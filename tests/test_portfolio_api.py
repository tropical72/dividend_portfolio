import pytest
from fastapi.testclient import TestClient
from src.backend.main import app
import os
import json

client = TestClient(app)

@pytest.fixture
def clean_data():
    """테스트 전 포트폴리오 데이터 초기화"""
    if os.path.exists("data/portfolios.json"):
        os.remove("data/portfolios.json")
    yield
    if os.path.exists("data/portfolios.json"):
        os.remove("data/portfolios.json")

def test_get_portfolios_empty(clean_data):
    """포트폴리오 목록이 비어있을 때 조회 테스트"""
    response = client.get("/api/portfolios")
    assert response.status_code == 200
    assert response.json()["data"] == []

def test_create_portfolio(clean_data):
    """포트폴리오 생성 테스트 (REQ-PRT-04.1)"""
    payload = {
        "name": "My Retirement Plan",
        "total_capital": 50000,
        "currency": "USD"
    }
    response = client.post("/api/portfolios", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["name"] == "My Retirement Plan"
    assert "id" in data

def test_delete_portfolio(clean_data):
    """포트폴리오 삭제 테스트"""
    # 1. 먼저 하나 생성
    res_create = client.post("/api/portfolios", json={"name": "To be deleted"})
    p_id = res_create.json()["data"]["id"]
    
    # 2. 삭제 요청
    res_delete = client.delete(f"/api/portfolios/{p_id}")
    assert res_delete.status_code == 200
    
    # 3. 목록 조회 시 없어야 함
    res_list = client.get("/api/portfolios")
    assert not any(p["id"] == p_id for p in res_list.json()["data"])
