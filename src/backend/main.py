import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.backend.api import DividendBackend

# [환경 설정] 데이터 저장 경로를 결정합니다.
DATA_DIR = os.getenv("APP_DATA_DIR", ".")

# [앱 초기화] FastAPI 서비스 및 백엔드 비즈니스 엔진 로드
app = FastAPI(title="Dividend Portfolio Manager API")
backend = DividendBackend(data_dir=DATA_DIR)

# --- [데이터 모델 정의] ---


class StockRequest(BaseModel):
    """관심종목 추가 요청을 위한 데이터 모델"""

    ticker: str
    country: Optional[str] = "US"


class SettingsRequest(BaseModel):
    """애플리케이션 설정 업데이트를 위한 데이터 모델"""

    dart_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_investment_goal: Optional[str] = None


# [CORS 설정] React 프론트엔드와의 통신 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """서버 가동 상태를 확인하는 헬스체크 엔드포인트"""
    return {"status": "ok"}


@app.get("/api/stock/{ticker}")
async def get_stock_info(ticker: str):
    """특정 티커의 상세 주식 정보를 조회합니다."""
    try:
        info = backend.data_provider.get_stock_info(ticker)
        if "error" in info:
            return {"success": False, "message": info["error"]}
        return {"success": True, "data": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/watchlist")
async def get_watchlist():
    """저장된 관심종목 전체 목록을 반환합니다."""
    return {"success": True, "data": backend.get_watchlist()}


@app.post("/api/watchlist")
async def add_to_watchlist(req: StockRequest):
    """새로운 종목을 관심종목에 추가합니다."""
    return backend.add_to_watchlist(req.ticker, req.country)


@app.delete("/api/watchlist/{ticker}")
async def remove_from_watchlist(ticker: str):
    """관심종목에서 특정 종목을 제거합니다."""
    return backend.remove_from_watchlist(ticker)


@app.get("/api/settings")
async def get_settings():
    """저장된 설정 정보를 반환합니다."""
    return {"success": True, "data": backend.get_settings()}


@app.post("/api/settings")
async def update_settings(req: SettingsRequest):
    """설정 정보를 업데이트합니다."""
    settings_dict = req.model_dump(exclude_none=True)
    return backend.update_settings(settings_dict)
