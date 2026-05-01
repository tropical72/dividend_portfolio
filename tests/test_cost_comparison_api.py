import json

import pytest
from fastapi.testclient import TestClient

import src.backend.main as main_module
from src.backend.api import DividendBackend


def _build_config_payload():
    return {
        "master_portfolio_id": None,
        "simulation_mode": "target",
        "household": {
            "members": [
                {
                    "id": "self",
                    "relationship": "self",
                    "birth_year": 1972,
                    "birth_month": 8,
                    "is_financially_dependent": False,
                    "has_income": False,
                    "notes": "",
                },
                {
                    "id": "spouse",
                    "relationship": "spouse",
                    "birth_year": 1974,
                    "birth_month": 3,
                    "is_financially_dependent": False,
                    "has_income": False,
                    "notes": "",
                },
            ]
        },
        "personal_assets": {
            "investment_assets": 1600000000,
            "personal_pension_assets": 700000000,
        },
        "real_estate": {
            "official_price": 650000000,
            "ownership_ratio": 0.5,
        },
        "assumptions": {
            "price_appreciation_rate": 3.0,
            "simulation_years": 5,
            "target_monthly_household_cash_after_tax": 10000000,
        },
        "corporate": {
            "salary_recipients": [
                {
                    "id": "self-salary",
                    "name": "본인",
                    "relationship": "self",
                    "monthly_salary": 3000000,
                    "is_employee_insured": True,
                }
            ],
            "monthly_fixed_cost": 500000,
            "corp_tax_nominal_rate": 0.1,
            "initial_shareholder_loan": 500000000,
            "annual_shareholder_loan_repayment": 108000000,
        },
        "policy_meta": {
            "base_year": 2026,
        },
    }


def _create_high_yield_master(backend: DividendBackend) -> str:
    corp_portfolio = backend.add_portfolio(
        name="CCS High Yield Corporate",
        account_type="Corporate",
        total_capital=100000000,
        currency="USD",
        items=[
            {
                "ticker": "HIGHC",
                "name": "High Yield Corp",
                "weight": 100,
                "category": "High Income",
                "dividend_yield": 12.0,
            }
        ],
    )["data"]
    pension_portfolio = backend.add_portfolio(
        name="CCS High Yield Pension",
        account_type="Pension",
        total_capital=100000000,
        currency="USD",
        items=[
            {
                "ticker": "HIGHP",
                "name": "High Yield Pension",
                "weight": 100,
                "category": "Dividend Growth",
                "dividend_yield": 9.0,
            }
        ],
    )["data"]
    master = backend.add_master_portfolio(
        name="CCS High Yield Master",
        corp_id=corp_portfolio["id"],
        pension_id=pension_portfolio["id"],
    )["data"]
    return str(master["id"])


