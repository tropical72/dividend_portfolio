import pytest
from src.core.cascade_engine import CascadeEngine

def test_cascade_liquidation_order():
    """자산 매도 순서 테스트: VOO -> SCHD -> BND -> SGOV"""
    # 30개월 생활비가 1.5억(월 500만 가정)인데 SGOV가 1억뿐인 상황
    assets = {
        "VOO": 100000000,
        "SCHD": 50000000,
        "BND": 30000000,
        "SGOV": 100000000
    }
    shortfall_target = 150000000 # 30개월분 타겟
    
    engine = CascadeEngine(target_buffer=shortfall_target)
    
    # 1. SGOV 부족으로 VOO 매도 결정
    decision = engine.get_liquidation_decision(assets)
    assert decision["target_asset"] == "VOO"
    assert decision["reason"] == "RECHARGE_BUFFER"

    # 2. VOO 소진 시 SCHD 매도
    assets["VOO"] = 0
    decision = engine.get_liquidation_decision(assets)
    assert decision["target_asset"] == "SCHD"

    # 3. SCHD 소진 시 BND 매도
    assets["SCHD"] = 0
    decision = engine.get_liquidation_decision(assets)
    assert decision["target_asset"] == "BND"

    # 4. 모든 상위 자산 소진 시 EMERGENCY (SGOV 사용)
    assets["BND"] = 0
    decision = engine.get_liquidation_decision(assets)
    assert decision["target_asset"] == "SGOV"
    assert decision["state"] == "EMERGENCY"
