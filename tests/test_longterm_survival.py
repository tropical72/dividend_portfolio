from src.core.projection_engine import ProjectionEngine
from src.core.rebalance_engine import RebalanceEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine


def test_longterm_survival_simulation():
    """장기 실행 시 summary/monthly_data 구조와 영구 생존 플래그를 유지해야 한다."""
    engine = ProjectionEngine(
        tax_engine=TaxEngine(),
        trigger_engine=TriggerEngine(),
        rebalance_engine=RebalanceEngine(),
    )
    result = engine.run_30yr_simulation(
        {"corp": 1600000000, "pension": 600000000},
        {
            "simulation_years": 30,
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
                "corp": {"dividend_yield": 0.0, "expected_return": 0.0, "weights": {"Growth": 1.0}},
                "pension": {
                    "dividend_yield": 0.0,
                    "expected_return": 0.0,
                    "weights": {"Growth": 1.0},
                },
            },
            "category_return_rates": {
                "corp": {"Growth Engine": {"dy": 0.0, "pa": 0.05, "tr": 0.05}},
                "pension": {"Growth Engine": {"dy": 0.0, "pa": 0.05, "tr": 0.05}},
            },
        },
    )

    assert "summary" in result
    assert "monthly_data" in result
    assert len(result["monthly_data"]) > 0

    summary = result["summary"]
    assert summary["total_survival_years"] >= 30
    assert summary["is_permanent"] is True
    assert "infinite_with_10pct_cut" in summary
