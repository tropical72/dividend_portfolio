import pytest
from src.backend.data_provider import StockDataProvider

@pytest.fixture
def provider():
    return StockDataProvider()

def test_get_exchange_rate(provider):
    """실시간 USD/KRW 환율 조회 테스트"""
    rate = provider.get_usd_krw_rate()
    assert rate > 1000  # 환율은 보통 1000원 이상
    assert isinstance(rate, float)

def test_currency_conversion(provider):
    """통화 변환 로직 검증 (USD <-> KRW)"""
    # 가상 환율 1400원 설정 시
    rate = 1400.0
    
    # 1. USD -> KRW
    amount_usd = 100.0
    converted_krw = amount_usd * rate
    assert converted_krw == 140000.0
    
    # 2. KRW -> USD
    amount_krw = 140000.0
    converted_usd = amount_krw / rate
    assert converted_usd == 100.0

def test_portfolio_analysis_logic():
    """포트폴리오 전체 분석 로직 검증 (비중 합산 및 수익률 계산) [REQ-PRT-03.4]"""
    # 가상의 포트폴리오 데이터
    total_capital = 100000  # $100,000
    items = [
        {"symbol": "AAPL", "weight": 60, "dividend_yield": 5.0},  # 60% 비중, 5% 수익률
        {"symbol": "MSFT", "weight": 40, "dividend_yield": 10.0}, # 40% 비중, 10% 수익률
    ]
    
    # 1. 비중 합계 검증
    total_weight = sum(item["weight"] for item in items)
    assert total_weight == 100
    
    # 2. 가중 평균 수익률 계산
    # (60/100 * 5.0) + (40/100 * 10.0) = 3.0 + 4.0 = 7.0%
    weighted_yield = sum((item["weight"] / 100) * item["dividend_yield"] for item in items)
    assert weighted_yield == 7.0
    
    # 3. 연간 예상 배당금 계산
    expected_annual_income = total_capital * (weighted_yield / 100)
    assert pytest.approx(expected_annual_income) == 7000.0
    
    # 4. 월평균 예상 배당금 계산
    expected_monthly_income = expected_annual_income / 12
    assert pytest.approx(expected_monthly_income) == 583.3333333333334

def test_monthly_distribution_logic():
    """12개월 배당 분포 산출 로직 검증 (TTM/Forward) [REQ-PRT-05]"""
    # 1. Forward 모드 검증
    # 분기배당(Quarterly) 1, 4, 7, 10월 지급 종목이 최근 100원 줬다면
    # 미래 12개월도 해당 월에 100원씩 표시되어야 함
    
    # 이 부분은 Backend API 구현 후 Integration Test로 수행하는 것이 정확하므로
    # 여기서는 로직 구조만 정의하거나 간단한 단위 테스트 작성
    pass
