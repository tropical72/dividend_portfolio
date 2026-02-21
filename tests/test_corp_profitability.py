import pytest
from src.core.tax_engine import TaxEngine

def test_corporate_profitability_calculation():
    """법인 수익성 계산 테스트: 과표, 세금, 가계수입, 세후성장률"""
    engine = TaxEngine()
    
    # 마스터 시나리오 설정
    initial_assets = 1600000000  # 16억
    return_rate = 0.0485         # 4.85%
    monthly_salary = 2500000     # 250만
    monthly_fixed_cost = 500000  # 50만
    loan_repayment = 6500000     # 650만
    
    result = engine.calculate_corp_profitability(
        assets=initial_assets,
        return_rate=return_rate,
        monthly_salary=monthly_salary,
        fixed_cost=monthly_fixed_cost,
        loan_repayment=loan_repayment
    )
    
    # 1. 법인 과세표준 확인 (약 3,860만 예상)
    assert result["tax_base"] > 35000000
    
    # 2. 실수령 가계 총액 확인 (약 870만 예상)
    assert result["household_income"] > 8000000
    
    # 3. 세후 복리 성장률 (인출 상황이므로 마이너스 가능성 인지)
    assert "after_tax_cagr" in result
    
    # 결과 출력
    tb = result['tax_base']
    ct = result['corp_tax']
    hi = result['household_income']
    cagr = result['after_tax_cagr'] * 100
    print(f"\n[Corp Test] Tax Base: {tb:,.0f} KRW")
    print(f"[Corp Test] Corp Tax: {ct:,.0f} KRW")
    print(f"[Corp Test] Household Monthly Cash: {hi:,.0f} KRW")
    print(f"[Corp Test] After-Tax CAGR: {cagr:.2f}%")
