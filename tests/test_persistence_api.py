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
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
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
async def test_settings_persistence():
    from src.backend.main import app

    new_key = "secret_dart_key"

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. 설정 저장
        await ac.post("/api/settings", json={"dart_api_key": new_key})

        # 2. 설정 로드 확인
        response = await ac.get("/api/settings")

    assert response.json()["data"]["dart_api_key"] == new_key

    # 3. 파일 물리적 존재 확인
    data_dir = os.environ["APP_DATA_DIR"]
    with open(os.path.join(data_dir, "settings.json"), "r") as f:
        saved_data = json.load(f)
        assert saved_data["dart_api_key"] == new_key
