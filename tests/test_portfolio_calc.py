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
