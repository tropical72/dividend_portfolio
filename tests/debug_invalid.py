from src.core.projection_engine import ProjectionEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine
from src.core.rebalance_engine import RebalanceEngine

def debug_inflation_impact():
    tax = TaxEngine()
    trigger = TriggerEngine()
    rebalance = RebalanceEngine()
    engine = ProjectionEngine(tax, trigger, rebalance)
    
    initial_assets = {"corp": 1600000000, "pension": 600000000}
    
    # 1. 정상 인플레이션 (2.5%)
    params_normal = {
        "target_monthly_cashflow": 9000000,
        "inflation_rate": 0.025,
        "market_return_rate": 0.0485,
        "corp_salary": 2500000,
        "corp_fixed_cost": 500000,
        "birth_year": 1972
    }
    res_normal = engine.run_30yr_simulation(initial_assets, params_normal)
    
    # 2. 극단적 인플레이션 (50%)
    params_extreme = params_normal.copy()
    params_extreme["inflation_rate"] = 0.50
    res_extreme = engine.run_30yr_simulation(initial_assets, params_extreme)
    
    print(f"Normal Inflation Survival: {res_normal['summary']['total_survival_years']} years")
    print(f"Extreme Inflation Survival: {res_extreme['summary']['total_survival_years']} years")
    
    # 극단적 인플레 상황에서는 반드시 생존 연수가 짧아져야 함
    if res_extreme['summary']['total_survival_years'] < res_normal['summary']['total_survival_years']:
        print("SUCCESS: Inflation impact detected.")
    else:
        print("FAILURE: Inflation has no impact on asset depletion.")

if __name__ == "__main__":
    debug_inflation_impact()
