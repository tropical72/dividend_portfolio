import pytest
from fastapi.testclient import TestClient
from uuid import uuid4

from src.backend.api import DividendBackend
from src.backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_master_portfolio_crud_and_dependency(client):
    """
    [TEST-RAMS-1.5] 마스터 포트폴리오 CRUD 및 삭제 방지 검증
    """
    suffix = uuid4().hex[:8]

    # 1. 초기 개별 포트폴리오 준비
    corp_res = client.post(
        "/api/portfolios",
        json={
            "name": f"Test Corp {suffix}",
            "account_type": "Corporate",
            "total_capital": 1000,
        },
    )
    corp_id = corp_res.json()["data"]["id"]

    # 2. 마스터 포트폴리오 생성
    master_res = client.post(
        "/api/master-portfolios",
        json={
            "name": f"Super Strategy {suffix}",
            "corp_id": corp_id,
            "pension_id": None,
        },
    )
    assert master_res.status_code == 200
    master_id = master_res.json()["data"]["id"]
    assert master_res.json()["data"]["name"] == f"Super Strategy {suffix}"

    # 3. 마스터 포트폴리오 조회
    list_res = client.get("/api/master-portfolios")
    assert any(m["id"] == master_id for m in list_res.json()["data"])

    # 4. 삭제 방지 검증 (Dependency Check) [REQ-PRT-08.3]
    # 마스터 포트폴리오에서 참조 중인 개별 포트폴리오 삭제 시도
    del_res = client.delete(f"/api/portfolios/{corp_id}")
    assert del_res.status_code == 200  # API 레벨에서는 200이지만 success가 False여야 함
    assert del_res.json()["success"] is False
    assert "사용 중" in del_res.json()["message"]

    # 5. 활성화 로직 검증 [REQ-PRT-08.4]
    client.post(f"/api/master-portfolios/{master_id}/activate")
    active_res = client.get("/api/master-portfolios")
    active_master = next(m for m in active_res.json()["data"] if m["id"] == master_id)
    assert active_master["is_active"] is True

    # 5.1 활성 전략 삭제 차단 검증 [REQ-PRT-08.5]
    del_active_res = client.delete(f"/api/master-portfolios/{master_id}")
    assert del_active_res.json()["success"] is False
    assert "사용 중" in del_active_res.json()["message"]

    # 6. 다른 전략 생성 및 활성화 후에는 기존 전략 삭제 가능해야 함
    client.post(
        "/api/master-portfolios",
        json={
            "name": f"Another Strategy {suffix}",
            "corp_id": corp_id,
            "pension_id": None,
        },
    )
    list_res2 = client.get("/api/master-portfolios")
    another_id = next(
        m["id"]
        for m in list_res2.json()["data"]
        if m["name"] == f"Another Strategy {suffix}"
    )

    # 다른 전략 활성화
    client.post(f"/api/master-portfolios/{another_id}/activate")

    # 이제 기존 전략(Super Strategy)은 비활성 상태이므로 삭제 가능
    del_res = client.delete(f"/api/master-portfolios/{master_id}")
    assert del_res.json()["success"] is True

    # 마지막 마스터 전략(Another Strategy)은 여전히 활성 상태이므로 삭제 불가 확인
    del_res_last = client.delete(f"/api/master-portfolios/{another_id}")
    assert del_res_last.json()["success"] is False

    # 강제로 모든 마스터 전략 삭제를 허용하려면 백엔드 로직 수정이 필요하거나,
    # 혹은 테스트 목적으로 Another Strategy를 삭제하기 위해
    # 시스템에 '기본(None)' 상태를 활성화하는 기능이 필요함.
    # 여기서는 요구사항대로 '활성 전략 삭제 불가'까지만 검증함.


def test_default_master_bundle_is_seeded_on_app_boot(tmp_path):
    """실앱 부팅 모드에서는 기본 master/corp/pension 번들이 자동 생성되어야 한다."""
    backend = DividendBackend(
        data_dir=str(tmp_path), ensure_default_master_bundle=True
    )

    portfolios = backend.get_portfolios()
    masters = backend.get_master_portfolios()

    assert any(p["id"] == backend.DEFAULT_CORP_PORTFOLIO_ID for p in portfolios)
    assert any(p["id"] == backend.DEFAULT_PENSION_PORTFOLIO_ID for p in portfolios)
    default_master = next(
        m for m in masters if m["id"] == backend.DEFAULT_MASTER_PORTFOLIO_ID
    )
    assert default_master["is_active"] is True
    assert default_master["is_system_default"] is True


def test_default_master_bundle_cannot_be_deleted(tmp_path):
    """기본 master/corp/pension 번들은 삭제할 수 없어야 한다."""
    backend = DividendBackend(
        data_dir=str(tmp_path), ensure_default_master_bundle=True
    )

    corp_delete = backend.remove_portfolio(backend.DEFAULT_CORP_PORTFOLIO_ID)
    pension_delete = backend.remove_portfolio(backend.DEFAULT_PENSION_PORTFOLIO_ID)
    master_delete = backend.remove_master_portfolio(backend.DEFAULT_MASTER_PORTFOLIO_ID)

    assert corp_delete["success"] is False
    assert "기본 포트폴리오" in corp_delete["message"]
    assert pension_delete["success"] is False
    assert "기본 포트폴리오" in pension_delete["message"]
    assert master_delete["success"] is False
    assert "기본 마스터 전략" in master_delete["message"]
