from typing import Dict

from src.core.tax_engine import TaxEngine


class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    [REQ-RAMS-3.2, 3.3] 인플레이션과 수익률을 반영한 자산 생존 수명 계산.
    """

    def __init__(self, tax_engine: TaxEngine):
        self.tax_engine = tax_engine

    def run_30yr_simulation(self, initial_assets: Dict[str, float], params: Dict) -> Dict:
        """
        360개월(30년) 시뮬레이션 실행 및 요약 결과 반환
        """
        months = 360
        current_corp = initial_assets.get("corp", 0)
        current_pension = initial_assets.get("pension", 0)

        target_cashflow = params.get("target_monthly_cashflow", 9000000)
        inflation_rate = params.get("inflation_rate", 0.025)
        market_return = params.get("market_return_rate", 0.0485)

        monthly_data = []
        survival_months = 0

        # 월간 물가상승률 및 수익률 변환
        monthly_inflation = (1 + inflation_rate) ** (1 / 12) - 1
        monthly_return = (1 + market_return) ** (1 / 12) - 1

        for m in range(1, months + 1):
            # 1. 인플레이션 반영 목표 생활비 증액
            current_target = target_cashflow * (1 + monthly_inflation) ** m

            # 2. 자산 수익 발생
            current_corp *= 1 + monthly_return
            current_pension *= 1 + monthly_return

            # 3. 법인 수익성 계산 및 세금/비용 차감
            corp_result = self.tax_engine.calculate_corp_profitability(
                assets=current_corp,
                return_rate=market_return,
                monthly_salary=params.get("corp_salary", 2500000),
                fixed_cost=params.get("corp_fixed_cost", 500000),
                loan_repayment=params.get("loan_repayment", 6500000),
            )

            # 법인 자산 차감 (순이익에서 상환액을 뺀 나머지가 실제 자산 변동분)
            current_corp += (corp_result["net_profit"] / 12) - params.get("loan_repayment", 6500000)

            # 4. 연금 인출 (월 250만 고정 가정)
            pension_withdrawal = 2500000
            current_pension -= pension_withdrawal

            # 5. 데이터 기록
            total_net_worth = current_corp + current_pension
            monthly_data.append(
                {
                    "month": m,
                    "corp_balance": current_corp,
                    "pension_balance": current_pension,
                    "total_net_worth": total_net_worth,
                    "target_cashflow": current_target,
                }
            )

            # 6. 생존 판정
            if total_net_worth > 0:
                survival_months = m
            else:
                break

        return {
            "summary": {
                "total_survival_years": survival_months // 12,
                "sgov_exhaustion_date": "TBD",
                "growth_asset_sell_start_date": "TBD",
                "is_permanent": survival_months == months,
            },
            "monthly_data": monthly_data,
        }
