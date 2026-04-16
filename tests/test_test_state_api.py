from fastapi.testclient import TestClient

import src.backend.main as main_module
from src.backend.api import DividendBackend


def test_export_and_restore_test_state_round_trip(tmp_path):
    backend = DividendBackend(data_dir=str(tmp_path))

    backend.update_settings({"default_currency": "KRW", "price_appreciation_rate": 4.2})
    corp = backend.add_portfolio(
        name="Corp Seed",
        account_type="Corporate",
        total_capital=1000,
        currency="USD",
        items=[{"symbol": "SGOV", "weight": 100, "category": "SGOV Buffer"}],
    )["data"]
    master = backend.add_master_portfolio(name="Master Seed", corp_id=corp["id"])["data"]
    backend.activate_master_portfolio(master["id"])

    snapshot = backend.export_test_state()

    backend.add_portfolio(
        name="Temp Portfolio",
        account_type="Pension",
        total_capital=500,
        currency="USD",
        items=[{"symbol": "BND", "weight": 100, "category": "Bond Buffer"}],
    )
    backend.update_retirement_config(
        {
            "simulation_params": {
                "target_monthly_cashflow": 9999,
            }
        }
    )
    backend.update_settings({"default_currency": "USD", "price_appreciation_rate": 1.5})

    restored = backend.restore_test_state(snapshot)

    assert restored["success"] is True
    assert backend.get_settings()["default_currency"] == "KRW"
    assert backend.get_settings()["price_appreciation_rate"] == 4.2
    assert len(backend.get_portfolios()) == 1
    assert backend.get_portfolios()[0]["name"] == "Corp Seed"
    assert len(backend.get_master_portfolios()) == 1
    assert backend.get_active_master_portfolio()["name"] == "Master Seed"
    assert backend.get_retirement_config() == snapshot["retirement_config"]


def test_test_state_endpoint_round_trip(tmp_path, monkeypatch):
    backend = DividendBackend(data_dir=str(tmp_path))
    monkeypatch.setattr(main_module, "backend", backend)
    client = TestClient(main_module.app)

    baseline = client.get("/api/test/state").json()["data"]

    backend.update_settings({"default_currency": "KRW"})
    backend.update_retirement_config({"simulation_params": {"target_monthly_cashflow": 1234}})

    restore_response = client.post("/api/test/state", json={"data": baseline})

    assert restore_response.status_code == 200
    assert restore_response.json()["success"] is True
    assert restore_response.json()["data"] == backend.export_test_state()
    assert backend.get_retirement_config() == baseline["retirement_config"]
