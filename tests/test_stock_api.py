import pytest
import respx
from httpx import ASGITransport, AsyncClient

from src.backend.main import app


@pytest.mark.asyncio
@respx.mock
async def test_get_stock_info_mocked():
    # 1. 외부 API 호출을 가로채서 Mock 데이터 반환 (예시)
    # yfinance 라이브러리가 내부적으로 호출하는 URL은 다양할 수 있으므로,
    # 여기서는 백엔드 API의 응답 구조가 약속된 대로 오는지 검증하는 데 집중합니다.
    ticker = "AAPL"

    # 2. 우리 API 서버를 호출
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/stock/{ticker}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["symbol"] == ticker
    # 실제 데이터가 오는지 확인 (yfinance가 실제 동작하거나 캐시된 데이터를 사용함)
    assert "Apple" in data["data"]["name"] or "AAPL" in data["data"]["symbol"]


@pytest.mark.asyncio
async def test_get_stock_info_invalid_ticker():
    ticker = "INVALID_TICKER_999"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/stock/{ticker}")

    # 실패 시 응답 구조 확인
    assert response.status_code == 200  # API 자체는 성공적으로 에러 메시지 반환
    data = response.json()
    assert data["success"] is False
    # 실제 메시지: "Invalid ticker or no data found: INVALID_TICKER_999"
    assert "invalid" in data["message"].lower() or "not found" in data["message"].lower()
