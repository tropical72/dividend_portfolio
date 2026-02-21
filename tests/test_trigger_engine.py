import pytest
from src.core.trigger_engine import TriggerEngine

def test_trigger_logic_signals():
    """트리거 발생 조건 검증 테스트 (REQ-RAMS-6.1~6.4)"""
    engine = TriggerEngine()
    
    # 1. SGOV 부족 트리거
    signals_sgov = engine.check_buffer_trigger(current_sgov=100000000, monthly_shortfall=5000000)
    assert any(s["type"] == "BUFFER_LOW" for s in signals_sgov)
    
    # 2. 법인세 경고 트리거
    signals_tax = engine.check_tax_trigger(tax_base=250000000)
    assert any(s["type"] == "TAX_WARNING" for s in signals_tax)
    
    # 3. 고인컴 편중 트리거
    signals_income = engine.check_concentration_trigger(high_income_weight=0.45)
    assert any(s["type"] == "CONCENTRATION_RISK" for s in signals_income)
    
    # 4. 시장 패닉 트리거
    signals_panic = engine.check_market_trigger(mdd=-0.25)
    assert any(s["type"] == "MARKET_PANIC" for s in signals_panic)
    
    print("\n[Trigger Test] All signals generated correctly.")
