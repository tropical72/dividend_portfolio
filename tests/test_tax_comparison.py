import pytest
from src.core.tax_engine import TaxEngine

def test_entity_comparison_proof():
    """법인 vs 개인 운용 실익 비교 검증 (REQ-RAMS-2.3)"""
    engine = TaxEngine()
    
    assets = 1600000000
    yield_rate = 0.0485 # 4.85%
    property_val = 1000000000 # 10억 부동산 가정
    
    # 1. 개인 운용 결과
    personal = engine.calculate_personal_profitability(
        assets=assets,
        return_rate=yield_rate,
        property_val=property_val
    )
    
    # 2. 법인 운용 결과
    corp = engine.calculate_corp_profitability(
        assets=assets,
        return_rate=yield_rate,
        monthly_salary=2500000,
        fixed_cost=500000,
        loan_repayment=6500000
    )
    
    p_income = personal['household_income']
    p_tax_health = personal['income_tax'] + personal['annual_health_premium']
    p_yield = personal['after_tax_yield']
    
    c_income = corp['household_income']
    c_tax = corp['corp_tax']
    c_profit = corp['net_profit']
    
    print("\n" + "="*50)
    print(f"ENTITY COMPARISON REPORT (Assets: {assets:,.0f} KRW)")
    print("="*50)
    print(f"[PERSONAL] Monthly Available: {p_income:,.0f} KRW")
    print(f"[PERSONAL] Annual Tax + Health: {p_tax_health:,.0f} KRW")
    print(f"[PERSONAL] Net Yield: {p_yield:.2f}%")
    print("-" * 50)
    print(f"[CORPORATE] Monthly Available: {c_income:,.0f} KRW")
    print(f"[CORPORATE] Annual Corp Tax: {c_tax:,.0f} KRW")
    print(f"[CORPORATE] Net Profit (In-Corp): {c_profit:,.0f} KRW")
    print("="*50)
    
    diff = c_income - p_income
    print(f"Monthly Household Cash Diff (Corp - Personal): {diff:,.0f} KRW")
    
    # 가용 현금 흐름 면에서 법인이 개인보다 유리해야 함 (대여금 상환 효과)
    assert c_income > p_income
