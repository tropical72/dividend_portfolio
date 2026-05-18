import os
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.backend.api import DividendBackend
from src.core.projection_engine import ProjectionEngine
from src.core.stress_engine import StressTestEngine
from src.core.tax_engine import TaxEngine


def _apply_profile_return_override(
    stats: Dict[str, Any],
    return_delta: float,
) -> Dict[str, Any]:
    """Apply a portfolio-level TR scenario delta while preserving category structure."""
    adjusted = deepcopy(stats)
    category_rates = adjusted.get("category_return_rates") or {}
    delta = float(return_delta)

    if category_rates:
        for rates in category_rates.values():
            rates["pa"] = float(rates.get("pa", 0.0)) + delta
            rates["tr"] = float(rates.get("dy", 0.0)) + rates["pa"]

    adjusted["expected_return"] = float(adjusted.get("expected_return", 0.0)) + delta
    return adjusted


def _combined_master_return(
    corp_stats: Dict[str, Any],
    pension_stats: Dict[str, Any],
    corp_portfolio: Optional[Dict[str, Any]],
    pension_portfolio: Optional[Dict[str, Any]],
) -> Optional[float]:
    corp_capital = float(corp_portfolio.get("total_capital", 0.0)) if corp_portfolio else 0.0
    pension_capital = (
        float(pension_portfolio.get("total_capital", 0.0)) if pension_portfolio else 0.0
    )
    total_capital = corp_capital + pension_capital

    if total_capital > 0:
        return (
            float(corp_stats.get("expected_return", 0.0)) * corp_capital
            + float(pension_stats.get("expected_return", 0.0)) * pension_capital
        ) / total_capital
    if corp_portfolio:
        return float(corp_stats.get("expected_return", 0.0))
    if pension_portfolio:
        return float(pension_stats.get("expected_return", 0.0))
    return None


def _get_default_data_dir() -> str:
    xdg_data_home = os.getenv("XDG_DATA_HOME")
    if xdg_data_home:
        return str(Path(xdg_data_home) / "dividend_portfolio")
    return str(Path.home() / ".local" / "share" / "dividend_portfolio")


BACKEND_ROOT = Path(__file__).resolve().parents[2]
DEFAULTS_DIR = str(BACKEND_ROOT / "defaults")
DATA_DIR = os.getenv("APP_DATA_DIR", _get_default_data_dir())
app = FastAPI(title="Dividend Portfolio Manager API")
backend = DividendBackend(
    data_dir=DATA_DIR,
    defaults_dir=DEFAULTS_DIR,
    ensure_default_master_bundle=True,
)

tax_engine = TaxEngine()
projection_engine = ProjectionEngine(tax_engine=tax_engine)
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
    ui_language: Optional[str] = "ko"
    default_pa_scenario: Optional[str] = None
    price_appreciation_rate: Optional[float] = None
    appreciation_rates: Optional[Dict[str, Any]] = None


class PortfolioRequest(BaseModel):
    name: str
    account_type: Optional[str] = "Corporate"
    total_capital: Optional[float] = 0.0
    currency: Optional[str] = "USD"
    items: Optional[List[Dict[str, Any]]] = None


class RetirementConfigRequest(BaseModel):
    active_assumption_id: Optional[str] = None
    user_profile: Optional[Dict[str, Any]] = None
    simulation_params: Optional[Dict[str, Any]] = None
    corp_params: Optional[Dict[str, Any]] = None
    pension_params: Optional[Dict[str, Any]] = None
    personal_params: Optional[Dict[str, Any]] = None
    planned_cashflows: Optional[List[Dict[str, Any]]] = None
    assumptions: Optional[Dict[str, Any]] = None
    tax_and_insurance: Optional[Dict[str, Any]] = None
    trigger_thresholds: Optional[Dict[str, Any]] = None
    strategy_rules: Optional[Dict[str, Any]] = None
    distribution_rules: Optional[Dict[str, Any]] = None
    distribution_yield_overrides: Optional[Dict[str, Any]] = None


class CostComparisonConfigRequest(BaseModel):
    master_portfolio_id: Optional[str] = None
    simulation_mode: Optional[str] = None
    household: Optional[Dict[str, Any]] = None
    personal_assets: Optional[Dict[str, Any]] = None
    real_estate: Optional[Dict[str, Any]] = None
    assumptions: Optional[Dict[str, Any]] = None
    corporate: Optional[Dict[str, Any]] = None
    policy_meta: Optional[Dict[str, Any]] = None


class MasterPortfolioRequest(BaseModel):
    name: str
    corp_id: Optional[str] = None
    pension_id: Optional[str] = None


class TestStateRequest(BaseModel):
    data: Dict[str, Any]


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
    return backend.add_to_watchlist(req.ticker, req.country or "US")


