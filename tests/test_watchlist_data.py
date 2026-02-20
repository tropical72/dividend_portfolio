from src.backend.data_provider import StockDataProvider


def test_stock_info_mandatory_fields():
    """[REQ-WCH-03.1] 9개 필수 데이터 필드 존재 여부 검증"""
    provider = StockDataProvider()
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
    provider = StockDataProvider()

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
    # 한국 종목은 yfinance 이력이 부실할 수 있으나, 최근 1년 이력이 있다면 분석되어야 함
    if info_samsung["dividend_frequency"] != "None":
        assert info_samsung["dividend_frequency"] in ["Quarterly", "Irregular"]
        assert len(info_samsung["payment_months"]) >= 1
