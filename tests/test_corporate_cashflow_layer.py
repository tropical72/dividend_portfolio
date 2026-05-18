import pytest

from src.core.projection_engine import ProjectionEngine
from src.core.tax_engine import TaxEngine


def make_engine() -> ProjectionEngine:
    return ProjectionEngine(tax_engine=TaxEngine())


def base_params() -> dict:
    return {
        "simulation_years": 1,
        "simulation_start_year": 2026,
        "simulation_start_month": 1,
        "birth_year": 1972,
        "birth_month": 8,
        "private_pension_start_age": 55,
        "national_pension_start_age": 65,
        "target_monthly_cashflow": 11500000,
        "inflation_rate": 0.0,
        "corp_salary": 0,
        "monthly_bookkeeping_fee": 0,
        "employee_count": 0,
        "initial_shareholder_loan": 0,
        "national_pension_amount": 2000000,
        "pension_withdrawal_target": 2500000,
        "planned_cashflows": [],
        "portfolio_stats": {
            "corp": {
                "dividend_yield": 0.0,
                "expected_return": 0.0,
                "strategy_weights": {
                    "SGOV Buffer": 0.2,
                    "Bond Buffer": 0.3,
                    "High Income": 0.1,
                    "Dividend Growth": 0.15,
                    "Growth Engine": 0.25,
                },
            },
            "pension": {
                "dividend_yield": 0.0,
                "expected_return": 0.0,
                "strategy_weights": {
                    "SGOV Buffer": 0.1,
                    "Bond Buffer": 0.4,
                    "High Income": 0.0,
                    "Dividend Growth": 0.2,
                    "Growth Engine": 0.3,
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


def test_corporate_dividend_income_flows_into_sgov_before_expense():
    """비-SGOV 자산 배당은 먼저 SGOV Buffer로 유입되어야 한다."""
    params = base_params()
    params["simulation_start_month"] = 4
    params["target_monthly_cashflow"] = 0
    params["monthly_bookkeeping_fee"] = 500
    params["portfolio_stats"]["corp"]["dividend_yield"] = 0.12
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 1.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["corp_sgov_balance"] == 700
    assert month1["corp_dividend_balance"] == 120000
    assert month1["corp_balance"] == 120700


def test_shareholder_loan_repayment_uses_remaining_corporate_sgov_only():
    """주주대여금 상환은 세후 부족분까지만 집행되고, 남는 SGOV는 그대로 남아야 한다."""
    params = base_params()
    params["simulation_start_month"] = 4
    params["target_monthly_cashflow"] = 1000
    params["initial_shareholder_loan"] = 100000
    params["portfolio_stats"]["corp"]["dividend_yield"] = 0.12
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 1.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 120000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["shareholder_loan_payment"] == 1000
    assert month1["loan_balance"] == 99000
    assert month1["corp_sgov_balance"] == 200
    assert month1["corp_balance"] == 120200


def test_shareholder_loan_payment_only_covers_household_net_shortfall():
    """남는 SGOV 전액 상환이 아니라 세후 가계 부족분만 주주대여금으로 지급해야 한다."""
    params = base_params()
    params["simulation_start_month"] = 4
    params["household_monthly_need"] = 10000000
    params["target_monthly_cashflow"] = 10000000
    params["corp_salary"] = 2500000
    params["employee_count"] = 1
    params["monthly_bookkeeping_fee"] = 500000
    params["initial_shareholder_loan"] = 100000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 1.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 20000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["net_salary"] == 2151375.0
    assert month1["shareholder_loan_payment"] == pytest.approx(7848625.0)
    assert month1["corp_monthly_need"] == pytest.approx(10848625.0)
    assert month1["loan_balance"] == pytest.approx(92151375.0)


def test_corporate_bookkeeping_runs_monthly_and_tax_adjustment_fee_hits_only_in_march():
    """월 기장비는 매달, 연 세무조정료는 3월에만 현금유출로 반영되어야 한다."""
    params = base_params()
    params["simulation_years"] = 2
    params["simulation_start_month"] = 1
    params["target_monthly_cashflow"] = 0
    params["monthly_bookkeeping_fee"] = 500000
    params["annual_corp_tax_adjustment_fee"] = 1200000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 1.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 50000000, "pension": 0},
        params=params,
        months=15,
    )

    feb_2027 = next(m for m in result["monthly_data"] if m["year"] == 2027 and m["month"] == 2)
    mar_2027 = next(m for m in result["monthly_data"] if m["year"] == 2027 and m["month"] == 3)

    assert feb_2027["corp_bookkeeping_paid"] == pytest.approx(500000.0)
    assert feb_2027["corp_tax_adjustment_fee_paid"] == pytest.approx(0.0)
    assert mar_2027["corp_bookkeeping_paid"] == pytest.approx(500000.0)
    assert mar_2027["corp_tax_adjustment_fee_paid"] == pytest.approx(1200000.0)


def test_corporate_tax_uses_realized_income_and_pays_august_prepay_then_march_settlement():
    """법인세는 실현소득만 과세표준에 포함하고 8월 50% 선납 후 다음 해 3월 정산해야 한다."""
    params = base_params()
    params["simulation_years"] = 3
    params["simulation_start_month"] = 1
    params["target_monthly_cashflow"] = 0
    params["monthly_bookkeeping_fee"] = 0
    params["annual_corp_tax_adjustment_fee"] = 0
    params["corp_salary"] = 0
    params["portfolio_stats"]["corp"]["dividend_yield"] = 0.0
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 1.0,
        "Growth Engine": 0.0,
    }
    params["category_return_rates"] = {
        "corp": {
            "Dividend Growth": {"dy": 0.12, "pa": 0.0, "tr": 0.12},
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 120000000, "pension": 0},
        params=params,
        months=27,
    )

    aug_2027 = next(m for m in result["monthly_data"] if m["year"] == 2027 and m["month"] == 8)
    mar_2028 = next(m for m in result["monthly_data"] if m["year"] == 2028 and m["month"] == 3)

    expected_final_2026_tax = pytest.approx(1584000.0)
    assert aug_2027["corp_tax_payment"] == pytest.approx(792000.0)
    assert aug_2027["corp_tax_assessed_for_year"] == expected_final_2026_tax
    assert mar_2028["corp_tax_payment"] == pytest.approx(792000.0)
    assert mar_2028["corp_tax_assessed_for_year"] == expected_final_2026_tax


def test_corporate_may_rebalance_refills_sgov_to_thirty_months():
    """5월 정기점검에서는 적자 여부와 무관하게 법인 SGOV를 30개월 목표로 복구해야 한다."""
    params = base_params()
    params["simulation_start_month"] = 5
    params["target_monthly_cashflow"] = 1000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.02,
        "Bond Buffer": 0.58,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.4,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["corp_sgov_months"] >= 30.0
    assert month1["corp_bond_months"] >= 12.0


def test_corporate_november_rebalance_refills_sgov_to_twenty_seven_months():
    """11월 반기정비에서는 법인 SGOV를 27개월 목표로 복구해야 한다."""
    params = base_params()
    params["simulation_start_month"] = 11
    params["target_monthly_cashflow"] = 1000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.05,
        "Bond Buffer": 0.45,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.5,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["corp_sgov_months"] >= 27.0


def test_pension_floor_refill_uses_bond_buffer_first():
    """개인연금 SGOV가 12개월 floor 아래면 Bond Buffer에서 먼저 보충해야 한다."""
    params = base_params()
    params["simulation_start_month"] = 4
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["national_pension_start_age"] = 80
    params["pension_withdrawal_target"] = 1000
    params["portfolio_stats"]["pension"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 1.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0, "pension": 20000},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]
    assert month1["phase"] == "Phase 2"
    assert month1["pension_draw"] == 0
    assert month1["pension_sgov_balance"] == 12000
    assert month1["pension_bond_balance"] == 8000


def test_phase_two_corporate_need_subtracts_pension_draw():
    """Phase 2에서는 법인 부담 월지출이 총 필요금액에서 개인연금만 차감된 값이어야 한다."""
    params = base_params()
    params["simulation_start_month"] = 8
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["national_pension_start_age"] = 80
    params["national_pension_amount"] = 0
    params["pension_withdrawal_target"] = 2500000
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


def test_phase_three_corporate_need_subtracts_pension_and_national_income():
    """Phase 3에서는 법인 부담액에서 개인연금과 국민연금이 모두 차감되어야 한다."""
    params = base_params()
    params["simulation_start_month"] = 8
    params["birth_year"] = 1960
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["national_pension_start_age"] = 65
    params["target_monthly_cashflow"] = 11500000
    params["pension_withdrawal_target"] = 2500000
    params["national_pension_amount"] = 2000000
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
    assert month1["phase"] == "Phase 3"
    assert month1["corp_monthly_need"] == 7000000
