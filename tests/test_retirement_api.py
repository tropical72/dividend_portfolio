from fastapi.testclient import TestClient

from src.backend.main import app, backend

client = TestClient(app)


def test_get_retirement_config():
    """은퇴 설정 조회 API 테스트"""
    response = client.get("/api/retirement/config")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "user_profile" in data["data"]
    assert data["data"]["assumptions"]["v1"]["name"] == "Standard Profile"
    assert data["data"]["assumptions"]["conservative"]["name"] == "Conservative Profile"


def test_update_retirement_config():
    """은퇴 설정 업데이트 API 테스트"""
    new_data = {
        "user_profile": {"birth_year": 1980},
        "active_assumption_id": "conservative",
    }
    response = client.post("/api/retirement/config", json=new_data)
    assert response.status_code == 200


def test_update_retirement_config_strategy_rules():
    """전략 규칙이 API를 통해 저장되고 기본값과 병합되는지 검증한다."""
    response = client.post(
        "/api/retirement/config",
        json={
            "strategy_rules": {
                "rebalance_month": 4,
                "corporate": {"sgov_target_months": 40},
            }
        },
    )

    assert response.status_code == 200
    strategy_rules = response.json()["data"]["strategy_rules"]
    assert strategy_rules["rebalance_month"] == 4
    assert strategy_rules["rebalance_week"] == 2
    assert strategy_rules["corporate"]["sgov_target_months"] == 40
    assert strategy_rules["corporate"]["sgov_warn_months"] == 30


def test_update_retirement_config_rejects_inconsistent_corp_principal():
    """법인 총운용자산이 자본금+주주대여금보다 작으면 저장을 거부해야 한다."""
    response = client.post(
        "/api/retirement/config",
        json={
            "corp_params": {
                "initial_investment": 100000000,
                "capital_stock": 10000000,
                "initial_shareholder_loan": 120000000,
            }
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is False
    assert "initial_investment" in payload["message"]


def test_run_retirement_simulation_with_events():
    """미래 자금 이벤트(Planned Cashflows)가 반영된 시뮬레이션 테스트"""
    original_master_portfolios = backend.master_portfolios

    # 1. 특정 시점에 대규모 자금 유입 설정
    event_year = 2035
    event_amount = 500000000
    config_update = {
        "user_profile": {"birth_year": 1972, "birth_month": 3},
        "active_assumption_id": "test_event",
        "assumptions": {
            "test_event": {
                "inflation_rate": 0.0,
                "expected_return": 0.0,
            }
        },
        "corp_params": {
            "initial_investment": 2000000000,
            "capital_stock": 0,
            "initial_shareholder_loan": 0,
            "monthly_salary": 0,
            "monthly_fixed_cost": 0,
            "employee_count": 0,
        },
        "pension_params": {
            "initial_investment": 0,
            "severance_reserve": 0,
            "other_reserve": 0,
            "monthly_withdrawal_target": 0,
        },
        "simulation_params": {
            "simulation_start_year": 2026,
            "simulation_start_month": 3,
            "target_monthly_cashflow": 9000000,
            "national_pension_amount": 0,
            "simulation_years": 12,
        },
        "planned_cashflows": [
            {
                "id": "test-event",
                "name": "테스트 유입",
                "year": event_year,
                "month": 6,
                "amount": event_amount,
                "type": "INFLOW",
                "entity": "CORP",
            }
        ],
    }
    client.post("/api/retirement/config", json=config_update)

    try:
        backend.master_portfolios = []

        # 2. 시뮬레이션 실행
        response = client.get("/api/retirement/simulate")
    finally:
        backend.master_portfolios = original_master_portfolios

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    monthly_data = data["data"]["monthly_data"]

    # 3. 이벤트 발생 시점 전후의 자산 변화 확인
    found_event = False
    for i, m_data in enumerate(monthly_data):
        if m_data["year"] == event_year and m_data["month"] == 6:
            # 이전 달 대비 자산이 이벤트 금액만큼(수익률 제외하고도) 크게 늘었는지 확인
            prev_nw = monthly_data[i - 1]["total_net_worth"]
            curr_nw = m_data["total_net_worth"]
            # 자산이 최소 4.5억 이상 증가했는지 확인 (수익률 변동폭 고려)
            assert curr_nw - prev_nw > 450000000
            found_event = True
            break

    assert found_event is True, f"{event_year}년 {6}월 이벤트를 찾을 수 없습니다."


def test_run_retirement_simulation_uses_strategy_rule_rebalance_month():
    """사용자 설정 rebalance_month가 실제 엔진 매도 시점에 반영되어야 한다."""
    client.post(
        "/api/retirement/config",
        json={
            "user_profile": {
                "birth_year": 1980,
                "birth_month": 1,
                "private_pension_start_age": 65,
                "national_pension_start_age": 65,
            },
            "active_assumption_id": "test_zero",
            "assumptions": {
                "test_zero": {
                    "inflation_rate": 0.0,
                    "expected_return": 0.0,
                }
            },
            "corp_params": {
                "initial_investment": 120000,
                "capital_stock": 0,
                "initial_shareholder_loan": 0,
                "monthly_salary": 0,
                "monthly_fixed_cost": 0,
                "employee_count": 0,
            },
            "pension_params": {
                "initial_investment": 0,
                "severance_reserve": 0,
                "other_reserve": 0,
                "monthly_withdrawal_target": 0,
            },
            "simulation_params": {
                "simulation_start_year": 2026,
                "simulation_start_month": 1,
                "target_monthly_cashflow": 1000,
                "national_pension_amount": 0,
                "simulation_years": 1,
            },
            "strategy_rules": {"rebalance_month": 2},
        },
    )

    original_get_active_master_portfolio = backend.get_active_master_portfolio
    original_get_portfolio_by_id = backend.get_portfolio_by_id
    original_portfolios = backend.portfolios
    original_get_portfolio_stats_by_id = backend.get_portfolio_stats_by_id

    try:
        backend.get_active_master_portfolio = lambda: None
        backend.get_portfolio_by_id = lambda _portfolio_id: None
        backend.portfolios = []
        backend.get_portfolio_stats_by_id = lambda _portfolio_id: {
            "dividend_yield": 0.0,
            "expected_return": 0.0,
            "weights": {"Growth": 1.0},
        }

        response = client.get("/api/retirement/simulate")
    finally:
        backend.get_active_master_portfolio = original_get_active_master_portfolio
        backend.get_portfolio_by_id = original_get_portfolio_by_id
        backend.portfolios = original_portfolios
        backend.get_portfolio_stats_by_id = original_get_portfolio_stats_by_id

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    month1 = payload["data"]["monthly_data"][0]
    assert month1["month"] == 1
    assert month1["corp_balance"] == 120000


def test_run_retirement_simulation_rejects_broken_active_master_reference():
    """활성 마스터 전략의 포트폴리오 참조가 깨지면 시뮬레이션은 실패해야 한다."""
    original_master_portfolios = backend.master_portfolios

    try:
        backend.master_portfolios = [
            {
                "id": "broken-master",
                "name": "Broken Master",
                "corp_id": "missing-corp",
                "pension_id": None,
                "is_active": True,
            }
        ]

        response = client.get("/api/retirement/simulate")
    finally:
        backend.master_portfolios = original_master_portfolios

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is False
    assert payload["broken_reference"] is True
    assert "broken portfolio references" in payload["message"]
