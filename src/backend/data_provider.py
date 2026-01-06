import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
import yfinance as yf
import OpenDartReader
import requests
from bs4 import BeautifulSoup


class StockDataProvider:
    """yfinance와 OpenDartReader, 그리고 네이버 금융을 사용하여 데이터를 제공하는 클래스입니다."""

    def __init__(self, dart_api_key: Optional[str] = None) -> None:
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.dart = OpenDartReader(dart_api_key) if dart_api_key else None

    def get_kr_stock_price_from_naver(self, ticker_symbol: str) -> Dict[str, Any]:
        """네이버 금융에서 한국 종목의 현재가와 이름을 가져옵니다."""
        try:
            code = ticker_symbol.split(".")[0]  # .KS, .KQ 제거
            url = f"https://finance.naver.com/item/main.naver?code={code}"
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            res = requests.get(url, headers=headers)
            res.raise_for_status()
            
            # 네이버 금융은 EUC-KR을 사용하는 경우가 많음
            soup = BeautifulSoup(res.content, "html.parser", from_encoding="euc-kr")
            
            # 현재가 추출
            no_today = soup.find("p", {"class": "no_today"})
            if not no_today:
                return {}
            
            price_span = no_today.find("span", {"class": "blind"})
            if not price_span:
                return {}
            
            price_str = price_span.text.replace(",", "")
            current_price = float(price_str)
            
            # 종목명 추출
            name = ticker_symbol
            wrap_company = soup.find("div", {"class": "wrap_company"})
            if wrap_company:
                h2 = wrap_company.find("h2")
                if h2:
                    name = h2.text.strip()

            return {
                "price": current_price,
                "name": name,
                "currency": "KRW"
            }
            
        except Exception as e:
            print(f"Naver Finance Error for {ticker_symbol}: {e}")
            return {}

    def get_kr_dividend_from_dart(self, ticker_symbol: str) -> Dict[str, Any]:
        """DART에서 한국 종목의 최근 배당 정보를 가져옵니다."""
        if not self.dart:
            return {}

        try:
            clean_ticker = ticker_symbol.split(".")[0]
            
            df = self.dart.dividend(clean_ticker)
            if df is not None and not df.empty:
                row = df[df['separate_combined'] == '연결']
                if row.empty:
                    row = df
                
                latest_row = row.iloc[0]
                annual_div = float(str(latest_row.get('thstrm', 0)).replace(',', ''))
                yield_val = float(str(latest_row.get('yield', 0)).replace(',', '')) if latest_row.get('yield') else 0.0
                
                return {
                    "annual_dividend": annual_div,
                    "yield": yield_val
                }
        except Exception as e:
            print(f"DART Query Error for {ticker_symbol}: {e}")
        
        return {}

    def get_stock_info(self, ticker_symbol: str) -> Dict[str, Any]:
        """티커에 대한 기본 정보와 현재가를 가져옵니다."""
        print(f"[Debug] Searching info for: {ticker_symbol}")
        
        info = {}
        current_price = None
        is_kr = ".KS" in ticker_symbol or ".KQ" in ticker_symbol
        
        # [Strategy for KR] 한국 종목은 네이버 금융 최우선
        if is_kr:
            print(f"[Debug] KR stock detected. Trying Naver Finance first...")
            naver_data = self.get_kr_stock_price_from_naver(ticker_symbol)
            if naver_data:
                current_price = naver_data["price"]
                info["currency"] = naver_data["currency"]
                info["longName"] = naver_data["name"]
                info["symbol"] = ticker_symbol
                print(f"[Debug] Price from Naver: {current_price}")

        ticker = yf.Ticker(ticker_symbol)

        # [Strategy for US/Global or Naver Failed] yfinance 시도
        try:
            yf_info = ticker.info
            info.update(yf_info) # 기존 정보 업데이트
            print(f"[Debug] yfinance info retrieved. Keys: {len(yf_info)}")
            
            if current_price is None:
                current_price = info.get("currentPrice") or info.get("regularMarketPrice")
                print(f"[Debug] Price from yfinance info: {current_price}")
        except Exception as e:
            print(f"[Debug] yfinance info failed: {e}")

        # [Fallback 1] fast_info
        if current_price is None:
            try:
                current_price = ticker.fast_info.get('last_price')
                print(f"[Debug] Price from fast_info: {current_price}")
            except Exception:
                pass
        
        # [Fallback 2] history (1mo)
        if current_price is None:
            try:
                hist = ticker.history(period="1mo")
                if not hist.empty:
                    current_price = float(hist["Close"].iloc[-1])
                    print(f"[Debug] Price from history(1mo): {current_price}")
            except Exception as e:
                print(f"[Debug] history(1mo) failed: {e}")

        # 모든 방법 실패 시 에러 반환
        if current_price is None:
            print(f"[Debug] Failed to find price via all methods.")
            return {
                "error": f"Invalid ticker or no data found: {ticker_symbol}",
                "symbol": ticker_symbol
            }

        # 성공 시 데이터 조합
        print(f"[Debug] Final Price: {current_price}")

        # 1년 수익률 계산
        one_yr_return = 0.0
        try:
            hist = ticker.history(period="1y")
            if not hist.empty and len(hist) > 0:
                price_1y_ago = hist.iloc[0]["Close"]
                one_yr_return = ((current_price - price_1y_ago) / price_1y_ago) * 100
        except Exception:
            pass

        dividend_yield = info.get("dividendYield", 0)
        if dividend_yield is None:
            dividend_yield = 0.0
        else:
            if 0 < dividend_yield < 0.2:
                    dividend_yield *= 100

        # [DART Fallback/Override for KR]
        if is_kr:
            dart_info = self.get_kr_dividend_from_dart(ticker_symbol)
            if dart_info:
                if dart_info.get("yield", 0) > 0:
                    dividend_yield = dart_info["yield"]
                elif dart_info.get("annual_dividend", 0) > 0 and current_price > 0:
                    dividend_yield = (dart_info["annual_dividend"] / current_price) * 100

        # [YF Fallback] 배당률 정보가 여전히 없으면 과거 이력으로 직접 계산
        if dividend_yield == 0.0:
            annual_dividend = self.calculate_historical_annual_dividend(ticker_symbol)
            if annual_dividend > 0 and current_price > 0:
                dividend_yield = (annual_dividend / current_price) * 100

        # 배당락일 변환
        ex_div_date_str = "-"
        ex_div_timestamp = info.get("exDividendDate")
        if ex_div_timestamp:
            try:
                ex_div_date_str = datetime.datetime.fromtimestamp(ex_div_timestamp).strftime('%Y-%m-%d')
            except Exception:
                pass

        return {
            "symbol": ticker_symbol,
            "name": info.get("longName") or info.get("shortName") or ticker_symbol,
            "price": current_price,
            "currency": info.get("currency", "USD"),
            "dividend_yield": dividend_yield,
            "one_yr_return": one_yr_return,
            "ex_div_date": ex_div_date_str,
        }

    def get_dividend_history(self, ticker_symbol: str) -> pd.Series:
        """과거 배당 이력을 가져옵니다."""
        ticker = yf.Ticker(ticker_symbol)
        return ticker.dividends

    def calculate_historical_annual_dividend(self, ticker_symbol: str) -> float:
        """최근 1년치 배당금 합계를 계산합니다 (TTM 방식)."""
        dividends = self.get_dividend_history(ticker_symbol)
        if dividends.empty:
            return 0.0

        # Timezone 처리
        if dividends.index.tz is not None:
            dividends.index = dividends.index.tz_localize(None)

        one_year_ago = datetime.datetime.now() - datetime.timedelta(days=365)
        recent_dividends = dividends[dividends.index >= one_year_ago]
        return float(recent_dividends.sum())

    def get_monthly_dividend_map(self, ticker_symbol: str) -> Dict[int, float]:
        """각 월별로 지급된 배당금 정보를 맵 형태로 반환합니다."""
        dividends = self.get_dividend_history(ticker_symbol)
        if dividends.empty:
            return {}

        # Timezone 처리
        if dividends.index.tz is not None:
            dividends.index = dividends.index.tz_localize(None)

        one_year_ago = datetime.datetime.now() - datetime.timedelta(days=365)
        recent = dividends[dividends.index >= one_year_ago]

        df = recent.to_frame()
        df["month"] = df.index.month
        monthly_last = df.groupby("month").last()["Dividends"]

        return monthly_last.to_dict()