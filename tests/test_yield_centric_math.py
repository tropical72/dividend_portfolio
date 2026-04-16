import json

import pytest

from src.backend.api import DividendBackend


@pytest.fixture
def temp_backend(tmp_path):
    """테스트를 위한 임시 백엔드 환경을 설정합니다."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()

    # 기본 설정 파일 생성 (PA 포함)
    settings = {"price_appreciation_rate": 3.5, "current_exchange_rate": 1400.0}
    with open(data_dir / "settings.json", "w") as f:
        json.dump(settings, f)

    # 테스트용 포트폴리오 생성 (배당률 4% 종목 1개)
    portfolios = [
        {
            "id": "test-p-1",
            "name": "Test Portfolio",
            "total_capital": 100000,
            "items": [
                {
                    "symbol": "SCHD",
                    "weight": 100,
                    "dividend_yield": 4.0,
                    "expected_return": 10.0,  # 기존 방식의 TR (무시되어야 함)
                }
            ],
        }
    ]
    with open(data_dir / "portfolios.json", "w") as f:
        json.dump(portfolios, f)

    return DividendBackend(data_dir=str(data_dir))


def test_portfolio_stats_uses_global_pa(temp_backend):
    """포트폴리오 통계 산출 시 종목별 TR이 아닌 'DY + Global PA' 공식을 사용하는지 검증합니다."""
    stats = temp_backend.get_portfolio_stats_by_id("test-p-1")

    # Expected Result:
    # DY = 4.0% (0.04)
    # PA = 3.5% (from settings)
    # TR = 4.0 + 3.5 = 7.5% (0.075)

    assert stats["dividend_yield"] == pytest.approx(0.04)
    assert stats["expected_return"] == pytest.approx(0.075)  # 4.0 + 3.5
    assert stats["expected_return"] != pytest.approx(0.10)  # 종목에 적힌 10.0은 무시되어야 함


def test_master_portfolio_combined_tr_logic(temp_backend):
    """마스터 포트폴리오의 통합 수익률도 DY + PA 기반으로 계산되는지 검증합니다."""
    # 마스터 포트폴리오 추가
    temp_backend.add_master_portfolio("Master Strategy", corp_id="test-p-1")

    master_list = temp_backend.get_master_portfolios()
    master = master_list[0]

    # combined_yield 필드(실제로는 TR)가 7.5%여야 함
    assert master["combined_yield"] == pytest.approx(0.075)
