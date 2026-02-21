import pytest
from src.core.tax_engine import TaxEngine

def test_local_health_insurance_calculation():
    """
    지역건보료 계산 테스트 (2026년 가상 기준)
    부동산 공시가 10억, 연 소득 2,000만 원일 때의 점수 합산 및 금액 검증
    """
    engine = TaxEngine()
    
    # 1. 재산 점수 산출 검증
    property_points = engine.get_property_points(property_val=1000000000)
    assert property_points > 0
    
    # 2. 소득 점수 산출 검증
    income_points = engine.get_income_points(annual_income=20000000)
    assert income_points > 0
    
    # 3. 최종 보험료 산출 (재산+소득 점수 * 단가)
    monthly_premium = engine.calculate_local_health_insurance(
        property_val=1000000000, 
        annual_income=20000000
    )
    assert monthly_premium > 0
    # 로그 출력을 위해 직접 문자열 포맷팅 사용
    msg = f"Monthly Premium: {monthly_premium}"
    print(f"\n[Test] {msg} KRW")

def test_corp_tax_calculation():
    """법인세 계산 테스트 (2억 이하 9%, 초과 19%)"""
    engine = TaxEngine()
    
    # 1. 2억 이하 구간
    tax_1 = engine.calculate_corp_tax(profit=100000000) # 1억
    assert tax_1 == 9000000 # 9%
    
    # 2. 2억 초과 구간
    tax_2 = engine.calculate_corp_tax(profit=300000000) # 3억
    # 2억 * 9% + 1억 * 19% = 1800만 + 1900만 = 3700만
    assert tax_2 == 37000000
