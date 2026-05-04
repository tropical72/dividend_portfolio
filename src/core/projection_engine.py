from typing import Any, Dict

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
        c_sw = c_stats.get("strategy_weights") or {}
        p_sw = p_stats.get("strategy_weights") or {}

        curr_assets = {
            "corp_growth": c_bal * (c_sw.get("Growth Engine", c_w.get("Growth", 0))),
            "corp_dividend": c_bal * (c_sw.get("Dividend Growth", c_w.get("Dividend", 0))),
            "corp_high_income": c_bal
            * (
                c_sw.get("High Income", 0)
                + c_sw.get("Bond Buffer", 0)
                + (
                    c_w.get("Fixed", 0)
                    if "High Income" not in c_sw and "Bond Buffer" not in c_sw
                    else 0
                )
            ),
            "corp_cash": c_bal * (c_sw.get("SGOV Buffer", c_w.get("Cash", 0))),
            "pen_growth": p_bal * (p_sw.get("Growth Engine", p_w.get("Growth", 0))),
            "pen_dividend": p_bal * (p_sw.get("Dividend Growth", p_w.get("Dividend", 0))),
            "pen_bond": p_bal * (p_sw.get("Bond Buffer", p_w.get("Fixed", 0))),
            "pen_cash": p_bal * (p_sw.get("SGOV Buffer", p_w.get("Cash", 0))),
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

        rebalance_month = int(p("rebalance_month", 1))
        bear_market_freeze_enabled = bool(p("bear_market_freeze_enabled", False))
        sgov_crisis_months = float(p("sgov_crisis_months", 24))
        sgov_warn_months = float(p("sgov_warn_months", 30))
        high_income_min_ratio = float(p("high_income_min_ratio", 0.20))
        growth_sell_years_left_threshold = float(p("growth_sell_years_left_threshold", 10))
        years_left_estimate = float(p("years_left_estimate", float("inf")))
        bond_min_years = float(p("bond_min_years", 5))
        bond_min_total_ratio = float(p("bond_min_total_ratio", 0.05))
        dividend_min_ratio = float(p("dividend_min_ratio", 0.10))
        planned_cashflows = p("planned_cashflows", [])

        # [NEW] 자산군별 기대주가상승률(PA) 로드
        a_rates = p(
            "appreciation_rates",
            {
                "cash_sgov": 0.001,
                "fixed_income": 0.025,
                "dividend_stocks": 0.055,
                "growth_stocks": 0.095,
            },
        )

        # [FIX] 사용자가 Retirement 탭에서 수정한 시장 수익률 가정 로드
        m_ret_rate = float(p("market_return_rate", 0.07))
        m_infl = (1 + infl_rate) ** (1 / 12) - 1

        def get_account_growth_rate(account_prefix: str) -> float:
            account_stats = c_stats if account_prefix == "corp" else p_stats
            dividend_yield = float(account_stats.get("dividend_yield", 0.0))
            baseline_total_return = float(account_stats.get("expected_return", dividend_yield))
            baseline_growth = baseline_total_return - dividend_yield
            target_growth = m_ret_rate - dividend_yield

            # 가시 설정(TR) 변경이 실제 그래프에 반영되도록 계좌 성장률을 동적으로 보정한다.
            if abs(baseline_growth) < 1e-9:
                return target_growth
            return baseline_growth * (target_growth / baseline_growth)

        # 월간 시장 수익률 (단리 변환)
        cur_y, cur_m = int(p("simulation_start_year", 2026)), int(p("simulation_start_month", 3))

        monthly_data = []
        survival_m = 0
        sgov_exhaust_date = "Permanent"
        growth_sell_date = "None"

        for m in range(1, months + 1):
            s_m = (cur_m + m - 1) % 12 or 12
            s_y = cur_y + (cur_m + m - 2) // 12
            age = ((s_y - birth_year) * 12 + (s_m - birth_month)) // 12

            # 이벤트 처리
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

            # 자산 수익 발생 (시장 수익률 가정 반영)
            # 배당/인컴은 자산 자체에 재투자하지 않고 계좌별 현금으로 유입한다.
            c_div = c_stats.get("dividend_yield", 0.04) / 12
            p_div = p_stats.get("dividend_yield", 0.035) / 12

            snapshot_assets = dict(curr_assets)
            corp_income_to_cash = 0.0
            pension_income_to_cash = 0.0
            for asset, bal in snapshot_assets.items():
                if bal <= 0:
                    continue

                account_prefix = "corp" if asset.startswith("corp") else "pen"
                account_growth_rate = get_account_growth_rate(account_prefix)

                # [NEW] 자산군별 기대주가상승률(PA) 적용
                if "growth" in asset:
                    growth = account_growth_rate / 12
                elif "dividend" in asset:
                    growth = account_growth_rate / 12
                elif "high_income" in asset or "bond" in asset:
                    growth = account_growth_rate / 12
                elif "cash" in asset:
                    growth = a_rates.get("cash_sgov", 0.001) / 12
                else:
                    growth = 0.0

                div = c_div if asset.startswith("corp") else p_div

                # 현금성 자산(cash)은 배당을 즉시 재투자하는 것으로 간주하여 가치에 합산
                if "cash" in asset:
                    curr_assets[asset] = bal * (1 + growth + div)
                    continue

                # 그 외 자산은 배당을 별도 현금으로 인출
                income_cash = bal * div
                curr_assets[asset] = bal * (1 + growth)
                if asset.startswith("corp"):
                    corp_income_to_cash += income_cash
                else:
                    pension_income_to_cash += income_cash

            curr_assets["corp_cash"] += corp_income_to_cash
            curr_assets["pen_cash"] += pension_income_to_cash

            # 법인 운영비 지출
            ins_rate = (
                self.tax_engine.health_rate
                + self.tax_engine.pension_rate
                + self.tax_engine.employment_rate
            )
            corp_ins_cost = (salary * ins_rate) * emp_count
            total_corp_out = (salary * emp_count) + corp_ins_cost + fixed_cost
            curr_assets["corp_cash"] = max(0, curr_assets["corp_cash"] - total_corp_out)

            # 목표 생활비 산출
            target_cf = base_cf * (1 + m_infl) ** m
            income_pension = n_amt * (1 + m_infl) ** m if age >= n_age else 0
            sal_info = self.tax_engine.calculate_income_tax(salary)
            income_salary = sal_info["net_salary"]
            deficit = max(0, target_cf - income_pension - income_salary)

            # 인출 시퀀스
            actual_p_draw = 0
            phase = "Phase 1"
            if age >= n_age:
                phase = "Phase 3"
            elif age >= p_age:
                phase = "Phase 2"

            if phase in {"Phase 2", "Phase 3"} and deficit > 0:
                p_target = min(p_cf * (1 + m_infl) ** m, deficit)
                cash_draw = min(curr_assets["pen_cash"], p_target)
                curr_assets["pen_cash"] -= cash_draw
                actual_p_draw += cash_draw
                p_target -= cash_draw

                if p_target > 0 and s_m == rebalance_month:
                    annual_pension_need = max(p_cf * 12, 1.0)
                    pension_total = sum(
                        curr_assets[k]
                        for k in ["pen_cash", "pen_bond", "pen_dividend", "pen_growth"]
                    )
                    bond_floor = max(
                        annual_pension_need * bond_min_years,
                        pension_total * bond_min_total_ratio,
                    )
                    dividend_floor = pension_total * dividend_min_ratio

                    bond_draw = min(curr_assets["pen_bond"], p_target)
                    curr_assets["pen_bond"] -= bond_draw
                    actual_p_draw += bond_draw
                    p_target -= bond_draw

                    if p_target > 0 and curr_assets["pen_bond"] <= bond_floor:
                        dividend_draw = min(curr_assets["pen_dividend"], p_target)
                        curr_assets["pen_dividend"] -= dividend_draw
                        actual_p_draw += dividend_draw
                        p_target -= dividend_draw

                    if (
                        p_target > 0
                        and phase == "Phase 3"
                        and curr_assets["pen_dividend"] <= dividend_floor
                        and not (bear_market_freeze_enabled and m_ret_rate < 0)
                    ):
                        growth_draw = min(curr_assets["pen_growth"], p_target)
                        curr_assets["pen_growth"] -= growth_draw
                        actual_p_draw += growth_draw
                        p_target -= growth_draw
                deficit = max(0, deficit - actual_p_draw)

            if loan_bal > 0 and deficit > 0:
                draw = min(loan_bal, deficit, curr_assets["corp_cash"])
                loan_bal -= draw
                curr_assets["corp_cash"] -= draw
                deficit = max(0, deficit - draw)

            if deficit > 0 and s_m == rebalance_month:
                current_month_need = max(deficit, 1.0)
                corp_cash_buffer_months = curr_assets["corp_cash"] / current_month_need
                corp_total = sum(
                    curr_assets[k]
                    for k in [
                        "corp_cash",
                        "corp_high_income",
                        "corp_dividend",
                        "corp_growth",
                    ]
                )
                if corp_cash_buffer_months < sgov_warn_months:
                    hi_draw = min(curr_assets["corp_high_income"], deficit)
                    curr_assets["corp_high_income"] -= hi_draw
                    deficit -= hi_draw

                high_income_ratio = (
                    curr_assets["corp_high_income"] / corp_total if corp_total > 0 else 0.0
                )
                if deficit > 0 and high_income_ratio <= high_income_min_ratio:
                    dividend_draw = min(curr_assets["corp_dividend"], deficit)
                    curr_assets["corp_dividend"] -= dividend_draw
                    deficit -= dividend_draw

                allow_corp_growth_sale = (
                    deficit > 0
                    and not (bear_market_freeze_enabled and m_ret_rate < 0)
                    and (
                        years_left_estimate <= growth_sell_years_left_threshold
                        or (
                            corp_cash_buffer_months < sgov_crisis_months
                            and curr_assets["corp_high_income"] <= 0
                            and curr_assets["corp_dividend"] <= 0
                        )
                    )
                )
                if allow_corp_growth_sale:
                    growth_draw = min(curr_assets["corp_growth"], deficit)
                    curr_assets["corp_growth"] -= growth_draw
                    deficit -= growth_draw
                    if growth_draw > 0 and growth_sell_date == "None":
                        growth_sell_date = f"{s_y}-{s_m:02d}"

                if deficit > 0:
                    cash_draw = min(curr_assets["corp_cash"], deficit)
                    curr_assets["corp_cash"] -= cash_draw
                    deficit -= cash_draw

            total_nw = sum(curr_assets.values())
            if total_nw <= 0:
                break
            if curr_assets["corp_cash"] <= 0 and sgov_exhaust_date == "Permanent":
                sgov_exhaust_date = f"{s_y}-{s_m:02d}"
            survival_m = m
            if m <= months:
                corp_bal = (
                    curr_assets["corp_growth"]
                    + curr_assets["corp_dividend"]
                    + curr_assets["corp_high_income"]
                    + curr_assets["corp_cash"]
                )
                pen_bal = (
                    curr_assets["pen_growth"]
                    + curr_assets["pen_dividend"]
                    + curr_assets["pen_bond"]
                    + curr_assets["pen_cash"]
                )
                monthly_data.append(
                    {
                        "index": m,
                        "year": s_y,
                        "month": s_m,
                        "age": age,
                        "phase": phase,
                        "total_net_worth": total_nw,
                        "corp_balance": corp_bal,
                        "pension_balance": pen_bal,
                        "loan_balance": loan_bal,
                        "target_cashflow": target_cf,
                        "net_salary": income_salary,
                    }
                )

        return {
            "summary": {
                "total_survival_years": survival_m // 12,
                "survival_months": survival_m,
                "is_permanent": survival_m >= months,
                "sgov_exhaustion_date": sgov_exhaust_date,
                "growth_asset_sell_start_date": growth_sell_date,
            },
            "survival_months": survival_m,
            "monthly_data": monthly_data,
        }
