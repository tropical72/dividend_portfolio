from fastapi.testclient import TestClient
from src.backend.main import app

client = TestClient(app)

def test_get_retirement_config():
    """은퇴 설정 조회 API 테스트"""
    response = client.get("/api/retirement/config")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "user_profile" in data["data"]

def test_update_retirement_config():
    """은퇴 설정 업데이트 API 테스트"""
    new_data = {
        "user_profile": {"birth_year": 1980},
        "active_assumption_id": "conservative"
    }
    response = client.post("/api/retirement/config", json=new_data)
    assert response.status_code == 200
    
    # 다시 조회해서 반영되었는지 확인
    get_res = client.get("/api/retirement/config")
    updated_data = get_res.json()["data"]
    assert updated_data["user_profile"]["birth_year"] == 1980
    assert updated_data["active_assumption_id"] == "conservative"
