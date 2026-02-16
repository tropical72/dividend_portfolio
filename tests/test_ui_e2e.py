import os
import sys
import pytest
from kivy.clock import Clock

# 프로젝트 루트 디렉토리를 path에 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.frontend.main import DividendApp
from src.backend.api import DividendBackend

class TestDividendApp:
    @pytest.fixture
    def app(self, tmp_path):
        """테스트용 앱 인스턴스 생성 (임시 저장소 사용)"""
        # 테스트용 임시 파일 경로 설정
        watchlist_path = tmp_path / "test_watchlist.json"
        settings_path = tmp_path / "test_settings.json"
        
        app = DividendApp()
        # 백엔드를 테스트용 파일 경로로 강제 교체
        app.backend = DividendBackend()
        app.backend.watchlist_file = str(watchlist_path)
        app.backend.settings_file = str(settings_path)
        
        # UI 빌드 및 초기화
        app.root = app.build()
        app.on_start()
        
        # Kivy 프레임 업데이트
        Clock.tick()
        
        return app

    def test_initial_ui_state(self, app):
        """앱 시작 시 초기 UI 상태 검증"""
        assert app.root.ids.status_label.text == "Add a stock to start"
        assert app.root.ids.country_button.text == "US"
        assert app.root.ids.ticker_input.text == ""

    def test_add_stock_ux_behavior(self, app):
        """종목 추가 시 UX 동작 검증 (입력창 초기화 및 테이블 갱신)"""
        # 1. Ticker 입력
        app.root.ids.ticker_input.text = "AAPL"
        
        # 초기 행 개수 확인
        initial_row_count = len(app.data_table.row_data)
        
        # 2. Add 버튼 동작 시뮬레이션
        app.add_stock()
        
        # 3. UX 검증: 입력창은 즉시 비워져야 함
        assert app.root.ids.ticker_input.text == ""
        
        # 4. 데이터 연동 검증: 테이블에 행이 하나 추가되어야 함
        # (네트워크 성공 가정 시)
        if "추가됨" in app.root.ids.status_label.text:
            assert len(app.data_table.row_data) == initial_row_count + 1
            # 추가된 데이터의 첫 번째 열(Ticker)이 AAPL인지 확인
            assert app.data_table.row_data[-1][0] == "AAPL"

    def test_sorting_functionality(self, app):
        """정렬 기능 동작 검증"""
        # 1. 테스트용 데이터 직접 삽입
        app.backend.watchlist = [
            {"symbol": "A", "name": "Alpha", "price": 100.0, "currency": "$", "dividend_yield": 1.0, "one_yr_return": 10.0},
            {"symbol": "B", "name": "Beta", "price": 200.0, "currency": "$", "dividend_yield": 2.0, "one_yr_return": 5.0},
        ]
        app.refresh_table()
        
        # 2. 'Price' 기준으로 정렬 실행 (현재 로직은 Price 정렬 시 내림차순)
        app.apply_sort("Price")
        
        # 3. 검증: 가격이 높은 B가 첫 번째 행에 있어야 함
        # MDDataTable의 row_data는 (symbol, name, price_str, yield_str, ...) 형태임
        assert "B" in app.data_table.row_data[0][0]
        assert "200.00" in app.data_table.row_data[0][2]

    def test_kr_ticker_auto_suffix(self, app):
        """한국 종목 입력 시 .KS 접미사 자동 완성 UX 검증"""
        app.root.ids.country_button.text = "KR"
        app.root.ids.ticker_input.text = "005930" # 삼성전자
        
        # Add 실행 (실제 네트워크 호출 발생)
        app.add_stock()
        
        # 검증: 테이블에 추가된 Ticker가 005930.KS 여야 함
        # (실패 시에도 status_label 확인 가능)
        if "추가됨" in app.root.ids.status_label.text:
            last_row_ticker = app.data_table.row_data[-1][0]
            assert last_row_ticker == "005930.KS"

        """잘못된 Ticker 입력 시 에러 표시 검증"""
        app.root.ids.ticker_input.text = "INVALID_TICKER_123"
        app.add_stock()
        
        # 에러 발생 시 글자 색상이 빨간색(1, 0, 0, 1)으로 변하는지 확인
        # KivyMD의 text_color는 리스트 형태일 수 있으므로 근사값으로 확인
        color = app.root.ids.status_label.text_color
        assert color[0] > 0.9 # Red channel should be high
        assert "실패" in app.root.ids.status_label.text
