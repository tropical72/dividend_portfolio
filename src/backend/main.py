import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.backend.api import DividendBackend
from src.core.projection_engine import ProjectionEngine
from src.core.rebalance_engine import RebalanceEngine
from src.core.stress_engine import StressTestEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine

DATA_DIR = os.getenv("APP_DATA_DIR", ".")
app = FastAPI(title="Dividend Portfolio Manager API")
backend = DividendBackend(data_dir=DATA_DIR)

tax_engine = TaxEngine()
trigger_engine = TriggerEngine()
rebalance_engine = RebalanceEngine()
projection_engine = ProjectionEngine(
    tax_engine=tax_engine, trigger_engine=trigger_engine, rebalance_engine=rebalance_engine
)
stress_engine = StressTestEngine()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    account_type: Optional[str] = "Corporate"
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
    planned_cashflows: Optional[list] = None
    assumptions: Optional[dict] = None
    tax_and_insurance: Optional[dict] = None
    trigger_thresholds: Optional[dict] = None

class MasterPortfolioRequest(BaseModel):
    name: str
    corp_id: Optional[str] = None
    pension_id: Optional[str] = None

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
    settings = backend.get_settings()
    # 응답 시 실시간 환율 정보 포함
    settings["current_exchange_rate"] = backend.get_exchange_rate()
    return {"success": True, "data": settings}

@app.get("/api/exchange-rate")
async def get_exchange_rate():
    return {"success": True, "rate": backend.get_exchange_rate()}

@app.post("/api/settings")
async def update_settings(req: SettingsRequest):
    settings_dict = req.model_dump(exclude_none=True)
    return backend.update_settings(settings_dict)

@app.get("/api/portfolios")
async def get_portfolios():
    return {"success": True, "data": backend.get_portfolios()}

@app.post("/api/portfolios")
async def create_portfolio(req: PortfolioRequest):
    return backend.add_portfolio(
        name=req.name,
        total_capital=req.total_capital,
        currency=req.currency,
        items=req.items,
    )

@app.delete("/api/portfolios/{p_id}")
async def delete_portfolio(p_id: str):
    return backend.remove_portfolio(p_id)

@app.patch("/api/portfolios/{p_id}")
async def update_portfolio(p_id: str, req: PortfolioRequest):
    updates = req.model_dump(exclude_none=True)
    return backend.update_portfolio(p_id, updates)

@app.get("/api/master-portfolios")
async def get_master_portfolios():
    return {"success": True, "data": backend.get_master_portfolios()}

@app.post("/api/master-portfolios")
async def create_master_portfolio(req: MasterPortfolioRequest):
    return backend.add_master_portfolio(
        name=req.name,
        corp_id=req.corp_id,
        pension_id=req.pension_id
    )

@app.delete("/api/master-portfolios/{m_id}")
async def delete_master_portfolio(m_id: str):
    return backend.remove_master_portfolio(m_id)

