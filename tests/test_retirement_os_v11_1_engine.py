import pytest

from src.core.projection_engine import ProjectionEngine
from src.core.tax_engine import TaxEngine


def make_engine() -> ProjectionEngine:
    return ProjectionEngine(tax_engine=TaxEngine())


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
        "monthly_bookkeeping_fee": 0,
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


def test_document_default_initial_bucket_setup_is_used_when_no_strategy_weights_exist():
    """전략 비중이 비어 있으면 문서의 초기 세팅 규칙을 사용해야 한다."""
    engine = make_engine()
    corp_stats = {"strategy_weights": {}}
    pension_stats = {"strategy_weights": {}}

    corp_assets = engine._build_account_state(
        initial_balance=800000000,
        account_type="corp",
        account_stats=corp_stats,
        phase="Phase 1",
        household_monthly_need=11500000,
        pension_withdrawal_target=2500000,
        national_pension_amount=0,
        corp_salary=0,
        employee_count=0,
        loan_balance=0,
        monthly_bookkeeping_fee=0,
    )
    pension_assets = engine._build_account_state(
        initial_balance=200000000,
        account_type="pension",
        account_stats=pension_stats,
        phase="Phase 1",
        household_monthly_need=11500000,
        pension_withdrawal_target=2500000,
        national_pension_amount=0,
        corp_salary=0,
        employee_count=0,
        loan_balance=0,
        monthly_bookkeeping_fee=0,
    )

    assert corp_assets["SGOV Buffer"] == pytest.approx(345000000.0)
    assert corp_assets["Bond Buffer"] == pytest.approx(207000000.0)
    assert corp_assets["High Income"] == pytest.approx(0.0)
    assert corp_assets["Dividend Growth"] == pytest.approx(210800000.0)
    assert corp_assets["Growth Engine"] == pytest.approx(37200000.0)
    assert pension_assets["SGOV Buffer"] == pytest.approx(60000000.0)
    assert pension_assets["Bond Buffer"] == pytest.approx(45000000.0)
    assert pension_assets["High Income"] == pytest.approx(0.0)
    assert pension_assets["Dividend Growth"] == pytest.approx(71250000.0)
    assert pension_assets["Growth Engine"] == pytest.approx(23750000.0)


def test_explicit_legacy_weights_override_document_default_initial_bucket_setup():
    """사용자가 저장한 legacy 비중이 있으면 문서 기본 초기세팅보다 그 비중을 우선해야 한다."""
    params = base_params()
    params["simulation_start_month"] = 4
    params["target_monthly_cashflow"] = 0
    params["household_monthly_need"] = 0
    params["portfolio_stats"]["corp"]["strategy_weights"] = {}
    params["portfolio_stats"]["corp"]["weights"] = {
        "Cash": 0.10,
        "Fixed": 0.20,
        "Dividend": 0.30,
        "Growth": 0.40,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_sgov_balance"] == pytest.approx(10000000.0)
    assert month1["corp_bond_balance"] == pytest.approx(0.0)
    assert month1["corp_high_income_balance"] == pytest.approx(20000000.0)
    assert month1["corp_dividend_balance"] == pytest.approx(30000000.0)
    assert month1["corp_growth_balance"] == pytest.approx(40000000.0)


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


def test_appreciation_rates_keep_sgov_flat_while_growth_compounds_upward():
    """Settings 자산군별 PA는 SGOV 정체와 Growth Engine 우상향을 분리해 만들어야 한다."""
    params = base_params()
    params.update(
        {
            "simulation_start_month": 12,
            "target_monthly_cashflow": 0.0,
            "household_monthly_need": 0.0,
            "pension_withdrawal_target": 0.0,
            "national_pension_amount": 0.0,
            "pension_enabled": False,
            "personal_enabled": False,
        }
    )
    params["portfolio_stats"]["corp"] = {
        "dividend_yield": 0.0,
        "expected_return": 0.0,
        "strategy_weights": {
            "SGOV Buffer": 0.50,
            "Bond Buffer": 0.0,
            "High Income": 0.0,
            "Dividend Growth": 0.0,
            "Growth Engine": 0.50,
        },
    }
    params["category_return_rates"] = {}
    params["appreciation_rates"] = {
        "cash_sgov": 0.0,
        "bond_buffer": 0.0,
        "high_income": 0.0,
        "dividend_stocks": 0.0,
        "growth_stocks": 0.12,
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 120000.0, "pension": 0.0, "personal": 0.0},
        params=params,
        months=4,
    )

    last_month = result["monthly_data"][-1]
    expected_growth_balance = 60000.0 * (1.12 ** (4.0 / 12.0))

    assert last_month["corp_sgov_balance"] == pytest.approx(60000.0)
    assert last_month["corp_growth_balance"] == pytest.approx(expected_growth_balance)
    assert last_month["corp_growth_balance"] > last_month["corp_sgov_balance"]


def test_national_pension_amount_changes_phase_three_corporate_need_and_asset_path():
    """국민연금 월 수령액 변경은 Phase 3 법인 필요액과 자산 경로를 즉시 바꿔야 한다."""

    def run_with_national_pension(amount: float) -> dict:
        params = base_params()
        params.update(
            {
                "simulation_start_year": 2026,
                "simulation_start_month": 1,
                "birth_year": 1961,
                "birth_month": 1,
                "private_pension_start_age": 65,
                "national_pension_start_age": 65,
                "target_monthly_cashflow": 1000.0,
                "household_monthly_need": 1000.0,
                "pension_withdrawal_target": 0.0,
                "national_pension_amount": amount,
                "pension_enabled": False,
                "personal_enabled": False,
            }
        )
        params["portfolio_stats"]["corp"]["strategy_weights"] = {
            "SGOV Buffer": 1.0,
            "Bond Buffer": 0.0,
            "High Income": 0.0,
            "Dividend Growth": 0.0,
            "Growth Engine": 0.0,
        }
        return make_engine()._execute_loop(
            initial_assets={"corp": 12000.0, "pension": 0.0, "personal": 0.0},
            params=params,
            months=1,
        )

    no_pension = run_with_national_pension(0.0)["monthly_data"][0]
    full_pension = run_with_national_pension(1000.0)["monthly_data"][0]

    assert no_pension["phase"] == "Phase 3"
    assert full_pension["phase"] == "Phase 3"
    assert no_pension["corp_monthly_need"] == pytest.approx(1000.0)
    assert full_pension["corp_monthly_need"] == pytest.approx(0.0)
    assert no_pension["corp_sgov_balance"] == pytest.approx(11000.0)
    assert full_pension["corp_sgov_balance"] == pytest.approx(12000.0)