def test_cost_comparison_config_persistence(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    payload = _build_config_payload()
    payload["master_portfolio_id"] = backend.DEFAULT_MASTER_PORTFOLIO_ID

    save_response = client.post("/api/cost-comparison/config", json=payload)
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    get_response = client.get("/api/cost-comparison/config")
    assert get_response.status_code == 200
    data = get_response.json()["data"]

    assert data["personal_assets"]["investment_assets"] == 1600000000
    assert data["real_estate"]["ownership_ratio"] == 0.5
    assert data["master_portfolio_id"] == backend.DEFAULT_MASTER_PORTFOLIO_ID
    assert data["assumptions"]["price_appreciation_rate"] == 3.0
    assert data["assumptions"]["target_monthly_household_cash_after_tax"] == 10000000
    assert data["corporate"]["salary_recipients"][0]["monthly_salary"] == 3000000
    assert data["corporate"]["corp_tax_nominal_rate"] == 0.1

    with open(tmp_path / "cost_comparison_config.json", "r", encoding="utf-8") as handle:
        saved = json.load(handle)

    assert saved["assumptions"]["simulation_years"] == 5
    assert saved["master_portfolio_id"] == backend.DEFAULT_MASTER_PORTFOLIO_ID
    assert saved["corporate"]["corp_tax_nominal_rate"] == 0.1
    assert saved["corporate"]["annual_shareholder_loan_repayment"] == 108000000


def test_cost_comparison_run_uses_active_master_and_returns_kpis(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    save_response = client.post("/api/cost-comparison/config", json=_build_config_payload())
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200

    body = run_response.json()
    assert body["success"] is True

    data = body["data"]
    assumptions = data["assumptions"]
    personal = data["personal"]
    corporate = data["corporate"]
    comparison = data["comparison"]

    assert assumptions["portfolio_name"]
    assert assumptions["master_portfolio_id"] == backend.DEFAULT_MASTER_PORTFOLIO_ID
    assert assumptions["dy"] > 0
    assert assumptions["tr"] == assumptions["dy"] + assumptions["pa"]
    assert assumptions["simulation_years"] == 5
    assert assumptions["target_monthly_household_cash_after_tax"] == 10000000
    assert assumptions["corporate_portfolio_name"]
    assert assumptions["pension_portfolio_name"]

    assert personal["kpis"]["annual_total_cost"] > 0
    assert personal["kpis"]["annual_health_insurance"] > 0
    assert corporate["kpis"]["monthly_disposable_cashflow"] == 10000000
    assert len(personal["series"]) == 5
    assert len(corporate["series"]) == 5

    assert comparison["winner"] in {"personal", "corporate", "tie"}
    assert comparison["winner_basis"] == "annual_net_cashflow"
    assert len(comparison["top_drivers"]) == 3
    assert all(driver["label"] != "주주대여금 상환" for driver in comparison["top_drivers"])
    assert (
        personal["kpis"]["annual_health_insurance"] != corporate["kpis"]["annual_health_insurance"]
    )
    assert personal["kpis"]["required_assets"] > 0
    assert corporate["kpis"]["required_assets"] > 0
    assert "annual_net_cashflow" in personal["kpis"]
    assert "annual_net_cashflow" in corporate["kpis"]
    assert corporate["breakdown"]["audit_details"]["corp_tax"]["nominal_rate"] == 0.1
    assert corporate["breakdown"]["audit_details"]["corp_tax"]["effective_rate"] == 0.11


def test_cost_comparison_run_uses_saved_master_portfolio_override(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    custom_master_id = _create_high_yield_master(backend)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    active_payload = _build_config_payload()
    active_payload["simulation_mode"] = "asset"
    active_response = client.post("/api/cost-comparison/run", json=active_payload)
    assert active_response.status_code == 200
    assert active_response.json()["success"] is True

    override_payload = _build_config_payload()
    override_payload["simulation_mode"] = "asset"
    override_payload["master_portfolio_id"] = custom_master_id
    save_response = client.post("/api/cost-comparison/config", json=override_payload)
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    active_data = active_response.json()["data"]
    override_data = run_response.json()["data"]

    assert override_data["assumptions"]["master_portfolio_id"] == custom_master_id
    assert override_data["assumptions"]["master_portfolio_name"] == "CCS High Yield Master"
    assert override_data["assumptions"]["corporate_portfolio_name"] == "CCS High Yield Corporate"
    assert override_data["assumptions"]["pension_portfolio_name"] == "CCS High Yield Pension"
    assert override_data["assumptions"]["dy"] > active_data["assumptions"]["dy"]
    assert override_data["assumptions"]["tr"] > active_data["assumptions"]["tr"]
    assert (
        override_data["personal"]["breakdown"]["annual_revenue"]
        > active_data["personal"]["breakdown"]["annual_revenue"]
    )


def test_cost_comparison_run_fails_when_saved_master_portfolio_is_missing(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    payload = _build_config_payload()
    payload["master_portfolio_id"] = "missing-master-id"

    save_response = client.post("/api/cost-comparison/config", json=payload)
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    body = run_response.json()

    assert body["success"] is False
    assert "master portfolio" in body["message"]


def test_cost_comparison_corporate_tax_rate_override_changes_tax(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    base_payload = _build_config_payload()
    base_payload["simulation_mode"] = "asset"
    base_payload["personal_assets"]["investment_assets"] = 5000000000

    low_response = client.post("/api/cost-comparison/run", json=base_payload)
    assert low_response.status_code == 200
    assert low_response.json()["success"] is True

    high_payload = _build_config_payload()
    high_payload["simulation_mode"] = "asset"
    high_payload["personal_assets"]["investment_assets"] = 5000000000
    high_payload["corporate"]["corp_tax_nominal_rate"] = 0.22

    high_response = client.post("/api/cost-comparison/run", json=high_payload)
    assert high_response.status_code == 200
    assert high_response.json()["success"] is True

    low_tax = low_response.json()["data"]["corporate"]["breakdown"]["tax"]
    high_tax = high_response.json()["data"]["corporate"]["breakdown"]["tax"]
    high_audit = high_response.json()["data"]["corporate"]["breakdown"]["audit_details"]["corp_tax"]

    assert high_tax > low_tax
    assert high_audit["nominal_rate"] == 0.22
    assert high_audit["effective_rate"] == pytest.approx(0.242)


def test_cost_comparison_winner_follows_higher_annual_net_cashflow(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    save_response = client.post("/api/cost-comparison/config", json=_build_config_payload())
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    data = run_response.json()["data"]
    personal_net_cash = data["personal"]["kpis"]["annual_net_cashflow"]
    corporate_net_cash = data["corporate"]["kpis"]["annual_net_cashflow"]
    winner = data["comparison"]["winner"]

    expected_winner = (
        "tie"
        if corporate_net_cash == pytest.approx(personal_net_cash)
        else ("corporate" if corporate_net_cash > personal_net_cash else "personal")
    )
    assert winner == expected_winner


def test_cost_comparison_winner_and_drivers_ignore_shareholder_loan_extraction_path(
    tmp_path, monkeypatch
):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    payload = _build_config_payload()
    payload["corporate"]["annual_shareholder_loan_repayment"] = 0

    save_response = client.post("/api/cost-comparison/config", json=payload)
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    data = run_response.json()["data"]
    comparison = data["comparison"]
    corporate = data["corporate"]

    assert comparison["winner_basis"] == "annual_net_cashflow"
    assert all(driver["label"] != "주주대여금 상환" for driver in comparison["top_drivers"])
    assert corporate["kpis"]["annual_net_cashflow"] == pytest.approx(
        corporate["breakdown"]["net_corporate_cash"] + corporate["breakdown"]["net_salary"]
    )


def test_cost_comparison_target_mode_corporate_net_cashflow_combines_company_cash_and_net_salary(
    tmp_path, monkeypatch
):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    payload = _build_config_payload()
    payload["assumptions"]["simulation_years"] = 10
    payload["personal_assets"]["investment_assets"] = 2500000000
    payload["corporate"]["initial_shareholder_loan"] = 500000000

    save_response = client.post("/api/cost-comparison/config", json=payload)
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    corporate = run_response.json()["data"]["corporate"]

    assert corporate["kpis"]["asset_margin_vs_current"] >= 0
    assert corporate["kpis"]["achieves_target_with_current_assets"] is True
    assert corporate["kpis"]["annual_net_cashflow"] == pytest.approx(
        corporate["breakdown"]["net_corporate_cash"] + corporate["breakdown"]["net_salary"]
    )


def test_cost_comparison_run_compounds_net_worth_over_years(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    save_response = client.post("/api/cost-comparison/config", json=_build_config_payload())
    assert save_response.status_code == 200

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    personal_series = run_response.json()["data"]["personal"]["series"]
    corporate_series = run_response.json()["data"]["corporate"]["series"]

    assert len(personal_series) == 5
    assert len(corporate_series) == 5
    assert (
        personal_series[1]["cumulative_household_cash"]
        > personal_series[0]["cumulative_household_cash"]
    )
    assert (
        corporate_series[1]["cumulative_household_cash"]
        > corporate_series[0]["cumulative_household_cash"]
    )
    assert personal_series[-1]["total_economic_value"] >= personal_series[-1]["net_worth"]
    assert corporate_series[-1]["disposable_cash"] >= 0


def test_cost_comparison_run_emits_outside_income_warning(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    payload = _build_config_payload()
    payload["personal_assets"]["investment_assets"] = 3000000000
    save_response = client.post("/api/cost-comparison/config", json=payload)
    assert save_response.status_code == 200

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    warnings = run_response.json()["data"]["warnings"]
    assert any("보수 외 소득월액보험료" in warning for warning in warnings)


def test_cost_comparison_corporate_series_excludes_loan_repayment_from_asset_balance(
    tmp_path, monkeypatch
):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    payload = _build_config_payload()
    payload["assumptions"]["simulation_years"] = 1

    save_response = client.post("/api/cost-comparison/config", json=payload)
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    data = run_response.json()["data"]
    corporate_series_value = data["corporate"]["series"][0]["net_worth"]
    total_value = data["corporate"]["series"][0]["total_economic_value"]
    household_cash = data["corporate"]["series"][0]["cumulative_household_cash"]

    assert total_value == corporate_series_value + household_cash


def test_cost_comparison_run_returns_revenue_and_withholding_breakdown(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    save_response = client.post("/api/cost-comparison/config", json=_build_config_payload())
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    data = run_response.json()["data"]
    personal_breakdown = data["personal"]["breakdown"]
    corporate_breakdown = data["corporate"]["breakdown"]

    assert personal_breakdown["annual_revenue"] > 0
    assert corporate_breakdown["annual_revenue"] > 0
    assert personal_breakdown["payroll_tax_withholding"] == 0
    assert corporate_breakdown["payroll_tax_withholding"] >= 0
    assert corporate_breakdown["net_salary"] > 0


def test_cost_comparison_run_returns_split_cumulative_value_series(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    save_response = client.post("/api/cost-comparison/config", json=_build_config_payload())
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    data = run_response.json()["data"]
    personal_point = data["personal"]["series"][-1]
    corporate_point = data["corporate"]["series"][-1]

    assert personal_point["cumulative_household_cash"] > 0
    assert personal_point["total_economic_value"] == (
        personal_point["net_worth"] + personal_point["cumulative_household_cash"]
    )
    assert corporate_point["total_economic_value"] == (
        corporate_point["net_worth"] + corporate_point["cumulative_household_cash"]
    )


def test_cost_comparison_run_returns_sustainability_series(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    save_response = client.post("/api/cost-comparison/config", json=_build_config_payload())
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    data = run_response.json()["data"]
    personal = data["personal"]
    corporate = data["corporate"]

    assert len(personal["sustainability_series"]) == 5
    assert len(corporate["sustainability_series"]) == 5
    assert "years_fully_funded" in personal["sustainability"]
    assert "years_fully_funded" in corporate["sustainability"]
    assert corporate["sustainability_series"][0]["household_cash"] >= 0
    assert corporate["sustainability"]["final_asset_balance"] >= 0


def test_cost_comparison_run_honors_nested_asset_mode_override(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    payload = _build_config_payload()
    payload["simulation_mode"] = "asset"

    save_response = client.post("/api/cost-comparison/config", json=payload)
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    data = run_response.json()["data"]
    assert data["assumptions"]["simulation_mode"] == "asset"
    assert data["personal"]["kpis"]["required_assets"] == (
        payload["personal_assets"]["investment_assets"]
    )


def test_personal_asset_driven_series_does_not_double_count_household_cash(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    payload = _build_config_payload()
    payload["simulation_mode"] = "asset"
    payload["assumptions"]["simulation_years"] = 2

    save_response = client.post("/api/cost-comparison/config", json=payload)
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    run_response = client.post("/api/cost-comparison/run", json={})
    assert run_response.status_code == 200
    assert run_response.json()["success"] is True

    personal_series = run_response.json()["data"]["personal"]["series"]
    assert personal_series[0]["cumulative_household_cash"] == 0
    assert personal_series[0]["total_economic_value"] == personal_series[0]["net_worth"]
