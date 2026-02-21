import pytest
from fastapi.testclient import TestClient
from src.backend.main import app

client = TestClient(app)

def test_portfolio_monthly_analysis_api():
    """포트폴리오 월별 분석 API 통합 테스트 [REQ-PRT-05]"""
    # 1. 테스트용 포트폴리오 생성
    payload = {
        "name": "Monthly Test",
        "total_capital": 10000,
        "currency": "USD",
        "items": [
            {
                "symbol": "AAPL", 
                "weight": 100, 
                "dividend_yield": 5.0, 
                "price": 150.0,
                "last_div_amount": 0.5,
                "payment_months": [2, 5, 8, 11]
            }
        ]
    }
    res_create = client.post("/api/portfolios", json=payload)
    p_id = res_create.json()["data"]["id"]
    
    # 2. Forward 모드 분석 요청
    res_fwd = client.get(f"/api/portfolios/{p_id}/analysis?mode=Forward")
    assert res_fwd.status_code == 200
    data_fwd = res_fwd.json()["data"]
    
    # 2, 5, 8, 11월에 금액이 있어야 함
    chart = data_fwd["monthly_chart"]
    months_with_div = [item["month"] for item in chart if item["amount_origin"] > 0]
    assert sorted(months_with_div) == [2, 5, 8, 11]
    
    # 3. TTM 모드 분석 요청 (실제 데이터가 없으면 비어있을 수 있음)
    res_ttm = client.get(f"/api/portfolios/{p_id}/analysis?mode=TTM")
    assert res_ttm.status_code == 200
    assert res_ttm.json()["data"]["mode"] == "TTM"
