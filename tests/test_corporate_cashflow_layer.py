from src.core.projection_engine import ProjectionEngine
from src.core.rebalance_engine import RebalanceEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine


def make_engine() -> ProjectionEngine:
    return ProjectionEngine(
        tax_engine=TaxEngine(),
        trigger_engine=TriggerEngine(),
        rebalance_engine=RebalanceEngine(),
    )


def test_corporate_dividend_income_flows_to_cash_before_expense():
    """법인 배당/인컴은 자산 재투자가 아니라 현금으로 유입되어야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params={
            "simulation_years": 1,
            "target_monthly_cashflow": 0,
            "inflation_rate": 0.0,
            "market_return_rate": 0.12,
            "corp_salary": 0,
            "corp_fixed_cost": 500,
            "employee_count": 0,
            "initial_shareholder_loan": 0,
            "portfolio_stats": {
                "corp": {
                    "dividend_yield": 0.12,
                    "weights": {"Dividend": 1.0},
                },
                "pension": {"dividend_yield": 0.0, "weights": {}},
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]

    # 12만 원 자산에서 월 배당 1,200원이 현금으로 들어오고,
    # 운영비 500원을 먼저 지출한 뒤 총 법인 자산은 120,700원이 남아야 한다.
    assert month1["corp_balance"] == 120700


def test_shareholder_loan_repayment_uses_corporate_cash_only():
    """주주대여금 반환은 법인 현금 잔액 범위 내에서만 이루어져야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params={
            "simulation_years": 1,
            "target_monthly_cashflow": 1000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.12,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "initial_shareholder_loan": 100000,
            "portfolio_stats": {
                "corp": {
                    "dividend_yield": 0.12,
                    "weights": {"Dividend": 1.0},
                },
                "pension": {"dividend_yield": 0.0, "weights": {}},
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]

    # 월 배당 1,200원 중 1,000원만 주주대여금 반환으로 사용되고
    # 200원은 법인 현금에 남아 총 법인 자산은 120,200원이 되어야 한다.
    assert month1["loan_balance"] == 99000
    assert month1["corp_balance"] == 120200


def test_corporate_growth_sale_waits_for_rebalance_month():
    """전략 자산 매도는 지정된 리밸런싱 월이 아니면 실행되지 않아야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 2,
            "target_monthly_cashflow": 1000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.0,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "initial_shareholder_loan": 0,
            "rebalance_month": 1,
            "portfolio_stats": {
                "corp": {
                    "dividend_yield": 0.0,
                    "weights": {"Growth": 1.0},
                },
                "pension": {"dividend_yield": 0.0, "weights": {}},
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_balance"] == 120000
    assert result["summary"]["growth_asset_sell_start_date"] == "None"


def test_corporate_growth_sale_runs_in_rebalance_month():
    """전략 자산 매도는 지정된 리밸런싱 월에는 실행될 수 있어야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "target_monthly_cashflow": 1000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.0,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "initial_shareholder_loan": 0,
            "rebalance_month": 1,
            "portfolio_stats": {
                "corp": {
                    "dividend_yield": 0.0,
                    "weights": {"Growth": 1.0},
                },
                "pension": {"dividend_yield": 0.0, "weights": {}},
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_balance"] == 119000
    assert result["summary"]["growth_asset_sell_start_date"] == "2026-01"


def test_corporate_rebalance_prefers_income_assets_before_growth():
    """리밸런싱 월에는 성장 자산보다 인컴 자산을 먼저 사용해야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "target_monthly_cashflow": 1000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.0,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "initial_shareholder_loan": 0,
            "rebalance_month": 1,
            "portfolio_stats": {
                "corp": {
                    "dividend_yield": 0.0,
                    "weights": {"Dividend": 0.5, "Growth": 0.5},
                },
                "pension": {"dividend_yield": 0.0, "weights": {}},
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]

    # 총 법인 자산은 1,000원 감소하지만 성장 자산 매도는 발생하지 않아야 한다.
    assert month1["corp_balance"] == 119000
    assert result["summary"]["growth_asset_sell_start_date"] == "None"


def test_pension_rebalance_uses_bond_before_dividend_and_growth():
    """연금 계좌는 SGOV 부족 시 Bond Buffer를 먼저 사용해야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 0, "pension": 120000},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "target_monthly_cashflow": 1000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.0,
            "private_pension_start_age": 0,
            "birth_year": 1980,
            "birth_month": 1,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "monthly_withdrawal_target": 1000,
            "pension_withdrawal_target": 1000,
            "rebalance_month": 1,
            "sgov_min_years": 2,
            "bond_min_years": 5,
            "bond_min_total_ratio": 0.05,
            "dividend_min_ratio": 0.10,
            "portfolio_stats": {
                "corp": {"dividend_yield": 0.0, "weights": {}},
                "pension": {
                    "dividend_yield": 0.0,
                    "weights": {"Cash": 0.0, "Fixed": 0.5, "Dividend": 0.5},
                },
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["pension_balance"] == 119000
    assert result["summary"]["growth_asset_sell_start_date"] == "None"


def test_bear_market_freeze_blocks_growth_sale():
    """하락장 잠금이 켜지면 성장 자산 매도는 리밸런싱 월에도 막혀야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "target_monthly_cashflow": 1000,
            "inflation_rate": 0.0,
            "market_return_rate": -0.30,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "initial_shareholder_loan": 0,
            "rebalance_month": 1,
            "bear_market_freeze_enabled": True,
            "portfolio_stats": {
                "corp": {
                    "dividend_yield": 0.0,
                    "weights": {"Growth": 1.0},
                },
                "pension": {"dividend_yield": 0.0, "weights": {}},
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["corp_balance"] == 117000
    assert result["summary"]["growth_asset_sell_start_date"] == "None"


def test_corporate_growth_sale_requires_crisis_buffer_threshold():
    """법인 Growth 매도는 위기 버퍼 임계치 미만일 때만 허용되어야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "target_monthly_cashflow": 1000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.0,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "initial_shareholder_loan": 0,
            "rebalance_month": 1,
            "sgov_crisis_months": 24,
            "portfolio_stats": {
                "corp": {
                    "dividend_yield": 0.0,
                    "weights": {"Cash": 0.2, "Growth": 0.8},
                },
                "pension": {"dividend_yield": 0.0, "weights": {}},
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["corp_balance"] == 119000
    assert result["summary"]["growth_asset_sell_start_date"] == "None"


def test_pension_growth_sale_is_blocked_before_phase3():
    """연금 Growth 매도는 Phase 2에서는 금지되어야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 0, "pension": 120000},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "target_monthly_cashflow": 1000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.0,
            "private_pension_start_age": 0,
            "national_pension_start_age": 65,
            "national_pension_amount": 0,
            "birth_year": 1980,
            "birth_month": 1,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "monthly_withdrawal_target": 1000,
            "pension_withdrawal_target": 1000,
            "rebalance_month": 1,
            "portfolio_stats": {
                "corp": {"dividend_yield": 0.0, "weights": {}},
                "pension": {
                    "dividend_yield": 0.0,
                    "weights": {"Growth": 1.0},
                },
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["phase"] == "Phase 2"
    assert month1["pension_balance"] == 120000


def test_pension_growth_sale_is_allowed_in_phase3():
    """연금 Growth 매도는 Phase 3에서는 허용되어야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 0, "pension": 120000},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "target_monthly_cashflow": 1000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.0,
            "private_pension_start_age": 0,
            "national_pension_start_age": 0,
            "national_pension_amount": 0,
            "birth_year": 1980,
            "birth_month": 1,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "monthly_withdrawal_target": 1000,
            "pension_withdrawal_target": 1000,
            "rebalance_month": 1,
            "portfolio_stats": {
                "corp": {"dividend_yield": 0.0, "weights": {}},
                "pension": {
                    "dividend_yield": 0.0,
                    "weights": {"Growth": 1.0},
                },
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["phase"] == "Phase 3"
    assert month1["pension_balance"] == 119000


def test_pension_growth_sale_waits_until_dividend_floor_is_breached():
    """연금 Growth 매도는 Phase 3이어도 Dividend 10% 바닥 전에는 금지되어야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 0, "pension": 100000},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "target_monthly_cashflow": 15000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.0,
            "private_pension_start_age": 0,
            "national_pension_start_age": 0,
            "national_pension_amount": 0,
            "birth_year": 1980,
            "birth_month": 1,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "pension_withdrawal_target": 15000,
            "rebalance_month": 1,
            "dividend_min_ratio": 0.10,
            "portfolio_stats": {
                "corp": {"dividend_yield": 0.0, "weights": {}},
                "pension": {
                    "dividend_yield": 0.0,
                    "strategy_weights": {
                        "SGOV Buffer": 0.0,
                        "Bond Buffer": 0.8,
                        "Dividend Growth": 0.15,
                        "Growth Engine": 0.05,
                    },
                },
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["phase"] == "Phase 3"
    assert month1["pension_balance"] == 85000


def test_corporate_dividend_sale_waits_until_high_income_floor_is_breached():
    """법인 SCHD 매도는 High Income 20% 바닥 전에는 금지되어야 한다."""
    engine = make_engine()

    result = engine._execute_loop(
        initial_assets={"corp": 100000, "pension": 0},
        params={
            "simulation_years": 1,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "target_monthly_cashflow": 25000,
            "inflation_rate": 0.0,
            "market_return_rate": 0.0,
            "corp_salary": 0,
            "corp_fixed_cost": 0,
            "employee_count": 0,
            "initial_shareholder_loan": 0,
            "rebalance_month": 1,
            "sgov_warn_months": 30,
            "sgov_crisis_months": 24,
            "high_income_min_ratio": 0.20,
            "growth_sell_years_left_threshold": 0,
            "portfolio_stats": {
                "corp": {
                    "dividend_yield": 0.0,
                    "strategy_weights": {
                        "SGOV Buffer": 0.10,
                        "High Income": 0.30,
                        "Dividend Growth": 0.60,
                        "Growth Engine": 0.0,
                    },
                },
                "pension": {"dividend_yield": 0.0, "weights": {}},
            },
        },
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["corp_balance"] == 75000
    assert result["summary"]["growth_asset_sell_start_date"] == "None"
