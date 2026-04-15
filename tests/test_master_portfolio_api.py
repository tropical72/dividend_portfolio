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
    
    # 5.1 활성 전략 삭제 차단 검증 [REQ-PRT-08.5]
    del_active_res = client.delete(f"/api/master-portfolios/{master_id}")
    assert del_active_res.json()["success"] is False
    assert "사용 중" in del_active_res.json()["message"]
    
    # 6. 다른 전략 생성 및 활성화 후에는 기존 전략 삭제 가능해야 함
    client.post("/api/master-portfolios", json={
        "name": "Another Strategy", "corp_id": corp_id, "pension_id": None
    })
    list_res2 = client.get("/api/master-portfolios")
    another_id = next(m["id"] for m in list_res2.json()["data"] if m["name"] == "Another Strategy")
    
    # 다른 전략 활성화
    client.post(f"/api/master-portfolios/{another_id}/activate")
    
    # 이제 기존 전략(Super Strategy)은 비활성 상태이므로 삭제 가능
    del_res = client.delete(f"/api/master-portfolios/{master_id}")
    assert del_res.json()["success"] is True
    
    # 마지막 마스터 전략(Another Strategy)은 여전히 활성 상태이므로 삭제 불가 확인
    del_res_last = client.delete(f"/api/master-portfolios/{another_id}")
    assert del_res_last.json()["success"] is False
    
    # 강제로 모든 마스터 전략 삭제를 허용하려면 백엔드 로직 수정이 필요하거나, 
    # 혹은 테스트 목적으로 Another Strategy를 삭제하기 위해 
    # 시스템에 '기본(None)' 상태를 활성화하는 기능이 필요함.
    # 여기서는 요구사항대로 '활성 전략 삭제 불가'까지만 검증함.