def test_may_rebalance_scales_distribution_run_rate_after_growth_sale():
    """5월 리밸런싱에서 Growth를 일부 매도하면 다음 달 법인 실현소득도 비례 감소해야 한다."""
    params = base_params()
    params["simulation_start_month"] = 5
    params["household_monthly_need"] = 1000000
    params["target_monthly_cashflow"] = 1000000
    params["pension_withdrawal_target"] = 0
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
            "SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Growth Engine": {"dy": 0.06, "pa": 0.0, "tr": 0.06},
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=2,
    )

    may, june = result["monthly_data"]

    assert may["corp_realized_income"] == pytest.approx(500000)
    assert may["corp_growth_balance"] == pytest.approx(52000000)
    assert may["corp_bond_balance"] == pytest.approx(18000000)
    assert june["corp_realized_income"] == pytest.approx(260000)


def test_may_surplus_deploy_creates_distribution_run_rate_for_new_growth_position():
    """SGOV 초과분이 Growth로 신규 배치되면 다음 달 target DY 기반 실현소득이 생겨야 한다."""
    params = base_params()
    params["simulation_start_month"] = 5
    params["household_monthly_need"] = 1000000
    params["target_monthly_cashflow"] = 1000000
    params["pension_withdrawal_target"] = 0
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
    params["category_return_rates"] = {
        "corp": {
            "SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Growth Engine": {"dy": 0.06, "pa": 0.0, "tr": 0.06},
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=2,
    )

    may, june = result["monthly_data"]

    assert may["corp_growth_balance"] == pytest.approx(69000000)
    assert june["corp_realized_income"] == pytest.approx(345000)


def test_monthly_override_does_not_contaminate_may_surplus_deploy_run_rate():
    """5월 override DY가 0이어도 신규 Growth run-rate는 구조적 DY 기준으로 생성되어야 한다."""
    params = base_params()
    params["simulation_start_month"] = 5
    params["household_monthly_need"] = 1000000
    params["target_monthly_cashflow"] = 1000000
    params["pension_withdrawal_target"] = 0
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
    params["category_return_rates"] = {
        "corp": {
            "SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Growth Engine": {"dy": 0.06, "pa": 0.0, "tr": 0.06},
        }
    }
    params["monthly_return_overrides"] = {
        "corp": {"Growth Engine": {"2026-05": {"dy": 0.0, "pa": 0.0}}}
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=2,
    )

    may, june = result["monthly_data"]

    assert may["corp_growth_balance"] == pytest.approx(69000000)
    assert june["corp_realized_income"] == pytest.approx(345000)


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


def test_inflation_change_follows_dynamic_main_review_month():
    """rebalance_month가 5월이 아니어도 인플레이션 승인액은 다음 달부터 적용되어야 한다."""
    params = base_params()
    params["simulation_years"] = 2
    params["simulation_start_month"] = 6
    params["rebalance_month"] = 6
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

    june = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 6)
    july = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 7)
    august = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 8)

    assert june["target_cashflow"] == 1000000
    assert june["next_target_cashflow"] == 1100000
    assert june["inflation_action"] == "approved"
    assert july["target_cashflow"] == 1100000
    assert august["target_cashflow"] == 1100000


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


def test_corporate_rebalance_uses_overweight_asset_before_fixed_donor_order():
    """법인 SGOV 복구 시 목표 대비 오버웨이트 자산을 고정 donor 순서보다 먼저 써야 한다."""
    params = base_params()
    params["simulation_start_month"] = 5
    params["target_monthly_cashflow"] = 1000000
    params["corp_bond_floor_months"] = 0
    params["corp_bond_target_months"] = 0
    params["corp_bond_upper_months"] = 0
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.30,
        "Bond Buffer": 0.00,
        "High Income": 0.00,
        "Dividend Growth": 0.40,
        "Growth Engine": 0.30,
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
            "SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "High Income": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Dividend Growth": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Growth Engine": {"dy": 0.0, "pa": 4.0, "tr": 4.0},
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_sgov_months"] == pytest.approx(30.0)
    assert month1["corp_high_income_balance"] == pytest.approx(0.0)
    assert month1["corp_dividend_balance"] == pytest.approx(40000000.0)
    expected_growth_after_compound_return_and_sgov_refill = (
        30000000 * ((1.0 + 4.0) ** (1.0 / 12.0)) - 1000000
    )
    assert month1["corp_growth_balance"] == pytest.approx(
        expected_growth_after_compound_return_and_sgov_refill
    )


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


