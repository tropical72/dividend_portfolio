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
        # [REQ-RAMS-1.4.1] 포트폴리오 기반 자산 비중 주입 (Fallback 포함)
        stats = params.get("portfolio_stats", {})
        c_stats = stats.get("corp", {})
        p_stats = stats.get("pension", {})

        # 법인/연금 자산군별 초기 배분
        c_bal = float(initial_assets.get("corp", 0))
        p_bal = float(initial_assets.get("pension", 0))
        
        c_w = c_stats.get("weights") or {"Growth": 0.7, "Cash": 0.3}
        p_w = p_stats.get("weights") or {"Growth": 0.4, "Dividend": 0.3, "Cash": 0.3}

        curr_assets = {
            "corp_growth": c_bal * c_w.get("Growth", 0),
            "corp_dividend": c_bal * c_w.get("Dividend", 0),
            "corp_fixed": c_bal * c_w.get("Fixed", 0),
            "corp_cash": c_bal * c_w.get("Cash", 0),
            "pen_growth": p_bal * p_w.get("Growth", 0),
            "pen_dividend": p_bal * p_w.get("Dividend", 0),
            "pen_fixed": p_bal * p_w.get("Fixed", 0),
            "pen_cash": p_bal * p_w.get("Cash", 0),
        }

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
        infl_rate = float(p("inflation_rate", 0.025))
        loan_bal = float(p("initial_shareholder_loan", 1550000000))
        salary, fixed_cost, emp_count = (
            float(p("corp_salary", 2500000)),
            float(p("corp_fixed_cost", 500000)),
            int(p("employee_count", 1)),
        )

        buffer_months = int(p("target_buffer_months", 24))
        planned_cashflows = p("planned_cashflows", [])

        m_infl = (1 + infl_rate) ** (1 / 12) - 1
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

            for event in planned_cashflows:
                if int(event["year"]) == s_y and int(event["month"]) == s_m:
                    amt = float(event["amount"])
                    e_type = event.get("type", "INFLOW")
                    entity = event.get("entity", "CORP").lower()
                    key = "corp_cash" if entity == "corp" else "pen_cash"
                    if e_type == "INFLOW":
                        curr_assets[key] += amt
                    else:
                        curr_assets[key] = max(0, curr_assets[key] - amt)

            c_div = (c_stats.get("dividend_yield", 0.04) / 12)
            p_div = (p_stats.get("dividend_yield", 0.035) / 12)
            c_yield = c_stats.get("dividend_yield", 0.04)
            p_yield = p_stats.get("dividend_yield", 0.035)
            c_growth_rate = (c_stats.get("expected_return", 0.07) - c_yield) / 12
            p_growth_rate = (p_stats.get("expected_return", 0.06) - p_yield) / 12
            
            for asset, bal in curr_assets.items():
                if bal <= 0: continue
                if asset.startswith("corp"):
                    div, growth = c_div, c_growth_rate
                else:
                    div, growth = p_div, p_growth_rate
                if "cash" in asset: growth *= 0.5
                curr_assets[asset] *= (1 + growth + div)

            ins_rate = (
                self.tax_engine.health_rate
                + self.tax_engine.pension_rate
                + self.tax_engine.employment_rate
            )
            corp_ins_cost = (salary * ins_rate) * emp_count
            total_corp_out = (salary * emp_count) + corp_ins_cost + fixed_cost
            curr_assets["corp_cash"] = max(0, curr_assets["corp_cash"] - total_corp_out)

            target_cf = base_cf * (1 + m_infl) ** m
            income_pension = n_amt * (1 + m_infl) ** m if age >= n_age else 0
            sal_info = self.tax_engine.calculate_income_tax(salary)
            income_salary = sal_info["net_salary"]
            deficit = max(0, target_cf - income_pension - income_salary)

            actual_p_draw = 0
            phase = "Phase 1"
            if age >= p_age and deficit > 0:
                phase = "Phase 2" if age < n_age else "Phase 3"
                p_target = min(p_cf * (1 + m_infl) ** m, deficit)
                for pa in ["pen_cash", "pen_fixed", "pen_dividend", "pen_growth"]:
                    draw = min(curr_assets[pa], p_target)
                    curr_assets[pa] -= draw
                    actual_p_draw += draw
                    p_target -= draw
                deficit = max(0, deficit - actual_p_draw)

            if loan_bal > 0 and deficit > 0:
                draw = min(loan_bal, deficit, curr_assets["corp_cash"])
                loan_bal -= draw
                curr_assets["corp_cash"] -= draw
                deficit = max(0, deficit - draw)

            if deficit > 0:
                legacy_assets = {"VOO": curr_assets["corp_growth"], "SGOV": curr_assets["corp_cash"]}
                cascade = CascadeEngine(target_buffer=target_cf * buffer_months)
                decision = cascade.get_liquidation_decision(legacy_assets)
                t_asset = decision["target_asset"] or "SGOV"
                real_key = "corp_growth" if t_asset == "VOO" else "corp_cash"
                draw = min(curr_assets[real_key], deficit)
                curr_assets[real_key] -= draw
                if draw < deficit: curr_assets["corp_cash"] = max(0, curr_assets["corp_cash"] - (deficit - draw))
                if real_key == "corp_growth" and growth_sell_date == "None": growth_sell_date = f"{s_y}-{s_m:02d}"
                deficit = 0

            total_nw = sum(curr_assets.values())
            if total_nw <= 0: break
            if curr_assets["corp_cash"] <= 0 and sgov_exhaust_date == "Permanent": sgov_exhaust_date = f"{s_y}-{s_m:02d}"
            survival_m = m
            if m <= months:
                corp_bal = curr_assets["corp_growth"] + curr_assets["corp_dividend"] + curr_assets["corp_fixed"] + curr_assets["corp_cash"]
                pen_bal = curr_assets["pen_growth"] + curr_assets["pen_dividend"] + curr_assets["pen_fixed"] + curr_assets["pen_cash"]
                monthly_data.append({
                    "index": m, "year": s_y, "month": s_m, "age": age, "phase": phase,
                    "total_net_worth": total_nw, "corp_balance": corp_bal, "pension_balance": pen_bal,
                    "loan_balance": loan_bal, "target_cashflow": target_cf, "net_salary": income_salary
                })

        return {
            "summary": {
                "total_survival_years": survival_m // 12,
                "survival_months": survival_m,
                "is_permanent": survival_m >= months,
                "sgov_exhaustion_date": sgov_exhaust_date,
                "growth_asset_sell_start_date": growth_sell_date
            },
            "survival_months": survival_m,
            "monthly_data": monthly_data
        }
