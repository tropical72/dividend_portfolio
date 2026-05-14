import pytest
from fastapi.testclient import TestClient

import src.backend.main as main_module
from src.backend.api import DividendBackend
from src.backend.main import app, backend

client = TestClient(app)


def _create_retirement_master(
    backend: DividendBackend,
    *,
    name: str,
    corp_category: str,
    pension_category: str,
    dividend_yield: float = 4.0,
) -> str:
    corp_portfolio = backend.add_portfolio(
        name=f"{name} Corporate",
        account_type="Corporate",
        total_capital=100000000,
        currency="USD",
        items=[
            {
                "ticker": f"{name[:4].upper()}C",
                "name": f"{name} Corp",
                "weight": 100,
                "category": corp_category,
                "dividend_yield": dividend_yield,
            }
        ],
    )["data"]
    pension_portfolio = backend.add_portfolio(
        name=f"{name} Pension",
        account_type="Pension",
        total_capital=100000000,
        currency="USD",
        items=[
            {
                "ticker": f"{name[:4].upper()}P",
                "name": f"{name} Pension",
                "weight": 100,
                "category": pension_category,
                "dividend_yield": dividend_yield,
            }
        ],
    )["data"]
    master = backend.add_master_portfolio(
        name=name,
        corp_id=corp_portfolio["id"],
        pension_id=pension_portfolio["id"],
    )["data"]
    backend.activate_master_portfolio(str(master["id"]))
    return str(master["id"])


def test_get_retirement_config():
    """은퇴 설정 조회 API 테스트"""
    response = client.get("/api/retirement/config")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "user_profile" in data["data"]
    assert data["data"]["assumptions"]["v1"]["name"] == "Standard Profile"
    assert data["data"]["assumptions"]["conservative"]["name"] == "Conservative Profile"


