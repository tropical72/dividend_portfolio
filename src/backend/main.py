from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from src.backend.api import DividendBackend

app = FastAPI(title="Dividend Portfolio Manager API")
backend = DividendBackend()

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
    # 실제 yfinance 데이터를 가져오는 backend.data_provider 사용
    try:
        info = backend.data_provider.get_stock_info(ticker)
        if "error" in info:
            return {"success": False, "message": info["error"]}
        return {"success": True, "data": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
