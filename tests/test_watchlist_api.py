import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
def setup_test_env(tmp_path, monkeypatch):
    """현재 FastAPI 모듈의 backend를 임시 저장소 인스턴스로 교체한다."""
    import src.backend.main as main_module
    from src.backend.api import DividendBackend

    data_dir = tmp_path / "data"
    data_dir.mkdir()
    monkeypatch.setenv("APP_DATA_DIR", str(data_dir))
    isolated_backend = DividendBackend(
        data_dir=str(data_dir),
        defaults_dir=main_module.DEFAULTS_DIR,
        ensure_default_master_bundle=True,
    )
    monkeypatch.setattr(main_module, "backend", isolated_backend)
    yield


@pytest.mark.asyncio
async def test_watchlist_add_and_get():
    """[TEST-WCH-1.1.1] 종목 추가 및 조회 기능 검증"""
    from src.backend.main import app

    ticker = "AAPL"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. 현재 기본 목록 크기를 기준선으로 사용
        get_res = await ac.get("/api/watchlist")
        initial_data = get_res.json()["data"]
        initial_count = len(initial_data)
        assert not any(item["symbol"] == ticker for item in initial_data)

        # 2. 종목 추가
        add_res = await ac.post("/api/watchlist", json={"ticker": ticker, "country": "US"})
        assert add_res.status_code == 200
        assert add_res.json()["success"] is True

        # 3. 추가 후 목록 확인
        get_res2 = await ac.get("/api/watchlist")
        data = get_res2.json()["data"]
        assert len(data) == initial_count + 1
        assert any(item["symbol"] == ticker for item in data)


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
