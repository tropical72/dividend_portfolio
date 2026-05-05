import pytest

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


def test_household_shortfall_uses_net_salary_not_gross_salary():
    """주주대여금 상환 필요액은 급여 총액이 아니라 실수령액 기준 부족분이어야 한다."""
    params = base_params()
    params["household_monthly_need"] = 10000000
    params["target_monthly_cashflow"] = 10000000
    params["corp_salary"] = 2500000
    params["employee_count"] = 1
    params["household_monthly_need"] = 10000000
    params["initial_shareholder_loan"] = 100000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 1.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 30000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["net_salary"] == pytest.approx(2151375.0)
    assert month1["shareholder_loan_payment"] == pytest.approx(7848625.0)
    assert month1["corp_monthly_need"] == pytest.approx(10348625.0)


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


def test_crash20_sets_shock_flag_and_keeps_it_until_next_may():
    """Crash20은 월말 이벤트로 Shock Flag를 켜고, 다음 5월 정기점검 전까지 유지되어야 한다."""
    params = base_params()
    params["simulation_years"] = 2
    params["simulation_start_month"] = 5
    params["target_monthly_cashflow"] = 0
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 1.0,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["category_return_rates"] = {
        "corp": {
            "Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
        }
    }
    params["monthly_return_overrides"] = {
        "corp": {
            "Growth Engine": {
                "2026-06": {"pa": -2.5, "dy": 0.0},
            }
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=13,
    )

    june = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 6)
    april = next(m for m in result["monthly_data"] if m["year"] == 2027 and m["month"] == 4)
    may = next(m for m in result["monthly_data"] if m["year"] == 2027 and m["month"] == 5)

    assert june["crash20_triggered"] is True
    assert june["shock_flag"] is True
    assert april["shock_flag"] is True
    assert may["shock_flag"] is False


def test_stress_is_decided_only_at_may_review():
    """Stress는 월말 잔액이 아니라 5월 정기점검 테스트 결과로만 갱신되어야 한다."""
    params = base_params()
    params["simulation_years"] = 2
    params["simulation_start_year"] = 2026
    params["simulation_start_month"] = 4
    params["target_monthly_cashflow"] = 1000000
    params["inflation_rate"] = 0.10
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.02,
        "Bond Buffer": 0.10,
        "High Income": 0.00,
        "Dividend Growth": 0.00,
        "Growth Engine": 0.88,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 10000000, "pension": 0},
        params=params,
        months=2,
    )

    april = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 4)
    may = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 5)

    assert april["stress"] is False
    assert may["stress"] is True
    assert may["inflation_action"] == "frozen"


def test_inflation_change_is_approved_in_may_and_applied_from_june():
    """인플레이션 조정은 5월에 승인 여부를 결정하고 6월부터 12개월 고정 적용해야 한다."""
    params = base_params()
    params["simulation_years"] = 2
    params["simulation_start_month"] = 5
    params["target_monthly_cashflow"] = 1000000
    params["inflation_rate"] = 0.10
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.30,
        "Bond Buffer": 0.20,
        "High Income": 0.00,
        "Dividend Growth": 0.00,
        "Growth Engine": 0.50,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 120000000, "pension": 0},
        params=params,
        months=3,
    )

    may = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 5)
    june = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 6)
    july = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 7)

    assert may["target_cashflow"] == 1000000
    assert may["next_target_cashflow"] == 1100000
    assert may["inflation_action"] == "approved"
    assert june["target_cashflow"] == 1100000
    assert july["target_cashflow"] == 1100000


def test_boost_temporarily_increases_pension_draw_for_six_months():
    """Shock 또는 Stress가 발생하면 개인연금 BOOST가 6개월 동안 추가 인출을 적용해야 한다."""
    params = base_params()
    params["simulation_years"] = 2
    params["simulation_start_month"] = 5
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["target_monthly_cashflow"] = 0
    params["pension_withdrawal_target"] = 2500000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 1.0,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 1.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
        "pension": {"SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }
    params["monthly_return_overrides"] = {
        "corp": {
            "Growth Engine": {
                "2026-06": {"pa": -3.6, "dy": 0.0},
            }
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 50000000},
        params=params,
        months=8,
    )

    june = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 6)
    july = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 7)
    november = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 11)
    december = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 12)

    assert june["boost_amount"] == 3000000
    assert july["pension_draw"] == 5500000
    assert november["pension_draw"] == 5500000
    assert december["boost_amount"] == 0


