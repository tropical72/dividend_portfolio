import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.backend.api import DividendBackend
from src.core.projection_engine import ProjectionEngine
from src.core.tax_engine import TaxEngine
from src.core.stress_engine import StressTestEngine

# [환경 설정] 데이터 저장 경로를 결정합니다.
DATA_DIR = os.getenv("APP_DATA_DIR", ".")

# [앱 초기화] FastAPI 서비스 및 백엔드 비즈니스 엔진 로드
app = FastAPI(title="Dividend Portfolio Manager API")
backend = DividendBackend(data_dir=DATA_DIR)

# Core Engines 초기화
tax_engine = TaxEngine()
projection_engine = ProjectionEngine(tax_engine=tax_engine)
stress_engine = StressTestEngine()

# [CORS 설정] 명시적으로 모든 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- [데이터 모델 정의] ---

class StockRequest(BaseModel):
    ticker: str
    country: Optional[str] = "US"

class SettingsRequest(BaseModel):
    dart_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_investment_goal: Optional[str] = None
    default_capital: Optional[float] = 10000.0
    default_currency: Optional[str] = "USD"

class PortfolioRequest(BaseModel):
    name: str
    account_type: Optional[str] = "Personal"
    total_capital: Optional[float] = 0.0
    currency: Optional[str] = "USD"
    items: Optional[list] = []

class RetirementConfigRequest(BaseModel):
    active_assumption_id: Optional[str] = None
    user_profile: Optional[dict] = None
    simulation_params: Optional[dict] = None
    corp_params: Optional[dict] = None
    pension_params: Optional[dict] = None
    personal_params: Optional[dict] = None
    assumptions: Optional[dict] = None

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/stock/{ticker}")
async def get_stock_info(ticker: str):
    try:
        info = backend.data_provider.get_stock_info(ticker)
        return {"success": True, "data": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/watchlist")
async def get_watchlist():
    return {"success": True, "data": backend.get_watchlist()}

@app.post("/api/watchlist")
async def add_to_watchlist(req: StockRequest):
    return backend.add_to_watchlist(req.ticker, req.country)

@app.delete("/api/watchlist/{ticker}")
async def remove_from_watchlist(ticker: str):
    return backend.remove_from_watchlist(ticker)

@app.get("/api/settings")
async def get_settings():
    return {"success": True, "data": backend.get_settings()}

@app.post("/api/settings")
async def update_settings(req: SettingsRequest):
    settings_dict = req.model_dump(exclude_none=True)
    return backend.update_settings(settings_dict)

@app.get("/api/portfolios")
async def get_portfolios():
    return {"success": True, "data": backend.get_portfolios()}

@app.post("/api/portfolios")
async def create_portfolio(req: PortfolioRequest):
    return backend.add_portfolio(name=req.name, total_capital=req.total_capital, currency=req.currency, items=req.items)

@app.delete("/api/portfolios/{p_id}")
async def delete_portfolio(p_id: str):
    return backend.remove_portfolio(p_id)

@app.patch("/api/portfolios/{p_id}")
async def update_portfolio(p_id: str, req: PortfolioRequest):
    updates = req.model_dump(exclude_none=True)
    return backend.update_portfolio(p_id, updates)

@app.get("/api/portfolios/{p_id}/analysis")
async def analyze_portfolio(p_id: str, mode: str = "TTM"):
    return backend.analyze_portfolio(p_id, mode=mode)

@app.get("/api/retirement/config")
async def get_retirement_config():
    return {"success": True, "data": backend.get_retirement_config()}

@app.post("/api/retirement/config")
async def update_retirement_config(req: RetirementConfigRequest):
    config_dict = req.model_dump(exclude_none=True)
    return backend.update_retirement_config(config_dict)

@app.get("/api/retirement/simulate")
async def run_retirement_simulation(scenario: Optional[str] = None):
    config = backend.get_retirement_config()
    if not config:
        return {"success": False, "message": "설정 데이터가 없습니다."}

    # 1. 기초 자산 구성 (안전한 get 접근)
    corp_params = config.get("corp_params", {})
    pension_params = config.get("pension_params", {})
    
    initial_assets = {
        "corp": corp_params.get("initial_investment", 1600000000),
        "pension": pension_params.get("severance_reserve", 350000000) 
                   + pension_params.get("other_reserve", 250000000),
    }

    # 2. 활성 가정(Assumption) 추출
    active_id = config.get("active_assumption_id", "v1")
    assumptions = config.get("assumptions", {})
    assumption = assumptions.get(active_id, assumptions.get("v1", {
        "expected_return": 0.0485,
        "inflation_rate": 0.025
    }))

    # 3. 시뮬레이션 파라미터 결합
    sim_params = config.get("simulation_params", {})
    base_params = {
        "target_monthly_cashflow": sim_params.get("target_monthly_cashflow", 9000000),
        "inflation_rate": assumption.get("inflation_rate", 0.025),
        "market_return_rate": assumption.get("expected_return", 0.0485),
        "corp_salary": corp_params.get("monthly_salary", 2500000),
        "corp_fixed_cost": corp_params.get("monthly_fixed_cost", 500000),
        "loan_repayment": sim_params.get("target_monthly_cashflow", 9000000) 
                          - corp_params.get("monthly_salary", 2500000),
    }

    final_params = base_params
    if scenario:
        final_params = stress_engine.apply_scenario(base_params, scenario.upper())

    result = projection_engine.run_30yr_simulation(initial_assets, final_params)
    
    # [Debug] 결과 데이터 정합성 확인
    if result and "monthly_data" in result:
        print(f"[Success] Simulation generated {len(result['monthly_data'])} months of data")
    else:
        print("[Error] Simulation failed to generate data")

    return {"success": True, "data": result}

@app.get("/api/retirement/snapshot")
async def get_retirement_snapshot():
    return {"success": True, "data": backend.get_retirement_snapshot()}

@app.post("/api/retirement/snapshot")
async def create_retirement_snapshot(req: dict):
    return backend.save_retirement_snapshot(req)