@app.delete("/api/watchlist/{ticker}")
async def remove_from_watchlist(ticker: str):
    return backend.remove_from_watchlist(ticker)


@app.get("/api/settings")
async def get_settings():
    settings = backend.get_settings()
    # 응답 시 실시간 환율 정보 포함
    rate_info = backend.get_exchange_rate_info()
    settings["current_exchange_rate"] = rate_info["rate"]
    settings["exchange_rate_last_updated"] = rate_info.get("last_fetch")
    return {"success": True, "data": settings}


@app.get("/api/exchange-rate")
async def get_exchange_rate(force: bool = False):
    rate_info = backend.get_exchange_rate_info(force_refresh=force)
    return {"success": True, "rate": rate_info["rate"], "data": rate_info}


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
        account_type=req.account_type or "Corporate",
        total_capital=req.total_capital or 0.0,
        currency=req.currency or "USD",
        items=req.items or [],
    )


@app.delete("/api/portfolios/{p_id}")
async def delete_portfolio(p_id: str):
    return backend.remove_portfolio(p_id)


@app.patch("/api/portfolios/{p_id}")
async def update_portfolio(p_id: str, req: PortfolioRequest):
    updates = req.model_dump(exclude_none=True)
    return backend.update_portfolio(p_id, updates)


@app.get("/api/master-portfolios")
async def get_master_portfolios(pa_scenario: Optional[str] = None):
    return {"success": True, "data": backend.get_master_portfolios(pa_scenario)}


@app.post("/api/master-portfolios")
async def create_master_portfolio(req: MasterPortfolioRequest):
    return backend.add_master_portfolio(
        name=req.name, corp_id=req.corp_id, pension_id=req.pension_id
    )


@app.patch("/api/master-portfolios/{m_id}")
async def update_master_portfolio(m_id: str, req: MasterPortfolioRequest):
    updates = req.model_dump(exclude_none=True)
    return backend.update_master_portfolio(m_id, updates)


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


@app.get("/api/cost-comparison/config")
async def get_cost_comparison_config():
    return {"success": True, "data": backend.get_cost_comparison_config()}


@app.post("/api/cost-comparison/config")
async def update_cost_comparison_config(req: CostComparisonConfigRequest):
    config_dict = req.model_dump(exclude_none=True)
    return backend.update_cost_comparison_config(config_dict)


@app.post("/api/cost-comparison/run")
async def run_cost_comparison(req: Optional[CostComparisonConfigRequest] = None):
    config_override = req.model_dump(exclude_none=True) if req else {}
    return backend.run_cost_comparison(config_override)


