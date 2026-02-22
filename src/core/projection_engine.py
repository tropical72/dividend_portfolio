from typing import Dict

from src.core.cascade_engine import CascadeEngine
from src.core.rebalance_engine import RebalanceEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine


class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    [REQ-RAMS-3.1] 연령별 Phase(1~3) 자동 스위칭 및 인출 최적화 로직 탑재.
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
        """내부 시뮬레이션 루프 (Phase 스위칭 로직 포함)"""
        curr_assets = {
            "VOO": initial_assets.get("corp", 0) * 0.7,
            "SCHD": initial_assets.get("pension", 0) * 0.5,
            "BND": initial_assets.get("pension", 0) * 0.2,
            "SGOV": initial_assets.get("corp", 0) * 0.3 + initial_assets.get("pension", 0) * 0.3,
        }

        target_weights = {"VOO": 0.40, "SCHD": 0.25, "BND": 0.15, "SGOV": 0.20}

        birth_year = params.get("birth_year", 1972)
        base_cashflow = params.get("target_monthly_cashflow", 9000000)
        inflation_rate = params.get("inflation_rate", 0.025)
        market_return = params.get("market_return_rate", 0.0485)

        target_buffer = base_cashflow * 30
        cascade = CascadeEngine(target_buffer=target_buffer)

        monthly_data = []
        signals = []
        survival_months = 0

        monthly_inflation = (1 + inflation_rate) ** (1 / 12) - 1
        monthly_return = (1 + market_return) ** (1 / 12) - 1
        current_year = 2026

        for m in range(1, months + 1):
            sim_year = current_year + (m // 12)
            age = sim_year - birth_year
            current_target = base_cashflow * (1 + monthly_inflation) ** m

            for asset in curr_assets:
                yield_val = monthly_return
                if asset == "VOO":
                    yield_val *= 1.2
                elif asset in ["BND", "SGOV"]:
                    yield_val *= 0.6
                curr_assets[asset] *= 1 + yield_val

            p_draw = 0
            n_draw = 0
            if age < 55:
                phase = "Phase 1"
            elif 55 <= age < 65:
                phase = "Phase 2"
                p_draw = 2500000
            else:
                phase = "Phase 3"
                n_draw = 1500000
                p_draw = 2000000

            corp_draw_needed = max(0, current_target - p_draw - n_draw)
            corp_assets_sum = curr_assets["VOO"] + curr_assets["SGOV"] * 0.5

            corp_result = self.tax_engine.calculate_corp_profitability(
                assets=corp_assets_sum,
                return_rate=market_return,
                monthly_salary=params.get("corp_salary", 2500000),
                fixed_cost=params.get("corp_fixed_cost", 500000),
                loan_repayment=max(0, corp_draw_needed - params.get("corp_salary", 2500000)),
            )

            rem_p = p_draw
            for pa in ["SCHD", "BND"]:
                if curr_assets[pa] >= rem_p:
                    curr_assets[pa] -= rem_p
                    rem_p = 0
                    break
                else:
                    rem_p -= curr_assets[pa]
                    curr_assets[pa] = 0

            decision = cascade.get_liquidation_decision(curr_assets)
            t_asset = decision["target_asset"]
            if t_asset:
                if curr_assets.get(t_asset, 0) >= corp_draw_needed:
                    curr_assets[t_asset] -= corp_draw_needed
                else:
                    curr_assets["SGOV"] -= corp_draw_needed

            if m <= 360:
                s1 = self.trigger_engine.check_buffer_trigger(curr_assets["SGOV"], current_target)
                s2 = self.trigger_engine.check_tax_trigger(corp_result["tax_base"])
                signals.extend([{**s, "month": m} for s in s1])
                signals.extend([{**s, "month": m} for s in s2])
                if m % 12 == 0:
                    reb_s = self.rebalance_engine.check_rebalance_condition(
                        curr_assets, target_weights
                    )
                    signals.extend(
                        [{**s, "month": m, "suggestion": "Check rebalance."} for s in reb_s]
                    )

            total_nw = sum(curr_assets.values())
            if m <= 360:
                monthly_data.append(
                    {
                        "month": m,
                        "age": age,
                        "phase": phase,
                        "total_net_worth": total_nw,
                        "corp_balance": curr_assets["VOO"] + curr_assets["SGOV"] * 0.5,
                        "pension_balance": (
                            curr_assets["SCHD"] + curr_assets["BND"] + curr_assets["SGOV"] * 0.5
                        ),
                        "target_cashflow": current_target,
                        "state": decision["state"],
                    }
                )

            if total_nw > 0:
                survival_months = m
            else:
                break

        unique_signals = []
        seen_keys = set()
        for s in signals:
            key = f"{s['type']}_{s.get('asset', '')}"
            if key not in seen_keys:
                unique_signals.append(s)
                seen_keys.add(key)

        return {
            "summary": {
                "total_survival_years": survival_months // 12,
                "is_permanent": survival_months >= 360,
                "signals": unique_signals,
            },
            "survival_months": survival_months,
            "monthly_data": monthly_data,
        }