def test_may_rebalance_keeps_corporate_bond_buffer_when_within_upper_band():
    """법인 Bond Buffer가 18~24개월 구간이면 5월 SGOV 복구 때 우선적으로 소진되면 안 된다."""
    params = base_params()
    params["target_monthly_cashflow"] = 1000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.00,
        "Bond Buffer": 0.24,
        "High Income": 0.76,
        "Dividend Growth": 0.00,
        "Growth Engine": 0.00,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_bond_months"] == pytest.approx(24.0)
    assert month1["corp_sgov_months"] >= 30.0


def test_may_rebalance_keeps_pension_bond_buffer_when_within_upper_band():
    """개인연금 Bond Buffer가 18~24개월 구간이면 5월 SGOV 복구 때 우선 소진되면 안 된다."""
    params = base_params()
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["target_monthly_cashflow"] = 0
    params["pension_withdrawal_target"] = 1000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.24,
        "High Income": 0.0,
        "Dividend Growth": 0.76,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0, "pension": 100000000},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["pension_bond_months"] == pytest.approx(24.0)
    assert month1["pension_sgov_months"] >= 24.0


def test_may_rebalance_caps_pension_sgov_and_bond_at_document_limits():
    """개인연금 5월 리밸런싱 후 SGOV 24개월, Bond 24개월 상한이 유지되어야 한다."""
    params = base_params()
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["target_monthly_cashflow"] = 0
    params["pension_withdrawal_target"] = 1000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.50,
        "Bond Buffer": 0.50,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0, "pension": 100000000},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["pension_sgov_months"] == pytest.approx(24.0)
    assert month1["pension_bond_months"] == pytest.approx(24.0)


def test_november_does_not_run_pension_target_rebalance():
    """11월에는 개인연금 정기 24개월 복구를 실행하면 안 된다."""
    params = base_params()
    params["simulation_start_month"] = 11
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["target_monthly_cashflow"] = 0
    params["pension_withdrawal_target"] = 1000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.06,
        "Bond Buffer": 0.94,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0, "pension": 100000000},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["pension_sgov_months"] < 24.0


def test_august_corporate_mini_review_uses_bond_only_for_sgov_adjustment():
    """8월 법인 미니점검은 SGOV만 조정하고 주식/고인컴 리밸런싱은 하면 안 된다."""
    params = base_params()
    params["simulation_start_month"] = 8
    params["target_monthly_cashflow"] = 1000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 1.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["planned_cashflows"] = [
        {
            "year": 2026,
            "month": 8,
            "amount": 5000000,
            "type": "OUTFLOW",
            "entity": "CORP",
        }
    ]

    result = make_engine()._execute_loop(
        initial_assets={"corp": 20000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_sgov_balance"] == pytest.approx(1000000.0)
    assert month1["corp_bond_balance"] == pytest.approx(19000000.0)
    assert month1["corp_high_income_balance"] == 0.0
    assert month1["corp_growth_balance"] == 0.0


def test_phase_two_reference_calendar_matches_document_buffer_months():
    """OS v11.1 대표 Phase 2 시나리오에서 문서의 구조적 SGOV 기준선이 재현되어야 한다."""
    params = base_params()
    params["simulation_years"] = 2
    params["simulation_start_year"] = 2027
    params["simulation_start_month"] = 5
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["national_pension_start_age"] = 80
    params["target_monthly_cashflow"] = 11500000
    params["pension_withdrawal_target"] = 2500000
    params["national_pension_amount"] = 0
    params["inflation_rate"] = 0.0
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 1.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 1.0,
        "Growth Engine": 0.0,
    }
    params["category_return_rates"] = {
        "corp": {
            "Bond Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "High Income": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
        },
        "pension": {
            "Bond Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Dividend Growth": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
        },
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 600000000, "pension": 120000000},
        params=params,
        months=13,
    )

    monthly = {(m["year"], m["month"]): m for m in result["monthly_data"]}

    may_2027 = monthly[(2027, 5)]
    oct_2027 = monthly[(2027, 10)]
    nov_2027 = monthly[(2027, 11)]
    apr_2028 = monthly[(2028, 4)]
    may_2028 = monthly[(2028, 5)]

    assert may_2027["phase"] == "Phase 2"
    assert may_2027["corp_monthly_need"] == 9000000
    assert may_2027["corp_sgov_months"] == pytest.approx(30.0)
    assert may_2027["pension_sgov_months"] == pytest.approx(24.0)
    assert oct_2027["corp_sgov_months"] == pytest.approx(25.0)
    assert nov_2027["pre_review_corp_sgov_months"] == pytest.approx(24.0)
    assert nov_2027["corp_sgov_months"] == pytest.approx(27.0)
    assert nov_2027["pension_sgov_months"] == pytest.approx(18.0)
    assert apr_2028["corp_sgov_months"] == pytest.approx(22.0)
    assert may_2028["pre_review_corp_sgov_months"] == pytest.approx(21.0)
    assert may_2028["corp_sgov_months"] == pytest.approx(30.0)
    assert may_2028["pension_sgov_months"] == pytest.approx(24.0)


