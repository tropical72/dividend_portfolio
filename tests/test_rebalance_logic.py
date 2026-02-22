import pytest
from src.core.rebalance_engine import RebalanceEngine

def test_rebalance_trigger_condition():
    """리밸런싱 임계치(±5%) 이탈 시 신호 발생 테스트"""
    engine = RebalanceEngine(config={"deviation_threshold": 0.05})
    
    target_weights = {"VOO": 0.40, "SGOV": 0.60}
    
    # 1. 정상 범위
    assets_ok = {"VOO": 430, "SGOV": 570}
    signals_ok = engine.check_rebalance_condition(assets_ok, target_weights)
    assert len(signals_ok) == 0
    
    # 2. 임계치 초과
    assets_warn = {"VOO": 460, "SGOV": 540}
    signals_warn = engine.check_rebalance_condition(assets_warn, target_weights)
    assert len(signals_warn) > 0
    
    print("\n[Rebalance Test] Success")
