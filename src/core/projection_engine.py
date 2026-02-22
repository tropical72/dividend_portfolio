from typing import Dict, List, Any
from src.core.tax_engine import TaxEngine
from src.core.cascade_engine import CascadeEngine
from src.core.trigger_engine import TriggerEngine
from src.core.rebalance_engine import RebalanceEngine

class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    
    본 엔진은 [REQ-RAMS-3.1, 3.2] 요구사항에 따라 나이(개월령), 설정된 인출액, 
    미래 확정적 자금 이벤트(Planned Cashflow)를 실시간 반영하여 자산 고갈 여부를 판정합니다.
    모든 계산은 월 단위로 수행되며, 물가 상승률(Inflation)과 자산 수익률을 복리로 적용합니다.
    """

    def __init__(
        self,
        tax_engine: TaxEngine,
        trigger_engine: TriggerEngine,
        rebalance_engine: RebalanceEngine
    ):
        """
        필요한 하위 엔진들을 주입받아 초기화합니다.
        
        Args:
            tax_engine: 세후 실질 현금흐름 계산용 세무 엔진
            trigger_engine: 리밸런싱 및 시장 이상 신호 감지 엔진
            rebalance_engine: 자산 비중 재조정 실행 엔진
        """
        self.tax_engine = tax_engine
        self.trigger_engine = trigger_engine
        self.rebalance_engine = rebalance_engine

    def run_30yr_simulation(self, initial_assets: Dict[str, float], params: Dict) -> Dict:
        """
        표준 30년(360개월) 시뮬레이션 및 10% 소비 감축 시의 영속 생존 여부를 분석합니다.
        
        Args:
            initial_assets: 기초 자산 정보 (corp: 법인자산, pension: 연금자산)
            params: 시뮬레이션에 필요한 모든 설정 파라미터
            
        Returns:
            Dict: 월별 시뮬레이션 데이터 및 요약 리포트
        """
        # 1. 표준 시나리오 실행 (30년)
        standard_result = self._execute_loop(initial_assets, params, months=360)
        
        # 2. 영속 가능성 테스트 (소비 10% 감축 시 100세 이상 생존 여부 확인용)
        # 1200개월(100년)까지 시뮬레이션하여 기초 체력을 검증합니다.
        params_10pct_cut = params.copy()
        params_10pct_cut["target_monthly_cashflow"] *= 0.9
        cut_result = self._execute_loop(initial_assets, params_10pct_cut, months=1200)
        
        standard_result["summary"]["infinite_with_10pct_cut"] = (
            cut_result["survival_months"] >= 1200
        )
        return standard_result

    def _execute_loop(self, initial_assets: Dict[str, float], params: Dict, months: int) -> Dict:
        """
        내부 시뮬레이션 루프: 연령별 Phase 전환 및 미래 이벤트를 동적으로 반영합니다.
        """
        # --- [준비단계 1. 기초 자산 배분] ---
        # 실제 환경에서는 사용자의 현재 포트폴리오 비중을 가져오는 것이 좋으나,
        # 현재는 표준 모델(VOO/SCHD/BND/SGOV)로 자산을 분배하여 시뮬레이션을 시작합니다.
        curr_assets = {
            "VOO": initial_assets.get("corp", 0) * 0.7,
            "SCHD": initial_assets.get("pension", 0) * 0.5,
            "BND": initial_assets.get("pension", 0) * 0.2,
            "SGOV": initial_assets.get("corp", 0) * 0.3 + initial_assets.get("pension", 0) * 0.3
        }
        
        # --- [준비단계 2. 파라미터 로드 및 상수 매핑] ---
        birth_year = params.get("birth_year", 1972)
        birth_month = params.get("birth_month", 3)
        private_pension_age = params.get("private_pension_start_age", 55)
        national_pension_age = params.get("national_pension_start_age", 65)
        
        base_cashflow = params.get("target_monthly_cashflow", 9000000)
        pension_withdrawal_target = params.get("pension_withdrawal_target", 2500000)
        national_pension_amount = params.get("national_pension_amount", 1500000)
        
        inflation_rate = params.get("inflation_rate", 0.025)
        market_return = params.get("market_return_rate", 0.0485)
        planned_events = params.get("planned_cashflows", [])
        
        target_buffer_months = params.get("target_buffer_months", 30)
        
        # 월간 복리 수익률 및 인플레이션 계산
        monthly_inflation = (1 + inflation_rate)**(1/12) - 1
        monthly_return = (1 + market_return)**(1/12) - 1
        
        # 시뮬레이션 시작 시점 (설정값 기반)
        current_year = params.get("simulation_start_year", 2026)
        current_month = params.get("simulation_start_month", 3)
        
        monthly_data = []
        survival_months = 0
        
        # --- [메인 시뮬레이션 루프] ---
        for m in range(1, months + 1):
            # 1. 시점 및 정밀 연령 계산 (만 나이 기준)
            sim_month = (current_month + m - 1) % 12 or 12
            sim_year = current_year + (current_month + m - 2) // 12
            total_months_old = (sim_year - birth_year) * 12 + (sim_month - birth_month)
            age_years = total_months_old // 12
            
            # 2. 미래 자금 이벤트 반영 [REQ-RAMS-1.3]
            # 해당 월에 예약된 유입/지출 이벤트를 자산 잔액에 가감합니다.
            for ev in planned_events:
                if ev["year"] == sim_year and ev["month"] == sim_month:
                    amount = ev["amount"] if ev["type"] == "INFLOW" else -ev["amount"]
                    # 법인 또는 연금 계좌의 현금성 자산(SGOV/BND)에서 우선 처리
                    if ev["entity"] == "CORP":
                        curr_assets["SGOV"] += amount
                    else:
                        curr_assets["BND"] += amount
            
            # 3. 인플레이션 반영 목표 생활비 산출 및 자산 수익 적용
            current_target = base_cashflow * (1 + monthly_inflation)**m
            for asset in curr_assets:
                # 자산군별 변동성 및 기대수익 가중치 (차후 설정화 필요)
                yield_val = monthly_return
                if asset == "VOO": yield_val *= 1.2  # 주식형 가중치
                elif asset in ["BND", "SGOV"]: yield_val *= 0.6  # 채권/현금성 가중치
                curr_assets[asset] *= (1 + yield_val)
            
            # 4. Phase별 인출 전략 실행 [REQ-RAMS-3.1]
            p_draw = 0  # 개인연금 인출액
            n_draw = 0  # 국민연금 수령액
            
            if age_years < private_pension_age:
                # Phase 1: 법인 자산 위주 인출 기간
                phase = "Phase 1"
            elif private_pension_age <= age_years < national_pension_age:
                # Phase 2: 개인연금 개시 후 기간
                phase = "Phase 2"
                p_draw = pension_withdrawal_target * (1 + monthly_inflation)**m
            else:
                # Phase 3: 국민연금 수령 시작 기간
                phase = "Phase 3"
                n_draw = national_pension_amount * (1 + monthly_inflation)**m
                # Phase 3에서는 개인연금 인출 비중을 다소 하향 조정 (예시 전략)
                p_draw = (pension_withdrawal_target * 0.8) * (1 + monthly_inflation)**m
            
            # 5. 자산 차감 실행 (Tier Cascade 전략 적용) [REQ-RAMS-3.2]
            # 생활비 목표에서 연금 수령액을 제외한 부족분을 법인 자산에서 충당합니다.
            corp_draw_needed = max(0, current_target - p_draw - n_draw)
            
            # (A) 연금 자산 인출 (SCHD -> BND 순)
            rem_p = p_draw
            for pa in ["SCHD", "BND"]:
                if curr_assets[pa] >= rem_p:
                    curr_assets[pa] -= rem_p
                    rem_p = 0
                    break
                else:
                    rem_p -= curr_assets[pa]
                    curr_assets[pa] = 0
            
            # (B) 법인 자산 인출 (Cascade Engine 결정에 따름)
            cascade = CascadeEngine(target_buffer=current_target * target_buffer_months)
            decision = cascade.get_liquidation_decision(curr_assets)
            t_asset = decision["target_asset"]
            
            if t_asset:
                if curr_assets.get(t_asset, 0) >= corp_draw_needed:
                    curr_assets[t_asset] -= corp_draw_needed
                else:
                    # 지정 자산 부족 시 현금성 자산에서 강제 차감
                    curr_assets["SGOV"] -= corp_draw_needed
            
            # 6. 데이터 기록 및 생존 판정
            total_nw = sum(curr_assets.values())
            if total_nw > 0:
                survival_months = m
                # 30년치 데이터만 기록 (성능 및 시각화 용도)
                if m <= 360:
                    monthly_data.append({
                        "month": m, 
                        "age": age_years, 
                        "phase": phase, 
                        "total_net_worth": total_nw,
                        "corp_balance": curr_assets.get("VOO", 0) + curr_assets.get("SGOV", 0) * 0.5,
                        "pension_balance": curr_assets.get("SCHD", 0) + curr_assets.get("BND", 0) + curr_assets.get("SGOV", 0) * 0.5,
                        "target_cashflow": current_target, 
                        "state": decision["state"]
                    })
            else:
                # 자산 고갈 시 루프 종료
                break
                
        return {
            "summary": {
                "total_survival_years": survival_months // 12,
                "is_permanent": survival_months >= 360,
                "signals": [] 
            },
            "survival_months": survival_months,
            "monthly_data": monthly_data
        }
