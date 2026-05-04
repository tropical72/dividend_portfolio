from src.core.projection_engine import ProjectionEngine
from src.core.rebalance_engine import RebalanceEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine


def make_engine() -> ProjectionEngine:
    return ProjectionEngine(TaxEngine(), TriggerEngine(), RebalanceEngine())


def base_params() -> dict:
    return {
        "simulation_years": 2,
        "simulation_start_year": 2026,
        "simulation_start_month": 1,
        "birth_year": 1972,
        "birth_month": 8,
        "private_pension_start_age": 80,
        "national_pension_start_age": 90,
        "target_monthly_cashflow": 0,
        "inflation_rate": 0.0,
        "corp_salary": 0,
        "corp_fixed_cost": 0,
        "employee_count": 0,
        "initial_shareholder_loan": 0,
        "national_pension_amount": 0,
        "pension_withdrawal_target": 0,
        "portfolio_stats": {
            "corp": {
                "dividend_yield": 0.0,
                "expected_return": 0.0,
                "strategy_weights": {
                    "SGOV Buffer": 0.0,
                    "Bond Buffer": 0.0,
                    "High Income": 0.0,
                    "Dividend Growth": 0.0,
                    "Growth Engine": 1.0,
                },
            },
            "pension": {
                "dividend_yield": 0.0,
                "expected_return": 0.0,
                "strategy_weights": {
                    "SGOV Buffer": 0.0,
                    "Bond Buffer": 0.0,
                    "High Income": 0.0,
                    "Dividend Growth": 0.0,
                    "Growth Engine": 1.0,
                },
            },
        },
    }


def test_simulation_math_integrity():
    """지출이 없고 수익률이 양수이면 총 순자산은 월별로 감소하지 않아야 한다."""
    params = base_params()
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.0, "pa": 0.12, "tr": 0.12}},
        "pension": {"Growth Engine": {"dy": 0.0, "pa": 0.12, "tr": 0.12}},
    }

    result = make_engine().run_30yr_simulation(
        {"corp": 1000000000, "pension": 500000000},
        params,
    )
    data = result["monthly_data"]

    assert len(data) > 0
    for i in range(1, len(data)):
        assert data[i]["total_net_worth"] >= data[i - 1]["total_net_worth"]


def test_higher_growth_profile_finishes_with_higher_net_worth():
    """같은 초기 조건이면 더 높은 Growth Engine PA가 더 큰 최종 순자산을 만들어야 한다."""
    conservative = base_params()
    conservative["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.0, "pa": 0.02, "tr": 0.02}},
        "pension": {"Growth Engine": {"dy": 0.0, "pa": 0.02, "tr": 0.02}},
    }
    optimistic = base_params()
    optimistic["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.0, "pa": 0.12, "tr": 0.12}},
        "pension": {"Growth Engine": {"dy": 0.0, "pa": 0.12, "tr": 0.12}},
    }

    initial_assets = {"corp": 800000000, "pension": 400000000}
    low_result = make_engine().run_30yr_simulation(initial_assets, conservative)
    high_result = make_engine().run_30yr_simulation(initial_assets, optimistic)

    assert (
        high_result["monthly_data"][-1]["total_net_worth"]
        > low_result["monthly_data"][-1]["total_net_worth"]
    )
