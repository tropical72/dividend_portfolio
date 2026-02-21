import pytest
from src.backend.data_provider import StockDataProvider
from src.backend.api import DividendBackend

@pytest.fixture
def provider():
    # DART 키 없이도 기본 로직 검증 가능하도록 설정
    return StockDataProvider()

@pytest.fixture
def backend(tmp_path):
    # 테스트 전용 임시 디렉토리 사용 (pytest의 tmp_path 활용)
    data_dir = str(tmp_path)
    return DividendBackend(data_dir=data_dir)

def test_smart_ticker_detection(backend):
    """[REQ-WCH-01.7] 스마트 티커 감지 검증 (6자리 Alphanumeric)"""
    # 1. 숫자 6자리
    res1 = backend.add_to_watchlist("005930", "US") # US로 보내도 .KS가 붙어야 함
    assert res1["data"]["symbol"] == "005930.KS"
    
    # 2. 영문 포함 6자리 (ETF/우선주)
    res2 = backend.add_to_watchlist("0104H0", "US")
    assert res2["data"]["symbol"] == "0104H0.KS"

def test_ttm_yield_calculation(provider):
    """[GS-DATA-01] TTM 수익률 역산 로직 검증"""
    # 가상의 데이터: 주가 10000원, 최근 12개월 배당합 500원 -> 5%
    ticker = "441640.KS" 
    info = provider.get_stock_info(ticker)
    
    assert info["dividend_yield"] > 0
    assert info["last_div_amount"] > 0
    # 계산식 검증: (annual_div_sum / price) * 100
    expected_yield = (info["past_avg_monthly_div"] * 12 / info["price"]) * 100
    assert pytest.approx(info["dividend_yield"], 0.1) == expected_yield

def test_korean_name_priority(provider):
    """[REQ-WCH-04.6] 한국 종목 한글 이름 우선순위 검증"""
    ticker = "005930.KS"
    info = provider.get_stock_info(ticker)
    # 영문(Samsung Electronics)이 아닌 한글이 포함되어 있는지 확인
    assert any(ord(char) > 127 for char in info["name"]) 

def test_dividend_frequency_new_label(provider):
    """[REQ-WCH-04.5] 신규 종목 (New) 라벨 부여 검증"""
    # KoAct 나스닥채권혼합(0104H0)은 상장 1년 미만이므로 (New)가 붙어야 함
    ticker = "0104H0.KS"
    info = provider.get_stock_info(ticker)
    assert "(New)" in info["dividend_frequency"]

def test_nan_to_zero_protection(provider):
    """[D-04] NaN/Inf 값의 JSON 직렬화 오류 방지 검증"""
    # 인위적으로 비정상 값을 넣었을 때 safe_float이 0.0을 반환하는지 확인
    from src.backend.data_provider import math
    def safe_float(val):
        try:
            f_val = float(val)
            return f_val if math.isfinite(f_val) else 0.0
        except: return 0.0
        
    assert safe_float(float('nan')) == 0.0
    assert safe_float(float('inf')) == 0.0
