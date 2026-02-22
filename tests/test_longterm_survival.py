import pytest
from src.core.projection_engine import ProjectionEngine
from src.core.tax_engine import TaxEngine
from src.core.trigger_engine import TriggerEngine
from src.core.rebalance_engine import RebalanceEngine

def test_longterm_survival_simulation():
    """30년 장기 생존 시뮬레이션 테스트 (REQ-RAMS-3.2)"""
    tax_engine = TaxEngine()
    trigger_engine = TriggerEngine()
    rebalance_engine = RebalanceEngine()
    
    # 기초 데이터 설정
    initial_assets = {
        "corp": 1600000000,
        "pension": 600000000
    }
    
    # 시뮬레이션 파라미터
    params = {
        "target_monthly_cashflow": 9000000,
        "inflation_rate": 0.025,
        "market_return_rate": 0.0485,
        "corp_fixed_cost": 500000,
        "corp_salary": 2500000,
        "loan_repayment": 6500000
    }
    
    engine = ProjectionEngine(
        tax_engine=tax_engine,
        trigger_engine=trigger_engine,
        rebalance_engine=rebalance_engine
    )
    result = engine.run_30yr_simulation(initial_assets, params)
    
    # 검증 포인트
    assert "summary" in result
    assert "monthly_data" in result
    assert len(result["monthly_data"]) > 0
    
    summary = result["summary"]
    years = summary['total_survival_years']
    
    print(f"\n[Survival Test] Survival Years: {years}")
    assert summary["total_survival_years"] >= 30
    assert "infinite_with_10pct_cut" in summary
