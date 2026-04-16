import pytest
from fastapi.testclient import TestClient

from src.backend.main import app, backend


@pytest.fixture
def client():
    return TestClient(app)


def test_portfolio_integration_yield_mapping(client):
    """
    [TEST-RAMS-1.4.2] 가중 평균 수익률(WARR) 검증
    포트폴리오의 배당률이 은퇴 시뮬레이션 결과에 정확히 반영되는지 확인합니다.
    """
    # 1. 테스트용 포트폴리오 데이터 준비 (법인: 고배당 10%, 연금: 저배당 2%)
    corp_p = {
        "id": "test-corp-p",
        "name": "High Yield Corp",
        "account_type": "Corporate",
        "total_capital": 1000000000,
        "currency": "KRW",
        "items": [{"symbol": "TEST1", "name": "High Div", "weight": 100, "dividend_yield": 10.0}],
    }
    pen_p = {
        "id": "test-pen-p",
        "name": "Low Yield Pension",
        "account_type": "Pension",
        "total_capital": 500000000,
        "currency": "KRW",
        "items": [{"symbol": "TEST2", "name": "Low Div", "weight": 100, "dividend_yield": 2.0}],
    }

    # 백엔드 메모리에 직접 주입 (파일 저장 없이 테스트)
    backend.portfolios = [corp_p, pen_p]

    # 2. 은퇴 설정 준비 (필수 필드 채우기)
    config = {
        "user_profile": {
            "birth_year": 1980,
            "birth_month": 1,
            "private_pension_start_age": 55,
            "national_pension_start_age": 65,
        },
        "simulation_params": {
            "target_monthly_cashflow": 5000000,
            "simulation_start_year": 2026,
            "simulation_start_month": 1,
            "national_pension_amount": 1000000,
            "simulation_years": 1,
        },
        "corp_params": {
            "initial_investment": 1000000000,
            "monthly_salary": 2000000,
            "monthly_fixed_cost": 500000,
            "employee_count": 1,
            "initial_shareholder_loan": 500000000,
        },
        "pension_params": {"monthly_withdrawal_target": 2000000, "initial_investment": 500000000},
        "assumptions": {"v1": {"expected_return": 0.05, "inflation_rate": 0.02}},
        "active_assumption_id": "v1",
        "tax_and_insurance": {
            "point_unit_price": 200,
            "ltc_rate": 0.12,
            "corp_tax_threshold": 200000000,
            "corp_tax_low_rate": 0.1,
            "corp_tax_high_rate": 0.2,
            "pension_rate": 0.045,
            "health_rate": 0.035,
            "employment_rate": 0.009,
            "income_tax_estimate_rate": 0.15,
        },
    }
    backend.update_retirement_config(config)

    # 3. 시뮬레이션 실행
    response = client.get("/api/retirement/simulate")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # 4. 검증: 메타데이터에 포트폴리오 정보가 포함되었는가? [REQ-RAMS-1.4.5]
    meta = data["data"].get("meta", {})
    assert meta["used_portfolios"]["corp"]["name"] == "High Yield Corp"
    assert "10.00%" in meta["used_portfolios"]["corp"]["yield"]
    assert meta["used_portfolios"]["pension"]["name"] == "Low Yield Pension"
    assert "2.00%" in meta["used_portfolios"]["pension"]["yield"]

    # 5. 검증: 엔진 계산 결과에 배당률 및 수익률이 반영되었는가? [REQ-RAMS-1.4.2]
    first_month = data["data"]["monthly_data"][0]

    # 10억 * (10%/12) = 833.33만원 (법인 배당)
    # 10억 * ((10%-10%)/12) = 0원 (법인 성장 - 성장률 0% 가정)
    # 하지만 corp_cash는 growth가 절반(0.5) 적용되므로 0원

    # 두 번째 시뮬레이션: 성장률 5% 주입
    config["assumptions"]["v1"]["expected_return"] = 0.15  # 10% 배당 + 5% 성장
    backend.update_retirement_config(config)
    response = client.get("/api/retirement/simulate")
    data = response.json()
    first_month = data["data"]["monthly_data"][0]

    # 법인 총 자산 증가분 확인
    # 초기 10억 -> 1개월 후 (배당 0.833% + 성장 0.416%) => 약 1.25% 증가 (1,250만원)
    # 법인 운영비 지출: 약 300~400만원 (급여 200 + 건보료 등 + 고정비 50)
    # 순증가: 약 850만원 이상 예상
    assert first_month["corp_balance"] > 1000000000  # 10억보다 커야 함 (수익이 비용을 초과)