@app.post("/api/master-portfolios/{m_id}/activate")
async def activate_master_portfolio(m_id: str):
    return backend.activate_master_portfolio(m_id)

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

    # 1. 필수 설정값 존재 여부 엄격 검증 (하드코딩 방지)
    required_keys = {
        "simulation_params": [
            "target_monthly_cashflow",
            "simulation_start_year",
            "simulation_start_month",
            "national_pension_amount",
        ],
        "user_profile": [
            "birth_year",
            "birth_month",
            "private_pension_start_age",
            "national_pension_start_age",
        ],
        "corp_params": [
            "initial_investment",
            "monthly_salary",
            "monthly_fixed_cost",
            "employee_count",
            "initial_shareholder_loan",
        ],
        "pension_params": ["monthly_withdrawal_target", "initial_investment"],
        "tax_and_insurance": [
            "point_unit_price",
            "ltc_rate",
            "corp_tax_threshold",
            "corp_tax_low_rate",
            "corp_tax_high_rate",
            "pension_rate",
            "health_rate",
            "employment_rate",
            "income_tax_estimate_rate",
        ],
    }

    missing_fields = []
    for section, keys in required_keys.items():
        if section not in config:
            missing_fields.append(section)
            continue
        for key in keys:
            if config[section].get(key) is None:
                missing_fields.append(f"{section}.{key}")

    if missing_fields:
        return {
            "success": False,
            "message": (
                f"필수 설정이 누락되었습니다: {', '.join(missing_fields)}. "
                "Settings 탭에서 설정을 완료해주세요."
            ),
        }

    # 2. 기초 자산 구성
    corp_params = config["corp_params"]
    pension_params = config["pension_params"]
    initial_assets = {
        "corp": corp_params["initial_investment"],
        "pension": (
            (pension_params.get("severance_reserve") or 0)
            + (pension_params.get("other_reserve") or 0)
            + (pension_params["initial_investment"])
        ),
    }

    # 3. 활성 가정(Assumption) 추출
    # [FIX] 쿼리 스트링 scenario가 있으면 우선 사용
    active_id = scenario or config.get("active_assumption_id", "v1")
    assumptions = config.get("assumptions", {})
    assumption = assumptions.get(active_id, assumptions.get("v1"))
    if not assumption:
        return {"success": False, "message": "활성화된 미래 가정(Assumption) 데이터가 없습니다."}

    # 4. 시뮬레이션 파라미터 결합 (포트폴리오 통계 포함)
    sim_params = config["simulation_params"]
    user_profile = config["user_profile"]
    trigger_params = config.get("trigger_thresholds", {"target_buffer_months": 24})
    
    # [REQ-RAMS-1.5.1] 활성화된 마스터 포트폴리오 기반 데이터 추출
    active_master = backend.get_active_master_portfolio()
    if active_master:
        corp_stats = backend.get_portfolio_stats_by_id(active_master.get("corp_id"))
        pension_stats = backend.get_portfolio_stats_by_id(active_master.get("pension_id"))
    else:
        # Fallback: 마스터가 없으면 타입별 첫 번째 포트폴리오 사용 (하위 호환)
        c_p = next((p for p in backend.portfolios if p.get("account_type") == "Corporate"), None)
        p_p = next((p for p in backend.portfolios if p.get("account_type") == "Pension"), None)
        corp_stats = backend.get_portfolio_stats_by_id(c_p["id"] if c_p else None)
        pension_stats = backend.get_portfolio_stats_by_id(p_p["id"] if p_p else None)
    
    base_params = {
        "portfolio_stats": {
            "corp": corp_stats,
            "pension": pension_stats
        },
        "target_monthly_cashflow": sim_params["target_monthly_cashflow"],
        "inflation_rate": assumption["inflation_rate"],
        "market_return_rate": assumption["expected_return"],
        "birth_year": user_profile["birth_year"],
        "birth_month": user_profile["birth_month"],
        "private_pension_start_age": user_profile["private_pension_start_age"],
        "national_pension_start_age": user_profile["national_pension_start_age"],
        "simulation_start_year": sim_params["simulation_start_year"],
        "simulation_start_month": sim_params["simulation_start_month"],
        "simulation_years": sim_params.get("simulation_years", 30),
        "target_buffer_months": trigger_params["target_buffer_months"],
        "equity_yield_multiplier": trigger_params.get("equity_yield_multiplier", 1.2),
        "debt_yield_multiplier": trigger_params.get("debt_yield_multiplier", 0.6),
        "pension_withdrawal_target": pension_params["monthly_withdrawal_target"],
        "national_pension_amount": sim_params["national_pension_amount"],
        "initial_shareholder_loan": corp_params["initial_shareholder_loan"],
        "planned_cashflows": config.get("planned_cashflows", []),
        "corp_salary": corp_params["monthly_salary"],
        "corp_fixed_cost": corp_params["monthly_fixed_cost"],
        "employee_count": corp_params["employee_count"],
        "real_estate_price": config.get("personal_params", {}).get("real_estate_price") or 0,
    }

    # 5. 세무 엔진 최신화
    tax_config = config["tax_and_insurance"]
    current_tax_engine = TaxEngine(config=tax_config)
    projection_engine.tax_engine = current_tax_engine
    
    final_params = base_params
    if scenario:
        final_params = stress_engine.apply_scenario(base_params, scenario.upper())

    # 6. 엔진 실행
    result = projection_engine.run_30yr_simulation(initial_assets, final_params)
    
    # [REQ-UI-05] 사용된 마스터 전략 및 포트폴리오 정보 메타데이터 추가
    active_m = backend.get_active_master_portfolio()
    corp_p = backend.get_portfolio_by_id(active_m.get("corp_id")) if active_m else None
    pen_p = backend.get_portfolio_by_id(active_m.get("pension_id")) if active_m else None
    
    result["meta"] = {
        "master_name": active_m["name"] if active_m else "None (Manual)",
        "used_portfolios": {
            "corp": {
                "name": corp_p["name"] if corp_p else "Default (None)",
                "yield": f"{corp_stats.get('dividend_yield', 0)*100:.2f}%"
            },
            "pension": {
                "name": pen_p["name"] if pen_p else "Default (None)",
                "yield": f"{pension_stats.get('dividend_yield', 0)*100:.2f}%"
            }
        }
    }
    
    return {"success": True, "data": result}

@app.get("/api/retirement/snapshot")
async def get_retirement_snapshot():
    return {"success": True, "data": backend.get_retirement_snapshot()}

@app.post("/api/retirement/snapshot")
async def create_retirement_snapshot(req: dict):
    return backend.save_retirement_snapshot(req)
