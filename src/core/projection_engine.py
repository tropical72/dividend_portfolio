from typing import Dict
from src.core.tax_engine import TaxEngine
from src.core.cascade_engine import CascadeEngine
from src.core.trigger_engine import TriggerEngine
from src.core.rebalance_engine import RebalanceEngine

class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    [REQ-RAMS-3.1, 3.2] 나이(개월령), 설정된 인출액, 미래 자금 이벤트를 실시간 반영한다.
    """

    def __init__(
        self,
        tax_engine: TaxEngine,
        trigger_engine: TriggerEngine,
        rebalance_engine: RebalanceEngine
    ):
        self.tax_engine = tax_engine
        self.trigger_engine = trigger_engine
        self.rebalance_engine = rebalance_engine

    def run_30yr_simulation(self, initial_assets: Dict[str, float], params: Dict) -> Dict:
        """360개월(30년) 시뮬레이션 실행"""
        standard_result = self._execute_loop(initial_assets, params, months=360)
        
        params_10pct_cut = params.copy()
        params_10pct_cut["target_monthly_cashflow"] *= 0.9
        cut_result = self._execute_loop(initial_assets, params_10pct_cut, months=1200)
        
        standard_result["summary"]["infinite_with_10pct_cut"] = (
            cut_result["survival_months"] >= 1200
        )
        return standard_result

    def _execute_loop(self, initial_assets: Dict[str, float], params: Dict, months: int) -> Dict:
        """내부 시뮬레이션 루프 (연령별 Phase 및 이벤트 동적 반영)"""
        # 1. 기초 자산 분배 (초기 투자금 설정 연동)
        curr_assets = {
            "VOO": initial_assets.get("corp", 0) * 0.7,
            "SCHD": initial_assets.get("pension", 0) * 0.5,
            "BND": initial_assets.get("pension", 0) * 0.2,
            "SGOV": initial_assets.get("corp", 0) * 0.3 + initial_assets.get("pension", 0) * 0.3
        }
        
        target_weights = {"VOO": 0.40, "SCHD": 0.25, "BND": 0.15, "SGOV": 0.20}
        
        # 2. 사용자 프로필 및 파라미터 로드
        birth_year = params.get("birth_year", 1972)
        birth_month = params.get("birth_month", 3)
        private_pension_age = params.get("private_pension_start_age", 55)
        national_pension_age = params.get("national_pension_start_age", 65)
        
        base_cashflow = params.get("target_monthly_cashflow", 9000000)
        pension_withdrawal_target = params.get("pension_withdrawal_target", 2500000)
        
        inflation_rate = params.get("inflation_rate", 0.025)
        market_return = params.get("market_return_rate", 0.0485)
        planned_events = params.get("planned_cashflows", [])
        
        target_buffer_months = 30
        monthly_inflation = (1 + inflation_rate)**(1/12) - 1
        monthly_return = (1 + market_return)**(1/12) - 1
        current_year, current_month = 2026, 3 # 시뮬레이션 시작 시점
        
        monthly_data = []
        signals = []
        survival_months = 0
        
        for m in range(1, months + 1):
            # --- [Step A. 시점 및 정밀 연령 계산] ---
            sim_month = (current_month + m - 1) % 12 or 12
            sim_year = current_year + (current_month + m - 2) // 12
            # 만 나이(개월 단위) 계산
            total_months_old = (sim_year - birth_year) * 12 + (sim_month - birth_month)
            age_years = total_months_old // 12
            
            # --- [Step B. 미래 자금 이벤트 반영 (REQ-RAMS-1.3)] ---
            for ev in planned_events:
                if ev["year"] == sim_year and ev["month"] == sim_month:
                    amount = ev["amount"] if ev["type"] == "INFLOW" else -ev["amount"]
                    if ev["entity"] == "CORP":
                        curr_assets["SGOV"] += amount # 법인 현금성 자산에 가감
                    else:
                        curr_assets["BND"] += amount # 연금 채권 자산에 가감
            
            # --- [Step C. 물가 반영 목표액 및 자산 수익] ---
            current_target = base_cashflow * (1 + monthly_inflation)**m
            for asset in curr_assets:
                yield_val = monthly_return
                if asset == "VOO": yield_val *= 1.2
                elif asset in ["BND", "SGOV"]: yield_val *= 0.6
                curr_assets[asset] *= (1 + yield_val)
            
            # --- [Step D. Phase별 인출 전략 (REQ-RAMS-3.1)] ---
            p_draw = 0
            n_draw = 0
            if age_years < private_pension_age:
                phase = "Phase 1"
            elif private_pension_age <= age_years < national_pension_age:
                phase = "Phase 2"
                p_draw = pension_withdrawal_target * (1 + monthly_inflation)**m
            else:
                phase = "Phase 3"
                n_draw = 1500000 * (1 + monthly_inflation)**m # 국민연금 임시값
                p_draw = (pension_withdrawal_target * 0.8) * (1 + monthly_inflation)**m
            
            # --- [Step E. 자산 차감 실행 (Cascade)] ---
            corp_draw_needed = max(0, current_target - p_draw - n_draw)
            
            # 연금 차감
            rem_p = p_draw
            for pa in ["SCHD", "BND"]:
                if curr_assets[pa] >= rem_p:
                    curr_assets[pa] -= rem_p
                    rem_p = 0
                    break
                else:
                    rem_p -= curr_assets[pa]
                    curr_assets[pa] = 0
            
            # 법인 차감 (Cascade)
            cascade = CascadeEngine(target_buffer=current_target * target_buffer_months)
            decision = cascade.get_liquidation_decision(curr_assets)
            t_asset = decision["target_asset"]
            if t_asset:
                if curr_assets.get(t_asset, 0) >= corp_draw_needed:
                    curr_assets[t_asset] -= corp_draw_needed
                else:
                    curr_assets["SGOV"] -= corp_draw_needed
            
            # --- [Step F. 데이터 기록 및 생존 판정] ---
            total_nw = sum(curr_assets.values())
            if total_nw > 0:
                survival_months = m
                if m <= 360:
                    monthly_data.append({
                        "month": m, "age": age_years, "phase": phase, "total_net_worth": total_nw,
                        "corp_balance": curr_assets["VOO"] + curr_assets["SGOV"] * 0.5,
                        "pension_balance": curr_assets["SCHD"] + curr_assets["BND"] + curr_assets["SGOV"] * 0.5,
                        "target_cashflow": current_target, "state": decision["state"]
                    })
            else:
                break
                
        return {
            "summary": {
                "total_survival_years": survival_months // 12,
                "is_permanent": survival_months >= 360,
                "signals": [] # 로직 생략 (기존과 동일)
            },
            "survival_months": survival_months,
            "monthly_data": monthly_data
        }
