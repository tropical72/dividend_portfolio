import pytest

from src.core.projection_engine import ProjectionEngine
from src.core.tax_engine import TaxEngine


def make_engine() -> ProjectionEngine:
    return ProjectionEngine(TaxEngine())


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


def test_annual_price_appreciation_uses_compound_monthly_conversion():
    """연 PA 12%는 12개월 뒤 12.68%가 아니라 정확히 12% 누적 가격상승이어야 한다."""
    params = base_params()
    params["simulation_years"] = 1
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.0, "pa": 0.12, "tr": 0.12}},
        "pension": {"Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }

    result = make_engine()._execute_loop(
        {"corp": 100000000, "pension": 0},
        params,
        months=12,
    )

    assert result["monthly_data"][-1]["total_net_worth"] == pytest.approx(112000000)


def test_distribution_run_rate_is_not_repriced_by_price_appreciation():
    """가격 하락 PA만으로 다음 달 배당금 절대액이 자동 삭감되면 안 된다."""
    params = base_params()
    params["simulation_years"] = 1
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.06, "pa": -0.50, "tr": -0.44}},
        "pension": {"Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }

    result = make_engine()._execute_loop(
        {"corp": 100000000, "pension": 0},
        params,
        months=2,
    )

    assert result["monthly_data"][0]["corp_realized_income"] == pytest.approx(500000)
    assert result["monthly_data"][1]["corp_realized_income"] == pytest.approx(500000)


def test_distribution_run_rate_initialization_ignores_monthly_override_dy():
    """월별 override DY는 영구 run-rate 초기값을 오염시키면 안 된다."""
    params = base_params()
    params["simulation_years"] = 1
    params["simulation_start_month"] = 1
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.06, "pa": 0.0, "tr": 0.06}},
        "pension": {"Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }
    params["monthly_return_overrides"] = {
        "corp": {"Growth Engine": {"2026-01": {"dy": 0.0, "pa": 0.0}}}
    }

    result = make_engine()._execute_loop(
        {"corp": 100000000, "pension": 0},
        params,
        months=2,
    )

    assert result["monthly_data"][0]["corp_realized_income"] == pytest.approx(500000)
    assert result["monthly_data"][1]["corp_realized_income"] == pytest.approx(500000)


def test_distribution_run_rate_compounds_with_growth_rule():
    """분배금 run-rate 성장률은 가격 평가액과 별도로 복리 월 성장한다."""
    params = base_params()
    params["simulation_years"] = 2
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.06, "pa": 0.0, "tr": 0.06}},
        "pension": {"Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }
    params["distribution_rules"] = {
        "corp": {"Growth Engine": {"growth_rate": 0.12}},
    }

    result = make_engine()._execute_loop(
        {"corp": 120000000, "pension": 0},
        params,
        months=13,
    )

    assert result["monthly_data"][0]["corp_realized_income"] == pytest.approx(600000)
    assert result["monthly_data"][12]["corp_realized_income"] == pytest.approx(672000)


def test_distribution_run_rate_is_cut_after_crash20_when_configured():
    """Crash20 발생 시 설정된 삭감률만큼 다음 달 분배금 run-rate가 줄어든다."""
    params = base_params()
    params["simulation_years"] = 1
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.06, "pa": -3.0, "tr": -2.94}},
        "pension": {"Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }
    params["distribution_rules"] = {
        "corp": {"Growth Engine": {"stress_cut_rate": 0.40}},
    }

    result = make_engine()._execute_loop(
        {"corp": 100000000, "pension": 0},
        params,
        months=2,
    )

    assert result["monthly_data"][0]["crash20_triggered"] is True
    assert result["monthly_data"][0]["corp_realized_income"] == pytest.approx(500000)
    assert result["monthly_data"][1]["corp_realized_income"] == pytest.approx(300000)


def test_distribution_run_rate_scales_down_after_partial_transfer():
    """비현금 카테고리 일부 매도 후 다음 달 분배금은 남은 포지션 비율만큼 감소해야 한다."""
    engine = make_engine()
    params = base_params()
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.06, "pa": 0.0, "tr": 0.06}},
    }
    assets = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 100000000.0,
    }
    run_rates = {"Growth Engine": 6000000.0}

    engine._transfer(
        assets,
        "Growth Engine",
        "SGOV Buffer",
        80000000.0,
        distribution_run_rates=run_rates,
        account_key="corp",
        account_stats=params["portfolio_stats"]["corp"],
        params=params,
        sim_year=2026,
        sim_month=5,
    )
    realized_income = engine._apply_monthly_returns(
        "corp",
        assets,
        run_rates,
        params["portfolio_stats"]["corp"],
        params,
        2026,
        6,
    )

    assert run_rates["Growth Engine"] == pytest.approx(1200000)
    assert realized_income == pytest.approx(100000)


def test_distribution_run_rate_is_created_after_new_risk_deployment():
    """현금성 자산에서 비현금 카테고리를 새로 매수하면 target DY 기반 run-rate가 생겨야 한다."""
    engine = make_engine()
    params = base_params()
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.06, "pa": 0.0, "tr": 0.06}},
    }
    assets = {
        "SGOV Buffer": 100000000.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    run_rates = {"Growth Engine": 0.0}

    engine._transfer(
        assets,
        "SGOV Buffer",
        "Growth Engine",
        50000000.0,
        distribution_run_rates=run_rates,
        account_key="corp",
        account_stats=params["portfolio_stats"]["corp"],
        params=params,
        sim_year=2026,
        sim_month=5,
    )
    realized_income = engine._apply_monthly_returns(
        "corp",
        assets,
        run_rates,
        params["portfolio_stats"]["corp"],
        params,
        2026,
        6,
    )

    assert run_rates["Growth Engine"] == pytest.approx(3000000)
    assert realized_income == pytest.approx(250000)


def test_distribution_yield_override_takes_priority_for_new_run_rate_creation():
    """신규 매수분 run-rate는 category DY보다 distribution_yield_overrides를 우선해야 한다."""
    engine = make_engine()
    params = base_params()
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.06, "pa": 0.0, "tr": 0.06}},
    }
    params["distribution_yield_overrides"] = {
        "corp": {"Growth Engine": 0.08},
    }
    assets = {
        "SGOV Buffer": 100000000.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    run_rates = {"Growth Engine": 0.0}

    engine._transfer(
        assets,
        "SGOV Buffer",
        "Growth Engine",
        50000000.0,
        distribution_run_rates=run_rates,
        account_key="corp",
        account_stats=params["portfolio_stats"]["corp"],
        params=params,
        sim_year=2026,
        sim_month=5,
    )
    realized_income = engine._apply_monthly_returns(
        "corp",
        assets,
        run_rates,
        params["portfolio_stats"]["corp"],
        params,
        2026,
        6,
    )

    assert run_rates["Growth Engine"] == pytest.approx(4000000)
    assert realized_income == pytest.approx(333333.3333333333)


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
