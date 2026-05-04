from fastapi.testclient import TestClient

import src.backend.main as main_module
from src.backend.api import DividendBackend


def test_export_and_restore_test_state_round_trip(tmp_path):
    backend = DividendBackend(data_dir=str(tmp_path))

    backend.update_settings(
        {
            "default_currency": "KRW",
            "price_appreciation_rate": 4.2,
            "ui_language": "ko",
        }
    )
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
        items=[{"symbol": "VGIT", "weight": 100, "category": "Bond Buffer"}],
    )
    backend.update_retirement_config(
        {
            "simulation_params": {
                "target_monthly_cashflow": 9999,
            }
        }
    )
    backend.update_settings(
        {
            "default_currency": "USD",
            "price_appreciation_rate": 1.5,
            "ui_language": "en",
        }
    )

    restored = backend.restore_test_state(snapshot)

    assert restored["success"] is True
    assert backend.get_settings()["default_currency"] == "KRW"
    assert backend.get_settings()["price_appreciation_rate"] == 4.2
    assert backend.get_settings()["ui_language"] == "ko"
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

    backend.update_settings({"default_currency": "KRW", "ui_language": "en"})
    backend.update_retirement_config({"simulation_params": {"target_monthly_cashflow": 1234}})

    restore_response = client.post("/api/test/state", json={"data": baseline})

    assert restore_response.status_code == 200
    assert restore_response.json()["success"] is True
    assert restore_response.json()["data"] == backend.export_test_state()
    assert backend.get_retirement_config() == baseline["retirement_config"]


def test_restore_test_state_reseeds_default_assets_in_app_mode(tmp_path):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)

    restored = backend.restore_test_state(
        {
            "settings": {},
            "watchlist": [],
            "portfolios": [],
            "master_portfolios": [],
            "retirement_config": {},
            "cost_comparison_config": {},
            "retirement_snapshot": {},
        }
    )

    assert restored["success"] is True
    assert any(item["symbol"] == "SGOV" for item in backend.get_watchlist())
    assert any(p["id"] == backend.DEFAULT_CORP_PORTFOLIO_ID for p in backend.get_portfolios())
    assert any(
        m["id"] == backend.DEFAULT_MASTER_PORTFOLIO_ID for m in backend.get_master_portfolios()
    )


def test_read_accessors_self_heal_missing_default_assets_in_app_mode(tmp_path):
    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)

    backend.watchlist = []
    backend.portfolios = []
    backend.master_portfolios = []

    watchlist = backend.get_watchlist()
    portfolios = backend.get_portfolios()
    masters = backend.get_master_portfolios()

    assert any(item["symbol"] == "SGOV" for item in watchlist)
    assert any(p["id"] == backend.DEFAULT_PENSION_PORTFOLIO_ID for p in portfolios)
    assert any(m["id"] == backend.DEFAULT_MASTER_PORTFOLIO_ID for m in masters)
    assert backend.get_active_master_portfolio()["id"] == backend.DEFAULT_MASTER_PORTFOLIO_ID
