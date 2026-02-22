from typing import Dict
from src.core.tax_engine import TaxEngine
from src.core.cascade_engine import CascadeEngine
from src.core.trigger_engine import TriggerEngine

class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    Cascade Engine 및 Trigger Engine과 연동하여 자산 소진 및 위험 신호를 정밀 계산한다.
    """

    def __init__(self, tax_engine: TaxEngine, trigger_engine: TriggerEngine):
        self.tax_engine = tax_engine
        self.trigger_engine = trigger_engine

    def run_30yr_simulation(self, initial_assets: Dict[str, float], params: Dict) -> Dict:
        """360개월(30년) 시뮬레이션 실행 및 요약 결과 반환"""
        standard_result = self._execute_loop(initial_assets, params, months=360)
        
        # 10% 비용 절감 시나리오 (영구 생존 여부 확인용)
        params_10pct_cut = params.copy()
        params_10pct_cut["target_monthly_cashflow"] *= 0.9
        cut_result = self._execute_loop(initial_assets, params_10pct_cut, months=1200)
        
        standard_result["summary"]["infinite_with_10pct_cut"] = (cut_result["survival_months"] >= 1200)
        return standard_result

    def _execute_loop(self, initial_assets: Dict[str, float], params: Dict, months: int) -> Dict:
        """내부 시뮬레이션 루프 실행 엔진"""
        curr_assets = {
            "VOO": initial_assets.get("corp", 0) * 0.7,
            "SCHD": initial_assets.get("pension", 0) * 0.5,
            "BND": initial_assets.get("pension", 0) * 0.2,
            "SGOV": initial_assets.get("corp", 0) * 0.3 + initial_assets.get("pension", 0) * 0.3
        }

        target_cashflow = params.get("target_monthly_cashflow", 9000000)
        target_buffer = target_cashflow * 30
        cascade = CascadeEngine(target_buffer=target_buffer)

        inflation_rate = params.get("inflation_rate", 0.025)
        market_return = params.get("market_return_rate", 0.0485)
        
        monthly_data = []
        signals = []
        sgov_exhaustion_month = None
        growth_sell_start_month = None
        survival_months = 0
        
        monthly_inflation = (1 + inflation_rate)**(1/12) - 1
        monthly_return = (1 + market_return)**(1/12) - 1
        
        for m in range(1, months + 1):
            current_target = target_cashflow * (1 + monthly_inflation)**m
            
            # 자산 수익 발생 (스트레스 시나리오 MDD 반영)
            market_drop = params.get("market_drop", 0) if m == 1 else 0 # 1개월차에 충격 주입 가정
            for asset in curr_assets:
                curr_assets[asset] *= (1 + monthly_return + market_drop)
            
            corp_assets_sum = curr_assets["VOO"] + curr_assets["SGOV"] * 0.5
            corp_result = self.tax_engine.calculate_corp_profitability(
                assets=corp_assets_sum,
                return_rate=market_return,
                monthly_salary=params.get("corp_salary", 2500000),
                fixed_cost=params.get("corp_fixed_cost", 500000),
                loan_repayment=params.get("loan_repayment", 6500000)
            )
            
            # --- [Trigger Check] ---
            if m <= 360:
                # 1. 버퍼 체크
                sgov_signals = self.trigger_engine.check_buffer_trigger(curr_assets["SGOV"], current_target)
                for s in sgov_signals: s.update({"month": m})
                signals.extend(sgov_signals)
                
                # 2. 법인세 체크
                tax_signals = self.trigger_engine.check_tax_trigger(corp_result["tax_base"])
                for s in tax_signals: s.update({"month": m})
                signals.extend(tax_signals)

            decision = cascade.get_liquidation_decision(curr_assets)
            if decision["state"] == "SELL_TIER_1_VOO" and growth_sell_start_month is None:
                growth_sell_start_month = m
            
            shortfall = current_target
            target_asset = decision["target_asset"]
            if target_asset:
                if curr_assets[target_asset] >= shortfall:
                    curr_assets[target_asset] -= shortfall
                else:
                    shortfall -= curr_assets[target_asset]
                    curr_assets[target_asset] = 0
            
            if curr_assets["SGOV"] <= 0 and sgov_exhaustion_month is None:
                sgov_exhaustion_month = m
            
            total_net_worth = sum(curr_assets.values())
            if m <= 360:
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
                
        def to_date_str(month_count):
            if month_count is None or month_count > 360: return "영구적"
            years = month_count // 12
            return f"은퇴 후 {years}년차"

        # 중복 시그널 제거 (유형별로 처음 발생한 것만 유지)
        unique_signals = []
        seen_types = set()
        for s in signals:
            if s["type"] not in seen_types:
                unique_signals.append(s)
                seen_types.add(s["type"])

        return {
            "summary": {
                "total_survival_years": survival_months // 12,
                "sgov_exhaustion_date": to_date_str(sgov_exhaustion_month),
                "growth_asset_sell_start_date": to_date_str(growth_sell_start_month),
                "is_permanent": survival_months >= 360,
                "signals": unique_signals
            },
            "survival_months": survival_months,
            "monthly_data": monthly_data
        }
