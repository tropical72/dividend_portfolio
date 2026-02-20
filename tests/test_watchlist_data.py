import json
import os
from src.backend.data_provider import StockDataProvider


def test_stock_info_mandatory_fields():
    """[REQ-WCH-03.1] 9개 필수 데이터 필드 존재 여부 검증"""
    # [Fix] settings.json에서 API 키 로드
    dart_key = None
    settings_path = "data/settings.json"
    if os.path.exists(settings_path):
        try:
            with open(settings_path, "r") as f:
                dart_key = json.load(f).get("dart_api_key")
        except Exception:
            pass
            
    provider = StockDataProvider(dart_api_key=dart_key)
    ticker = "AAPL"

    info = provider.get_stock_info(ticker)

    # 필수 필드 리스트
    mandatory_fields = [
        "symbol",
        "name",
        "price",
        "dividend_yield",
        "one_yr_return",
        "ex_div_date",
        "last_div_amount",
        "last_div_yield",
        "past_avg_monthly_div",
    ]

    for field in mandatory_fields:
        assert field in info, f"Missing mandatory field: {field}"
        assert info[field] is not None, f"Field {field} should not be None"


def test_dividend_cycle_analysis():
    """[REQ-WCH-03.2] 배당 주기 및 지급 월 분석 검증"""
    # settings.json에서 API 키 로드
    dart_key = None
    settings_path = "data/settings.json"
    if os.path.exists(settings_path):
        try:
            with open(settings_path, "r") as f:
                dart_key = json.load(f).get("dart_api_key")
        except Exception:
            pass
            
    provider = StockDataProvider(dart_api_key=dart_key)

    # 1. 월배당 종목 (Realty Income - O)
    info_o = provider.get_stock_info("O")
    assert "dividend_frequency" in info_o
    assert "payment_months" in info_o
    assert info_o["dividend_frequency"] == "Monthly"
    assert len(info_o["payment_months"]) >= 10  # 월배당이므로 최소 10개 이상의 월이 포함되어야 함

    # 2. 분기배당 종목 (Apple - AAPL)
    info_aapl = provider.get_stock_info("AAPL")
    assert info_aapl["dividend_frequency"] == "Quarterly"
    assert len(info_aapl["payment_months"]) == 4  # 분기배당은 4개 월

    # 3. 한국 분기배당 종목 (삼성전자 - 005930.KS)
    info_samsung = provider.get_stock_info("005930.KS")
    assert info_samsung["dividend_frequency"] == "Quarterly"
    assert info_samsung["last_div_amount"] > 0
    assert info_samsung["past_avg_monthly_div"] > 100  # 약 118원 수준 예상
    assert info_samsung["ex_div_date"] != "-"

    # 4. 한국 반기배당 종목 (맥쿼리인프라 - 088980.KS)
    info_macquarie = provider.get_stock_info("088980.KS")
    assert info_macquarie["dividend_frequency"] == "Semi-Annually"
    assert info_macquarie["past_avg_monthly_div"] > 50  # 약 65원 수준 예상
    assert info_macquarie["ex_div_date"].startswith("202")  # 정확한 연도 포함 확인