def test_august_corporate_mini_review_does_not_sell_equity_when_bond_is_insufficient():
    """8월 법인 미니점검은 Bond가 부족해도 주식/고인컴을 donor로 쓰면 안 된다."""
    params = base_params()
    params["simulation_start_month"] = 8
    params["target_monthly_cashflow"] = 4000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.05,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.95,
    }
    params["planned_cashflows"] = [
        {
            "year": 2026,
            "month": 8,
            "amount": 1000000,
            "type": "OUTFLOW",
            "entity": "CORP",
        }
    ]
    params["category_return_rates"] = {
        "corp": {
            "Bond Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["corp_sgov_balance"] == pytest.approx(4000000.0)
    assert month1["corp_bond_balance"] == pytest.approx(1000000.0)
    assert month1["corp_growth_balance"] == pytest.approx(95000000.0)


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


def test_november_corporate_rebalance_keeps_bond_at_upper_band_boundary():
    """11월 법인 반기점검에서 Bond가 정확히 24개월이면 자동 donor로 줄면 안 된다."""
    params = base_params()
    params["simulation_start_month"] = 11
    params["target_monthly_cashflow"] = 1000000
    params["portfolio_stats"]["corp"]["strategy_weights"] = {
        "SGOV Buffer": 0.03,
        "Bond Buffer": 0.24,
        "High Income": 0.0,
        "Dividend Growth": 0.73,
        "Growth Engine": 0.0,
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
            "SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Bond Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
            "Dividend Growth": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 0},
        params=params,
        months=1,
    )

    month1 = result["monthly_data"][0]

    assert month1["pre_review_corp_bond_months"] == pytest.approx(24.0)
    assert month1["corp_bond_months"] == pytest.approx(24.0)
    assert month1["corp_sgov_months"] == pytest.approx(27.0)


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


def test_stress_without_crash20_still_triggers_first_boost_ladder():
    """5월 Stress만으로도 15~20% drawdown이면 BOOST +1m이 발동해야 한다."""
    params = base_params()
    params["simulation_years"] = 1
    params["simulation_start_month"] = 5
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["national_pension_start_age"] = 80
    params["target_monthly_cashflow"] = 10000000
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
                "2026-05": {"pa": -1.8, "dy": 0.0},
            }
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 50000000},
        params=params,
        months=2,
    )

    may = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 5)
    june = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 6)

    assert may["stress"] is True
    assert may["crash20_triggered"] is False
    assert may["boost_amount"] == 1000000.0
    assert june["pension_draw"] == pytest.approx(3500000.0)


def test_stress_boost_follows_dynamic_main_review_month():
    """Stress 기반 BOOST는 5월 고정이 아니라 메인 정기점검 월을 따라야 한다."""
    params = base_params()
    params["simulation_years"] = 1
    params["simulation_start_month"] = 6
    params["rebalance_month"] = 6
    params["birth_year"] = 1970
    params["birth_month"] = 1
    params["private_pension_start_age"] = 55
    params["national_pension_start_age"] = 80
    params["target_monthly_cashflow"] = 10000000
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
                "2026-06": {"pa": -1.8, "dy": 0.0},
            }
        }
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100000000, "pension": 50000000},
        params=params,
        months=2,
    )

    june = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 6)
    july = next(m for m in result["monthly_data"] if m["year"] == 2026 and m["month"] == 7)

    assert june["stress"] is True
    assert june["crash20_triggered"] is False
    assert june["boost_amount"] == 1000000.0
    assert july["pension_draw"] == pytest.approx(3500000.0)


def test_transfer_records_actual_sale_and_proportional_cost_basis():
    engine = make_engine()
    assets = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 120.0,
        "Growth Engine": 0.0,
    }
    cost_basis = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 80.0,
        "Growth Engine": 0.0,
    }
    trade_events = []

    moved = engine._transfer(
        assets,
        "Dividend Growth",
        "SGOV Buffer",
        30.0,
        account_key="personal",
        sim_year=2026,
        sim_month=5,
        cost_basis=cost_basis,
        trade_events=trade_events,
    )

    assert moved == pytest.approx(30.0)
    assert cost_basis["Dividend Growth"] == pytest.approx(60.0)
    assert cost_basis["SGOV Buffer"] == pytest.approx(30.0)
    assert trade_events == [
        {
            "account": "personal",
            "year": 2026,
            "month": 5,
            "from_category": "Dividend Growth",
            "to_category": "SGOV Buffer",
            "sale_proceeds": 30.0,
            "cost_basis_sold": 20.0,
            "realized_gain": 10.0,
        }
    ]


def test_transfer_from_sgov_is_purchase_without_realized_sale():
    engine = make_engine()
    assets = {
        "SGOV Buffer": 50.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 0.0,
    }
    cost_basis = dict(assets)
    trade_events = []

    engine._transfer(
        assets,
        "SGOV Buffer",
        "Growth Engine",
        20.0,
        account_key="personal",
        sim_year=2026,
        sim_month=5,
        cost_basis=cost_basis,
        trade_events=trade_events,
    )

    assert cost_basis["SGOV Buffer"] == pytest.approx(30.0)
    assert cost_basis["Growth Engine"] == pytest.approx(20.0)
    assert trade_events == []


def test_personal_taxable_account_uses_actual_rebalance_sales():
    params = base_params()
    params["simulation_start_month"] = 5
    params["rebalance_month"] = 5
    params["personal_withdrawal_target"] = 10.0
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {
            "SGOV Buffer": 0.0,
            "Bond Buffer": 0.0,
            "High Income": 0.0,
            "Dividend Growth": 0.0,
            "Growth Engine": 1.0,
        },
        "category_return_rates": {
            "Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
        },
    }
    params.setdefault("category_return_rates", {})["personal"] = {
        "Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100.0},
        params=params,
        months=1,
    )

    month = result["monthly_data"][0]
    personal_events = [event for event in result["trade_events"] if event["account"] == "personal"]
    assert month["personal_balance"] == pytest.approx(100.0)
    assert month["personal_draw"] == pytest.approx(0.0)
    assert sum(event["sale_proceeds"] for event in personal_events) == pytest.approx(100.0)


