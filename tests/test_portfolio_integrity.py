import pytest
from fastapi.testclient import TestClient
from src.backend.main import app
import os

client = TestClient(app)

@pytest.fixture
def setup_portfolio():
    """테스트용 포트폴리오 데이터 세팅"""
    # 1. 초기화
    if os.path.exists("data/portfolios.json"):
        os.remove("data/portfolios.json")
    
    # 2. AAPL을 포함한 포트폴리오 하나 생성
    payload = {
        "name": "Safety Test",
        "items": [
            {"symbol": "AAPL.KS", "category": "Growth", "weight": 100}
        ]
    }
    client.post("/api/portfolios", json=payload)
    yield
    # 3. 정리
    if os.path.exists("data/portfolios.json"):
        os.remove("data/portfolios.json")

def test_delete_stock_blocked_by_portfolio(setup_portfolio):
    """포트폴리오에 포함된 종목 삭제 시도 시 차단되는지 검증 [REQ-PRT-02.2]"""
    # AAPL.KS 삭제 시도 (Watchlist에서 삭제 시도하는 시나리오)
    # 현재 DividendBackend.remove_from_watchlist() 내부에서 
    # is_stock_in_portfolio()를 호출함.
    
    # 1. Watchlist에 AAPL.KS 추가 (테스트 전제 조건)
    client.post("/api/watchlist", json={"ticker": "AAPL", "country": "KR"})
    
    # 2. 삭제 시도
    response = client.delete("/api/watchlist/AAPL.KS")
    
    # 3. 결과 확인: 실패(차단)해야 함
    assert response.status_code == 200 # API 자체는 성공 응답이나 내부 success는 False
    data = response.json()
    assert data["success"] is False
    assert "포트폴리오에 포함된 종목은 삭제할 수 없습니다" in data["message"]
