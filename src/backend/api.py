import os
import uuid
from typing import Any, Dict, List

from src.backend.data_provider import StockDataProvider
from src.backend.storage import StorageManager


class DividendBackend:
    """
    배당 포트폴리오 관리기의 핵심 비즈니스 로직을 담당하는 엔진입니다.
    """

    def __init__(self, data_dir: str = ".") -> None:
        self.storage = StorageManager(data_dir=data_dir)
        self.data_dir = os.path.abspath(data_dir)
        self.watchlist_file = "watchlist.json"
        self.settings_file = "settings.json"
        self.portfolios_file = "portfolios.json"
        self.retirement_config_file = "retirement_config.json"

        self.settings = self.storage.load_json(self.settings_file, {})
        dart_key = self.settings.get("dart_api_key")
        self.data_provider = StockDataProvider(dart_api_key=dart_key)
        self.watchlist: List[Dict[str, Any]] = self.storage.load_json(self.watchlist_file, [])
        self.portfolios: List[Dict[str, Any]] = self.storage.load_json(self.portfolios_file, [])
        self.retirement_config = self.storage.load_json(self.retirement_config_file, {})

    def get_retirement_config(self) -> Dict[str, Any]:
        """저장된 은퇴 운용 설정 정보를 반환합니다."""
        return self.retirement_config

    def update_retirement_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        """은퇴 운용 설정을 업데이트합니다. [REQ-RAMS-1.2]"""
        self.retirement_config.update(new_config)
        self.storage.save_json(self.retirement_config_file, self.retirement_config)
        return {"success": True, "message": "은퇴 설정이 저장되었습니다.", "data": self.retirement_config}

    def get_watchlist(self) -> List[Dict[str, Any]]:
        """저장된 관심 종목 목록을 반환합니다. (필드 누락 방지 포함)"""
        # 기존 데이터 호환성을 위해 필수 필드 기본값 보정
        for item in self.watchlist:
            item.setdefault("one_yr_return", 0.0)
            item.setdefault("ex_div_date", "-")
            item.setdefault("last_div_amount", 0.0)
            item.setdefault("last_div_yield", 0.0)
            item.setdefault("past_avg_monthly_div", 0.0)
            item.setdefault("dividend_frequency", "None")
            item.setdefault("payment_months", [])
        return self.watchlist

    def get_portfolios(self) -> List[Dict[str, Any]]:
        """저장된 모든 포트폴리오 목록을 반환합니다."""
        return self.portfolios

    def add_portfolio(
        self, name: str, total_capital: float = 0.0, currency: str = "USD", items: list = None
    ) -> Dict[str, Any]:
        """새로운 포트폴리오를 생성합니다."""
        new_p = {
            "id": str(uuid.uuid4()),
            "name": name,
            "total_capital": total_capital,
            "currency": currency,
            "items": items or [],
            "created_at": str(os.path.getmtime(self.data_dir)) # 실제 생성 시간 대신 더미 활용 가능
        }
        self.portfolios.append(new_p)
        self.storage.save_json(self.portfolios_file, self.portfolios)
        return {"success": True, "data": new_p}

    def remove_portfolio(self, p_id: str) -> Dict[str, Any]:
        """특정 포트폴리오를 삭제합니다."""
        for i, p in enumerate(self.portfolios):
            if p["id"] == p_id:
                removed = self.portfolios.pop(i)
                self.storage.save_json(self.portfolios_file, self.portfolios)
                return {"success": True, "message": f"{removed['name']} 삭제됨"}
        return {"success": False, "message": "포트폴리오를 찾을 수 없습니다."}

    def update_portfolio(self, p_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """특정 포트폴리오의 정보를 업데이트합니다. [REQ-PRT-04.2]"""
        for p in self.portfolios:
            if p["id"] == p_id:
                p.update(updates)
                self.storage.save_json(self.portfolios_file, self.portfolios)
                return {"success": True, "data": p}
        return {"success": False, "message": "포트폴리오를 찾을 수 없습니다."}

    def analyze_portfolio(self, p_id: str, mode: str = "TTM") -> Dict[str, Any]:
        """포트폴리오의 실시간 분석 결과를 반환합니다. [REQ-PRT-03.4, 05.1]"""
        portfolio = next((p for p in self.portfolios if p["id"] == p_id), None)
        if not portfolio:
            return {"success": False, "message": "포트폴리오를 찾을 수 없습니다."}

        total_capital = portfolio.get("total_capital", 0.0)
        items = portfolio.get("items", [])
        usd_krw_rate = self.data_provider.get_usd_krw_rate()

        total_weight = sum(item.get("weight", 0.0) for item in items)
        weighted_yield = 0.0
        
        # 월별 배당금 합계 저장 (1~12월)
        monthly_distribution = {m: 0.0 for m in range(1, 13)}
        
        for item in items:
            symbol = item.get("symbol")
            weight = item.get("weight", 0.0)
            if weight <= 0:
                continue
            
            # 종목의 할당 금액 (포트폴리오 통화 기준)
            allocated_amount = total_capital * (weight / 100.0)
            
            # 종목의 기본 정보 및 수익률 (저장된 값 사용 - 필요시 refresh 로직 추가)
            ticker_yield = item.get("dividend_yield", 0.0)
            weighted_yield += (weight / 100.0) * ticker_yield if total_weight > 0 else 0.0

            # 월별 분포 계산
            if mode == "Forward":
                # Forward: Last Amt * Months
                months = item.get("payment_months", [])
                last_amt = item.get("last_div_amount", 0.0)
                price = item.get("price", 1.0)
                if price > 0:
                    # (할당금 / 주가) = 보유 주식 수
                    shares = allocated_amount / price
                    for m in months:
                        monthly_distribution[m] += shares * last_amt
            else:
                # TTM: 실제 과거 1년 합산
                monthly_map = self.data_provider.get_monthly_dividend_map(symbol)
                price = item.get("price", 1.0)
                if price > 0:
                    shares = allocated_amount / price
                    for m, amt in monthly_map.items():
                        monthly_distribution[m] += shares * amt

        # 통화 환산 (KRW 기준)
        p_currency = portfolio.get("currency", "USD")
        
        def to_krw(amt):
            return amt * usd_krw_rate if p_currency == "USD" else amt

        # 최종 요약 계산
        annual_income_val = total_capital * (weighted_yield / 100.0)
        
        # 통화별 연간 수입 계산
        if p_currency == "USD":
            annual_usd = annual_income_val
            annual_krw = annual_income_val * usd_krw_rate
        else:
            annual_krw = annual_income_val
            annual_usd = annual_income_val / usd_krw_rate

        return {
            "success": True,
            "data": {
                "total_weight": total_weight,
                "weighted_yield": weighted_yield,
                "mode": mode,
                "currency": p_currency,
                "exchange_rate": usd_krw_rate,
                "summary": {
                    "annual": {
                        "usd": annual_usd,
                        "krw": annual_krw
                    }
                },
                "monthly_chart": [
                    {
                        "month": m,
                        "amount_krw": to_krw(amt),
                        "amount_origin": amt
                    } for m, amt in monthly_distribution.items()
                ]
            }
        }
        """저장된 관심 종목 목록을 반환합니다. (필드 누락 방지 포함)"""
        # 기존 데이터 호환성을 위해 필수 필드 기본값 보정
        for item in self.watchlist:
            item.setdefault("one_yr_return", 0.0)
            item.setdefault("ex_div_date", "-")
            item.setdefault("last_div_amount", 0.0)
            item.setdefault("last_div_yield", 0.0)
            item.setdefault("past_avg_monthly_div", 0.0)
            item.setdefault("dividend_frequency", "None")
            item.setdefault("payment_months", [])
        return self.watchlist

    def get_settings(self) -> Dict[str, Any]:
        """저장된 설정 정보를 반환합니다."""
        return self.settings

    def add_to_watchlist(self, ticker: str, country: str = "US") -> Dict[str, Any]:
        """새로운 종목을 추가하고 저장합니다."""
        formatted_ticker = ticker.upper().strip()

        # [REQ-WCH-01.7] 스마트 티커 감지: 6자리(숫자+영문 가능)면 자동으로 한국 종목 처리
        # 한국 티커는 보통 6자리이며, ETF나 우선주의 경우 영문자가 포함될 수 있음 (예: 0104H0)
        is_kr_ticker_format = len(formatted_ticker) == 6

        if (country == "KR" or is_kr_ticker_format) and not (
            formatted_ticker.endswith(".KS") or formatted_ticker.endswith(".KQ")
        ):
            formatted_ticker += ".KS"

        for item in self.watchlist:
            if item["symbol"] == formatted_ticker:
                return {"success": False, "message": "이미 등록된 종목입니다."}

        info = self.data_provider.get_stock_info(formatted_ticker)
        if "error" in info:
            return {"success": False, "message": f"조회 실패: {info['error']}"}

        info["country"] = country
        self.watchlist.append(info)
        self.storage.save_json(self.watchlist_file, self.watchlist)
        return {"success": True, "message": f"{info['name']} 추가됨", "data": info}

    def is_stock_in_portfolio(self, ticker: str) -> bool:
        """
        특정 종목이 현재 저장된 어떤 포트폴리오에라도 포함되어 있는지 확인합니다.
        """
        search_ticker = ticker.upper().strip()
        for p in self.portfolios:
            items = p.get("items", [])
            if any(item.get("symbol", "").upper() == search_ticker for item in items):
                return True
        return False

    def remove_from_watchlist(self, ticker: str) -> Dict[str, Any]:
        """관심종목에서 특정 종목을 제거합니다. (무결성 검사 포함)"""
        # 1. 포트폴리오 무결성 체크: 삭제 전 사용 여부 확인
        if self.is_stock_in_portfolio(ticker.upper()):
            return {
                "success": False,
                "message": (
                    "포트폴리오에 포함된 종목은 삭제할 수 없습니다. "
                    "먼저 포트폴리오에서 제거해 주세요."
                ),
            }

        # 2. 리스트에서 찾아 삭제
        for i, item in enumerate(self.watchlist):
            if item["symbol"] == ticker.upper():
                removed = self.watchlist.pop(i)
                self.storage.save_json(self.watchlist_file, self.watchlist)
                return {"success": True, "message": f"{removed['name']} 제거됨"}
        return {"success": False, "message": "종목을 찾을 수 없습니다."}

    def update_settings(self, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        """설정을 업데이트합니다."""
        self.settings.update(new_settings)
        self.storage.save_json(self.settings_file, self.settings)
        if "dart_api_key" in new_settings:
            self.data_provider = StockDataProvider(dart_api_key=self.settings["dart_api_key"])
        return {"success": True, "message": "설정이 저장되었습니다."}
