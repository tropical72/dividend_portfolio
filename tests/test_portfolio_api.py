import pytest
from fastapi.testclient import TestClient

from src.backend.api import DividendBackend
from src.backend.main import app, backend

client = TestClient(app)


@pytest.fixture
def clean_data():
    """테스트 전 포트폴리오 데이터 초기화 (API 사용)"""
    backend.portfolios = []
    res = client.get("/api/portfolios")
    if res.status_code == 200:
        for p in res.json().get("data", []):
            client.delete(f"/api/portfolios/{p['id']}")
    backend.portfolios = []
    yield


def test_get_portfolios_empty(clean_data):
    """포트폴리오 목록이 비어있을 때 조회 테스트"""
    response = client.get("/api/portfolios")
    assert response.status_code == 200
    assert response.json()["data"] == []


def test_create_portfolio(clean_data):
    """포트폴리오 생성 테스트 (REQ-PRT-04.1)"""
    payload = {"name": "My Retirement Plan", "total_capital": 50000, "currency": "USD"}
    response = client.post("/api/portfolios", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["name"] == "My Retirement Plan"
    assert "id" in data


def test_delete_portfolio(clean_data):
    """포트폴리오 삭제 테스트"""
    # 1. 먼저 하나 생성
    res_create = client.post("/api/portfolios", json={"name": "To be deleted"})
    p_id = res_create.json()["data"]["id"]

    # 2. 삭제 요청
    res_delete = client.delete(f"/api/portfolios/{p_id}")
    assert res_delete.status_code == 200

    # 3. 목록 조회 시 없어야 함
    res_list = client.get("/api/portfolios")
    assert not any(p["id"] == p_id for p in res_list.json()["data"])


def test_rename_portfolio(clean_data):
    """포트폴리오 이름 변경 테스트 (REQ-PRT-04.2)"""
    # 1. 생성
    res_create = client.post("/api/portfolios", json={"name": "Old Name"})
    p_id = res_create.json()["data"]["id"]

    # 2. 이름 변경 요청 (PATCH)
    res_rename = client.patch(f"/api/portfolios/{p_id}", json={"name": "New Name"})
    assert res_rename.status_code == 200

    # 3. 반영 확인
    res_list = client.get("/api/portfolios")
    updated_p = next(p for p in res_list.json()["data"] if p["id"] == p_id)
    assert updated_p["name"] == "New Name"


def test_create_portfolio_persists_account_type_and_strategy_categories(clean_data):
    """새 전략 카테고리와 account_type이 저장 시 유지되는지 검증한다."""
    payload = {
        "name": "Corp Strategy",
        "account_type": "Corporate",
        "total_capital": 1600000000,
        "currency": "KRW",
        "items": [
            {"symbol": "SGOV", "name": "SGOV", "category": "SGOV Buffer", "weight": 30},
            {"symbol": "JEPI", "name": "JEPI", "category": "High Income", "weight": 20},
            {"symbol": "SCHD", "name": "SCHD", "category": "Dividend Growth", "weight": 20},
            {"symbol": "VOO", "name": "VOO", "category": "Growth Engine", "weight": 30},
        ],
    }

    response = client.post("/api/portfolios", json=payload)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["account_type"] == "Corporate"
    assert [item["category"] for item in data["items"]] == [
        "SGOV Buffer",
        "High Income",
        "Dividend Growth",
        "Growth Engine",
    ]


def test_strategy_categories_are_converted_to_legacy_weight_buckets(tmp_path):
    """새 전략 카테고리가 기존 엔진 호환 가중치로 변환되는지 검증한다."""
    backend = DividendBackend(data_dir=str(tmp_path))
    created = backend.add_portfolio(
        name="Corp Strategy",
        account_type="Corporate",
        total_capital=1600000000,
        currency="KRW",
        items=[
            {"symbol": "SGOV", "name": "SGOV", "category": "SGOV Buffer", "weight": 30},
            {"symbol": "JEPI", "name": "JEPI", "category": "High Income", "weight": 20},
            {"symbol": "SCHD", "name": "SCHD", "category": "Dividend Growth", "weight": 20},
            {"symbol": "VOO", "name": "VOO", "category": "Growth Engine", "weight": 30},
        ],
    )

    stats = backend.get_portfolio_stats_by_id(created["data"]["id"])

    assert stats["weights"]["Cash"] == pytest.approx(0.3)
    assert stats["weights"]["Dividend"] == pytest.approx(0.4)
    assert stats["weights"]["Growth"] == pytest.approx(0.3)


def test_strategy_categories_are_exposed_as_strategy_weights(tmp_path):
    """엔진이 직접 쓰는 4카테고리 strategy_weights가 유지되는지 검증한다."""
    backend = DividendBackend(data_dir=str(tmp_path))
    created = backend.add_portfolio(
        name="Pension Strategy",
        account_type="Pension",
        total_capital=600000000,
        currency="KRW",
        items=[
            {"symbol": "SGOV", "name": "SGOV", "category": "SGOV Buffer", "weight": 25},
            {"symbol": "BND", "name": "BND", "category": "Bond Buffer", "weight": 35},
            {
                "symbol": "SCHD",
                "name": "SCHD",
                "category": "Dividend Growth",
                "weight": 20,
            },
            {
                "symbol": "VOO",
                "name": "VOO",
                "category": "Growth Engine",
                "weight": 20,
            },
        ],
    )

    stats = backend.get_portfolio_stats_by_id(created["data"]["id"])

    assert stats["strategy_weights"]["SGOV Buffer"] == pytest.approx(0.25)
    assert stats["strategy_weights"]["Bond Buffer"] == pytest.approx(0.35)
    assert stats["strategy_weights"]["Dividend Growth"] == pytest.approx(0.20)
    assert stats["strategy_weights"]["Growth Engine"] == pytest.approx(0.20)
