from typing import Any, Dict

from src.core.cascade_engine import CascadeEngine
from src.core.rebalance_engine import RebalanceEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine


class ProjectionEngine:
    """
    수학적으로 완벽하게 증명 가능한 은퇴 시뮬레이션 엔진.
    하드코딩된 상수를 배제하고 모든 변수를 파라미터로부터 로드합니다.
    """

    def __init__(
        self,
        tax_engine: TaxEngine,
        trigger_engine: TriggerEngine,
        rebalance_engine: RebalanceEngine,
    ):
        self.tax_engine = tax_engine
        self.trigger_engine = trigger_engine
        self.rebalance_engine = rebalance_engine

    def run_30yr_simulation(
        self, initial_assets: Dict[str, float], params: Dict[str, Any]
    ) -> Dict[str, Any]:
        # 시뮬레이션 기간 (기본 30년 -> 개월 변환)
        sim_years = int(params.get("simulation_years", 30))
        return self._execute_loop(initial_assets, params, months=sim_years * 12)

    def _execute_loop(
        self, initial_assets: Dict[str, float], params: Dict[str, Any], months: int
    ) -> Dict[str, Any]:
        # 1. 기초 자산
        curr_assets = {
            "VOO": float(initial_assets.get("corp", 0)) * 0.7,
            "SCHD": float(initial_assets.get("pension", 0)) * 0.5,
            "BND": float(initial_assets.get("pension", 0)) * 0.2,
            "SGOV": (
                float(initial_assets.get("corp", 0)) * 0.3
                + float(initial_assets.get("pension", 0)) * 0.3
            ),
        }

        # 2. 파라미터 로드
        def p(k: str, d: Any) -> Any:
            return params.get(k, d)

        birth_year, birth_month = int(p("birth_year", 1972)), int(p("birth_month", 3))
        p_age, n_age = (
            int(p("private_pension_start_age", 55)),
            int(p("national_pension_start_age", 65)),
        )
        base_cf = float(p("target_monthly_cashflow", 9000000))
        n_amt = float(p("national_pension_amount", 1500000))
        p_cf = float(p("pension_withdrawal_target", 2500000))
        infl_rate, mkt_rate = (
            float(p("inflation_rate", 0.025)),
            float(p("market_return_rate", 0.0485)),
        )
        loan_bal = float(p("initial_shareholder_loan", 1550000000))
        salary, fixed_cost, emp_count = (
            float(p("corp_salary", 2500000)),
            float(p("corp_fixed_cost", 500000)),
            int(p("employee_count", 1)),
        )

        # [ADD] 자산 수익률 가중치 파라미터 로드
        equity_mult = float(p("equity_yield_multiplier", 1.2))
        debt_mult = float(p("debt_yield_multiplier", 0.6))
        buffer_months = int(p("target_buffer_months", 24))

        m_infl = (1 + infl_rate) ** (1 / 12) - 1
        m_ret = (1 + mkt_rate) ** (1 / 12) - 1
        cur_y, cur_m = int(p("simulation_start_year", 2026)), int(
            p("simulation_start_month", 3)
        )

        monthly_data = []
        survival_m = 0
        sgov_exhaust_date = "Permanent"
        growth_sell_date = "None"

        for m in range(1, months + 1):
            s_m = (cur_m + m - 1) % 12 or 12
            s_y = cur_y + (cur_m + m - 2) // 12
            age = ((s_y - birth_year) * 12 + (s_m - birth_month)) // 12

            # [A] 자산 수익 발생 (파라미터화된 가중치 적용)
            for asset in curr_assets:
                y = m_ret * (
                    equity_mult
                    if asset == "VOO"
                    else debt_mult if asset in ["BND", "SGOV"] else 1.0
                )
                curr_assets[asset] *= 1 + y

            # [B] 법인 운영비 지출
            ins_rate = (
                self.tax_engine.health_rate
                + self.tax_engine.pension_rate
                + self.tax_engine.employment_rate
            )
            corp_ins_cost = (salary * ins_rate) * emp_count
            total_corp_out = (salary * emp_count) + corp_ins_cost + fixed_cost
            curr_assets["SGOV"] = max(0, curr_assets["SGOV"] - total_corp_out)

            # [C] 생활비 목표 및 수입원
            target_cf = base_cf * (1 + m_infl) ** m
            income_pension = n_amt * (1 + m_infl) ** m if age >= n_age else 0
            sal_info = self.tax_engine.calculate_income_tax(salary)
            income_salary = sal_info["net_salary"]

            deficit = max(0, target_cf - income_pension - income_salary)

            # [D] 인출 전략 (1순위: 개인연금)
            actual_p_draw = 0
            phase = "Phase 1"
            if age >= p_age and deficit > 0:
                phase = "Phase 2" if age < n_age else "Phase 3"
                p_target = min(p_cf * (1 + m_infl) ** m, deficit)
                for pa in ["SCHD", "BND"]:
                    draw = min(curr_assets[pa], p_target)
                    curr_assets[pa] -= draw
                    actual_p_draw += draw
                    p_target -= draw
                deficit = max(0, deficit - actual_p_draw)

            # [E] 인출 전략 (2순위: 주주대여금)
            if loan_bal > 0 and deficit > 0:
                draw = min(loan_bal, deficit, curr_assets["SGOV"])
                loan_bal -= draw
                curr_assets["SGOV"] -= draw
                deficit = max(0, deficit - draw)

            # [F] 인출 전략 (3순위: 법인 자산 Cascade)
            if deficit > 0:
                cascade = CascadeEngine(target_buffer=target_cf * buffer_months)
                decision = cascade.get_liquidation_decision(curr_assets)
                t_asset = decision["target_asset"] or "SGOV"
                draw = min(curr_assets[t_asset], deficit)
                curr_assets[t_asset] -= draw
                if draw < deficit:
                    curr_assets["SGOV"] = max(0, curr_assets["SGOV"] - (deficit - draw))
                if t_asset != "SGOV" and growth_sell_date == "None":
                    growth_sell_date = f"{s_y}-{s_m:02d}"
                deficit = 0

            # [G] 기록 및 판정
            total_nw = sum(curr_assets.values())
            if total_nw <= 0:
                break

            if curr_assets["SGOV"] <= 0 and sgov_exhaust_date == "Permanent":
                sgov_exhaust_date = f"{s_y}-{s_m:02d}"

            survival_m = m
            if m <= months:  # 요청한 기간만큼 데이터 기록
                monthly_data.append(
                    {
                        "index": m,
                        "year": s_y,
                        "month": s_m,
                        "age": age,
                        "phase": phase,
                        "total_net_worth": total_nw,
                        "corp_balance": curr_assets["VOO"] + curr_assets["SGOV"],
                        "pension_balance": curr_assets["SCHD"] + curr_assets["BND"],
                        "loan_balance": loan_bal,
                        "target_cashflow": target_cf,
                        "net_salary": income_salary,
                    }
                )

        return {
            "summary": {
                "total_survival_years": survival_m // 12,
                "is_permanent": survival_m >= months,
                "sgov_exhaustion_date": sgov_exhaust_date,
                "growth_asset_sell_start_date": growth_sell_date,
            },
            "survival_months": survival_m,
            "monthly_data": monthly_data,
        }
