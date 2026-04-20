import json

from fastapi.testclient import TestClient

import src.backend.main as main_module
from src.backend.api import DividendBackend


def _build_config_payload():
    return {
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
            "initial_shareholder_loan": 500000000,
            "annual_shareholder_loan_repayment": 108000000,
        },
        "policy_meta": {
            "base_year": 2026,
        },
    }


def test_cost_comparison_config_persistence(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    payload = _build_config_payload()

    save_response = client.post("/api/cost-comparison/config", json=payload)
    assert save_response.status_code == 200
    assert save_response.json()["success"] is True

    get_response = client.get("/api/cost-comparison/config")
    assert get_response.status_code == 200
    data = get_response.json()["data"]

    assert data["personal_assets"]["investment_assets"] == 1600000000
    assert data["real_estate"]["ownership_ratio"] == 0.5
    assert data["assumptions"]["price_appreciation_rate"] == 3.0
    assert data["assumptions"]["target_monthly_household_cash_after_tax"] == 10000000
    assert data["corporate"]["salary_recipients"][0]["monthly_salary"] == 3000000

    with open(tmp_path / "cost_comparison_config.json", "r", encoding="utf-8") as handle:
        saved = json.load(handle)

    assert saved["assumptions"]["simulation_years"] == 5
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
    assert assumptions["dy"] > 0
    assert assumptions["tr"] == assumptions["dy"] + assumptions["pa"]
    assert assumptions["simulation_years"] == 5
    assert assumptions["target_monthly_household_cash_after_tax"] == 10000000

    assert personal["kpis"]["annual_total_cost"] > 0
    assert personal["kpis"]["annual_health_insurance"] > 0
    assert corporate["kpis"]["monthly_disposable_cashflow"] == 10000000
    assert len(personal["series"]) == 5
    assert len(corporate["series"]) == 5

    assert comparison["winner"] in {"personal", "corporate"}
    assert comparison["winner_basis"] == "annual_total_cost"
    assert len(comparison["top_drivers"]) == 3
    assert (
        personal["kpis"]["annual_health_insurance"] != corporate["kpis"]["annual_health_insurance"]
    )
    assert personal["kpis"]["required_assets"] > 0
    assert corporate["kpis"]["required_assets"] > 0


def test_cost_comparison_winner_follows_lower_annual_total_cost(tmp_path, monkeypatch):
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
    personal_cost = data["personal"]["kpis"]["annual_total_cost"]
    corporate_cost = data["corporate"]["kpis"]["annual_total_cost"]
    winner = data["comparison"]["winner"]

    expected_winner = "corporate" if corporate_cost <= personal_cost else "personal"
    assert winner == expected_winner


def test_cost_comparison_corporate_feasibility_separates_assets_and_loan_capacity(
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
    assert corporate["kpis"]["loan_capacity_sufficient"] is False
    assert corporate["kpis"]["achieves_target_with_current_setup"] is False


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
    assert "cumulative_loan_repayment" in corporate_series[0]
    assert (
        corporate_series[-1]["cumulative_loan_repayment"]
        >= corporate_series[0]["cumulative_loan_repayment"]
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
    assert (
        corporate_point["cumulative_household_cash"] >= corporate_point["cumulative_loan_repayment"]
    )
    assert corporate_point["total_economic_value"] == (
        corporate_point["net_worth"] + corporate_point["cumulative_household_cash"]
    )


def test_cost_comparison_run_returns_sustainability_series_and_loan_gap(tmp_path, monkeypatch):
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
    required_loan = corporate["breakdown"]["required_shareholder_loan_repayment"]
    configured_loan = corporate["breakdown"]["configured_annual_loan_target"]
    gap = corporate["breakdown"]["loan_repayment_gap"]

    assert gap >= 0
    assert gap == max(0, required_loan - configured_loan)
