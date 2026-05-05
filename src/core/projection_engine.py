from typing import Any, Dict

from src.core.rebalance_engine import RebalanceEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine


class ProjectionEngine:
    """OS v11.1 기준 월간 은퇴 운용 시뮬레이션 엔진."""

    CATEGORY_ORDER = (
        "SGOV Buffer",
        "Bond Buffer",
        "High Income",
        "Dividend Growth",
        "Growth Engine",
    )

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
        sim_years = int(params.get("simulation_years", 30))
        return self._execute_loop(initial_assets, params, months=sim_years * 12)

    def _execute_loop(
        self, initial_assets: Dict[str, float], params: Dict[str, Any], months: int
    ) -> Dict[str, Any]:
        stats = params.get("portfolio_stats", {})
        corp_stats = stats.get("corp", {})
        pension_stats = stats.get("pension", {})

        corp_assets = self._build_account_state(
            initial_balance=float(initial_assets.get("corp", 0.0)),
            account_type="corp",
            account_stats=corp_stats,
        )
        pension_assets = self._build_account_state(
            initial_balance=float(initial_assets.get("pension", 0.0)),
            account_type="pension",
            account_stats=pension_stats,
        )

        def p(key: str, default: Any) -> Any:
            return params.get(key, default)

        birth_year = int(p("birth_year", 1972))
        birth_month = int(p("birth_month", 8))
        private_pension_start_age = int(p("private_pension_start_age", 55))
        national_pension_start_age = int(p("national_pension_start_age", 65))
        approved_total_need = float(p("target_monthly_cashflow", 11500000))
        inflation_rate = float(p("inflation_rate", 0.0))
        national_pension_amount = float(p("national_pension_amount", 2000000))
        pension_withdrawal_target = float(p("pension_withdrawal_target", 2500000))
        loan_balance = float(p("initial_shareholder_loan", 0.0))
        corp_salary = float(p("corp_salary", 0.0))
        corp_fixed_cost = float(p("corp_fixed_cost", 0.0))
        employee_count = int(p("employee_count", 0))
        planned_cashflows = params.get("planned_cashflows", [])
        start_year = int(p("simulation_start_year", 2026))
        start_month = int(p("simulation_start_month", 1))

        current_stress = False
        shock_flag = False
        boost_amount = 0.0
        boost_months_remaining = 0
        growth_sell_date = "None"
        sgov_exhaustion_date = "Permanent"
        survival_m = 0
        crash20_base = self._equity_value(corp_assets) + self._equity_value(pension_assets)
        previous_may_total_assets = None
        monthly_data = []

        for index in range(1, months + 1):
            sim_month = (start_month + index - 1) % 12 or 12
            sim_year = start_year + (start_month + index - 2) // 12
            age = ((sim_year - birth_year) * 12 + (sim_month - birth_month)) // 12
            phase = self._resolve_phase(age, private_pension_start_age, national_pension_start_age)

            self._apply_planned_cashflows(
                corp_assets, pension_assets, planned_cashflows, sim_year, sim_month
            )
            self._apply_monthly_returns(
                "corp", corp_assets, corp_stats, params, sim_year, sim_month
            )
            self._apply_monthly_returns(
                "pension", pension_assets, pension_stats, params, sim_year, sim_month
            )

            current_total_need = approved_total_need
            current_boost_amount = boost_amount if boost_months_remaining > 0 else 0.0
            pension_income = (
                pension_withdrawal_target + current_boost_amount
                if phase in {"Phase 2", "Phase 3"}
                else 0.0
            )
            national_income = national_pension_amount if phase == "Phase 3" else 0.0
            corp_monthly_need = max(0.0, current_total_need - pension_income - national_income)

            corp_operating_cost = self._corp_operating_cost(
                corp_salary, corp_fixed_cost, employee_count
            )
            corp_assets["SGOV Buffer"] = max(0.0, corp_assets["SGOV Buffer"] - corp_operating_cost)

            pension_draw = 0.0
            if pension_income > 0:
                pension_draw = min(pension_income, pension_assets["SGOV Buffer"])
                pension_assets["SGOV Buffer"] -= pension_draw

            corp_draw = min(corp_monthly_need, corp_assets["SGOV Buffer"])
            corp_assets["SGOV Buffer"] -= corp_draw

            if loan_balance > 0 and corp_assets["SGOV Buffer"] > 0:
                loan_repayment = min(loan_balance, corp_assets["SGOV Buffer"])
                loan_balance -= loan_repayment
                corp_assets["SGOV Buffer"] -= loan_repayment

            inflation_action = "none"
            next_target_cashflow = current_total_need
            boost_reference_base = crash20_base
            if sim_month == 5:
                (
                    current_stress,
                    inflation_action,
                    next_target_cashflow,
                ) = self._run_may_review(
                    corp_assets=corp_assets,
                    pension_assets=pension_assets,
                    current_total_need=current_total_need,
                    inflation_rate=inflation_rate,
                    previous_may_total_assets=previous_may_total_assets,
                    shock_flag=shock_flag,
                    phase=phase,
                    pension_withdrawal_target=pension_withdrawal_target,
                    national_pension_amount=national_pension_amount,
                )
                growth_used = self._run_may_rebalance(
                    corp_assets=corp_assets,
                    pension_assets=pension_assets,
                    corp_monthly_need=self._phase_corp_monthly_need(
                        next_target_cashflow,
                        phase,
                        pension_withdrawal_target,
                        national_pension_amount,
                    ),
                    pension_withdrawal_target=pension_withdrawal_target,
                )
                if growth_used > 0 and growth_sell_date == "None":
                    growth_sell_date = f"{sim_year}-{sim_month:02d}"
                crash20_base = self._equity_value(corp_assets) + self._equity_value(pension_assets)
                previous_may_total_assets = sum(corp_assets.values()) + sum(pension_assets.values())
                shock_flag = False
            elif sim_month == 8:
                self._run_august_corporate_review(corp_assets, corp_monthly_need)
            elif sim_month == 11:
                growth_used = self._run_november_rebalance(corp_assets, corp_monthly_need)
                if growth_used > 0 and growth_sell_date == "None":
                    growth_sell_date = f"{sim_year}-{sim_month:02d}"

            self._run_pension_floor_refill(pension_assets, pension_withdrawal_target)

            total_net_worth = sum(corp_assets.values()) + sum(pension_assets.values())
            if total_net_worth <= 0:
                break

            equity_value = self._equity_value(corp_assets) + self._equity_value(pension_assets)
            crash20_triggered = False
            if crash20_base > 0 and equity_value <= crash20_base * 0.8 and not shock_flag:
                crash20_triggered = True
                shock_flag = True
            if crash20_triggered or (sim_month == 5 and current_stress):
                boost_amount = self._boost_amount_for_drawdown(equity_value, boost_reference_base)
                boost_months_remaining = 6 if boost_amount > 0 else 0

            corp_sgov_months = self._months_cover(corp_assets["SGOV Buffer"], corp_monthly_need)
            corp_bond_months = self._months_cover(corp_assets["Bond Buffer"], corp_monthly_need)
            pension_sgov_months = self._months_cover(
                pension_assets["SGOV Buffer"], pension_withdrawal_target
            )
            pension_bond_months = self._months_cover(
                pension_assets["Bond Buffer"], pension_withdrawal_target
            )

            if corp_assets["SGOV Buffer"] <= 0 and sgov_exhaustion_date == "Permanent":
                sgov_exhaustion_date = f"{sim_year}-{sim_month:02d}"

            survival_m = index
            corp_balance = sum(corp_assets.values())
            pension_balance = sum(pension_assets.values())
            monthly_data.append(
                {
                    "index": index,
                    "year": sim_year,
                    "month": sim_month,
                    "age": age,
                    "phase": phase,
                    "total_net_worth": total_net_worth,
                    "corp_balance": corp_balance,
                    "pension_balance": pension_balance,
                    "loan_balance": loan_balance,
                    "target_cashflow": current_total_need,
                    "next_target_cashflow": next_target_cashflow,
                    "net_salary": 0.0,
                    "pension_draw": pension_draw,
                    "boost_amount": boost_amount if boost_months_remaining > 0 else 0.0,
                    "corp_monthly_need": corp_monthly_need,
                    "shock_flag": shock_flag,
                    "crash20_triggered": crash20_triggered,
                    "stress": current_stress,
                    "inflation_action": inflation_action,
                    "corp_sgov_balance": corp_assets["SGOV Buffer"],
                    "corp_bond_balance": corp_assets["Bond Buffer"],
                    "corp_high_income_balance": corp_assets["High Income"],
                    "corp_dividend_balance": corp_assets["Dividend Growth"],
                    "corp_growth_balance": corp_assets["Growth Engine"],
                    "pension_sgov_balance": pension_assets["SGOV Buffer"],
                    "pension_bond_balance": pension_assets["Bond Buffer"],
                    "pension_high_income_balance": pension_assets["High Income"],
                    "pension_dividend_balance": pension_assets["Dividend Growth"],
                    "pension_growth_balance": pension_assets["Growth Engine"],
                    "corp_sgov_months": corp_sgov_months,
                    "corp_bond_months": corp_bond_months,
                    "pension_sgov_months": pension_sgov_months,
                    "pension_bond_months": pension_bond_months,
                }
            )
            if boost_months_remaining > 0:
                boost_months_remaining -= 1
                if boost_months_remaining == 0:
                    boost_amount = 0.0
            if sim_month == 5:
                approved_total_need = next_target_cashflow

        return {
            "summary": {
                "total_survival_years": survival_m // 12,
                "survival_months": survival_m,
                "is_permanent": survival_m >= months,
                "sgov_exhaustion_date": sgov_exhaustion_date,
                "growth_asset_sell_start_date": growth_sell_date,
                "signals": [],
                "infinite_with_10pct_cut": False,
            },
            "survival_months": survival_m,
            "monthly_data": monthly_data,
        }

    def _build_account_state(
        self, initial_balance: float, account_type: str, account_stats: Dict[str, Any]
    ) -> Dict[str, float]:
        strategy_weights = account_stats.get("strategy_weights") or {}
        legacy_weights = account_stats.get("weights") or {}

        if not strategy_weights:
            strategy_weights = {
                "SGOV Buffer": float(legacy_weights.get("Cash", 0.0)),
                "Bond Buffer": (
                    float(legacy_weights.get("Fixed", 0.0)) if account_type == "pension" else 0.0
                ),
                "High Income": (
                    float(legacy_weights.get("Fixed", 0.0)) if account_type == "corp" else 0.0
                ),
                "Dividend Growth": float(legacy_weights.get("Dividend", 0.0)),
                "Growth Engine": float(legacy_weights.get("Growth", 0.0)),
            }

        if sum(float(v) for v in strategy_weights.values()) <= 0:
            strategy_weights = (
                {
                    "SGOV Buffer": 0.30,
                    "Bond Buffer": 0.00,
                    "High Income": 0.00,
                    "Dividend Growth": 0.00,
                    "Growth Engine": 0.70,
                }
                if account_type == "corp"
                else {
                    "SGOV Buffer": 0.30,
                    "Bond Buffer": 0.00,
                    "High Income": 0.00,
                    "Dividend Growth": 0.30,
                    "Growth Engine": 0.40,
                }
            )

        return {
            category: initial_balance * float(strategy_weights.get(category, 0.0))
            for category in self.CATEGORY_ORDER
        }

    def _resolve_phase(
        self, age: int, private_pension_start_age: int, national_pension_start_age: int
    ) -> str:
        if age >= national_pension_start_age:
            return "Phase 3"
        if age >= private_pension_start_age:
            return "Phase 2"
        return "Phase 1"

    def _apply_planned_cashflows(
        self,
        corp_assets: Dict[str, float],
        pension_assets: Dict[str, float],
        planned_cashflows: list,
        sim_year: int,
        sim_month: int,
    ) -> None:
        for event in planned_cashflows:
            if int(event["year"]) != sim_year or int(event["month"]) != sim_month:
                continue
            amount = float(event["amount"])
            target_assets = (
                corp_assets if event.get("entity", "CORP").lower() == "corp" else pension_assets
            )
            if event.get("type", "INFLOW") == "INFLOW":
                target_assets["SGOV Buffer"] += amount
            else:
                target_assets["SGOV Buffer"] = max(0.0, target_assets["SGOV Buffer"] - amount)

    def _apply_monthly_returns(
        self,
        account_key: str,
        account_assets: Dict[str, float],
        account_stats: Dict[str, Any],
        params: Dict[str, Any],
        sim_year: int,
        sim_month: int,
    ) -> None:
        for category in self.CATEGORY_ORDER:
            balance = account_assets[category]
            if balance <= 0:
                continue

            category_rates = self._category_rate_spec(
                account_key, category, account_assets, account_stats, params, sim_year, sim_month
            )
            monthly_dy = float(category_rates["dy"]) / 12.0
            monthly_pa = float(category_rates["pa"]) / 12.0

            if category == "SGOV Buffer":
                account_assets[category] = balance * (1 + monthly_dy + monthly_pa)
                continue

            income_to_sgov = balance * monthly_dy
            account_assets[category] = balance * (1 + monthly_pa)
            account_assets["SGOV Buffer"] += income_to_sgov

    def _category_rate_spec(
        self,
        account_key: str,
        category: str,
        account_assets: Dict[str, float],
        account_stats: Dict[str, Any],
        params: Dict[str, Any],
        sim_year: int,
        sim_month: int,
    ) -> Dict[str, float]:
        month_key = f"{sim_year}-{sim_month:02d}"
        monthly_override = (
            params.get("monthly_return_overrides", {})
            .get(account_key, {})
            .get(category, {})
            .get(month_key, {})
        )
        if monthly_override:
            dy = float(monthly_override.get("dy", 0.0))
            pa = float(monthly_override.get("pa", 0.0))
            return {"dy": dy, "pa": pa, "tr": dy + pa}
        category_override = (
            params.get("category_return_rates", {}).get(account_key, {}).get(category, {})
        )
        if category_override:
            return {
                "dy": float(category_override.get("dy", 0.0)),
                "pa": float(category_override.get("pa", 0.0)),
                "tr": float(category_override.get("tr", 0.0)),
            }

        appreciation_rates = params.get("appreciation_rates", {})
        account_expected_return = float(account_stats.get("expected_return", 0.0))
        account_dividend_yield = float(account_stats.get("dividend_yield", 0.0))
        default_pa = {
            "SGOV Buffer": float(appreciation_rates.get("cash_sgov", 0.0)),
            "Bond Buffer": float(appreciation_rates.get("bond_buffer", 0.0)),
            "High Income": float(appreciation_rates.get("high_income", 0.0)),
            "Dividend Growth": float(appreciation_rates.get("dividend_stocks", 0.0)),
            "Growth Engine": float(appreciation_rates.get("growth_stocks", 0.0)),
        }
        category_yields = account_stats.get("category_dividend_yields") or {}
        if category in category_yields:
            dy = float(category_yields[category])
        else:
            dy = self._fallback_dividend_yield(category, account_assets, account_stats)
        pa = default_pa.get(category, 0.0)
        positive_non_sgov = [
            name for name, value in account_assets.items() if name != "SGOV Buffer" and value > 0
        ]
        if len(positive_non_sgov) == 1 and positive_non_sgov[0] == category:
            pa = max(pa, account_expected_return - account_dividend_yield)
        return {"dy": dy, "pa": pa, "tr": dy + pa}

    def _fallback_dividend_yield(
        self, category: str, account_assets: Dict[str, float], account_stats: Dict[str, Any]
    ) -> float:
        overall_yield = float(account_stats.get("dividend_yield", 0.0))
        positive_non_sgov = [
            name for name, value in account_assets.items() if name != "SGOV Buffer" and value > 0
        ]
        if len(positive_non_sgov) == 1 and positive_non_sgov[0] == category:
            return overall_yield
        return 0.0

    def _corp_operating_cost(
        self, corp_salary: float, corp_fixed_cost: float, employee_count: int
    ) -> float:
        ins_rate = (
            self.tax_engine.health_rate
            + self.tax_engine.pension_rate
            + self.tax_engine.employment_rate
        )
        return (
            (corp_salary * employee_count)
            + (corp_salary * ins_rate * employee_count)
            + corp_fixed_cost
        )

    def _run_may_review(
        self,
        corp_assets: Dict[str, float],
        pension_assets: Dict[str, float],
        current_total_need: float,
        inflation_rate: float,
        previous_may_total_assets: float | None,
        shock_flag: bool,
        phase: str,
        pension_withdrawal_target: float,
        national_pension_amount: float,
    ) -> tuple[bool, str, float]:
        candidate_total_need = current_total_need * (1.0 + inflation_rate)
        corp_candidate_need = self._phase_corp_monthly_need(
            candidate_total_need,
            phase,
            pension_withdrawal_target,
            national_pension_amount,
        )
        can_fill_sgov = self._can_fill_target(
            corp_assets,
            target_category="SGOV Buffer",
            target_amount=corp_candidate_need * 30.0,
            donor_sequence=(
                ("Bond Buffer", corp_candidate_need * 12.0),
                ("High Income", 0.0),
                ("Dividend Growth", 0.0),
                ("Growth Engine", 0.0),
            ),
        )
        can_keep_bond_floor = self._can_fill_target(
            corp_assets,
            target_category="Bond Buffer",
            target_amount=corp_candidate_need * 12.0,
            donor_sequence=(
                ("High Income", 0.0),
                ("Dividend Growth", 0.0),
                ("Growth Engine", 0.0),
            ),
        )
        total_assets = sum(corp_assets.values()) + sum(pension_assets.values())
        real_asset_guard = True
        if previous_may_total_assets is not None:
            real_asset_guard = total_assets >= previous_may_total_assets * (1.0 + inflation_rate)
        is_stress = not (can_fill_sgov and can_keep_bond_floor and real_asset_guard)

        if shock_flag or is_stress:
            return is_stress, "frozen", current_total_need
        return is_stress, "approved", candidate_total_need

    def _phase_corp_monthly_need(
        self,
        total_need: float,
        phase: str,
        pension_withdrawal_target: float,
        national_pension_amount: float,
    ) -> float:
        pension_income = pension_withdrawal_target if phase in {"Phase 2", "Phase 3"} else 0.0
        national_income = national_pension_amount if phase == "Phase 3" else 0.0
        return max(0.0, total_need - pension_income - national_income)

    def _can_fill_target(
        self,
        account_assets: Dict[str, float],
        target_category: str,
        target_amount: float,
        donor_sequence: tuple,
    ) -> bool:
        projected_assets = dict(account_assets)
        if target_amount <= projected_assets[target_category]:
            return True
        needed = target_amount - projected_assets[target_category]
        remaining = needed
        for donor, floor in donor_sequence:
            if remaining <= 0:
                break
            available = max(0.0, projected_assets[donor] - floor)
            moved = min(available, remaining)
            projected_assets[donor] -= moved
            projected_assets[target_category] += moved
            remaining -= moved
        return remaining <= 0

    def _boost_amount_for_drawdown(self, equity_value: float, crash20_base: float) -> float:
        if crash20_base <= 0:
            return 0.0
        drawdown = 1.0 - (equity_value / crash20_base)
        if drawdown > 0.30:
            return 3000000.0
        if drawdown >= 0.20:
            return 2000000.0
        if drawdown >= 0.15:
            return 1000000.0
        return 0.0

    def _run_may_rebalance(
        self,
        corp_assets: Dict[str, float],
        pension_assets: Dict[str, float],
        corp_monthly_need: float,
        pension_withdrawal_target: float,
    ) -> float:
        growth_used = 0.0
        growth_used += self._fill_corp_sgov(
            corp_assets, corp_monthly_need * 30.0, corp_monthly_need
        )
        growth_used += self._fill_bucket(
            corp_assets,
            target_category="Bond Buffer",
            target_amount=corp_monthly_need * 18.0,
            floor_amount=corp_monthly_need * 12.0,
            donor_order=("High Income", "Dividend Growth", "Growth Engine"),
        )
        growth_used += self._fill_pension_sgov(
            pension_assets,
            target_amount=pension_withdrawal_target * 24.0,
            monthly_need=pension_withdrawal_target,
        )
        growth_used += self._fill_bucket(
            pension_assets,
            target_category="Bond Buffer",
            target_amount=pension_withdrawal_target * 18.0,
            floor_amount=pension_withdrawal_target * 12.0,
            donor_order=("High Income", "Dividend Growth", "Growth Engine"),
        )
        return growth_used

    def _run_november_rebalance(
        self, corp_assets: Dict[str, float], corp_monthly_need: float
    ) -> float:
        growth_used = self._fill_corp_sgov(corp_assets, corp_monthly_need * 27.0, corp_monthly_need)
        growth_used += self._fill_bucket(
            corp_assets,
            target_category="Bond Buffer",
            target_amount=corp_monthly_need * 18.0,
            floor_amount=corp_monthly_need * 12.0,
            donor_order=("High Income", "Dividend Growth", "Growth Engine"),
        )
        return growth_used

    def _run_august_corporate_review(
        self, corp_assets: Dict[str, float], corp_monthly_need: float
    ) -> None:
        if corp_monthly_need <= 0 or corp_assets["SGOV Buffer"] >= corp_monthly_need:
            return
        self._transfer(
            corp_assets,
            "Bond Buffer",
            "SGOV Buffer",
            corp_monthly_need - corp_assets["SGOV Buffer"],
        )

    def _fill_corp_sgov(
        self, corp_assets: Dict[str, float], target_amount: float, monthly_need: float
    ) -> float:
        if target_amount <= 0:
            return 0.0
        growth_used = 0.0
        bond_upper = monthly_need * 24.0
        bond_floor = monthly_need * 12.0
        growth_used += self._transfer(
            corp_assets,
            "Bond Buffer",
            "SGOV Buffer",
            max(0.0, corp_assets["Bond Buffer"] - bond_upper),
        )
        growth_used += self._transfer_from_sequence(
            corp_assets,
            "SGOV Buffer",
            max(0.0, target_amount - corp_assets["SGOV Buffer"]),
            (
                ("High Income", 0.0),
                ("Dividend Growth", 0.0),
                ("Growth Engine", 0.0),
                ("Bond Buffer", bond_floor),
            ),
        )
        return growth_used

    def _fill_bucket(
        self,
        account_assets: Dict[str, float],
        target_category: str,
        target_amount: float,
        floor_amount: float,
        donor_order: tuple,
    ) -> float:
        if target_amount <= account_assets[target_category]:
            return 0.0
        needed = target_amount - account_assets[target_category]
        donor_sequence = tuple(
            (donor, floor_amount if donor == "Bond Buffer" else 0.0) for donor in donor_order
        )
        return self._transfer_from_sequence(account_assets, target_category, needed, donor_sequence)

    def _fill_pension_sgov(
        self, pension_assets: Dict[str, float], target_amount: float, monthly_need: float
    ) -> float:
        if target_amount <= 0:
            return 0.0
        growth_used = 0.0
        bond_upper = monthly_need * 24.0
        bond_floor = monthly_need * 12.0
        growth_used += self._transfer(
            pension_assets,
            "Bond Buffer",
            "SGOV Buffer",
            max(0.0, pension_assets["Bond Buffer"] - bond_upper),
        )
        growth_used += self._transfer_from_sequence(
            pension_assets,
            "SGOV Buffer",
            max(0.0, target_amount - pension_assets["SGOV Buffer"]),
            (
                ("High Income", 0.0),
                ("Dividend Growth", 0.0),
                ("Growth Engine", 0.0),
                ("Bond Buffer", bond_floor),
            ),
        )
        return growth_used

    def _run_pension_floor_refill(
        self, pension_assets: Dict[str, float], pension_withdrawal_target: float
    ) -> None:
        floor_amount = pension_withdrawal_target * 12.0
        if pension_withdrawal_target <= 0 or pension_assets["SGOV Buffer"] >= floor_amount:
            return
        needed = floor_amount - pension_assets["SGOV Buffer"]
        self._transfer(pension_assets, "Bond Buffer", "SGOV Buffer", needed)

    def _transfer_from_sequence(
        self,
        account_assets: Dict[str, float],
        target_category: str,
        needed: float,
        donor_sequence: tuple,
    ) -> float:
        growth_used = 0.0
        remaining = needed
        for donor, floor in donor_sequence:
            if remaining <= 0:
                break
            available = max(0.0, account_assets[donor] - floor)
            moved = self._transfer(
                account_assets, donor, target_category, min(available, remaining)
            )
            remaining -= moved
            if donor == "Growth Engine":
                growth_used += moved
        return growth_used

    def _transfer(
        self,
        account_assets: Dict[str, float],
        from_category: str,
        to_category: str,
        amount: float,
    ) -> float:
        moved = min(max(0.0, amount), account_assets[from_category])
        account_assets[from_category] -= moved
        account_assets[to_category] += moved
        return moved

    def _months_cover(self, balance: float, monthly_need: float) -> float:
        if monthly_need <= 0:
            return 0.0
        return balance / monthly_need

    def _equity_value(self, account_assets: Dict[str, float]) -> float:
        return (
            account_assets["High Income"]
            + account_assets["Dividend Growth"]
            + account_assets["Growth Engine"]
        )
