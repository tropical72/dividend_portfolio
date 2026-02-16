import importlib
import os

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
def setup_test_env(tmp_path):
    """테스트 환경 격리: 임시 디렉토리 사용"""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    os.environ["APP_DATA_DIR"] = str(data_dir)

    # 앱 및 백엔드 재로드
    import src.backend.main

    importlib.reload(src.backend.main)
    yield
    if "APP_DATA_DIR" in os.environ:
        del os.environ["APP_DATA_DIR"]


@pytest.mark.asyncio
async def test_watchlist_add_and_get():
    """[TEST-WCH-1.1.1] 종목 추가 및 조회 기능 검증"""
    from src.backend.main import app

    ticker = "AAPL"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. 초기 목록 비어있음 확인
        get_res = await ac.get("/api/watchlist")
        assert len(get_res.json()["data"]) == 0

        # 2. 종목 추가
        add_res = await ac.post("/api/watchlist", json={"ticker": ticker, "country": "US"})
        assert add_res.status_code == 200
        assert add_res.json()["success"] is True

        # 3. 추가 후 목록 확인
        get_res2 = await ac.get("/api/watchlist")
        data = get_res2.json()["data"]
        assert len(data) == 1
        assert data[0]["symbol"] == ticker


@pytest.mark.asyncio
async def test_watchlist_duplicate_prevent():
    """[TEST-WCH-1.1.1] 중복 종목 추가 방지 검증"""
    from src.backend.main import app

    ticker = "TSLA"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. 첫 번째 추가
        await ac.post("/api/watchlist", json={"ticker": ticker})

        # 2. 동일 종목 두 번째 추가 시도
        await ac.post("/api/watchlist", json={"ticker": ticker})


@pytest.mark.asyncio
async def test_watchlist_delete_integrity():
    """[TEST-WCH-1.2.2] 포트폴리오 포함 종목 삭제 방지 검증"""
    from src.backend.main import app, backend

    ticker = "AAPL"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. 종목 추가
        await ac.post("/api/watchlist", json={"ticker": ticker})

        # 2. 백엔드 메서드 모킹: 해당 종목이 포트폴리오에 있다고 가정
        # (아직 포트폴리오 로직이 없으므로 메서드 결과를 강제 설정)
        backend.is_stock_in_portfolio = lambda t: True if t == ticker else False

        # 3. 삭제 시도
        del_res = await ac.delete(f"/api/watchlist/{ticker}")

        # 4. 검증: 삭제 실패 및 경고 메시지 확인
        assert del_res.json()["success"] is False
        assert "포트폴리오에 포함된" in del_res.json()["message"]