def test_personal_only_mode_uses_personal_draw_for_household_cashflow():
    params = base_params()
    params.update(
        {
            "simulation_start_month": 6,
            "household_monthly_need": 10.0,
            "target_monthly_cashflow": 10.0,
            "pension_withdrawal_target": 0.0,
            "personal_withdrawal_target": 10.0,
            "national_pension_amount": 0.0,
            "corp_salary": 5.0,
            "monthly_bookkeeping_fee": 2.0,
            "corp_enabled": False,
            "personal_enabled": True,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "dividend_yield": 0.0,
        "expected_return": 0.0,
        "strategy_weights": {
            "SGOV Buffer": 1.0,
            "Bond Buffer": 0.0,
            "High Income": 0.0,
            "Dividend Growth": 0.0,
            "Growth Engine": 0.0,
        },
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100.0, "pension": 0.0, "personal": 100.0},
        params=params,
        months=1,
    )

    month = result["monthly_data"][0]
    assert month["corp_balance"] == pytest.approx(100.0)
    assert month["corp_monthly_need"] == 0.0
    assert month["net_salary"] == 0.0
    assert month["personal_draw"] == 10.0
    assert month["household_shortfall"] == 0.0


def test_personal_us_dividend_withholding_is_deducted_in_payment_month():
    params = base_params()
    params.update(
        {
            "simulation_start_month": 6,
            "personal_enabled": True,
            "personal_withdrawal_target": 0.0,
            "personal_property_assessed_value": 0.0,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {"SGOV Buffer": 1.0},
        "category_return_rates": {"SGOV Buffer": {"dy": 0.12, "pa": 0.0, "tr": 0.12}},
    }
    params.setdefault("category_return_rates", {})["personal"] = {
        "SGOV Buffer": {"dy": 0.12, "pa": 0.0, "tr": 0.12}
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 120000000.0},
        params=params,
        months=1,
    )

    month = result["monthly_data"][0]
    assert month["personal_gross_dividend"] == pytest.approx(1200000.0)
    assert month["personal_foreign_withholding_tax"] == pytest.approx(180000.0)
    assert month["personal_balance"] == pytest.approx(121020000.0)


def test_personal_annual_tax_audit_is_empty_when_personal_account_is_disabled():
    result = make_engine()._execute_loop(
        initial_assets={"corp": 100.0, "pension": 0.0, "personal": 0.0},
        params={**base_params(), "personal_enabled": False},
        months=12,
    )

    assert result["personal_annual_tax_audit"] == []


def test_personal_annual_tax_audit_estimates_tax_before_following_may_payment():
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": 6,
            "personal_enabled": True,
            "personal_withdrawal_target": 0.0,
            "personal_property_assessed_value": 0.0,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {"SGOV Buffer": 1.0},
        "category_return_rates": {"SGOV Buffer": {"dy": 0.12, "pa": 0.0, "tr": 0.12}},
    }
    params.setdefault("category_return_rates", {})["personal"] = {
        "SGOV Buffer": {"dy": 0.12, "pa": 0.0, "tr": 0.12}
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 120000000.0},
        params=params,
        months=1,
    )

    audit = result["personal_annual_tax_audit"][0]
    assert audit["payment_year"] is None
    assert audit["foreign_tax_credit"] == pytest.approx(audit["foreign_withholding_tax"])
    assert audit["domestic_additional_tax"] > 0
    assert audit["annual_deduction"] == pytest.approx(2500000.0)


def test_personal_annual_tax_audit_exposes_comparison_tax_amounts():
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": 6,
            "personal_enabled": True,
            "personal_withdrawal_target": 0.0,
            "personal_property_assessed_value": 0.0,
            "personal_other_comprehensive_tax_base": 50000000.0,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {"SGOV Buffer": 1.0},
        "category_return_rates": {"SGOV Buffer": {"dy": 1.2, "pa": 0.0, "tr": 1.2}},
    }
    params.setdefault("category_return_rates", {})["personal"] = {
        "SGOV Buffer": {"dy": 1.2, "pa": 0.0, "tr": 1.2}
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 240000000.0},
        params=params,
        months=1,
    )

    audit = result["personal_annual_tax_audit"][0]
    assert audit["gross_dividend"] == pytest.approx(24000000.0)
    assert audit["general_calculated_tax"] == pytest.approx(11000000.0)
    assert audit["comparison_calculated_tax"] == pytest.approx(10560000.0)
    assert audit["incremental_financial_income_tax"] == pytest.approx(4136000.0)
    assert audit["domestic_additional_tax"] == pytest.approx(536000.0)


def test_personal_dividend_domestic_tax_is_paid_in_following_may():
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": 6,
            "personal_enabled": True,
            "personal_withdrawal_target": 0.0,
            "personal_property_assessed_value": 0.0,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {"SGOV Buffer": 1.0},
        "category_return_rates": {"SGOV Buffer": {"dy": 0.12, "pa": 0.0, "tr": 0.12}},
    }
    params.setdefault("category_return_rates", {})["personal"] = {
        "SGOV Buffer": {"dy": 0.12, "pa": 0.0, "tr": 0.12}
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 120000000.0},
        params=params,
        months=12,
    )

    may = result["monthly_data"][-1]
    assert (may["year"], may["month"]) == (2027, 5)
    assert may["personal_dividend_additional_tax"] > 0
    assert may["personal_tax_payment"] == pytest.approx(
        may["personal_dividend_additional_tax"] + may["personal_capital_gains_tax"]
    )
    assert result["personal_tax_ledger"][0]["tax_year"] == 2026
    annual_audit = result["personal_annual_tax_audit"][0]
    assert annual_audit["tax_year"] == 2026
    assert annual_audit["payment_year"] == 2027
    assert annual_audit["payment_month"] == 5
    assert annual_audit["gross_dividend"] > 0
    assert annual_audit["foreign_withholding_tax"] > 0
    assert annual_audit["ending_cost_basis"] > 0
    assert "health_insurance_total" in annual_audit
    assert "funding_sales" in annual_audit


