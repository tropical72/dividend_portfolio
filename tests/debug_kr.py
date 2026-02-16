import yfinance as yf


def check_kr_stock():
    ticker_symbol = "441640.KS"
    ticker = yf.Ticker(ticker_symbol)
    
    print(f"--- {ticker_symbol} Debug ---")
    print(f"Name: {ticker.info.get('longName')}")
    print(f"Dividend Yield (Info): {ticker.info.get('dividendYield')}")
    
    print("\n--- Dividend History (Last 5) ---")
    history = ticker.dividends
    print(history.tail(5))

    if not history.empty:
        last_year_dividends = history.sum() # 단순 합산 (전체 기간 주의)
        # 실제로는 최근 1년치만 합산해야 함
        print(f"\nTotal Dividends (All time/Sample): {last_year_dividends}")

if __name__ == "__main__":
    check_kr_stock()

