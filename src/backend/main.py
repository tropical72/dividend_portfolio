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
    default_capital: Optional[float] = 10000.0
    default_currency: Optional[str] = "USD"


class PortfolioRequest(BaseModel):
    """포트폴리오 생성/수정 요청을 위한 데이터 모델"""

    name: str
    account_type: Optional[str] = "Personal"
    total_capital: Optional[float] = 0.0
    currency: Optional[str] = "USD"
    items: Optional[list] = []


class RetirementConfigRequest(BaseModel):
    """은퇴 운용 설정 업데이트를 위한 데이터 모델"""

    active_assumption_id: Optional[str] = None
    user_profile: Optional[dict] = None
    simulation_params: Optional[dict] = None
    corp_params: Optional[dict] = None
    pension_params: Optional[dict] = None
    personal_params: Optional[dict] = None
    assumptions: Optional[dict] = None


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


@app.get("/api/portfolios")
async def get_portfolios():
    """저장된 모든 포트폴리오 목록을 반환합니다."""
    return {"success": True, "data": backend.get_portfolios()}


@app.post("/api/portfolios")
async def create_portfolio(req: PortfolioRequest):
    """새로운 포트폴리오를 생성합니다."""
    return backend.add_portfolio(
        name=req.name,
        total_capital=req.total_capital,
        currency=req.currency,
        items=req.items,
    )


@app.delete("/api/portfolios/{p_id}")
async def delete_portfolio(p_id: str):
    """특정 포트폴리오를 제거합니다."""
    return backend.remove_portfolio(p_id)


@app.patch("/api/portfolios/{p_id}")
async def update_portfolio(p_id: str, req: PortfolioRequest):
    """특정 포트폴리오의 정보를 업데이트합니다."""
    updates = req.model_dump(exclude_none=True)
    return backend.update_portfolio(p_id, updates)


@app.get("/api/portfolios/{p_id}/analysis")
async def analyze_portfolio(p_id: str, mode: str = "TTM"):
    """포트폴리오 실시간 분석 결과를 반환합니다."""
    return backend.analyze_portfolio(p_id, mode=mode)


@app.get("/api/retirement/config")
async def get_retirement_config():
    """은퇴 운용 설정 정보를 반환합니다."""
    return {"success": True, "data": backend.get_retirement_config()}


@app.post("/api/retirement/config")
async def update_retirement_config(req: RetirementConfigRequest):
    """은퇴 운용 설정을 업데이트합니다."""
    config_dict = req.model_dump(exclude_none=True)
    return backend.update_retirement_config(config_dict)


@app.get("/api/retirement/simulate")
async def run_retirement_simulation(scenario: Optional[str] = None):
    """저장된 설정을 기반으로 30년 은퇴 시뮬레이션을 실행합니다. [REQ-RAMS-3.3]"""
    config = backend.get_retirement_config()
    if not config:
        return {"success": False, "message": "설정 데이터가 없습니다."}

    # 1. 기초 자산 구성
    initial_assets = {
        "corp": config["corp_params"]["initial_investment"],
        "pension": config["pension_params"]["severance_reserve"]
        + config["pension_params"]["other_reserve"],
    }

    # 2. 활성 가정(Assumption) 추출
    active_id = config.get("active_assumption_id", "v1")
    assumption = config["assumptions"].get(active_id, config["assumptions"]["v1"])

    # 3. 시뮬레이션 파라미터 결합
    base_params = {
        "target_monthly_cashflow": config["simulation_params"].get(
            "target_monthly_cashflow", 9000000
        ),
        "inflation_rate": assumption["inflation_rate"],
        "market_return_rate": assumption["expected_return"],
        "corp_salary": config["corp_params"]["monthly_salary"],
        "corp_fixed_cost": config["corp_params"]["monthly_fixed_cost"],
        "loan_repayment": config["simulation_params"].get("target_monthly_cashflow", 9000000)
        - config["corp_params"]["monthly_salary"],
    }

    # 4. 스트레스 시나리오 적용 (요청 시)
    final_params = base_params
    if scenario:
        final_params = stress_engine.apply_scenario(base_params, scenario.upper())

    # 5. 시뮬레이션 실행
    result = projection_engine.run_30yr_simulation(initial_assets, final_params)

    return {"success": True, "data": result}