def test_personal_health_income_is_reflected_after_configured_lag():
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "personal_enabled": True,
            "personal_withdrawal_target": 0.0,
            "personal_property_assessed_value": 1000000000.0,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {"SGOV Buffer": 1.0},
        "category_return_rates": {"SGOV Buffer": {"dy": 0.12, "pa": 0.0, "tr": 0.12}},
    }
    params.setdefault("category_return_rates", {})["personal"] = {
        "SGOV Buffer": {"dy": 0.12, "pa": 0.0, "tr": 0.12}
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 120000000.0},
        params=params,
        months=23,
    )

    october = result["monthly_data"][-2]
    november = result["monthly_data"][-1]
    assert (october["year"], october["month"]) == (2027, 10)
    assert october["personal_health_income"] == 0.0
    assert (november["year"], november["month"]) == (2027, 11)
    assert november["personal_health_income_year"] == 2026
    assert november["personal_health_income"] >= 10000000.0
    assert november["personal_health_insurance"] > october["personal_health_insurance"]


def test_personal_tax_payment_uses_existing_donor_and_trade_event_rules():
    engine = make_engine()
    assets = {
        "SGOV Buffer": 0.0,
        "Bond Buffer": 0.0,
        "High Income": 0.0,
        "Dividend Growth": 0.0,
        "Growth Engine": 100.0,
    }
    run_rates = {category: 0.0 for category in assets}
    engine._active_cost_basis_by_account = {"personal": {**assets, "Growth Engine": 60.0}}
    engine._active_trade_events = []

    paid = engine._pay_personal_cash_obligation(
        assets,
        run_rates,
        {"strategy_weights": {"Growth Engine": 1.0}},
        base_params(),
        2027,
        5,
        30.0,
        obligation_type="annual_tax",
    )

    assert paid == 30.0
    assert assets["Growth Engine"] == 70.0
    assert assets["SGOV Buffer"] == 0.0
    assert engine._active_trade_events == [
        {
            "account": "personal",
            "year": 2027,
            "month": 5,
            "from_category": "Growth Engine",
            "to_category": "SGOV Buffer",
            "sale_proceeds": 30.0,
            "cost_basis_sold": 18.0,
            "realized_gain": 12.0,
            "cash_obligation": "annual_tax",
        }
    ]


def test_inactive_corporate_planned_cashflow_is_ignored():
    params = base_params()
    params.update(
        {
            "simulation_start_month": 1,
            "household_monthly_need": 0.0,
            "target_monthly_cashflow": 0.0,
            "corp_enabled": False,
            "personal_enabled": True,
        }
    )
    params["planned_cashflows"] = [
        {"year": 2026, "month": 1, "amount": 100.0, "type": "INFLOW", "entity": "CORP"}
    ]

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100.0},
        params=params,
        months=1,
    )

    month = result["monthly_data"][0]
    assert month["corp_balance"] == 0.0
    assert month["total_net_worth"] == pytest.approx(month["personal_balance"])


def test_personal_only_mode_auto_draws_phase_household_gap():
    params = base_params()
    params.update(
        {
            "household_monthly_need": 10.0,
            "target_monthly_cashflow": 10.0,
            "pension_withdrawal_target": 0.0,
            "personal_withdrawal_target": 0.0,
            "national_pension_amount": 0.0,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_enabled": True,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {"SGOV Buffer": 1.0},
        "category_return_rates": {"SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100.0}, params=params, months=1
    )

    assert result["monthly_data"][0]["personal_draw"] == 10.0
    assert result["monthly_data"][0]["household_shortfall"] == 0.0


def test_personal_may_review_uses_personal_buffers_when_corporate_is_disabled():
    params = base_params()
    params.update(
        {
            "simulation_start_month": 5,
            "household_monthly_need": 1_000_000.0,
            "target_monthly_cashflow": 1_000_000.0,
            "personal_withdrawal_target": 0.0,
            "inflation_rate": 0.10,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_enabled": True,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {"SGOV Buffer": 0.30, "Bond Buffer": 0.20, "Growth Engine": 0.50},
        "category_return_rates": {},
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 120_000_000.0},
        params=params,
        months=1,
    )

    may = result["monthly_data"][0]
    assert may["stress"] is False
    assert may["inflation_action"] == "approved"


def test_household_cashflow_summary_matches_monthly_ledger():
    params = base_params()
    params.update(
        {
            "household_monthly_need": 10.0,
            "target_monthly_cashflow": 10.0,
            "personal_withdrawal_target": 0.0,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_enabled": True,
        }
    )
    params["portfolio_stats"]["personal"] = {"strategy_weights": {"SGOV Buffer": 1.0}}

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 15.0}, params=params, months=2
    )

    summary = result["summary"]
    assert summary["cumulative_household_need"] == 20.0
    assert summary["cumulative_household_paid"] == 15.0
    assert summary["cumulative_household_shortfall"] == 5.0
    assert summary["first_household_shortfall_date"] == "2026-06"


def test_personal_sgov_withdrawal_reduces_cost_basis_without_taxable_sale():
    params = base_params()
    params.update(
        {
            "household_monthly_need": 10.0,
            "target_monthly_cashflow": 10.0,
            "personal_withdrawal_target": 0.0,
            "personal_initial_cost_basis": 60.0,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_enabled": True,
        }
    )
    params["portfolio_stats"]["personal"] = {"strategy_weights": {"SGOV Buffer": 1.0}}

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100.0}, params=params, months=1
    )

    assert result["monthly_data"][0]["personal_draw"] == 10.0
    assert result["ending_cost_basis"]["personal"]["SGOV Buffer"] == pytest.approx(54.0)
    assert result["trade_events"] == []


