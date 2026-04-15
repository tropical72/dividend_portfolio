import pytest
from fastapi.testclient import TestClient
from src.backend.main import app, backend
import uuid

@pytest.fixture
def client():
    return TestClient(app)

def test_master_portfolio_crud_and_dependency(client):
    """
    [TEST-RAMS-1.5] 마스터 포트폴리오 CRUD 및 삭제 방지 검증
    """
    # 1. 초기 개별 포트폴리오 준비
    corp_res = client.post("/api/portfolios", json={
        "name": "Test Corp", "account_type": "Corporate", "total_capital": 1000
    })
    corp_id = corp_res.json()["data"]["id"]
    
    # 2. 마스터 포트폴리오 생성
    master_res = client.post("/api/master-portfolios", json={
        "name": "Super Strategy",
        "corp_id": corp_id,
        "pension_id": None
    })
    assert master_res.status_code == 200
    master_id = master_res.json()["data"]["id"]
    assert master_res.json()["data"]["name"] == "Super Strategy"
    
    # 3. 마스터 포트폴리오 조회
    list_res = client.get("/api/master-portfolios")
    assert any(m["id"] == master_id for m in list_res.json()["data"])
    
    # 4. 삭제 방지 검증 (Dependency Check) [REQ-PRT-08.3]
    # 마스터 포트폴리오에서 참조 중인 개별 포트폴리오 삭제 시도
    del_res = client.delete(f"/api/portfolios/{corp_id}")
    assert del_res.status_code == 200 # API 레벨에서는 200이지만 success가 False여야 함
    assert del_res.json()["success"] is False
    assert "사용 중" in del_res.json()["message"]
    
    # 5. 활성화 로직 검증 [REQ-PRT-08.4]
    client.post(f"/api/master-portfolios/{master_id}/activate")
    active_res = client.get("/api/master-portfolios")
    active_master = next(m for m in active_res.json()["data"] if m["id"] == master_id)
    assert active_master["is_active"] is True
    
    # 6. 마스터 포트폴리오 삭제 후에는 개별 포트폴리오 삭제 가능해야 함
    client.delete(f"/api/master-portfolios/{master_id}")
    del_res_ok = client.delete(f"/api/portfolios/{corp_id}")
    assert del_res_ok.json()["success"] is True
