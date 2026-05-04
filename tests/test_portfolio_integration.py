import pytest
from fastapi.testclient import TestClient

import src.backend.main as main_module
from src.backend.api import DividendBackend
from src.backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


def _create_single_category_master(
    backend: DividendBackend,
    *,
    name: str,
    corp_category: str,
    pension_category: str,
    corp_dividend_yield: float,
    pension_dividend_yield: float,
) -> None:
    corp_portfolio = backend.add_portfolio(
        name=f"{name} Corporate",
        account_type="Corporate",
        total_capital=1000000000,
        currency="KRW",
        items=[
            {
                "symbol": "TEST-CORP",
                "name": f"{name} Corp",
                "weight": 100,
                "category": corp_category,
                "dividend_yield": corp_dividend_yield,
            }
        ],
    )["data"]
    pension_portfolio = backend.add_portfolio(
        name=f"{name} Pension",
        account_type="Pension",
        total_capital=500000000,
        currency="KRW",
        items=[
            {
                "symbol": "TEST-PEN",
                "name": f"{name} Pension",
                "weight": 100,
                "category": pension_category,
                "dividend_yield": pension_dividend_yield,
            }
        ],
    )["data"]
    master = backend.add_master_portfolio(
        name=name,
        corp_id=corp_portfolio["id"],
        pension_id=pension_portfolio["id"],
    )["data"]
    backend.activate_master_portfolio(master["id"])


def test_portfolio_integration_yield_mapping(tmp_path, monkeypatch):
    """
    [TEST-RAMS-1.4.2] 가중 평균 수익률(WARR) 검증
    포트폴리오의 배당률이 은퇴 시뮬레이션 결과에 정확히 반영되는지 확인합니다.
    """
    isolated_backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    _create_single_category_master(
        isolated_backend,
        name="Yield Mapping Master",
        corp_category="High Income",
        pension_category="Bond Buffer",
        corp_dividend_yield=10.0,
        pension_dividend_yield=2.0,
    )
    monkeypatch.setattr(main_module, "backend", isolated_backend)
    client = TestClient(main_module.app)

    # 2. 은퇴 설정 준비 (필수 필드 채우기)
    config = {
        "user_profile": {
            "birth_year": 1980,
            "birth_month": 1,
            "private_pension_start_age": 55,
            "national_pension_start_age": 65,
        },
        "simulation_params": {
            "target_monthly_cashflow": 5000000,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "national_pension_amount": 1000000,
            "simulation_years": 1,
        },
        "corp_params": {
            "initial_investment": 1000000000,
            "monthly_salary": 2000000,
            "monthly_fixed_cost": 500000,
            "employee_count": 1,
            "initial_shareholder_loan": 500000000,
        },
        "pension_params": {"monthly_withdrawal_target": 2000000, "initial_investment": 500000000},
        "assumptions": {"custom": {"expected_return": 0.05, "inflation_rate": 0.02}},
        "active_assumption_id": "custom",
        "tax_and_insurance": {
            "point_unit_price": 200,
            "ltc_rate": 0.12,
            "corp_tax_threshold": 200000000,
            "corp_tax_low_rate": 0.1,
            "corp_tax_high_rate": 0.2,
            "pension_rate": 0.045,
            "health_rate": 0.035,
            "employment_rate": 0.009,
            "income_tax_estimate_rate": 0.15,
        },
    }
    isolated_backend.update_retirement_config(config)

    # 3. 시뮬레이션 실행
    response = client.get("/api/retirement/simulate")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # 4. 검증: 메타데이터에 포트폴리오 정보가 포함되는가
    meta = data["data"].get("meta", {})
    assert meta["master_name"] == "Yield Mapping Master"
    assert meta["used_portfolios"]["corp"]["name"] == "Yield Mapping Master Corporate"
    assert "10.00%" in meta["used_portfolios"]["corp"]["yield"]
    assert meta["used_portfolios"]["pension"]["name"] == "Yield Mapping Master Pension"
    assert "2.00%" in meta["used_portfolios"]["pension"]["yield"]
    expected_combined_dy = (10.0 * 1000000000 + 2.0 * 500000000) / 1500000000 / 100
    assert meta["combined_dy"] == pytest.approx(expected_combined_dy)

    # 5. 검증: 첫 달 결과에 실제 사용된 포트폴리오 잔액이 노출되는가
    first_month = data["data"]["monthly_data"][0]
    assert first_month["corp_high_income_balance"] > 0
    assert first_month["pension_bond_balance"] > 0


def test_retirement_simulation_changes_when_pa_scenario_changes(tmp_path, monkeypatch):
    """
    PA 시나리오 변경이 그래프 원본 데이터에 반영되는지 검증합니다.
    """
    isolated_backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    _create_single_category_master(
        isolated_backend,
        name="Growth Sensitive Master",
        corp_category="Growth Engine",
        pension_category="Growth Engine",
        corp_dividend_yield=0.0,
        pension_dividend_yield=0.0,
    )
    monkeypatch.setattr(main_module, "backend", isolated_backend)
    client = TestClient(main_module.app)

    isolated_backend.update_retirement_config(
        {
            "simulation_params": {
                "target_monthly_cashflow": 2000000,
                "simulation_start_year": 2026,
                "simulation_start_month": 1,
                "national_pension_amount": 0,
                "simulation_years": 5,
            },
            "corp_params": {
                "initial_investment": 500000000,
                "monthly_salary": 0,
                "monthly_fixed_cost": 0,
                "employee_count": 0,
                "initial_shareholder_loan": 0,
            },
            "pension_params": {
                "initial_investment": 500000000,
                "monthly_withdrawal_target": 0,
            },
            "user_profile": {
                "birth_year": 1980,
                "birth_month": 1,
                "private_pension_start_age": 80,
                "national_pension_start_age": 90,
            },
            "assumptions": {
                "custom": {
                    "expected_return": 0.05,
                    "inflation_rate": 0.0,
                }
            },
            "active_assumption_id": "custom",
        }
    )
    low_response = client.get("/api/retirement/simulate?pa_scenario=conservative")
    assert low_response.status_code == 200
    low_data = low_response.json()
    assert low_data["success"] is True
    low_final_net_worth = low_data["data"]["monthly_data"][-1]["total_net_worth"]

    high_response = client.get("/api/retirement/simulate?pa_scenario=optimistic")
    assert high_response.status_code == 200
    high_data = high_response.json()
    assert high_data["success"] is True
    high_final_net_worth = high_data["data"]["monthly_data"][-1]["total_net_worth"]

    assert high_final_net_worth > low_final_net_worth
