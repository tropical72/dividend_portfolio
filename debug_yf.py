import datetime

import yfinance as yf


def check_data():
    ticker = yf.Ticker("AAPL")
    info = ticker.info
    
    print("--- Debug Info ---")
    print("Symbol: AAPL")
    print(f"Dividend Yield (Raw): {info.get('dividendYield')}")
    print(f"Ex-Dividend Date (Raw): {info.get('exDividendDate')}")
    
    # 날짜 변환 테스트
    ex_div_timestamp = info.get('exDividendDate')
    if ex_div_timestamp:
        dt = datetime.datetime.fromtimestamp(ex_div_timestamp).strftime('%Y-%m-%d')
        print(f"Ex-Dividend Date (Formatted): {dt}")
    else:
        print("Ex-Dividend Date: None")

if __name__ == "__main__":
    check_data()