def test_shock_flag_freezes_may_inflation_even_when_assets_are_otherwise_healthy():
    """Shock Flag가 ON이면 다음 5월에는 자산여력이 있어도 인플레이션 승인을 하면 안 된다."""
    params = base_params()
    params["simulation_years"] = 2
    params["simulation_start_year"] = 2026
    params["simulation_start_month"] = 5
    params["target_monthly_cashflow"] = 1000000
    params["inflation_rate"] = 0.10
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.30,
        "Bond Buffer": 0.20,
        "High Income": 0.00,
        "Dividend Growth": 0.00,
        "Growth Engine": 0.50,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 1.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["category_return_rates"] = {
        "corp": {
            "SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Bond Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
        },
        "pension": {"SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }
    params["monthly_return_overrides"] = {
        "corp": {
            "Growth Engine": {
                "2026-06": {"pa": -2.5, "dy": 0.0},
            }
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 120000000, "pension": 60000000},
        params=params,
        months=13,
    )

    june = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 6)
    april_next = next(m for m in result["monthly_data"] if m["year"] == 2027 and m["month"] == 4)
    may_next = next(m for m in result["monthly_data"] if m["year"] == 2027 and m["month"] == 5)

    assert june["shock_flag"] is True
    assert april_next["shock_flag"] is True
    assert may_next["inflation_action"] == "frozen"
    assert may_next["shock_flag"] is False


@pytest.mark.parametrize(
    ("monthly_pa", "expected_boost"),
    [
        (-2.5, 2000000.0),
        (-3.6, 3000000.0),
    ],
)
def test_boost_amount_follows_shock_drawdown_ladder(monthly_pa: float, expected_boost: float):
    """Shock 발생 시 BOOST 금액은 drawdown 구간에 따라 2m/3m으로 나뉘어야 한다."""
    params = base_params()
    params["simulation_years"] = 1
    params["simulation_start_month"] = 5
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["target_monthly_cashflow"] = 0
    params["pension_withdrawal_target"] = 2500000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 1.0,
    }
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 1.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    params["category_return_rates"] = {
        "corp": {"Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
        "pension": {"SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }
    params["monthly_return_overrides"] = {
        "corp": {
            "Growth Engine": {
                "2026-06": {"pa": monthly_pa, "dy": 0.0},
            }
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 50000000},
        params=params,
        months=2,
    )

    june = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 6)

    assert june["shock_flag"] is True
    assert june["boost_amount"] == expected_boost


def test_boost_amount_first_ladder_is_one_million():
    """BOOST ladder의 15~20% 구간은 +1m이어야 한다."""
    engine = make_engine()

    assert engine._boost_amount_for_drawdown(85.0, 100.0) == 1000000.0
