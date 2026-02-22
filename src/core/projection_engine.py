from typing import Dict

from src.core.cascade_engine import CascadeEngine
from src.core.rebalance_engine import RebalanceEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine


class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    Cascade, Trigger, Rebalance Engine과 연동하여 통합 시뮬레이션을 수행한다.
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
        """내부 시뮬레이션 루프"""
        curr_assets = {
            "VOO": initial_assets.get("corp", 0) * 0.7,
            "SCHD": initial_assets.get("pension", 0) * 0.5,
            "BND": initial_assets.get("pension", 0) * 0.2,
            "SGOV": initial_assets.get("corp", 0) * 0.3 + initial_assets.get("pension", 0) * 0.3,
        }

        target_weights = {"VOO": 0.40, "SCHD": 0.25, "BND": 0.15, "SGOV": 0.20}

        target_cashflow = params.get("target_monthly_cashflow", 9000000)
        target_buffer = target_cashflow * 30
        cascade = CascadeEngine(target_buffer=target_buffer)

        inflation_rate = params.get("inflation_rate", 0.025)
        market_return = params.get("market_return_rate", 0.0485)

        monthly_data = []
        signals = []
        survival_months = 0

        monthly_inflation = (1 + inflation_rate) ** (1 / 12) - 1
        monthly_return = (1 + market_return) ** (1 / 12) - 1

        for m in range(1, months + 1):
            current_target = target_cashflow * (1 + monthly_inflation) ** m

            # 자산 수익 발생 (자산별 차등 수익률)
            for asset in curr_assets:
                asset_yield = monthly_return
                if asset == "VOO":
                    asset_yield *= 1.2
                if asset in ["BND", "SGOV"]:
                    asset_yield *= 0.6
                curr_assets[asset] *= 1 + asset_yield

            corp_assets_sum = curr_assets["VOO"] + curr_assets["SGOV"] * 0.5
            corp_result = self.tax_engine.calculate_corp_profitability(
                assets=corp_assets_sum,
                return_rate=market_return,
                monthly_salary=params.get("corp_salary", 2500000),
                fixed_cost=params.get("corp_fixed_cost", 500000),
                loan_repayment=params.get("loan_repayment", 6500000),
            )

            # --- [Trigger & Rebalance Check] ---
            if m <= 360:
                # 1. 버퍼 및 세금 트리거
                buf_sigs = self.trigger_engine.check_buffer_trigger(
                    curr_assets["SGOV"], current_target
                )
                tax_sigs = self.trigger_engine.check_tax_trigger(corp_result["tax_base"])

                signals.extend([{**s, "month": m} for s in buf_sigs])
                signals.extend([{**s, "month": m} for s in tax_sigs])

                # 2. 리밸런싱 체크 (연 1회)
                if m % 12 == 0:
                    reb_signals = self.rebalance_engine.check_rebalance_condition(
                        curr_assets, target_weights
                    )
                    for s in reb_signals:
                        s.update(
                            {"month": m, "suggestion": "비중 조절 및 세무 최적화를 검토하세요."}
                        )
                        signals.append(s)

            # 인출 실행
            decision = cascade.get_liquidation_decision(curr_assets)
            shortfall = current_target
            target_asset = decision["target_asset"]
            if target_asset:
                if curr_assets[target_asset] >= shortfall:
                    curr_assets[target_asset] -= shortfall
                else:
                    shortfall -= curr_assets[target_asset]
                    curr_assets[target_asset] = 0

            total_net_worth = sum(curr_assets.values())
            if m <= 360:
                monthly_data.append(
                    {
                        "month": m,
                        "total_net_worth": total_net_worth,
                        "corp_balance": curr_assets["VOO"] + curr_assets["SGOV"] * 0.5,
                        "pension_balance": (
                            curr_assets["SCHD"] + curr_assets["BND"] + curr_assets["SGOV"] * 0.5
                        ),
                        "target_cashflow": current_target,
                        "state": decision["state"],
                    }
                )

            if total_net_worth > 0:
                survival_months = m
            else:
                break

        unique_signals = []
        seen_types = set()
        for s in signals:
            sig_key = f"{s['type']}_{s.get('asset', '')}"
            if sig_key not in seen_types:
                unique_signals.append(s)
                seen_types.add(sig_key)

        return {
            "summary": {
                "total_survival_years": survival_months // 12,
                "is_permanent": survival_months >= 360,
                "signals": unique_signals,
            },
            "survival_months": survival_months,
            "monthly_data": monthly_data,
        }
