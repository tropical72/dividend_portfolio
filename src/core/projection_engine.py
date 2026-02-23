from typing import Dict, List, Any
from src.core.tax_engine import TaxEngine
from src.core.cascade_engine import CascadeEngine
from src.core.trigger_engine import TriggerEngine
from src.core.rebalance_engine import RebalanceEngine

class ProjectionEngine:
    """
    [Domain Layer] 생애 주기 인출 및 30년 장기 프로젝션 엔진
    [REQ-RAMS-3.1, 3.2] 나이(개월령), 설정된 인출액, 미래 자금 이벤트를 실시간 반영한다.
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
        params_10pct_cut["target_monthly_cashflow"] = float(params.get("target_monthly_cashflow", 9000000)) * 0.9
        cut_result = self._execute_loop(initial_assets, params_10pct_cut, months=1200)
        
        standard_result["summary"]["infinite_with_10pct_cut"] = (
            cut_result["survival_months"] >= 1200
        )
        return standard_result

    def _execute_loop(self, initial_assets: Dict[str, float], params: Dict, months: int) -> Dict:
        """내부 시뮬레이션 루프: 혁의 비과세 인출 및 연금 소진 전략 적용"""
        # --- [준비단계 1. 기초 자산 배분] ---
        curr_assets = {
            "VOO": float(initial_assets.get("corp", 0)) * 0.7,
            "SCHD": float(initial_assets.get("pension", 0)) * 0.5,
            "BND": float(initial_assets.get("pension", 0)) * 0.2,
            "SGOV": float(initial_assets.get("corp", 0)) * 0.3 + float(initial_assets.get("pension", 0)) * 0.3
        }
        
        # --- [준비단계 2. 파라미터 로드 (Safe get 적용)] ---
        birth_year = int(params.get("birth_year", 1972))
        birth_month = int(params.get("birth_month", 3))
        private_pension_age = int(params.get("private_pension_start_age", 55))
        national_pension_age = int(params.get("national_pension_start_age", 65))
        
        base_cashflow = float(params.get("target_monthly_cashflow", 9000000))
        national_pension_amount = float(params.get("national_pension_amount", 1500000))
        pension_withdrawal_target = float(params.get("pension_withdrawal_target", 2500000))
        
        inflation_rate = float(params.get("inflation_rate", 0.025))
        market_return = float(params.get("market_return_rate", 0.0485))
        planned_events = params.get("planned_cashflows", [])
        shareholder_loan_balance = float(params.get("initial_shareholder_loan", 1550000000))
        target_buffer_months = int(params.get("target_buffer_months", 30))
        
        # 월간 복리 수익률 및 인플레이션 계산
        monthly_inflation = (1 + inflation_rate)**(1/12) - 1
        monthly_return = (1 + market_return)**(1/12) - 1
        
        current_year = int(params.get("simulation_start_year", 2026))
        current_month = int(params.get("simulation_start_month", 3))
        
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
            
            # 2. 미래 자금 이벤트 반영 [REQ-RAMS-1.3]
            occurred_event = None
            for ev in planned_events:
                if int(ev["year"]) == sim_year and int(ev["month"]) == sim_month:
                    amt = float(ev["amount"]) if ev.get("type") == "INFLOW" else -float(ev.get("amount", 0))
                    # 통화 환산 (간이 로직: KRW 기준 데이터면 그대로, USD면 환율 적용 가능하나 일단 금액 그대로 가감)
                    if ev.get("entity") == "CORP": curr_assets["SGOV"] += amt
                    else: curr_assets["BND"] += amt
                    occurred_event = {"name": ev.get("description") or ev.get("name", "자금 이벤트"), "amount": amt}
            
            # 3. 비용 및 수입 계산 (법인 직원 유지)
            corp_salary = float(params.get("corp_salary", 2500000))
            corp_fixed_cost = float(params.get("corp_fixed_cost", 500000))
            employee_count = int(params.get("employee_count", 1))
            
            salary_info = self.tax_engine.calculate_income_tax(corp_salary)
            # 법인 부담 보험료 (국민연금, 건강보험, 고용보험)
            corp_ins_rate = self.tax_engine.health_rate + self.tax_engine.pension_rate + self.tax_engine.employment_rate
            corp_ins_cost = (corp_salary * corp_ins_rate) * employee_count
            total_corp_monthly_outflow = (corp_salary * employee_count) + corp_ins_cost + corp_fixed_cost
            
            # 법인 현금성 자산(SGOV)에서 운영비 차감
            curr_assets["SGOV"] = max(0, curr_assets.get("SGOV", 0) - total_corp_monthly_outflow)
            
            # 4. 개인 연금 인출 실행 (Phase 기반)
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
            
            # 연금 자산 인출 (SCHD -> BND 순)
            actual_p_draw = 0
            rem_p = p_withdrawal_needed
            for pa in ["SCHD", "BND"]:
                if curr_assets.get(pa, 0) >= rem_p:
                    curr_assets[pa] -= rem_p
                    actual_p_draw += rem_p
                    rem_p = 0
                    break
                else:
                    actual_p_draw += curr_assets.get(pa, 0)
                    rem_p -= curr_assets.get(pa, 0)
                    curr_assets[pa] = 0
            
            # 5. 부족분 법인 인출 (Cascade 전략)
            current_target = base_cashflow * (1 + monthly_inflation)**m
            needed_from_corp = max(0, current_target - actual_p_draw - n_draw)
            
            # 6. 세무 처리 및 주주대여금 반환 반영
            # (주주대여금 잔액이 있으면 비과세 인출로 우선 충당)
            if shareholder_loan_balance > 0 and needed_from_corp > 0:
                repayment = min(shareholder_loan_balance, needed_from_corp)
                shareholder_loan_balance -= repayment
                # 실제 인출은 SGOV에서 발생
                curr_assets["SGOV"] = max(0, curr_assets.get("SGOV", 0) - repayment)
                needed_from_corp -= repayment

            # 여전히 부족하면 배당/급여 등 (현재는 단순 자산 차감으로 구현)
            if needed_from_corp > 0:
                # Cascade Engine 호출 (타겟 자산 결정)
                cascade = CascadeEngine(target_buffer=current_target * target_buffer_months)
                decision = cascade.get_liquidation_decision(curr_assets)
                t_asset = decision["target_asset"]
                if t_asset and curr_assets.get(t_asset, 0) >= needed_from_corp:
                    curr_assets[t_asset] -= needed_from_corp
                else:
                    curr_assets["SGOV"] = max(0, curr_assets.get("SGOV", 0) - needed_from_corp)
                
                if t_asset != "SGOV" and growth_sell_start_date == "None":
                    growth_sell_start_date = f"{sim_year}-{sim_month:02d}"

            # 7. 기록 및 판정
            total_nw = sum(curr_assets.values())
            if total_nw <= 0:
                break
                
            if curr_assets.get("SGOV", 0) <= 0 and sgov_exhaustion_date == "Permanent":
                sgov_exhaustion_date = f"{sim_year}-{sim_month:02d}"
                
            survival_months = m
            if m <= 360:
                monthly_data.append({
                    "month": sim_month,
                    "year": sim_year,
                    "age": age_years,
                    "phase": phase,
                    "total_net_worth": total_nw,
                    "corp_balance": curr_assets["VOO"] + curr_assets["SGOV"],
                    "pension_balance": curr_assets["SCHD"] + curr_assets["BND"],
                    "loan_balance": shareholder_loan_balance,
                    "corp_cost": total_corp_monthly_outflow,
                    "health_premium": salary_info["health"],
                    "event": occurred_event
                })

        return {
            "summary": {
                "total_survival_years": survival_months // 12,
                "is_permanent": survival_months >= 360,
                "sgov_exhaustion_date": sgov_exhaustion_date,
                "growth_asset_sell_start_date": growth_sell_start_date,
                "signals": self.trigger_engine.analyze_simulation_data(monthly_data) if hasattr(self.trigger_engine, 'analyze_simulation_data') else []
            },
            "survival_months": survival_months,
            "monthly_data": monthly_data
        }