@app.get("/api/retirement/simulate")
async def run_retirement_simulation(
    scenario: Optional[str] = None,
    stress_scenario: Optional[str] = None,
    pa_scenario: Optional[str] = None,
):
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
            "monthly_bookkeeping_fee",
            "annual_corp_tax_adjustment_fee",
            "employee_count",
            "initial_shareholder_loan",
        ],
        "pension_params": ["monthly_withdrawal_target", "initial_investment"],
        "tax_and_insurance": [
            "point_unit_price",
            "ltc_rate",
            "corp_tax_threshold",
            "corp_tax_nominal_rate",
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
    monthly_bookkeeping_fee = float(
        corp_params.get("monthly_bookkeeping_fee", corp_params.get("monthly_fixed_cost", 0)) or 0
    )
    annual_corp_tax_adjustment_fee = float(corp_params.get("annual_corp_tax_adjustment_fee") or 0)
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
    if scenario and scenario not in assumptions:
        return {
            "success": False,
            "message": (
                f"활성화된 미래 가정(Assumption) '{scenario}' 데이터가 없습니다. "
                "stress scenario는 stress_scenario 쿼리로 전달해주세요."
            ),
        }
    assumption = assumptions.get(active_id, assumptions.get("v1"))
    if not assumption:
        return {"success": False, "message": "활성화된 미래 가정(Assumption) 데이터가 없습니다."}

    # 4. 시뮬레이션 파라미터 결합 (포트폴리오 통계 포함)
    sim_params = config["simulation_params"]
    user_profile = config["user_profile"]
    strategy_rules = config.get("strategy_rules", {})
    corporate_rules = strategy_rules.get("corporate", {})
    pension_rules = strategy_rules.get("pension", {})

    # [REQ-RAMS-1.5.1] 활성화된 마스터 포트폴리오 기반 데이터 추출
    active_master = backend.get_active_master_portfolio()
    if active_master:
        master_calc = backend.calculate_master_portfolio_tr(active_master)
        if not master_calc["success"]:
            return {
                "success": False,
                "message": master_calc["message"],
                "broken_reference": True,
            }

    active_corp = (
        backend.get_portfolio_by_id(active_master.get("corp_id")) if active_master else None
    )
    active_pension = (
        backend.get_portfolio_by_id(active_master.get("pension_id")) if active_master else None
    )
    if active_master and (active_corp or active_pension):
        corp_stats = backend.get_portfolio_stats_by_id(active_master.get("corp_id"), pa_scenario)
        pension_stats = backend.get_portfolio_stats_by_id(
            active_master.get("pension_id"), pa_scenario
        )
    else:
        # Fallback: 마스터가 없으면 타입별 첫 번째 포트폴리오 사용 (하위 호환)
        c_p = next((p for p in backend.portfolios if p.get("account_type") == "Corporate"), None)
        p_p = next((p for p in backend.portfolios if p.get("account_type") == "Pension"), None)
        corp_stats = backend.get_portfolio_stats_by_id(c_p["id"] if c_p else None, pa_scenario)
        pension_stats = backend.get_portfolio_stats_by_id(p_p["id"] if p_p else None, pa_scenario)

    base_master_return = _combined_master_return(
        corp_stats,
        pension_stats,
        active_corp if active_master else None,
        active_pension if active_master else None,
    )
    if active_id != "v1" and active_id in assumptions:
        profile_return = float(assumption["expected_return"])
        if base_master_return is None:
            base_master_return = _combined_master_return(
                corp_stats,
                pension_stats,
                {"total_capital": initial_assets["corp"]} if initial_assets["corp"] else None,
                (
                    {"total_capital": initial_assets["pension"]}
                    if initial_assets["pension"]
                    else None
                ),
            )
        profile_delta = profile_return - float(base_master_return or 0.0)
        corp_stats = _apply_profile_return_override(corp_stats, profile_delta)
        pension_stats = _apply_profile_return_override(pension_stats, profile_delta)

    base_params = {
        "portfolio_stats": {"corp": corp_stats, "pension": pension_stats},
        "category_return_rates": {
            "corp": corp_stats.get("category_return_rates", {}),
            "pension": pension_stats.get("category_return_rates", {}),
        },
        "appreciation_rates": {
            k: v / 100.0
            for k, v in backend.get_appreciation_rates_for_scenario(pa_scenario).items()
        },
        "target_monthly_cashflow": sim_params["target_monthly_cashflow"],
        "household_monthly_need": sim_params.get(
            "household_monthly_need", sim_params["target_monthly_cashflow"]
        ),
        "inflation_rate": assumption["inflation_rate"],
        "birth_year": user_profile["birth_year"],
        "birth_month": user_profile["birth_month"],
        "private_pension_start_age": user_profile["private_pension_start_age"],
        "national_pension_start_age": user_profile["national_pension_start_age"],
        "simulation_start_year": sim_params["simulation_start_year"],
        "simulation_start_month": sim_params["simulation_start_month"],
        "simulation_years": sim_params.get("simulation_years", 30),
        "pension_withdrawal_target": pension_params["monthly_withdrawal_target"],
        "national_pension_amount": sim_params["national_pension_amount"],
        "initial_shareholder_loan": corp_params["initial_shareholder_loan"],
        "planned_cashflows": config.get("planned_cashflows", []),
        "corp_salary": corp_params["monthly_salary"],
        "monthly_bookkeeping_fee": monthly_bookkeeping_fee,
        "annual_corp_tax_adjustment_fee": annual_corp_tax_adjustment_fee,
        "employee_count": corp_params["employee_count"],
        "rebalance_month": strategy_rules.get("rebalance_month", 5),
        "sgov_target_months": corporate_rules.get("sgov_target_months", 30),
        "corp_november_sgov_target_months": corporate_rules.get(
            "november_sgov_target_months", corporate_rules.get("sgov_warn_months", 27)
        ),
        "corp_bond_floor_months": corporate_rules.get("bond_floor_months", 12),
        "corp_bond_target_months": corporate_rules.get("bond_target_months", 18),
        "corp_bond_upper_months": corporate_rules.get("bond_upper_months", 24),
        "pension_sgov_target_months": pension_rules.get(
            "sgov_target_months", pension_rules.get("sgov_min_years", 2) * 12
        ),
        "pension_sgov_floor_months": pension_rules.get("sgov_floor_months", 12),
        "pension_bond_floor_months": pension_rules.get("bond_floor_months", 12),
        "pension_bond_target_months": pension_rules.get("bond_target_months", 18),
        "pension_bond_upper_months": pension_rules.get("bond_upper_months", 24),
        "distribution_rules": config.get("distribution_rules", {}),
        "distribution_yield_overrides": config.get("distribution_yield_overrides", {}),
    }

    # 5. 세무 엔진 최신화
    tax_config = config["tax_and_insurance"]
    current_tax_engine = TaxEngine(config=tax_config)
    projection_engine.tax_engine = current_tax_engine

    # 6. 스트레스 테스트 시나리오 적용 (필요 시)
    final_params = base_params
    normalized_stress_scenario = None
    valid_stress_scenarios = {"BEAR", "STAGFLATION", "DIVIDEND_CUT"}
    if stress_scenario:
        normalized_stress_scenario = stress_scenario.upper()
        if normalized_stress_scenario not in valid_stress_scenarios:
            return {
                "success": False,
                "message": (
                    "지원하지 않는 stress scenario입니다. "
                    "BEAR, STAGFLATION, DIVIDEND_CUT 중 하나를 사용해주세요."
                ),
            }
        final_params = stress_engine.apply_scenario(base_params, normalized_stress_scenario)

    # 7. 엔진 실행
    result = projection_engine.run_30yr_simulation(initial_assets, final_params)

    # [REQ-UI-05] 사용된 마스터 전략 및 포트폴리오 정보 메타데이터 추가
    active_m = backend.get_active_master_portfolio()
    if active_m:
        corp_p = backend.get_portfolio_by_id(active_m.get("corp_id"))
        pen_p = backend.get_portfolio_by_id(active_m.get("pension_id"))
    else:
        corp_p = next(
            (p for p in backend.get_portfolios() if p.get("account_type") == "Corporate"),
            None,
        )
        pen_p = next(
            (p for p in backend.get_portfolios() if p.get("account_type") == "Pension"),
            None,
        )
    if corp_p is None:
        corp_p = next(
            (p for p in backend.get_portfolios() if p.get("account_type") == "Corporate"),
            None,
        )
    if pen_p is None:
        pen_p = next(
            (p for p in backend.get_portfolios() if p.get("account_type") == "Pension"),
            None,
        )

    # 마스터 전략의 통합 수익률 계산
    combined_tr = None
    combined_dy = None
    if active_m:
        c_cap = corp_p["total_capital"] if corp_p else 0
        p_cap = pen_p["total_capital"] if pen_p else 0
        total_cap = c_cap + p_cap
        if total_cap > 0:
            combined_dy = (
                corp_stats.get("dividend_yield", 0.0) * c_cap
                + pension_stats.get("dividend_yield", 0.0) * p_cap
            ) / total_cap
            # [REQ-GLB-13] 자산군별 PA가 이미 반영된 expected_return을 가중 평균
            combined_tr = (
                corp_stats.get("expected_return", 0.0) * c_cap
                + pension_stats.get("expected_return", 0.0) * p_cap
            ) / total_cap
        elif corp_p:
            combined_dy = corp_stats.get("dividend_yield", 0.0)
            combined_tr = corp_stats.get("expected_return", 0.0)
        elif pen_p:
            combined_dy = pension_stats.get("dividend_yield", 0.0)
            combined_tr = pension_stats.get("expected_return", 0.0)

    result["meta"] = {
        "master_name": active_m["name"] if active_m else "None (Manual)",
        "master_yield": combined_dy,  # DY 표시용
        "master_tr": combined_tr,  # TR 표시용
        "combined_dy": combined_dy,
        "combined_tr": combined_tr,
        "pa_rate": combined_tr - combined_dy if (combined_tr and combined_dy) else 0.0,
        "pa_scenario": backend._normalize_pa_scenario(pa_scenario),
        "stress_scenario": normalized_stress_scenario,
        "strategy_rules_summary": {
            "rebalance_month": strategy_rules.get("rebalance_month", 5),
            "corporate_sgov_target_months": corporate_rules.get("sgov_target_months", 30),
            "pension_sgov_target_months": pension_rules.get(
                "sgov_target_months", pension_rules.get("sgov_min_years", 2) * 12
            ),
        },
        "used_portfolios": {
            "corp": {
                "name": corp_p["name"] if corp_p else "Default (None)",
                "yield": f"{corp_stats.get('dividend_yield', 0)*100:.2f}%",
                "expected_return": corp_stats.get("expected_return", 0.07),
            },
            "pension": {
                "name": pen_p["name"] if pen_p else "Default (None)",
                "yield": f"{pension_stats.get('dividend_yield', 0)*100:.2f}%",
                "expected_return": pension_stats.get("expected_return", 0.07),
            },
        },
    }

    return {"success": True, "data": result}


@app.get("/api/retirement/snapshot")
async def get_retirement_snapshot():
    return {"success": True, "data": backend.get_retirement_snapshot()}


@app.post("/api/retirement/snapshot")
async def create_retirement_snapshot(req: dict):
    return backend.save_retirement_snapshot(req)


@app.get("/api/test/state")
async def get_test_state():
    return {"success": True, "data": backend.export_test_state()}


@app.post("/api/test/state")
async def restore_test_state(req: TestStateRequest):
    return backend.restore_test_state(req.data)
