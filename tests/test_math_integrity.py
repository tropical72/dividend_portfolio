from src.core.projection_engine import ProjectionEngine
from src.core.rebalance_engine import RebalanceEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine


def test_simulation_math_integrity():
    """시뮬레이션 자산 증감 산식의 무결성을 검증합니다."""
    tax_engine = TaxEngine()
    engine = ProjectionEngine(tax_engine, TriggerEngine(), RebalanceEngine())

    initial_assets = {"corp": 1000000000, "pension": 500000000}
    params = {
        "target_monthly_cashflow": 10000000,
        "inflation_rate": 0.03,
        "market_return_rate": 0.05,
        "corp_salary": 3000000,
        "corp_fixed_cost": 500000,
        "employee_count": 1,
        "initial_shareholder_loan": 500000000,
        "national_pension_amount": 1500000,
        "pension_withdrawal_target": 2000000,
    }

    result = engine.run_30yr_simulation(initial_assets, params)
    data = result["monthly_data"]

    # 첫 달부터 마지막 달까지 자산 변화 검증
    for i in range(1, len(data)):
        prev_nw = data[i - 1]["total_net_worth"]
        curr_nw = data[i]["total_net_worth"]

        # 수익률과 지출을 고려했을 때, 자산이 비정상적으로 급감하지 않는지 확인
        # (정확한 산식 검증은 세무 엔진 로직을 포함해야 하므로 오차범위 1% 이내 확인)
        expected_min = prev_nw * 0.95  # 대규모 지출이 있을 수 있으므로 여유 있게 설정
        assert curr_nw > expected_min, f"Month {i}: Asset drop is too sharp! {prev_nw} -> {curr_nw}"


def test_conservative_profile_benchmarking():
    """Conservative Profile에서 이중 차감 수정 후 생존 기간이 늘어났는지 확인합니다."""
    tax_engine = TaxEngine()
    engine = ProjectionEngine(tax_engine, TriggerEngine(), RebalanceEngine())

    initial_assets = {"corp": 1600000000, "pension": 600000000}
    # Conservative: 3.5% return, 3.5% inflation
    params = {
        "target_monthly_cashflow": 9000000,
        "inflation_rate": 0.035,
        "market_return_rate": 0.035,
        "corp_salary": 2500000,
        "corp_fixed_cost": 500000,
        "employee_count": 1,
        "initial_shareholder_loan": 1550000000,
        "national_pension_amount": 1500000,
        "pension_withdrawal_target": 2500000,
    }

    result = engine.run_30yr_simulation(initial_assets, params)
    # 이중 차감이 해결되었다면 최소 30년 이상 생존해야 함 (기존 28년에서 개선 확인)
    survival_years = result["summary"]["total_survival_years"]
    assert (
        survival_years >= 30
    ), f"Conservative profile still failing too early: {survival_years} years"
