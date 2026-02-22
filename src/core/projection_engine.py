from typing import Dict, List, Any
from src.core.tax_engine import TaxEngine
from src.core.cascade_engine import CascadeEngine
from src.core.trigger_engine import TriggerEngine
from src.core.rebalance_engine import RebalanceEngine

class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    [REQ-RAMS-3.1, 3.2] 혁의 전략: 법인 직원 유지, 개인연금 소진, 부족분 주주대여금 반환
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
        
        params_10pct_cut = params.copy()
        params_10pct_cut["target_monthly_cashflow"] = float(params["target_monthly_cashflow"]) * 0.9
        cut_result = self._execute_loop(initial_assets, params_10pct_cut, months=1200)
        
        standard_result["summary"]["infinite_with_10pct_cut"] = (
            cut_result["survival_months"] >= 1200
        )
        return standard_result

    def _execute_loop(self, initial_assets: Dict[str, float], params: Dict, months: int) -> Dict:
        """내부 시뮬레이션 루프: 혁의 비과세 인출 및 연금 소진 전략 적용"""
        # --- [준비단계 1. 기초 자산 배분] ---
        curr_assets = {
            "VOO": float(initial_assets["corp"]) * 0.7,
            "SCHD": float(initial_assets["pension"]) * 0.5,
            "BND": float(initial_assets["pension"]) * 0.2,
            "SGOV": float(initial_assets["corp"]) * 0.3 + float(initial_assets["pension"]) * 0.3
        }
        
        # --- [준비단계 2. 파라미터 로드] ---
        birth_year = int(params["birth_year"])
        birth_month = int(params["birth_month"])
        private_pension_age = int(params["private_pension_start_age"])
        national_pension_age = int(params["national_pension_start_age"])
        
        base_cashflow = float(params["target_monthly_cashflow"])
        national_pension_amount = float(params["national_pension_amount"])
        pension_withdrawal_target = float(params["pension_withdrawal_target"])
        
        inflation_rate = float(params["inflation_rate"])
        market_return = float(params["market_return_rate"])
        planned_events = params.get("planned_cashflows", [])
        shareholder_loan_balance = float(params["initial_shareholder_loan"])
        target_buffer_months = int(params["target_buffer_months"])
        
        monthly_inflation = (1 + inflation_rate)**(1/12) - 1
        monthly_return = (1 + market_return)**(1/12) - 1
        
        current_year = int(params["simulation_start_year"])
        current_month = int(params["simulation_start_month"])
        
        monthly_data = []
        survival_months = 0
        sgov_exhaustion_date = "Permanent"
        growth_sell_start_date = "None"
        
        # --- [메인 시뮬레이션 루프] ---
        for m in range(1, months + 1):
            sim_month = (current_month + m - 1) % 12 or 12
            sim_year = current_year + (current_month + m - 2) // 12
            total_months_old = (sim_year - birth_year) * 12 + (sim_month - birth_month)
            age_years = total_months_old // 12
            
            # 1. 자산 수익 적용
            for asset in curr_assets:
                yield_val = monthly_return
                if asset == "VOO": yield_val *= 1.2
                elif asset in ["BND", "SGOV"]: yield_val *= 0.6
                curr_assets[asset] *= (1 + yield_val)
            
            # 2. 미래 자금 이벤트 반영
            occurred_event = None
            for ev in planned_events:
                if int(ev["year"]) == sim_year and int(ev["month"]) == sim_month:
                    amt = float(ev["amount"]) if ev.get("type") == "INFLOW" else -float(ev.get("amount", 0))
                    if ev.get("entity") == "CORP": curr_assets["SGOV"] += amt
                    else: curr_assets["BND"] += amt
                    occurred_event = {"name": ev.get("description", "자금 이벤트"), "amount": amt}
            
            # 3. 비용 및 수입 계산 (법인 직원 유지)
            corp_salary = float(params["corp_salary"])
            corp_fixed_cost = float(params["corp_fixed_cost"])
            employee_count = int(params["employee_count"])
            
            salary_info = self.tax_engine.calculate_income_tax(corp_salary)
            corp_ins_rate = self.tax_engine.health_rate + self.tax_engine.pension_rate + self.tax_engine.employment_rate
            corp_ins_cost = (corp_salary * corp_ins_rate) * employee_count
            total_corp_monthly_outflow = (corp_salary * employee_count) + corp_ins_cost + corp_fixed_cost
            
            # 법인 자산에서 운영비 차감
            curr_assets["SGOV"] = max(0, curr_assets.get("SGOV", 0) - total_corp_monthly_outflow)
            
            # 4. 개인 연금 인출 실행 (개인연금 우선 소진 전략)
            p_withdrawal_needed = 0
            n_draw = 0
            phase = "Phase 1"
            
            if private_pension_age <= age_years < national_pension_age:
                phase = "Phase 2"
                p_withdrawal_needed = pension_withdrawal_target * (1 + monthly_inflation)**m
            elif age_years >= national_pension_age:
                phase = "Phase 3"
                n_draw = national_pension_amount * (1 + monthly_inflation)**m
                p_withdrawal_needed = pension_withdrawal_target * (1 + monthly_inflation)**m
            
            # 연금 자산에서 실제 인출 시도 (SCHD -> BND 순)
            actual_p_draw = 0
            rem_p = p_withdrawal_needed
            for pa in ["SCHD", "BND"]:
                if curr_assets[pa] >= rem_p:
                    curr_assets[pa] -= rem_p
                    actual_p_draw += rem_p
                    rem_p = 0
                    break
                else:
                    actual_p_draw += curr_assets[pa]
                    rem_p -= curr_assets[pa]
                    curr_assets[pa] = 0
            
            # 5. 부족분 생활비 충당 (주주대여금 반환 가변 조정)
            individual_net_income = salary_info["net_salary"] + actual_p_draw + n_draw
            target_living_cost = base_cashflow * (1 + monthly_inflation)**m
            shortfall = max(0, target_living_cost - individual_net_income)
            
            decision_state = "STABLE"
            if shortfall > 0:
                # Cascade 엔진을 통해 자산 매도
                cascade = CascadeEngine(target_buffer=target_living_cost * target_buffer_months)
                decision = cascade.get_liquidation_decision(curr_assets)
                t_asset = decision["target_asset"] or "SGOV"
                decision_state = decision["state"]
                
                # 기록용 날짜 체크
                if t_asset != "SGOV" and sgov_exhaustion_date == "Permanent": sgov_exhaustion_date = f"{sim_year}-{sim_month:02d}"
                if t_asset == "VOO" and growth_sell_start_date == "None": growth_sell_start_date = f"{sim_year}-{sim_month:02d}"
                
                curr_assets[t_asset] = max(0, curr_assets.get(t_asset, 0) - shortfall)
                shareholder_loan_balance = max(0, shareholder_loan_balance - shortfall)
            
            # 6. 데이터 기록
            total_nw = sum(curr_assets.values())
            if total_nw > 0:
                survival_months = m
                if m <= 360:
                    monthly_data.append({
                        "year": int(sim_year), "month": int(sim_month), "age": int(age_years), 
                        "phase": str(phase), "total_net_worth": float(total_nw),
                        "corp_balance": float(curr_assets.get("VOO", 0) + curr_assets.get("SGOV", 0)),
                        "pension_balance": float(curr_assets.get("SCHD", 0) + curr_assets.get("BND", 0)),
                        "target_cashflow": float(target_living_cost), 
                        "corp_cost": float(total_corp_monthly_outflow),
                        "health_premium": float(salary_info["health"]),
                        "loan_balance": float(shareholder_loan_balance),
                        "state": str(decision_state), "event": occurred_event
                    })
            else:
                break
                
        return {
            "summary": {
                "total_survival_years": int(survival_months // 12), 
                "is_permanent": bool(survival_months >= 360),
                "sgov_exhaustion_date": sgov_exhaustion_date,
                "growth_asset_sell_start_date": growth_sell_start_date
            },
            "survival_months": int(survival_months),
            "monthly_data": monthly_data
        }
