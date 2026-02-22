from typing import Dict, List
from src.core.tax_engine import TaxEngine
from src.core.cascade_engine import CascadeEngine

class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    [REQ-RAMS-3.3, 3.4] Cascade Engine과 연동하여 자산 소진 및 임계점을 정밀 계산한다.
    """

    def __init__(self, tax_engine: TaxEngine):
        self.tax_engine = tax_engine

    def run_30yr_simulation(self, initial_assets: Dict[str, float], params: Dict) -> Dict:
        """
        360개월(30년) 시뮬레이션 실행 및 요약 결과 반환
        """
        months = 360
        # 자산 세분화 (Cascade Engine 연동을 위해 상세 항목 필요)
        # 만약 상세 항목이 없으면 법인/연금 총액을 VOO와 SGOV로 가상 분배 (시뮬레이션용)
        curr_assets = {
            "VOO": initial_assets.get("corp", 0) * 0.7,
            "SCHD": initial_assets.get("pension", 0) * 0.5,
            "BND": initial_assets.get("pension", 0) * 0.2,
            "SGOV": initial_assets.get("corp", 0) * 0.3 + initial_assets.get("pension", 0) * 0.3
        }

        # Cascade Engine 초기화 (SGOV 버퍼 타겟 설정)
        target_cashflow = params.get("target_monthly_cashflow", 9000000)
        target_buffer = target_cashflow * 30 # 30개월 버퍼
        cascade = CascadeEngine(target_buffer=target_buffer)

        inflation_rate = params.get("inflation_rate", 0.025)
        market_return = params.get("market_return_rate", 0.0485)
        
        monthly_data = []
        sgov_exhaustion_month = None
        growth_sell_start_month = None
        survival_months = 0
        
        monthly_inflation = (1 + inflation_rate)**(1/12) - 1
        monthly_return = (1 + market_return)**(1/12) - 1
        
        for m in range(1, months + 1):
            # 1. 인플레이션 반영 목표 생활비
            current_target = target_cashflow * (1 + monthly_inflation)**m
            
            # 2. 자산 수익 발생 (단순화: 모든 자산 동일 수익률 적용)
            for asset in curr_assets:
                curr_assets[asset] *= (1 + monthly_return)
            
            # 3. 법인 수익성 및 세금 정산 (법인 자산인 VOO와 SGOV 일부에 대해 적용)
            corp_assets_sum = curr_assets["VOO"] + curr_assets["SGOV"] * 0.5
            corp_result = self.tax_engine.calculate_corp_profitability(
                assets=corp_assets_sum,
                return_rate=market_return,
                monthly_salary=params.get("corp_salary", 2500000),
                fixed_cost=params.get("corp_fixed_cost", 500000),
                loan_repayment=params.get("loan_repayment", 6500000)
            )
            
            # 4. 인출 실행 (Cascade Engine 가동)
            # 배당 수입이 부족하여 자산을 팔아야 하는 상황 시뮬레이션
            decision = cascade.get_liquidation_decision(curr_assets)
            
            # 매도 시작 시점 기록
            if decision["state"] == "SELL_TIER_1_VOO" and growth_sell_start_month is None:
                growth_sell_start_month = m
            
            # 이번 달 필요한 인출액 차감
            shortfall = current_target
            target_asset = decision["target_asset"]
            
            if target_asset:
                if curr_assets[target_asset] >= shortfall:
                    curr_assets[target_asset] -= shortfall
                else:
                    # 해당 자산 소진 시 다음 자산에서 차감 (단순화)
                    shortfall -= curr_assets[target_asset]
                    curr_assets[target_asset] = 0
            
            # 5. SGOV 고갈 체크
            if curr_assets["SGOV"] <= 0 and sgov_exhaustion_month is None:
                sgov_exhaustion_month = m
            
            # 6. 데이터 기록
            total_net_worth = sum(curr_assets.values())
            monthly_data.append({
                "month": m,
                "total_net_worth": total_net_worth,
                "corp_balance": curr_assets["VOO"] + curr_assets["SGOV"] * 0.5,
                "pension_balance": curr_assets["SCHD"] + curr_assets["BND"] + curr_assets["SGOV"] * 0.5,
                "target_cashflow": current_target,
                "state": decision["state"]
            })
            
            if total_net_worth > 0:
                survival_months = m
            else:
                break
                
        # 연도 환산 함수
        def to_date_str(month_count):
            if month_count is None: return "영구적"
            years = month_count // 12
            return f"은퇴 후 {years}년차"

        return {
            "summary": {
                "total_survival_years": survival_months // 12,
                "sgov_exhaustion_date": to_date_str(sgov_exhaustion_month),
                "growth_asset_sell_start_date": to_date_str(growth_sell_start_month),
                "is_permanent": survival_months == months
            },
            "monthly_data": monthly_data
        }
