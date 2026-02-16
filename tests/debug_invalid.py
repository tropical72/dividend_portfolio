from src.backend.api import DividendBackend


def test_invalid_tickers():
    backend = DividendBackend()
    
    print("--- Test 1: Invalid US Ticker ---")
    result_us = backend.add_to_watchlist("INVALID_TICKER_123", "US")
    print(f"Result: {result_us}")
    
    print("\n--- Test 2: Invalid KR Ticker ---")
    # 999999는 존재하지 않는 한국 종목 코드
    result_kr = backend.add_to_watchlist("999999", "KR") 
    print(f"Result: {result_kr}")

if __name__ == "__main__":
    test_invalid_tickers()
