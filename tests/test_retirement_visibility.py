import pytest
from fastapi.testclient import TestClient

from src.backend.main import app

client = TestClient(app)


def test_retirement_simulation_metadata_visibility():
    """
    [REQ-RAMS-1.4.5] 시뮬레이션 결과에 사용된 포트폴리오 메타데이터가 포함되는지 검증
    """
    # 1. 시뮬레이션 실행
    response = client.get("/api/retirement/simulate")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # 2. 메타데이터 구조 검증
    assert "meta" in data["data"], "결과 데이터에 'meta' 필드가 누락되었습니다."
    meta = data["data"]["meta"]
    assert "used_portfolios" in meta, "meta 필드에 'used_portfolios'가 누락되었습니다."
    assert "strategy_rules_summary" in meta, "meta 필드에 전략 규칙 요약이 누락되었습니다."

    # 3. 실제 포트폴리오 이름 및 배당률 매핑 검증 (portfolios.json 기반)
    corp_info = meta["used_portfolios"].get("corp")
    assert corp_info is not None, "법인 포트폴리오 정보가 누락되었습니다."
    assert corp_info["name"], "법인 포트폴리오 이름이 비어 있습니다."
    assert "yield" in corp_info, "배당률(yield) 정보가 누락되었습니다."

    strategy_summary = meta["strategy_rules_summary"]
    assert strategy_summary["rebalance_month"] >= 1
    assert strategy_summary["corporate_sgov_target_months"] >= 1
    assert strategy_summary["pension_sgov_min_years"] >= 1
    assert isinstance(strategy_summary["bear_market_freeze_enabled"], bool)

    print(f"\n[Verified] Used Portfolio: {corp_info['name']} ({corp_info['yield']})")


if __name__ == "__main__":
    pytest.main([__file__])