def test_corporate_tax_includes_realized_gain_from_trade_events():
    engine = make_engine()
    engine._active_trade_events = [{"account": "corp", "year": 2026, "realized_gain": 100.0}]

    assessed = engine._annual_corp_tax_for_year(
        2026,
        realized_income_by_year={2026: 0.0},
        deductible_expenses_by_year={2026: 0.0},
        assessed_tax_by_year={},
    )

    assert assessed == pytest.approx(11.0)


def test_personal_operating_draw_ignores_legacy_withdrawal_target():
    params = base_params()
    params.update(
        {
            "household_monthly_need": 10.0,
            "target_monthly_cashflow": 10.0,
            "personal_withdrawal_target": 99.0,
            "pension_withdrawal_target": 0.0,
            "national_pension_amount": 0.0,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_enabled": True,
        }
    )
    params["portfolio_stats"]["personal"] = {"strategy_weights": {"SGOV Buffer": 1.0}}

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100.0}, params=params, months=1
    )

    assert result["monthly_data"][0]["personal_draw"] == 10.0


def test_personal_operating_account_uses_thirty_and_twenty_seven_month_targets():
    params = base_params()
    params.update(
        {
            "household_monthly_need": 1.0,
            "target_monthly_cashflow": 1.0,
            "personal_withdrawal_target": 0.0,
            "pension_withdrawal_target": 0.0,
            "national_pension_amount": 0.0,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_enabled": True,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {"SGOV Buffer": 0.0, "Bond Buffer": 0.0, "Growth Engine": 1.0},
        "category_return_rates": {"Growth Engine": {"dy": 0.0, "pa": 0.0, "tr": 0.0}},
    }

    may_params = {**params, "simulation_start_month": 5}
    may = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100.0},
        params=may_params,
        months=1,
    )["monthly_data"][0]
    november_params = {**params, "simulation_start_month": 11}
    november = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100.0},
        params=november_params,
        months=1,
    )["monthly_data"][0]

    assert may["personal_sgov_balance"] == pytest.approx(30.0)
    assert november["personal_sgov_balance"] == pytest.approx(27.0)


def test_corporate_taxable_distribution_covers_gap_after_loan_is_exhausted():
    params = base_params()
    params.update(
        {
            "household_monthly_need": 10.0,
            "target_monthly_cashflow": 10.0,
            "pension_withdrawal_target": 0.0,
            "national_pension_amount": 0.0,
            "initial_shareholder_loan": 0.0,
            "corp_salary": 0.0,
            "monthly_bookkeeping_fee": 0.0,
            "shareholder_distribution_withholding_rate": 0.154,
            "corp_enabled": True,
            "pension_enabled": False,
            "personal_enabled": False,
        }
    )
    params["portfolio_stats"]["corp"] = {"strategy_weights": {"SGOV Buffer": 1.0}}

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100.0, "pension": 0.0, "personal": 0.0}, params=params, months=1
    )

    month = result["monthly_data"][0]
    assert month["shareholder_distribution_net"] == pytest.approx(10.0)
    assert month["shareholder_distribution_withholding"] == pytest.approx(10.0 / 0.846 * 0.154)
    assert month["shareholder_distribution_gross"] == pytest.approx(10.0 / 0.846)
    assert month["household_shortfall"] == 0.0


def test_sub_won_float_residual_does_not_create_household_shortfall():
    params = base_params()
    params.update(
        {
            "household_monthly_need": 1.0,
            "target_monthly_cashflow": 1.0,
            "pension_withdrawal_target": 0.0,
            "national_pension_amount": 0.0,
            "initial_shareholder_loan": 0.0,
            "corp_salary": 0.0,
            "monthly_bookkeeping_fee": 0.0,
            "shareholder_distribution_withholding_rate": 0.154,
            "corp_enabled": True,
            "pension_enabled": False,
            "personal_enabled": False,
        }
    )
    params["portfolio_stats"]["corp"] = {"strategy_weights": {"SGOV Buffer": 1.0}}

    result = make_engine()._execute_loop(
        initial_assets={"corp": 100.0, "pension": 0.0, "personal": 0.0},
        params=params,
        months=1,
    )

    assert result["monthly_data"][0]["household_shortfall"] == 0.0
    assert result["summary"]["cumulative_household_shortfall"] == 0.0
    assert result["summary"]["first_household_shortfall_date"] is None


OPERATING_CATEGORIES = (
    "SGOV Buffer",
    "Bond Buffer",
    "High Income",
    "Dividend Growth",
    "Growth Engine",
)


