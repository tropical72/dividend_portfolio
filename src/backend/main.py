import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.backend.api import DividendBackend

# 환경 변수로부터 데이터 디렉토리 설정 (기본값: 현재 디렉토리)
DATA_DIR = os.getenv("APP_DATA_DIR", ".")
app = FastAPI(title="Dividend Portfolio Manager API")
backend = DividendBackend(data_dir=DATA_DIR)

class StockRequest(BaseModel):
    ticker: str
    country: Optional[str] = "US"

class SettingsRequest(BaseModel):
    dart_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_investment_goal: Optional[str] = None

# React 프론트엔드와의 통신을 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/stock/{ticker}")
async def get_stock_info(ticker: str):
    try:
        info = backend.data_provider.get_stock_info(ticker)
        if "error" in info:
            return {"success": False, "message": info["error"]}
        return {"success": True, "data": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/watchlist")
async def get_watchlist():
    return {"success": True, "data": backend.get_watchlist()}

@app.post("/api/watchlist")
async def add_to_watchlist(req: StockRequest):
    result = backend.add_to_watchlist(req.ticker, req.country)
    return result

@app.delete("/api/watchlist/{ticker}")
async def remove_from_watchlist(ticker: str):
    result = backend.remove_from_watchlist(ticker)
    return result

@app.get("/api/settings")
async def get_settings():
    return {"success": True, "data": backend.get_settings()}

@app.post("/api/settings")
async def update_settings(req: SettingsRequest):
    # Pydantic 모델을 dict로 변환 (None 제외)
    settings_dict = req.model_dump(exclude_none=True)
    result = backend.update_settings(settings_dict)
    return result
