import pytest
from src.core.projection_engine import ProjectionEngine
from src.core.tax_engine import TaxEngine

def test_longterm_survival_simulation():
    """30년 장기 생존 시뮬레이션 테스트 (REQ-RAMS-3.2)"""
    tax_engine = TaxEngine()
    
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
    
    engine = ProjectionEngine(tax_engine=tax_engine)
    result = engine.run_30yr_simulation(initial_assets, params)
    
    # 검증 포인트
    assert "summary" in result
    assert "monthly_data" in result
    assert len(result["monthly_data"]) > 0
    
    summary = result["summary"]
    # 로그 출력을 변수화하여 안전하게 처리
    years = summary['total_survival_years']
    sgov_date = summary['sgov_exhaustion_date']
    growth_date = summary['growth_asset_sell_start_date']
    
    print(f"\n[Survival Test] Survival Years: {years}")
    print(f"[Survival Test] SGOV Exhaustion: {sgov_date}")
    print(f"[Survival Test] Growth Sell Start: {growth_date}")
    
    # 16억/6억 자본이면 30년은 충분히 버텨야 함
    assert summary["total_survival_years"] >= 30