def _run_tax_neutral_operating_account(
    account_key: str,
    *,
    months: int = 18,
    initial_assets: float = 1000000000.0,
    start_month: int = 5,
    inflation_rate: float = 0.0,
    distribution_rules: dict | None = None,
    distribution_yield_overrides: dict | None = None,
    monthly_return_overrides: dict | None = None,
):
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": start_month,
            "birth_year": 1970,
            "birth_month": 1,
            "private_pension_start_age": 0,
            "national_pension_start_age": 200,
            "household_monthly_need": 1000000.0,
            "target_monthly_cashflow": 1000000.0,
            "inflation_rate": inflation_rate,
            "national_pension_amount": 0.0,
            "pension_withdrawal_target": 0.0,
            "personal_withdrawal_target": 0.0,
            "corp_salary": 0.0,
            "monthly_bookkeeping_fee": 0.0,
            "annual_corp_tax_adjustment_fee": 0.0,
            "employee_count": 0,
            "initial_shareholder_loan": 0.0,
            "shareholder_distribution_withholding_rate": 0.0,
            "corp_enabled": account_key == "corp",
            "pension_enabled": False,
            "personal_enabled": account_key == "personal",
            "personal_initial_cost_basis": initial_assets,
            "personal_property_assessed_value": 0.0,
        }
    )
    rates = {
        "SGOV Buffer": {"dy": 0.0, "pa": 0.0, "tr": 0.0},
        "Bond Buffer": {"dy": 0.04, "pa": 0.0, "tr": 0.04},
        "High Income": {"dy": 0.06, "pa": 0.0, "tr": 0.06},
        "Dividend Growth": {"dy": 0.03, "pa": 0.0, "tr": 0.03},
        "Growth Engine": {"dy": 0.01, "pa": 0.0, "tr": 0.01},
    }
    stats = {
        "dividend_yield": 0.0,
        "expected_return": 0.0,
        "strategy_weights": {
            "SGOV Buffer": 0.05,
            "Bond Buffer": 0.15,
            "High Income": 0.20,
            "Dividend Growth": 0.25,
            "Growth Engine": 0.35,
        },
        "category_return_rates": rates,
    }
    params["portfolio_stats"] = {
        "corp": stats,
        "pension": {},
        "personal": stats,
    }
    params["category_return_rates"] = {
        "corp": rates,
        "pension": {},
        "personal": rates,
    }
    params["distribution_rules"] = distribution_rules or {}
    params["distribution_yield_overrides"] = distribution_yield_overrides or {}
    params["monthly_return_overrides"] = monthly_return_overrides or {}
    tax_engine = TaxEngine(
        {
            "corp_tax_nominal_rate": 0.0,
            "corp_tax_low_rate": 0.0,
            "corp_tax_high_rate": 0.0,
            "us_dividend_foreign_withholding_rate": 0.0,
            "domestic_dividend_tax_rate": 0.0,
            "financial_income_comprehensive_threshold": 1e30,
            "us_capital_gains_tax_rate": 0.0,
            "health_financial_income_threshold": 1e30,
        }
    )
    balances = {
        "corp": initial_assets if account_key == "corp" else 0.0,
        "pension": 0.0,
        "personal": initial_assets if account_key == "personal" else 0.0,
    }
    return ProjectionEngine(tax_engine)._execute_loop(balances, params, months)


def _operating_path(result: dict, account_key: str) -> list[tuple]:
    prefix = "corp" if account_key == "corp" else "personal"
    return [
        tuple(
            row[f"{prefix}_{category}_balance"]
            for category in ("sgov", "bond", "high_income", "dividend", "growth")
        )
        for row in result["monthly_data"]
    ]


def _operating_events(result: dict) -> list[tuple]:
    return [
        (
            event["year"],
            event["month"],
            event["from_category"],
            event["to_category"],
            event["sale_proceeds"],
            event["cost_basis_sold"],
            event["realized_gain"],
        )
        for event in result["trade_events"]
    ]


def test_personal_default_state_uses_operating_account_buffer_policy():
    engine = make_engine()
    common = {
        "initial_balance": 1000000000.0,
        "account_stats": {},
        "phase": "Phase 1",
        "household_monthly_need": 1000000.0,
        "pension_withdrawal_target": 0.0,
        "national_pension_amount": 0.0,
        "corp_salary": 0.0,
        "employee_count": 0,
        "loan_balance": 0.0,
        "monthly_bookkeeping_fee": 0.0,
    }

    corporate = engine._build_account_state(account_type="corp", **common)
    personal = engine._build_account_state(account_type="personal", **common)

    assert personal == pytest.approx(corporate)
    assert personal["SGOV Buffer"] == pytest.approx(30000000.0)


def test_corporate_and_personal_share_one_operating_account_path():
    corporate = _run_tax_neutral_operating_account("corp", months=360)
    personal = _run_tax_neutral_operating_account("personal", months=360)

    assert _operating_path(corporate, "corp") == pytest.approx(
        _operating_path(personal, "personal")
    )
    assert _operating_events(corporate) == pytest.approx(_operating_events(personal))
    assert corporate["ending_distribution_run_rates"]["corp"] == pytest.approx(
        personal["ending_distribution_run_rates"]["personal"]
    )


def test_personal_reuses_corporate_distribution_policy_and_shock_cut():
    rules = {
        "corp": {
            "Dividend Growth": {"growth_rate": 0.12, "stress_cut_rate": 0.5},
            "Growth Engine": {"stress_cut_rate": 0.5},
        }
    }
    overrides = {"corp": {"Dividend Growth": 0.05}}
    shock = {
        account: {
            "Growth Engine": {
                month: {"dy": 0.01, "pa": -0.99}
                for month in ("2026-06", "2026-07", "2026-08", "2026-09")
            }
        }
        for account in ("corp", "personal")
    }
    corporate = _run_tax_neutral_operating_account(
        "corp",
        months=6,
        start_month=6,
        distribution_rules=rules,
        distribution_yield_overrides=overrides,
        monthly_return_overrides=shock,
    )
    personal = _run_tax_neutral_operating_account(
        "personal",
        months=6,
        start_month=6,
        distribution_rules=rules,
        distribution_yield_overrides=overrides,
        monthly_return_overrides=shock,
    )

    assert [row["shock_flag"] for row in corporate["monthly_data"]] == [
        row["shock_flag"] for row in personal["monthly_data"]
    ]
    assert _operating_path(corporate, "corp") == pytest.approx(
        _operating_path(personal, "personal")
    )
    assert corporate["ending_distribution_run_rates"]["corp"] == pytest.approx(
        personal["ending_distribution_run_rates"]["personal"]
    )


