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


def base_params() -> dict:
    return {
        "simulation_years": 1,
        "simulation_start_year": 2026,
        "simulation_start_month": 5,
        "birth_year": 1972,
        "birth_month": 8,
        "private_pension_start_age": 55,
        "national_pension_start_age": 65,
        "target_monthly_cashflow": 11500000,
        "inflation_rate": 0.0,
        "corp_salary": 0,
        "corp_fixed_cost": 0,
        "employee_count": 0,
        "initial_shareholder_loan": 0,
        "national_pension_amount": 2000000,
        "pension_withdrawal_target": 2500000,
        "market_return_rate": 0.0,
        "planned_cashflows": [],
        "portfolio_stats": {
            "corp": {
                "dividend_yield": 0.0,
                "expected_return": 0.0,
                "strategy_weights": {
                    "SGOV Buffer": 0.20,
                    "Bond Buffer": 0.30,
                    "High Income": 0.10,
                    "Dividend Growth": 0.15,
                    "Growth Engine": 0.25,
                },
            },
            "pension": {
                "dividend_yield": 0.0,
                "expected_return": 0.0,
                "strategy_weights": {
                    "SGOV Buffer": 0.10,
                    "Bond Buffer": 0.40,
                    "High Income": 0.00,
                    "Dividend Growth": 0.20,
                    "Growth Engine": 0.30,
                },
            },
        },
        "appreciation_rates": {
            "cash_sgov": 0.0,
            "bond_buffer": 0.0,
            "high_income": 0.0,
            "dividend_stocks": 0.0,
            "growth_stocks": 0.0,
        },
    }


def test_monthly_output_exposes_all_five_strategy_buckets_separately():
    """OS v11.1 결과는 5개 전략 카테고리 잔액을 각각 노출해야 한다."""
    params = base_params()
    params["simulation_start_month"] = 4

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 60000000},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_sgov_balance"] == 8500000
    assert month1["corp_bond_balance"] == 30000000
    assert month1["corp_high_income_balance"] == 10000000
    assert month1["corp_dividend_balance"] == 15000000
    assert month1["corp_growth_balance"] == 25000000


def test_corporate_may_rebalance_refills_sgov_even_without_same_month_deficit():
    """5월 정기점검은 적자 발생 여부와 무관하게 법인 SGOV를 목표 개월수로 복구해야 한다."""
    params = base_params()
    params["target_monthly_cashflow"] = 1000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.02,
        "Bond Buffer": 0.58,
        "High Income": 0.00,
        "Dividend Growth": 0.00,
        "Growth Engine": 0.40,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_sgov_months"] >= 30.0


def test_phase_two_corporate_need_uses_total_need_minus_pension_draw():
    """Phase 2에서는 개인연금 차감 후의 법인 부담액만 법인 SGOV에서 인출해야 한다."""
    params = base_params()
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["national_pension_start_age"] = 80
    params["simulation_start_year"] = 2026
    params["simulation_start_month"] = 8
    params["target_monthly_cashflow"] = 11500000
    params["pension_withdrawal_target"] = 2500000
    params["national_pension_amount"] = 0
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 1.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 1.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 50000000, "pension": 50000000},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["phase"] == "Phase 2"
    assert month1["corp_monthly_need"] == 9000000
    assert month1["pension_draw"] == 2500000
    assert month1["corp_sgov_balance"] == 41000000


def test_category_specific_pa_dy_tr_are_applied_independently():
    """Bond Buffer와 Growth Engine은 서로 다른 TR을 독립적으로 적용받아야 한다."""
    params = base_params()
    params["target_monthly_cashflow"] = 0
    params["portfolio_stats"]["corp"]["dividend_yield"] = 0.0
    params["portfolio_stats"]["corp"]["expected_return"] = 0.0
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.50,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.50,
    }
    params["category_return_rates"] = {
        "corp": {
            "Bond Buffer": {"dy": 0.00, "pa": 0.00, "tr": 0.00},
            "Growth Engine": {"dy": 0.00, "pa": 0.12, "tr": 0.12},
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_bond_balance"] == 60000
    assert month1["corp_growth_balance"] > 60000
