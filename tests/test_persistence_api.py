import importlib
import json
import os

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
def setup_test_env(tmp_path):
    """테스트 환경 격리: 임시 디렉토리를 데이터 디렉토리로 설정"""
    data_dir = tmp_path / "data"
    data_dir.mkdir()

    # 환경 변수 설정
    os.environ["APP_DATA_DIR"] = str(data_dir)

    # 메인 앱 모듈 재로드 (새로운 환경 변수 반영)
    import src.backend.main

    importlib.reload(src.backend.main)

    yield

    # 환경 변수 복구 (선택 사항)
    if "APP_DATA_DIR" in os.environ:
        del os.environ["APP_DATA_DIR"]


@pytest.mark.asyncio
async def test_watchlist_persistence():
    from src.backend.main import app

    ticker = "AAPL"

    # 1. 종목 추가
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/watchlist", json={"ticker": ticker})

        # 2. 조회 확인
        response = await ac.get("/api/watchlist")

    assert response.status_code == 200
    tickers = [item["symbol"] for item in response.json()["data"]]
    assert ticker in tickers

    # 3. 파일 물리적 존재 확인 (격리 검증)
    data_dir = os.environ["APP_DATA_DIR"]
    assert os.path.exists(os.path.join(data_dir, "watchlist.json"))


@pytest.mark.asyncio
async def test_settings_persistence(monkeypatch):
    from src.backend import api as api_module
    from src.backend.main import app

    class DummyProvider:
        def __init__(self, dart_api_key=None):
            self.dart_api_key = dart_api_key

    monkeypatch.setattr(api_module, "StockDataProvider", DummyProvider)

    new_key = "secret_dart_key"
    new_gemini_key = "secret_gemini_key"
    new_language = "en"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. 설정 저장
        await ac.post(
            "/api/settings",
            json={
                "dart_api_key": new_key,
                "gemini_api_key": new_gemini_key,
                "ui_language": new_language,
            },
        )

        # 2. 설정 로드 확인
        response = await ac.get("/api/settings")

    assert response.json()["data"]["dart_api_key"] == new_key
    assert response.json()["data"]["gemini_api_key"] == new_gemini_key
    assert response.json()["data"]["ui_language"] == new_language

    # 3. 공개 설정과 비밀 설정이 분리 저장되는지 확인
    data_dir = os.environ["APP_DATA_DIR"]
    with open(os.path.join(data_dir, "settings.json"), "r") as f:
        saved_data = json.load(f)
        assert saved_data["ui_language"] == new_language
        assert "dart_api_key" not in saved_data
        assert "gemini_api_key" not in saved_data

    with open(os.path.join(data_dir, "settings.local.json"), "r") as f:
        saved_secret_data = json.load(f)
        assert saved_secret_data["dart_api_key"] == new_key
        assert saved_secret_data["gemini_api_key"] == new_gemini_key


def test_backend_loads_git_tracked_defaults_and_saves_only_to_local_data(tmp_path):
    from src.backend.api import DividendBackend

    data_dir = tmp_path / "appdata"
    defaults_dir = tmp_path / "defaults"
    data_dir.mkdir()
    defaults_dir.mkdir()

    default_settings = {
        "default_capital": 12000.0,
        "default_currency": "USD",
        "ui_language": "ko",
    }
    default_cost_config = {
        "simulation_mode": "asset",
        "assumptions": {"simulation_years": 20},
    }
    default_retirement_config = {
        "simulation_params": {"target_monthly_cashflow": 3500000},
    }

    (defaults_dir / "settings.json").write_text(
        json.dumps(default_settings, ensure_ascii=False, indent=4), encoding="utf-8"
    )
    (defaults_dir / "cost_comparison_config.json").write_text(
        json.dumps(default_cost_config, ensure_ascii=False, indent=4), encoding="utf-8"
    )
    (defaults_dir / "retirement_config.json").write_text(
        json.dumps(default_retirement_config, ensure_ascii=False, indent=4), encoding="utf-8"
    )

    backend = DividendBackend(
        data_dir=str(data_dir),
        defaults_dir=str(defaults_dir),
        ensure_default_master_bundle=False,
    )

    assert backend.get_settings()["default_capital"] == 12000.0
    assert backend.get_cost_comparison_config()["assumptions"]["simulation_years"] == 20
    assert (
        backend.get_retirement_config()["simulation_params"]["target_monthly_cashflow"] == 3500000
    )


def test_backend_normalizes_legacy_appreciation_rates_on_load(tmp_path):
    from src.backend.api import DividendBackend

    data_dir = tmp_path / "appdata"
    data_dir.mkdir()

    (data_dir / "settings.json").write_text(
        json.dumps(
            {
                "default_currency": "USD",
                "appreciation_rates": {
                    "cash_sgov": 0.1,
                    "fixed_income": 2.5,
                    "dividend_stocks": 7.5,
                },
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    backend = DividendBackend(data_dir=str(data_dir))
    settings = backend.get_settings()

    assert settings["appreciation_rates"]["cash_sgov"] == 0.1
    assert settings["appreciation_rates"]["bond_buffer"] == 2.5
    assert settings["appreciation_rates"]["high_income"] == 2.5
    assert settings["appreciation_rates"]["dividend_stocks"] == 7.5
    assert settings["appreciation_rates"]["growth_stocks"] == 8.2
    assert "fixed_income" not in settings["appreciation_rates"]

    backend.update_settings({"ui_language": "en"})

    saved_settings = json.loads((data_dir / "settings.json").read_text(encoding="utf-8"))
    assert saved_settings["ui_language"] == "en"
    assert saved_settings["appreciation_rates"]["bond_buffer"] == 2.5
    assert saved_settings["appreciation_rates"]["high_income"] == 2.5
    assert "fixed_income" not in saved_settings["appreciation_rates"]
