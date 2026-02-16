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