def test_pension_disabled_stress_does_not_create_personal_boost_income():
    corporate = _run_tax_neutral_operating_account(
        "corp", months=3, initial_assets=25000000.0, inflation_rate=0.025
    )
    personal = _run_tax_neutral_operating_account(
        "personal", months=3, initial_assets=25000000.0, inflation_rate=0.025
    )

    assert [row["stress"] for row in corporate["monthly_data"]] == [
        row["stress"] for row in personal["monthly_data"]
    ]
    assert [row["boost_amount"] for row in personal["monthly_data"]] == [0.0, 0.0, 0.0]
    assert [row["corp_draw"] for row in corporate["monthly_data"]] == pytest.approx(
        [row["personal_draw"] for row in personal["monthly_data"]]
    )
    assert _operating_path(corporate, "corp") == pytest.approx(
        _operating_path(personal, "personal")
    )


def test_personal_couple_split_keeps_each_owner_under_health_income_threshold():
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "personal_enabled": True,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_split_mode": "couple",
            "personal_income_allocation": "split_50_50",
            "personal_external_financial_income": 18_000_000.0,
            "personal_property_assessed_value": 0.0,
            "household_monthly_need": 0.0,
            "target_monthly_cashflow": 0.0,
        }
    )

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100_000_000.0},
        params=params,
        months=12,
    )

    november = next(
        row for row in result["monthly_data"] if row["year"] == 2026 and row["month"] == 11
    )
    assert november["personal_health_income_by_owner"] == {"self": 0.0, "spouse": 0.0}
    assert november["personal_health_income"] == 0.0
    audit = result["personal_annual_tax_audit"][0]
    assert audit["external_financial_income_by_owner"] == {
        "self": 9_000_000.0,
        "spouse": 9_000_000.0,
    }


def test_personal_couple_self_100_applies_health_income_to_self_only():
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "personal_enabled": True,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_split_mode": "couple",
            "personal_income_allocation": "self_100",
            "personal_external_financial_income": 18_000_000.0,
            "personal_property_assessed_value": 0.0,
            "household_monthly_need": 0.0,
            "target_monthly_cashflow": 0.0,
        }
    )

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100_000_000.0},
        params=params,
        months=12,
    )

    november = next(
        row for row in result["monthly_data"] if row["year"] == 2026 and row["month"] == 11
    )
    assert november["personal_health_income_by_owner"] == {
        "self": 18_000_000.0,
        "spouse": 0.0,
    }
    assert november["personal_health_income"] == 18_000_000.0
    assert november["personal_health_insurance_by_owner"]["self"] > 0.0
    assert november["personal_health_insurance_by_owner"]["spouse"] == 0.0


def test_personal_couple_dividend_split_and_comprehensive_tax_isolation():
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "personal_enabled": True,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_split_mode": "couple",
            "personal_income_allocation": "split_50_50",
            "personal_external_financial_income": 0.0,
            "personal_other_comprehensive_tax_base": 0.0,
            "personal_property_assessed_value": 0.0,
            "household_monthly_need": 0.0,
            "target_monthly_cashflow": 0.0,
        }
    )
    params["portfolio_stats"]["personal"] = {
        "strategy_weights": {"Dividend Growth": 1.0},
        "category_return_rates": {
            "Dividend Growth": {"dy": 0.03, "pa": 0.0, "tr": 0.03},
        },
    }
    params.setdefault("category_return_rates", {})["personal"] = {
        "Dividend Growth": {"dy": 0.03, "pa": 0.0, "tr": 0.03},
    }

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 1_200_000_000.0},
        params=params,
        months=12,
    )

    audit = next(row for row in result["personal_annual_tax_audit"] if row["tax_year"] == 2026)
    assert audit["gross_dividend"] == pytest.approx(36_000_000.0)
    assert audit["gross_dividend_by_owner"] == pytest.approx(
        {"self": 18_000_000.0, "spouse": 18_000_000.0}
    )
    assert audit["is_comprehensive"] is False
    assert audit["general_calculated_tax"] == pytest.approx(0.0)
    assert audit["comparison_calculated_tax"] == pytest.approx(0.0)
    assert audit["domestic_additional_tax"] == pytest.approx(144_000.0)


def test_personal_health_income_threshold_is_strictly_greater_than_limit():
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "personal_enabled": True,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_split_mode": "couple",
            "personal_income_allocation": "split_50_50",
            "personal_external_financial_income": 20_000_000.0,
            "personal_property_assessed_value": 0.0,
            "household_monthly_need": 0.0,
            "target_monthly_cashflow": 0.0,
        }
    )

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100_000_000.0},
        params=params,
        months=12,
    )

    november = next(
        row for row in result["monthly_data"] if row["year"] == 2026 and row["month"] == 11
    )
    assert november["personal_health_income_by_owner"] == {"self": 0.0, "spouse": 0.0}
    assert november["personal_health_income"] == 0.0


def test_personal_couple_property_health_premium_uses_household_assessed_value_once():
    params = base_params()
    params.update(
        {
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "personal_enabled": True,
            "corp_enabled": False,
            "pension_enabled": False,
            "personal_split_mode": "couple",
            "personal_income_allocation": "split_50_50",
            "personal_external_financial_income": 0.0,
            "personal_property_assessed_value": 1_000_000_000.0,
            "household_monthly_need": 0.0,
            "target_monthly_cashflow": 0.0,
        }
    )
    expected = make_engine().tax_engine.calculate_local_health_insurance_detailed(
        1_000_000_000.0, 0.0
    )["total_premium"]

    result = make_engine()._execute_loop(
        initial_assets={"corp": 0.0, "pension": 0.0, "personal": 100_000_000.0},
        params=params,
        months=1,
    )

    month = result["monthly_data"][0]
    assert month["personal_health_insurance"] == pytest.approx(expected)
    assert month["personal_health_insurance_by_owner"] == {"self": 0.0, "spouse": 0.0}
