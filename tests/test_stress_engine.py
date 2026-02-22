import pytest
from src.core.stress_engine import StressTestEngine

def test_stress_scenario_overrides():
    """스트레스 테스트 시나리오별 파라미터 오버라이드 검증 (REQ-RAMS-5.2)"""
    engine = StressTestEngine()
    
    # 기본 파라미터
    base_params = {
        "market_return_rate": 0.0485,
        "inflation_rate": 0.025,
        "dividend_yield": 0.05
    }
    
    # 1. BEAR 시나리오
    bear_params = engine.apply_scenario(base_params, "BEAR")
    assert bear_params["stress_event"] == "MARKET_CRASH"
    assert bear_params["market_drop"] == -0.30
    
    # 2. STAGFLATION 시나리오
    stag_params = engine.apply_scenario(base_params, "STAGFLATION")
    assert stag_params["market_return_rate"] == 0.0
    assert stag_params["inflation_rate"] == 0.04
    
    # 3. DIVIDEND_CUT 시나리오
    cut_params = engine.apply_scenario(base_params, "DIVIDEND_CUT")
    assert cut_params["dividend_yield"] == 0.05 * 0.75
    
    print("\n[Stress Test] All scenario overrides validated.")
