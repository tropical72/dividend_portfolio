from typing import Dict
from src.core.tax_engine import TaxEngine
from src.core.cascade_engine import CascadeEngine
from src.core.trigger_engine import TriggerEngine
from src.core.rebalance_engine import RebalanceEngine

class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    [REQ-RAMS-3.1, 3.2] 인플레이션에 따른 인출액 증액을 실시간으로 반영하여 자산 소진을 계산한다.
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
        
        # 10% 비용 절감 시나리오 (영구 생존 확인용 - 100년 실행)
        params_10pct_cut = params.copy()
        params_10pct_cut["target_monthly_cashflow"] *= 0.9
        cut_result = self._execute_loop(initial_assets, params_10pct_cut, months=1200)
        
        standard_result["summary"]["infinite_with_10pct_cut"] = (
            cut_result["survival_months"] >= 1200
        )
        return standard_result

    def _execute_loop(self, initial_assets: Dict[str, float], params: Dict, months: int) -> Dict:
        """내부 시뮬레이션 루프 (인플레이션 효과를 자산 차감에 직접 반영)"""
        # 초기 자산 복제
        curr_assets = {
            "VOO": initial_assets.get("corp", 0) * 0.7,
            "SCHD": initial_assets.get("pension", 0) * 0.5,
            "BND": initial_assets.get("pension", 0) * 0.2,
            "SGOV": initial_assets.get("corp", 0) * 0.3 + initial_assets.get("pension", 0) * 0.3
        }
        
        target_weights = {"VOO": 0.40, "SCHD": 0.25, "BND": 0.15, "SGOV": 0.20}
        birth_year = params.get("birth_year", 1972)
        base_cashflow = params.get("target_monthly_cashflow", 9000000)
        inflation_rate = params.get("inflation_rate", 0.025)
        market_return = params.get("market_return_rate", 0.0485)
        
        target_buffer_months = 30
        monthly_inflation = (1 + inflation_rate)**(1/12) - 1
        monthly_return = (1 + market_return)**(1/12) - 1
        current_year = 2026
        
        monthly_data = []
        signals = []
        survival_months = 0
        
        for m in range(1, months + 1):
            # 1. 시점 및 연령
            sim_year = current_year + (m // 12)
            age = sim_year - birth_year
            
            # 2. 인플레이션 반영된 이번 달 목표 생활비 (핵심!)
            current_target = base_cashflow * (1 + monthly_inflation)**m
            
            # 3. 자산 수익 발생 (인출 전 가치 증액)
            for asset in curr_assets:
                # 자산별 차등 수익률 시뮬레이션 (단순화)
                yield_val = monthly_return
                if asset == "VOO": yield_val *= 1.2
                elif asset in ["BND", "SGOV"]: yield_val *= 0.6
                curr_assets[asset] *= (1 + yield_val)
            
            # 4. Phase별 인출액 결정 (인플레이션에 따라 연금 수령액도 실질 가치 유지 가정)
            p_draw = 0
            n_draw = 0
            if age < 55:
                phase = "Phase 1"
            elif 55 <= age < 65:
                phase = "Phase 2"
                p_draw = 2500000 * (1 + monthly_inflation)**m
            else:
                phase = "Phase 3"
                n_draw = 1500000 * (1 + monthly_inflation)**m
                p_draw = 2000000 * (1 + monthly_inflation)**m
            
            # 5. 연금 자산 선차감
            remaining_draw = p_draw
            for pa in ["SCHD", "BND"]:
                if curr_assets[pa] >= remaining_draw:
                    curr_assets[pa] -= remaining_draw
                    remaining_draw = 0
                    break
                else:
                    remaining_draw -= curr_assets[pa]
                    curr_assets[pa] = 0
            
            # 6. 법인 부족분 산출 및 차감
            corp_draw_needed = max(0, current_target - p_draw - n_draw)
            
            # 법인 수익성 및 세무 정산 (자산 규모 업데이트용)
            corp_assets_sum = curr_assets["VOO"] + curr_assets["SGOV"] * 0.5
            corp_result = self.tax_engine.calculate_corp_profitability(
                assets=corp_assets_sum,
                return_rate=market_return,
                monthly_salary=params.get("corp_salary", 2500000),
                fixed_cost=params.get("corp_fixed_cost", 500000),
                loan_repayment=max(0, corp_draw_needed - 2500000)
            )
            
            # Cascade Engine을 통한 법인 자산 실제 차감
            cascade = CascadeEngine(target_buffer=current_target * target_buffer_months)
            decision = cascade.get_liquidation_decision(curr_assets)
            t_asset = decision["target_asset"]
            
            if t_asset:
                if curr_assets.get(t_asset, 0) >= corp_draw_needed:
                    curr_assets[t_asset] -= corp_draw_needed
                else:
                    # 해당 자산 부족 시 SGOV에서 강제 차감
                    curr_assets["SGOV"] -= corp_draw_needed
            
            # 7. 트리거 체크
            if m <= 360:
                s1 = self.trigger_engine.check_buffer_trigger(curr_assets["SGOV"], current_target)
                s2 = self.trigger_engine.check_tax_trigger(corp_result["tax_base"])
                signals.extend([{**s, "month": m} for s in s1])
                signals.extend([{**s, "month": m} for s in s2])
                if m % 12 == 0:
                    reb_s = self.rebalance_engine.check_rebalance_condition(curr_assets, target_weights)
                    signals.extend([{**s, "month": m, "suggestion": "Rebalance."} for s in reb_s])

            # 8. 데이터 기록 및 생존 판정
            total_nw = sum(curr_assets.values())
            if total_nw > 0:
                survival_months = m
                if m <= 360:
                    monthly_data.append({
                        "month": m, "age": age, "phase": phase, "total_net_worth": total_nw,
                        "corp_balance": curr_assets["VOO"] + curr_assets["SGOV"] * 0.5,
                        "pension_balance": curr_assets["SCHD"] + curr_assets["BND"] + curr_assets["SGOV"] * 0.5,
                        "target_cashflow": current_target, "state": decision["state"]
                    })
            else:
                break
                
        # 시그널 요약
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
                "signals": unique_signals
            },
            "survival_months": survival_months,
            "monthly_data": monthly_data
        }
