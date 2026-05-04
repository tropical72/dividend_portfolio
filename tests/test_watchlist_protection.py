import json

import pytest
from fastapi.testclient import TestClient

from src.backend.api import DividendBackend
from src.backend.main import app

client = TestClient(app)


@pytest.fixture
def temp_backend(tmp_path):
    # 테스트 전용 임시 디렉토리 사용
    data_dir = str(tmp_path)
    # ensure_default_master_bundle=True를 통해 시딩 활성화
    return DividendBackend(data_dir=data_dir, ensure_default_master_bundle=True)


def test_default_watchlist_seeding(temp_backend):
    """기본 관심종목이 자동으로 생성되고 is_system_default가 True인지 확인"""
    watchlist = temp_backend.watchlist
    default_symbols = {
        "SGOV",
        "JEPI",
        "JEPQ",
        "VOO",
        "QQQM",
        "SCHD",
        "BND",
        "VGIT",
        "DIVO",
        "441640.KS",
    }

    for symbol in default_symbols:
        item = next((i for i in watchlist if i["symbol"] == symbol), None)
        assert item is not None
        assert item.get("is_system_default") is True


def test_default_watchlist_deletion_protection(temp_backend):
    """기본 관심종목은 삭제할 수 없어야 함"""
    # SGOV 삭제 시도
    res = temp_backend.remove_from_watchlist("SGOV")
    assert res["success"] is False
    assert "기본 관심종목은 삭제할 수 없습니다" in res["message"]

    # 리스트에 여전히 존재해야 함
    assert any(i["symbol"] == "SGOV" for i in temp_backend.watchlist)


def test_custom_stock_deletion_allowed(temp_backend):
    """사용자가 추가한 일반 종목은 삭제 가능해야 함"""
    # 임의 종목 추가 (Mock info가 필요할 수 있으나 여기서는 직접 리스트 조작으로 테스트)
    temp_backend.watchlist.append(
        {"symbol": "AAPL", "name": "Apple Inc.", "is_system_default": False}
    )

    res = temp_backend.remove_from_watchlist("AAPL")
    assert res["success"] is True
    assert not any(i["symbol"] == "AAPL" for i in temp_backend.watchlist)


def test_bnd_watchlist_migration_does_not_duplicate_existing_vgit(tmp_path):
    """기존 VGIT가 있으면 BND 마이그레이션 후에도 VGIT가 중복 생성되지 않아야 한다."""
    watchlist_path = tmp_path / "watchlist.json"
    portfolios_path = tmp_path / "portfolios.json"

    watchlist_path.write_text(
        json.dumps(
            [
                {"symbol": "BND", "name": "Vanguard Total Bond Market ETF"},
                {"symbol": "VGIT", "name": "User-added VGIT"},
            ]
        ),
        encoding="utf-8",
    )
    portfolios_path.write_text(
        json.dumps(
            [
                {
                    "id": "p1",
                    "name": "Bond Test",
                    "items": [{"symbol": "BND", "name": "Legacy Bond Buffer"}],
                }
            ]
        ),
        encoding="utf-8",
    )

    backend = DividendBackend(data_dir=str(tmp_path), ensure_default_master_bundle=True)

    vgit_items = [item for item in backend.watchlist if item["symbol"] == "VGIT"]
    bnd_items = [item for item in backend.watchlist if item["symbol"] == "BND"]
    assert len(vgit_items) == 1
    assert len(bnd_items) == 1
    assert bnd_items[0].get("is_system_default") is True
    assert backend.portfolios[0]["items"][0]["symbol"] == "VGIT"
