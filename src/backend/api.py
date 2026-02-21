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

        self.settings = self.storage.load_json(self.settings_file, {})
        dart_key = self.settings.get("dart_api_key")
        self.data_provider = StockDataProvider(dart_api_key=dart_key)
        self.watchlist: List[Dict[str, Any]] = self.storage.load_json(self.watchlist_file, [])
        self.portfolios: List[Dict[str, Any]] = self.storage.load_json(self.portfolios_file, [])

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

    def analyze_portfolio(self, p_id: str) -> Dict[str, Any]:
        """포트폴리오의 실시간 분석 결과를 반환합니다. [REQ-PRT-03.4]"""
        portfolio = next((p for p in self.portfolios if p["id"] == p_id), None)
        if not portfolio:
            return {"success": False, "message": "포트폴리오를 찾을 수 없습니다."}

        total_capital = portfolio.get("total_capital", 0.0)
        items = portfolio.get("items", [])
        usd_krw_rate = self.data_provider.get_usd_krw_rate()

        total_weight = sum(item.get("weight", 0.0) for item in items)
        weighted_yield = 0.0
        
        # 각 종목의 최신 배당 수익률 반영
        for item in items:
            # 팁: 실제 앱에서는 성능을 위해 캐싱된 데이터를 사용하거나 별도 업데이트 로직 필요
            # 여기서는 로직 구현에 집중함
            w = item.get("weight", 0.0)
            y = item.get("dividend_yield", 0.0)
            weighted_yield += (w / 100.0) * y if total_weight > 0 else 0.0

        expected_annual_usd = total_capital * (weighted_yield / 100.0)
        if portfolio.get("currency") == "KRW":
            # KRW 포트폴리오인 경우 원화 기준으로 먼저 계산
            annual_income_krw = expected_annual_usd
            annual_income_usd = annual_income_krw / usd_krw_rate
        else:
            # USD 포트폴리오인 경우
            annual_income_usd = expected_annual_usd
            annual_income_krw = annual_income_usd * usd_krw_rate

        return {
            "success": True,
            "data": {
                "total_weight": total_weight,
                "weighted_yield": weighted_yield,
                "expected_annual_income": {
                    "usd": annual_income_usd,
                    "krw": annual_income_krw
                },
                "expected_monthly_income": {
                    "usd": annual_income_usd / 12.0,
                    "krw": annual_income_krw / 12.0
                }
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
        특정 종목이 현재 구성된 포트폴리오에 포함되어 있는지 확인합니다.
        (현재는 포트폴리오 기능 미구현으로 항상 False 반환 - 추후 구현 예정)
        """
        # TODO: docs/02_Portfolio 개발 시 실제 저장소(portfolios.json)와 연동 필요
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