def test_get_retirement_config_filters_test_only_assumptions():
    """테스트 전용 assumption이 저장돼 있어도 사용자 노출 설정에서는 제거되어야 한다."""
    original_config = dict(backend.retirement_config)

    try:
        backend.retirement_config = {
            "active_assumption_id": "test_zero",
            "assumptions": {
                "v1": {
                    "name": "Standard Profile",
                    "expected_return": 0.05,
                    "inflation_rate": 0.02,
                },
                "conservative": {
                    "name": "Conservative Profile",
                    "expected_return": 0.03,
                    "inflation_rate": 0.03,
                },
                "test_zero": {
                    "expected_return": 0.0,
                    "inflation_rate": 0.0,
                },
            },
        }

        response = client.get("/api/retirement/config")
    finally:
        backend.retirement_config = original_config
        backend._ensure_retirement_config_defaults()

    assert response.status_code == 200
    payload = response.json()["data"]
    assert set(payload["assumptions"].keys()) == {"v1", "conservative"}
    assert payload["active_assumption_id"] == "v1"


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
    assert strategy_rules["corporate"]["bond_floor_months"] == 12
    assert strategy_rules["pension"]["sgov_target_months"] == 24


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
        "active_assumption_id": "v1",
        "assumptions": {
            "v1": {
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
    """현재 월 결과에는 설정된 전략 규칙과 기본 현금흐름이 함께 반영되어야 한다."""
    live_backend = main_module.backend
    client.post(
        "/api/retirement/config",
        json={
            "user_profile": {
                "birth_year": 1980,
                "birth_month": 1,
                "private_pension_start_age": 65,
                "national_pension_start_age": 65,
            },
            "active_assumption_id": "v1",
            "assumptions": {
                "v1": {
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

    original_get_active_master_portfolio = live_backend.get_active_master_portfolio
    original_get_portfolio_by_id = live_backend.get_portfolio_by_id
    original_portfolios = live_backend.portfolios
    original_get_portfolio_stats_by_id = live_backend.get_portfolio_stats_by_id
    original_get_standard_profile_return = live_backend.get_standard_profile_return

    try:
        live_backend.get_active_master_portfolio = lambda: None
        live_backend.get_portfolio_by_id = lambda _portfolio_id: None
        live_backend.portfolios = []
        live_backend.get_standard_profile_return = lambda *_args, **_kwargs: 0.0
        live_backend.get_portfolio_stats_by_id = lambda _portfolio_id, *_args, **_kwargs: {
            "dividend_yield": 0.0,
            "expected_return": 0.0,
            "weights": {"Growth": 1.0},
        }

        response = client.get("/api/retirement/simulate")
    finally:
        live_backend.get_active_master_portfolio = original_get_active_master_portfolio
        live_backend.get_portfolio_by_id = original_get_portfolio_by_id
        live_backend.portfolios = original_portfolios
        live_backend.get_standard_profile_return = original_get_standard_profile_return
        live_backend.get_portfolio_stats_by_id = original_get_portfolio_stats_by_id

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    month1 = payload["data"]["monthly_data"][0]
    assert month1["month"] == 1
    assert month1["phase"] == "Phase 1"
    assert month1["corp_monthly_need"] == 1000
    assert month1["corp_balance"] > 0


def test_run_retirement_simulation_uses_document_default_initial_bucket_setup_when_stats_are_empty(
    tmp_path, monkeypatch
):
    """API 경로에서도 전략 비중이 비어 있으면 문서 기본 초기 세팅이 적용되어야 한다."""
    local_backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", local_backend)
    local_client = TestClient(main_module.app)

    local_client.post(
        "/api/retirement/config",
        json={
            "user_profile": {
                "birth_year": 1980,
                "birth_month": 1,
                "private_pension_start_age": 55,
                "national_pension_start_age": 80,
            },
            "active_assumption_id": "v1",
            "assumptions": {
                "v1": {
                    "inflation_rate": 0.0,
                    "expected_return": 0.0,
                }
            },
            "corp_params": {
                "initial_investment": 800000000,
                "capital_stock": 0,
                "initial_shareholder_loan": 0,
                "monthly_salary": 0,
                "monthly_bookkeeping_fee": 0,
                "annual_corp_tax_adjustment_fee": 0,
                "monthly_fixed_cost": 0,
                "employee_count": 0,
            },
            "pension_params": {
                "initial_investment": 200000000,
                "severance_reserve": 0,
                "other_reserve": 0,
                "monthly_withdrawal_target": 2500000,
            },
            "simulation_params": {
                "simulation_start_year": 2026,
                "simulation_start_month": 1,
                "target_monthly_cashflow": 11500000,
                "household_monthly_need": 11500000,
                "national_pension_amount": 0,
                "simulation_years": 1,
            },
        },
    )
    local_backend.get_active_master_portfolio = lambda: None
    local_backend.get_portfolio_by_id = lambda _portfolio_id: None
    local_backend.portfolios = []
    local_backend.get_standard_profile_return = lambda *_args, **_kwargs: 0.0
    local_backend.get_appreciation_rates_for_scenario = lambda *_args, **_kwargs: {
        "cash_sgov": 0.0,
        "bond_buffer": 0.0,
        "high_income": 0.0,
        "dividend_stocks": 0.0,
        "growth_stocks": 0.0,
    }
    local_backend.get_portfolio_stats_by_id = lambda _portfolio_id, *_args, **_kwargs: {
        "dividend_yield": 0.0,
        "expected_return": 0.0,
        "weights": {},
        "strategy_weights": {},
        "category_return_rates": {},
    }

    response = local_client.get("/api/retirement/simulate")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    month1 = payload["data"]["monthly_data"][0]
    assert month1["corp_sgov_balance"] == pytest.approx(333500000.0)
    assert month1["corp_bond_balance"] == pytest.approx(207000000.0)
    assert month1["corp_high_income_balance"] == pytest.approx(0.0)
    assert month1["corp_dividend_balance"] == pytest.approx(210800000.0)
    assert month1["corp_growth_balance"] == pytest.approx(37200000.0)
    assert month1["pension_sgov_balance"] == pytest.approx(60000000.0)
    assert month1["pension_bond_balance"] == pytest.approx(45000000.0)
    assert month1["pension_high_income_balance"] == pytest.approx(0.0)
    assert month1["pension_dividend_balance"] == pytest.approx(71250000.0)
    assert month1["pension_growth_balance"] == pytest.approx(23750000.0)


def test_run_retirement_simulation_uses_dynamic_strategy_rule_month_caps(tmp_path, monkeypatch):
    """strategy_rules의 버퍼 개월수 설정이 실제 5월 리밸런싱 결과에 반영되어야 한다."""
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    _create_retirement_master(
        backend,
        name="Strategy Rule Caps",
        corp_category="Bond Buffer",
        pension_category="Bond Buffer",
        dividend_yield=0.0,
    )
    monkeypatch.setattr(main_module, "backend", backend)
    local_client = TestClient(main_module.app)

    local_client.post(
        "/api/retirement/config",
        json={
            "user_profile": {
                "birth_year": 1970,
                "birth_month": 1,
                "private_pension_start_age": 55,
                "national_pension_start_age": 80,
            },
            "active_assumption_id": "v1",
            "assumptions": {
                "v1": {
                    "inflation_rate": 0.0,
                    "expected_return": 0.0,
                }
            },
            "corp_params": {
                "initial_investment": 100000000,
                "capital_stock": 0,
                "initial_shareholder_loan": 0,
                "monthly_salary": 0,
                "monthly_fixed_cost": 0,
                "employee_count": 0,
            },
            "pension_params": {
                "initial_investment": 100000000,
                "severance_reserve": 0,
                "other_reserve": 0,
                "monthly_withdrawal_target": 1000000,
            },
            "simulation_params": {
                "simulation_start_year": 2026,
                "simulation_start_month": 5,
                "target_monthly_cashflow": 2000000,
                "national_pension_amount": 0,
                "simulation_years": 1,
            },
            "strategy_rules": {
                "corporate": {
                    "sgov_target_months": 40,
                    "november_sgov_target_months": 29,
                    "bond_floor_months": 10,
                    "bond_target_months": 16,
                    "bond_upper_months": 22,
                },
                "pension": {
                    "sgov_min_years": 3,
                    "sgov_floor_months": 10,
                    "bond_floor_months": 10,
                    "bond_target_months": 16,
                    "bond_upper_months": 22,
                },
            },
        },
    )

    response = local_client.get("/api/retirement/simulate")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    month1 = payload["data"]["monthly_data"][0]
    assert month1["month"] == 5
    assert month1["corp_sgov_months"] == pytest.approx(40.0)
    assert month1["corp_bond_months"] == pytest.approx(22.0)
    assert month1["pension_sgov_months"] == pytest.approx(36.0)
    assert month1["pension_bond_months"] == pytest.approx(22.0)


def test_retirement_simulation_august_review_does_not_sell_equity_when_bond_is_insufficient(
    tmp_path, monkeypatch
):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    local_client = TestClient(main_module.app)

    local_client.post(
        "/api/retirement/config",
        json={
            "user_profile": {
                "birth_year": 1980,
                "birth_month": 1,
                "private_pension_start_age": 65,
                "national_pension_start_age": 80,
            },
            "active_assumption_id": "v1",
            "assumptions": {
                "v1": {
                    "inflation_rate": 0.0,
                    "expected_return": 0.0,
                }
            },
            "corp_params": {
                "initial_investment": 100000000,
                "capital_stock": 0,
                "initial_shareholder_loan": 0,
                "monthly_salary": 0,
                "monthly_bookkeeping_fee": 0,
                "annual_corp_tax_adjustment_fee": 0,
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
                "simulation_start_month": 8,
                "target_monthly_cashflow": 4000000,
                "national_pension_amount": 0,
                "simulation_years": 1,
            },
            "planned_cashflows": [
                {
                    "id": "aug-outflow",
                    "name": "August Tax Event",
                    "year": 2026,
                    "month": 8,
                    "amount": 1000000,
                    "type": "OUTFLOW",
                    "entity": "CORP",
                }
            ],
        },
    )

    backend.get_active_master_portfolio = lambda: None
    backend.get_portfolio_by_id = lambda _portfolio_id: None
    backend.portfolios = []
    backend.get_standard_profile_return = lambda *_args, **_kwargs: 0.0
    backend.get_appreciation_rates_for_scenario = lambda *_args, **_kwargs: {
        "cash_sgov": 0.0,
        "bond_buffer": 0.0,
        "high_income": 0.0,
        "dividend_stocks": 0.0,
        "growth_stocks": 0.0,
    }
    backend.get_portfolio_stats_by_id = lambda _portfolio_id, *_args, **_kwargs: {
        "dividend_yield": 0.0,
        "expected_return": 0.0,
        "weights": {},
        "strategy_weights": {
            "SGOV Buffer": 0.0,
            "Bond Buffer": 0.05,
            "High Income": 0.0,
            "Dividend Growth": 0.0,
            "Growth Engine": 0.95,
        },
        "category_return_rates": {},
    }

    response = local_client.get("/api/retirement/simulate")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    month1 = payload["data"]["monthly_data"][0]
    assert month1["corp_sgov_balance"] == pytest.approx(4000000.0)
    assert month1["corp_bond_balance"] == pytest.approx(1000000.0)
    assert month1["corp_growth_balance"] == pytest.approx(95000000.0)


def test_retirement_simulation_november_rebalance_keeps_bond_at_upper_band_boundary(
    tmp_path, monkeypatch
):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    local_client = TestClient(main_module.app)

    local_client.post(
        "/api/retirement/config",
        json={
            "user_profile": {
                "birth_year": 1980,
                "birth_month": 1,
                "private_pension_start_age": 65,
                "national_pension_start_age": 80,
            },
            "active_assumption_id": "v1",
            "assumptions": {
                "v1": {
                    "inflation_rate": 0.0,
                    "expected_return": 0.0,
                }
            },
            "corp_params": {
                "initial_investment": 100000000,
                "capital_stock": 0,
                "initial_shareholder_loan": 0,
                "monthly_salary": 0,
                "monthly_bookkeeping_fee": 0,
                "annual_corp_tax_adjustment_fee": 0,
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
                "simulation_start_month": 11,
                "target_monthly_cashflow": 1000000,
                "national_pension_amount": 0,
                "simulation_years": 1,
            },
        },
    )

    backend.get_active_master_portfolio = lambda: None
    backend.get_portfolio_by_id = lambda _portfolio_id: None
    backend.portfolios = []
    backend.get_standard_profile_return = lambda *_args, **_kwargs: 0.0
    backend.get_appreciation_rates_for_scenario = lambda *_args, **_kwargs: {
        "cash_sgov": 0.0,
        "bond_buffer": 0.0,
        "high_income": 0.0,
        "dividend_stocks": 0.0,
        "growth_stocks": 0.0,
    }
    backend.get_portfolio_stats_by_id = lambda _portfolio_id, *_args, **_kwargs: {
        "dividend_yield": 0.0,
        "expected_return": 0.0,
        "weights": {},
        "strategy_weights": {
            "SGOV Buffer": 0.03,
            "Bond Buffer": 0.24,
            "High Income": 0.0,
            "Dividend Growth": 0.73,
            "Growth Engine": 0.0,
        },
        "category_return_rates": {},
    }

    response = local_client.get("/api/retirement/simulate")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    month1 = payload["data"]["monthly_data"][0]
    assert month1["pre_review_corp_bond_months"] == pytest.approx(24.0)
    assert month1["corp_bond_months"] == pytest.approx(24.0)
    assert month1["corp_sgov_months"] == pytest.approx(27.0)


def test_retirement_api_phase_two_reference_calendar_matches_document_buffer_months(
    tmp_path, monkeypatch
):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    local_client = TestClient(main_module.app)

    local_client.post(
        "/api/retirement/config",
        json={
            "user_profile": {
                "birth_year": 1970,
                "birth_month": 1,
                "private_pension_start_age": 55,
                "national_pension_start_age": 80,
            },
            "active_assumption_id": "v1",
            "assumptions": {
                "v1": {
                    "inflation_rate": 0.0,
                    "expected_return": 0.0,
                }
            },
            "corp_params": {
                "initial_investment": 600000000,
                "capital_stock": 0,
                "initial_shareholder_loan": 0,
                "monthly_salary": 0,
                "monthly_bookkeeping_fee": 0,
                "annual_corp_tax_adjustment_fee": 0,
                "employee_count": 0,
            },
            "pension_params": {
                "initial_investment": 120000000,
                "severance_reserve": 0,
                "other_reserve": 0,
                "monthly_withdrawal_target": 2500000,
            },
            "simulation_params": {
                "simulation_start_year": 2027,
                "simulation_start_month": 5,
                "target_monthly_cashflow": 11500000,
                "national_pension_amount": 0,
                "simulation_years": 2,
            },
        },
    )

    backend.get_active_master_portfolio = lambda: None
    backend.get_portfolio_by_id = lambda _portfolio_id: None
    backend.portfolios = []
    backend.get_standard_profile_return = lambda *_args, **_kwargs: 0.0
    backend.get_appreciation_rates_for_scenario = lambda *_args, **_kwargs: {
        "cash_sgov": 0.0,
        "bond_buffer": 0.0,
        "high_income": 0.0,
        "dividend_stocks": 0.0,
        "growth_stocks": 0.0,
    }

    def _stats(_portfolio_id, *_args, **_kwargs):
        if _portfolio_id is None:
            return {
                "dividend_yield": 0.0,
                "expected_return": 0.0,
                "weights": {},
                "strategy_weights": {},
                "category_return_rates": {},
            }
        return {
            "dividend_yield": 0.0,
            "expected_return": 0.0,
            "weights": {},
            "strategy_weights": (
                {
                    "SGOV Buffer": 0.0,
                    "Bond Buffer": 0.0,
                    "High Income": 1.0,
                    "Dividend Growth": 0.0,
                    "Growth Engine": 0.0,
                }
                if _portfolio_id == "corp"
                else {
                    "SGOV Buffer": 0.0,
                    "Bond Buffer": 0.0,
                    "High Income": 0.0,
                    "Dividend Growth": 1.0,
                    "Growth Engine": 0.0,
                }
            ),
            "category_return_rates": {},
        }

    backend.get_portfolio_stats_by_id = _stats
    backend.portfolios = [
        {
            "id": "corp",
            "name": "Reference Corporate",
            "account_type": "Corporate",
            "total_capital": 600000000,
        },
        {
            "id": "pension",
            "name": "Reference Pension",
            "account_type": "Pension",
            "total_capital": 120000000,
        },
    ]

    response = local_client.get("/api/retirement/simulate")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    monthly = {
        (m["year"], m["month"]): m for m in payload["data"]["monthly_data"]
    }

    may_2027 = monthly[(2027, 5)]
    oct_2027 = monthly[(2027, 10)]
    nov_2027 = monthly[(2027, 11)]
    apr_2028 = monthly[(2028, 4)]
    may_2028 = monthly[(2028, 5)]

    assert may_2027["phase"] == "Phase 2"
    assert may_2027["corp_monthly_need"] == 9000000
    assert may_2027["corp_sgov_months"] == pytest.approx(30.0)
    assert may_2027["pension_sgov_months"] == pytest.approx(24.0)
    assert oct_2027["corp_sgov_months"] == pytest.approx(25.0)
    assert nov_2027["pre_review_corp_sgov_months"] == pytest.approx(24.0)
    assert nov_2027["corp_sgov_months"] == pytest.approx(27.0)
    assert nov_2027["pension_sgov_months"] == pytest.approx(18.0)
    assert apr_2028["corp_sgov_months"] == pytest.approx(22.0)
    assert may_2028["pre_review_corp_sgov_months"] == pytest.approx(21.0)
    assert may_2028["corp_sgov_months"] == pytest.approx(30.0)
    assert may_2028["pension_sgov_months"] == pytest.approx(24.0)


def test_retirement_api_shock_flag_freezes_next_may_inflation_even_when_assets_are_healthy(
    tmp_path, monkeypatch
):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    local_client = TestClient(main_module.app)

    local_client.post(
        "/api/retirement/config",
        json={
            "user_profile": {
                "birth_year": 1980,
                "birth_month": 1,
                "private_pension_start_age": 65,
                "national_pension_start_age": 80,
            },
            "active_assumption_id": "v1",
            "assumptions": {
                "v1": {
                    "inflation_rate": 0.10,
                    "expected_return": 0.0,
                }
            },
            "corp_params": {
                "initial_investment": 120000000,
                "capital_stock": 0,
                "initial_shareholder_loan": 0,
                "monthly_salary": 0,
                "monthly_bookkeeping_fee": 0,
                "annual_corp_tax_adjustment_fee": 0,
                "employee_count": 0,
            },
            "pension_params": {
                "initial_investment": 60000000,
                "severance_reserve": 0,
                "other_reserve": 0,
                "monthly_withdrawal_target": 0,
            },
            "simulation_params": {
                "simulation_start_year": 2026,
                "simulation_start_month": 5,
                "target_monthly_cashflow": 1000000,
                "national_pension_amount": 0,
                "simulation_years": 2,
            },
        },
    )

    backend.get_active_master_portfolio = lambda: None
    backend.get_portfolio_by_id = lambda _portfolio_id: None
    backend.portfolios = [
        {
            "id": "corp",
            "name": "Shock Corporate",
            "account_type": "Corporate",
            "total_capital": 120000000,
        },
        {
            "id": "pension",
            "name": "Shock Pension",
            "account_type": "Pension",
            "total_capital": 60000000,
        },
    ]
    backend.get_standard_profile_return = lambda *_args, **_kwargs: 0.0
    backend.get_appreciation_rates_for_scenario = lambda *_args, **_kwargs: {
        "cash_sgov": 0.0,
        "bond_buffer": 0.0,
        "high_income": 0.0,
        "dividend_stocks": 0.0,
        "growth_stocks": 0.0,
    }

    def _stats(_portfolio_id, *_args, **_kwargs):
        return {
            "dividend_yield": 0.0,
            "expected_return": 0.0,
            "weights": {},
            "strategy_weights": (
                {
                    "SGOV Buffer": 0.30,
                    "Bond Buffer": 0.20,
                    "High Income": 0.0,
                    "Dividend Growth": 0.0,
                    "Growth Engine": 0.50,
                }
                if _portfolio_id == "corp"
                else {
                    "SGOV Buffer": 1.0,
                    "Bond Buffer": 0.0,
                    "High Income": 0.0,
                    "Dividend Growth": 0.0,
                    "Growth Engine": 0.0,
                }
            ),
            "category_return_rates": {},
        }

    backend.get_portfolio_stats_by_id = _stats
    original_run = main_module.projection_engine.run_30yr_simulation

    def _run_with_override(initial_assets, params):
        params = dict(params)
        params["monthly_return_overrides"] = {
            "corp": {
                "Growth Engine": {
                    "2026-06": {"pa": -2.5, "dy": 0.0},
                }
            }
        }
        return original_run(initial_assets, params)

    monkeypatch.setattr(main_module.projection_engine, "run_30yr_simulation", _run_with_override)

    response = local_client.get("/api/retirement/simulate")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    monthly = {
        (m["year"], m["month"]): m for m in payload["data"]["monthly_data"]
    }

    june = monthly[(2026, 6)]
    april_next = monthly[(2027, 4)]
    may_next = monthly[(2027, 5)]

    assert june["shock_flag"] is True
    assert april_next["shock_flag"] is True
    assert may_next["inflation_action"] == "frozen"
    assert may_next["shock_flag"] is False


def test_retirement_simulation_meta_pa_rate_follows_master_category_mix(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    growth_master_id = _create_retirement_master(
        backend,
        name="Retirement Growth Mix",
        corp_category="Growth Engine",
        pension_category="Growth Engine",
    )
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    client.post(
        "/api/retirement/config",
        json={
            "active_assumption_id": "v1",
            "user_profile": {
                "birth_year": 1972,
                "birth_month": 3,
            },
            "corp_params": {
                "initial_investment": 100000000,
                "capital_stock": 0,
                "initial_shareholder_loan": 0,
                "monthly_salary": 0,
                "monthly_bookkeeping_fee": 0,
                "annual_corp_tax_adjustment_fee": 0,
                "employee_count": 0,
            },
            "pension_params": {
                "initial_investment": 100000000,
                "severance_reserve": 0,
                "other_reserve": 0,
                "monthly_withdrawal_target": 0,
            },
            "simulation_params": {
                "simulation_start_year": 2026,
                "simulation_start_month": 1,
                "target_monthly_cashflow": 0,
                "national_pension_amount": 0,
                "simulation_years": 1,
            },
        },
    )

    response = client.get("/api/retirement/simulate")
    assert response.status_code == 200
    assert response.json()["success"] is True

    meta = response.json()["data"]["meta"]
    assert meta["master_name"] == "Retirement Growth Mix"
    assert meta["combined_dy"] == pytest.approx(0.04)
    assert meta["combined_tr"] == pytest.approx(0.115)
    assert meta["pa_rate"] == pytest.approx(0.075)
    assert meta["pa_scenario"] == "base"

    conservative_master_id = _create_retirement_master(
        backend,
        name="Retirement Conservative Mix",
        corp_category="High Income",
        pension_category="Bond Buffer",
    )
    assert conservative_master_id != growth_master_id

    response = client.get("/api/retirement/simulate")
    assert response.status_code == 200
    assert response.json()["success"] is True

    conservative_meta = response.json()["data"]["meta"]
    assert conservative_meta["master_name"] == "Retirement Conservative Mix"
    assert conservative_meta["combined_dy"] == pytest.approx(0.04)
    assert conservative_meta["combined_tr"] == pytest.approx(0.0465)
    assert conservative_meta["pa_rate"] == pytest.approx(0.0065)


def test_retirement_simulation_uses_category_return_rates_from_saved_portfolio(
    tmp_path, monkeypatch
):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    corp_portfolio = backend.add_portfolio(
        name="Reference Corporate",
        account_type="Corporate",
        total_capital=100000000,
        currency="USD",
        items=[
            {
                "ticker": "VGIT",
                "name": "VGIT",
                "weight": 50,
                "category": "Bond Buffer",
                "dividend_yield": 4.0,
            },
            {
                "ticker": "VOO",
                "name": "VOO",
                "weight": 50,
                "category": "Growth Engine",
                "dividend_yield": 1.5,
            },
        ],
    )["data"]
    pension_portfolio = backend.add_portfolio(
        name="Reference Pension",
        account_type="Pension",
        total_capital=100000000,
        currency="USD",
        items=[
            {
                "ticker": "SGOV",
                "name": "SGOV",
                "weight": 100,
                "category": "SGOV Buffer",
                "dividend_yield": 3.5,
            }
        ],
    )["data"]
    master = backend.add_master_portfolio(
        name="Reference Rates",
        corp_id=corp_portfolio["id"],
        pension_id=pension_portfolio["id"],
    )["data"]
    backend.activate_master_portfolio(str(master["id"]))
    monkeypatch.setattr(main_module, "backend", backend)
    local_client = TestClient(main_module.app)

    local_client.post(
        "/api/retirement/config",
        json={
            "active_assumption_id": "v1",
            "assumptions": {
                "v1": {
                    "name": "Standard Profile",
                    "expected_return": 0.0,
                    "inflation_rate": 0.0,
                }
            },
            "corp_params": {
                "initial_investment": 120000,
                "capital_stock": 0,
                "initial_shareholder_loan": 0,
                "monthly_salary": 0,
                "monthly_bookkeeping_fee": 0,
                "annual_corp_tax_adjustment_fee": 0,
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
                "target_monthly_cashflow": 0,
                "national_pension_amount": 0,
                "simulation_years": 1,
            },
        },
    )

    response = local_client.get("/api/retirement/simulate?pa_scenario=base")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    month1 = payload["data"]["monthly_data"][0]
    assert month1["corp_bond_balance"] == pytest.approx(59990.0)
    assert month1["corp_growth_balance"] == pytest.approx(60375.0)
    assert month1["corp_sgov_balance"] == pytest.approx(275.0)


def test_run_retirement_simulation_applies_national_pension_income_from_configured_age():
    """국민연금 개시 연령과 월 수령액이 Phase 3 현금흐름에 반영되어야 한다."""
    live_backend = main_module.backend
    client.post(
        "/api/retirement/config",
        json={
            "user_profile": {
                "birth_year": 1961,
                "birth_month": 1,
                "private_pension_start_age": 65,
                "national_pension_start_age": 65,
            },
            "active_assumption_id": "v1",
            "assumptions": {
                "v1": {
                    "inflation_rate": 0.0,
                    "expected_return": 0.0,
                }
            },
            "corp_params": {
                "initial_investment": 12000,
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
                "national_pension_amount": 1000,
                "simulation_years": 1,
            },
        },
    )

    original_get_active_master_portfolio = live_backend.get_active_master_portfolio
    original_get_portfolio_by_id = live_backend.get_portfolio_by_id
    original_portfolios = live_backend.portfolios
    original_get_portfolio_stats_by_id = live_backend.get_portfolio_stats_by_id
    original_get_standard_profile_return = live_backend.get_standard_profile_return

    try:
        live_backend.get_active_master_portfolio = lambda: None
        live_backend.get_portfolio_by_id = lambda _portfolio_id: None
        live_backend.portfolios = []
        live_backend.get_standard_profile_return = lambda *_args, **_kwargs: 0.0
        live_backend.get_portfolio_stats_by_id = lambda _portfolio_id, *_args, **_kwargs: {
            "dividend_yield": 0.0,
            "expected_return": 0.0,
            "weights": {"Growth": 1.0},
        }

        response = client.get("/api/retirement/simulate")
    finally:
        live_backend.get_active_master_portfolio = original_get_active_master_portfolio
        live_backend.get_portfolio_by_id = original_get_portfolio_by_id
        live_backend.portfolios = original_portfolios
        live_backend.get_standard_profile_return = original_get_standard_profile_return
        live_backend.get_portfolio_stats_by_id = original_get_portfolio_stats_by_id

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    month1 = payload["data"]["monthly_data"][0]
    assert month1["month"] == 1
    assert month1["phase"] == "Phase 3"
    assert month1["corp_monthly_need"] == 0
    assert month1["corp_balance"] >= 12000


def test_run_retirement_simulation_rejects_broken_active_master_reference():
    """활성 마스터 전략의 포트폴리오 참조가 깨지면 시뮬레이션은 실패해야 한다."""
    live_backend = main_module.backend
    original_get_active_master_portfolio = live_backend.get_active_master_portfolio
    original_calculate_master_portfolio_tr = live_backend.calculate_master_portfolio_tr

    try:
        live_backend.get_active_master_portfolio = lambda: {
            "id": "broken-master",
            "name": "Broken Master",
            "corp_id": "missing-corp",
            "pension_id": None,
            "is_active": True,
        }
        live_backend.calculate_master_portfolio_tr = lambda *_args, **_kwargs: {
            "success": False,
            "message": "broken portfolio references: corp_id=missing-corp",
            "data": {
                "corp_portfolio": None,
                "pension_portfolio": None,
                "missing_refs": ["corp_id=missing-corp"],
                "is_broken": True,
            },
        }

        response = client.get("/api/retirement/simulate")
    finally:
        live_backend.get_active_master_portfolio = original_get_active_master_portfolio
        live_backend.calculate_master_portfolio_tr = original_calculate_master_portfolio_tr

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is False
    assert payload["broken_reference"] is True
    assert "broken portfolio references" in payload["message"]
