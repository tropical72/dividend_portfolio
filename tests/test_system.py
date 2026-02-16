import pytest
from httpx import AsyncClient
import os
import sys

# 프로젝트 루트를 path에 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# 테스트 대상: 아직 생성되지 않은 src.backend.main의 app 객체
# 이 단계에서는 임포트 에러 또는 실행 에러가 발생하는 것이 정상(Red)입니다.
@pytest.mark.asyncio
async def test_health_check():
    from src.backend.main import app
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
