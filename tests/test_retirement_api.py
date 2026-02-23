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
def test_run_retirement_simulation_with_events():
    """미래 자금 이벤트(Planned Cashflows)가 반영된 시뮬레이션 테스트"""
    # 1. 특정 시점에 대규모 자금 유입 설정
    event_year = 2035
    event_amount = 500000000
    config_update = {
        "user_profile": {"birth_year": 1972, "birth_month": 3},
        "simulation_params": {
            "simulation_start_year": 2026,
            "simulation_start_month": 3,
            "target_monthly_cashflow": 9000000
        },
        "planned_cashflows": [
            {
                "id": "test-event",
                "name": "테스트 유입",
                "year": event_year,
                "month": 6,
                "amount": event_amount,
                "type": "INFLOW",
                "entity": "CORP"
            }
        ]
    }
    client.post("/api/retirement/config", json=config_update)
    
    # 2. 시뮬레이션 실행
    response = client.get("/api/retirement/simulate")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    monthly_data = data["data"]["monthly_data"]
    
    # 3. 이벤트 발생 시점 전후의 자산 변화 확인
    found_event = False
    for i, m_data in enumerate(monthly_data):
        if m_data["year"] == event_year and m_data["month"] == 6:
            # 이전 달 대비 자산이 이벤트 금액만큼(수익률 제외하고도) 크게 늘었는지 확인
            prev_nw = monthly_data[i-1]["total_net_worth"]
            curr_nw = m_data["total_net_worth"]
            # 자산이 최소 4.5억 이상 증가했는지 확인 (수익률 변동폭 고려)
            assert curr_nw - prev_nw > 450000000
            found_event = True
            break
            
    assert found_event is True, f"{event_year}년 {6}월 이벤트를 찾을 수 없습니다."
