"""
Backend API Interface
이 파일은 Frontend에서 Backend 로직에 접근하는 유일한 경로입니다.
UI 라이브러리(Kivy 등)에 의존성이 없는 순수 Python 코드로 작성됩니다.
"""

import os
from typing import Any, Dict, List

from src.backend.data_provider import StockDataProvider
from src.backend.storage import StorageManager


class DividendBackend:
    def __init__(self, data_dir: str = ".") -> None:
        self.storage = StorageManager()
        self.data_dir = data_dir
        self.watchlist_file = os.path.join(data_dir, "watchlist.json")
        self.settings_file = os.path.join(data_dir, "settings.json")
        
        # 데이터 디렉토리 생성 (없을 경우)
        if data_dir != "." and not os.path.exists(data_dir):
            os.makedirs(data_dir)
        
        # 설정 로드
        self.settings = self.storage.load_json(self.settings_file, {})
        dart_key = self.settings.get("dart_api_key")
        
        self.data_provider = StockDataProvider(dart_api_key=dart_key)
        
        # 앱 시작 시 저장된 데이터 로드
        self.watchlist: List[Dict[str, Any]] = self.storage.load_json(self.watchlist_file, [])

    def get_watchlist(self) -> List[Dict[str, Any]]:
        """저장된 관심 종목 목록을 반환합니다."""
        return self.watchlist

    def get_settings(self) -> Dict[str, Any]:
        """저장된 설정 정보를 반환합니다."""
        return self.settings

    def add_to_watchlist(self, ticker: str, country: str = "US") -> Dict[str, Any]:
        """
        새로운 종목을 관심 종목에 추가하고 파일에 저장합니다.
        """
        formatted_ticker = ticker.upper().strip()
        if country == "KR" and not (
            formatted_ticker.endswith(".KS") or formatted_ticker.endswith(".KQ")
        ):
            formatted_ticker += ".KS"

        # 중복 체크
        for item in self.watchlist:
            if item["symbol"] == formatted_ticker:
                return {"success": False, "message": "이미 등록된 종목입니다."}

        # 데이터 조회
        info = self.data_provider.get_stock_info(formatted_ticker)
        if "error" in info:
            return {
                "success": False,
                "message": f"데이터 조회 실패: {info.get('error')}",
            }

        # 저장용 데이터 구성 (국가 정보 포함)
        info["country"] = country
        
        # Watchlist에 추가 및 영구 저장
        self.watchlist.append(info)
        self.storage.save_json(self.watchlist_file, self.watchlist)
        
        return {
            "success": True,
            "message": f"{info['name']} ({formatted_ticker}) 추가됨",
            "data": info,
        }

    def remove_from_watchlist(self, ticker: str) -> Dict[str, Any]:
        """관심 종목에서 제거합니다."""
        for i, item in enumerate(self.watchlist):
            if item["symbol"] == ticker.upper():
                removed = self.watchlist.pop(i)
                self.storage.save_json(self.watchlist_file, self.watchlist)
                return {"success": True, "message": f"{removed['name']} 제거됨"}
        return {"success": False, "message": "종목을 찾을 수 없습니다."}

    def update_settings(self, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        """설정을 업데이트하고 저장합니다."""
        self.settings.update(new_settings)
        self.storage.save_json(self.settings_file, self.settings)
        # API 키가 변경되었을 수 있으므로 data_provider 재설정
        if "dart_api_key" in new_settings:
            self.data_provider = StockDataProvider(dart_api_key=self.settings["dart_api_key"])
        return {"success": True, "message": "설정이 저장되었습니다."}

    def get_portfolio_analysis(self, portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
        """포트폴리오 데이터를 받아 분석 결과를 반환합니다."""
        # TODO: 추후 포트폴리오 계산 로직 구현 필요
        return {"total_dividend": 0, "yield": 0.0}