import pytest

from src.core.tax_engine import TaxEngine


def test_local_health_insurance_calculation():
    """
    지역건보료 계산 기본 회귀 테스트
    재산세 과세표준 10억, 연 소득 2,000만 원 기준
    """
    engine = TaxEngine()

    # 1. 재산 점수 산출 검증
    property_points = engine.get_property_points(property_val=1000000000)
    assert property_points > 0

    # 2. 2026년부터 소득은 점수화하지 않고 월 보험료율을 직접 적용
    assert engine.get_income_points(annual_income=20000000) == 0

    # 3. 최종 보험료 산출 (소득월액보험료 + 재산보험료 + 장기요양)
    monthly_premium = engine.calculate_local_health_insurance(
        property_val=1000000000, annual_income=20000000
    )
    assert monthly_premium > 0
    # 로그 출력을 위해 직접 문자열 포맷팅 사용
    msg = f"Monthly Premium: {monthly_premium}"
    print(f"\n[Test] {msg} KRW")


def test_local_health_insurance_matches_2026_nhis_formula():
    """2026년 공단 공식 산식과 재산 60등급표를 재현합니다."""
    engine = TaxEngine(
        {
            "point_unit_price": 211.5,
            "health_insurance_rate": 0.0719,
            "long_term_care_rate": 0.009448,
            "property_basic_deduction": 100000000,
        }
    )

    ten_billion = engine.calculate_local_health_insurance_detailed(
        property_val=1000000000, annual_income=12000000
    )
    assert ten_billion["taxable_property_value"] == 900000000
    assert ten_billion["property_grade"] == 38
    assert ten_billion["property_points"] == 1001
    assert ten_billion["income_monthly_premium"] == pytest.approx(71900.0)
    assert ten_billion["property_premium"] == pytest.approx(211711.0)
    assert ten_billion["base_premium"] == pytest.approx(283610.0)
    assert ten_billion["long_term_care_premium"] == pytest.approx(37260.0)
    assert ten_billion["total_premium"] == pytest.approx(320870.0)

    assessed_value = engine.calculate_local_health_insurance_detailed(
        property_val=615000000, annual_income=12000000
    )
    assert assessed_value["taxable_property_value"] == 515000000
    assert assessed_value["property_grade"] == 33
    assert assessed_value["property_points"] == 812
    assert assessed_value["total_premium"] == pytest.approx(275640.0)


def test_property_grade_boundaries_and_basic_deduction():
    engine = TaxEngine({"property_basic_deduction": 100000000})

    assert engine.get_property_grade(100000000) == (0, 0)
    assert engine.get_property_grade(104500000) == (1, 22)
    assert engine.get_property_grade(104500001) == (2, 44)
    assert engine.get_property_grade(7881240000) == (59, 2271)
    assert engine.get_property_grade(7881240001) == (60, 2341)


def test_corp_tax_calculation():
    """법인세 계산 테스트 (2026년 명목 10%, 지방소득세 포함 11%)"""
    engine = TaxEngine()

    tax_1 = engine.calculate_corp_tax(profit=100000000)  # 1억
    assert tax_1 == 11000000

    tax_2 = engine.calculate_corp_tax(profit=300000000)  # 3억
    assert tax_2 == 33000000


def test_corp_tax_uses_effective_local_income_tax_rate():
    """사용자에게 보이는 명목 세율에 지방소득세 10%를 더해 계산합니다."""
    engine = TaxEngine({"corp_tax_nominal_rate": 0.2})

    assert engine.corp_tax_effective_rate == 0.22
    assert engine.calculate_corp_tax(profit=100000000) == 22000000


def test_tax_engine_boundary_cases():
    """세무 엔진의 경계값 및 예외 상황 테스트 (Regression 보강)"""
    engine = TaxEngine()

    # 1. 소득이 0원일 때 소득 점수는 0점이어야 함
    assert engine.get_income_points(annual_income=0) == 0
    assert engine.get_income_points(annual_income=3360000) == 0  # 하한선 이하

    # 2. 재산이 1억 원 이하(공제 범위)일 때 재산 점수는 0점이어야 함
    assert engine.get_property_points(property_val=50000000) == 0
    assert engine.get_property_points(property_val=100000000) == 0

    # 3. 법인세 기본값은 2026년 명목 10%, 지방소득세 포함 11%
    assert engine.calculate_corp_tax(profit=200000000) == 22000000

    # 4. 매우 높은 급여에 대한 4대보험 계산 (에러 발생 여부 체크)
    income_info = engine.calculate_income_tax(monthly_salary=20000000)  # 월 2000만
    assert income_info["net_salary"] < 20000000
    assert income_info["health"] > 0


def test_us_dividend_tax_keeps_foreign_withholding_and_domestic_credit_separate():
    engine = TaxEngine(
        {
            "us_dividend_foreign_withholding_rate": 0.15,
            "domestic_dividend_tax_rate": 0.154,
            "financial_income_comprehensive_threshold": 20000000,
        }
    )

    result = engine.calculate_us_dividend_tax(12000000)

    assert result["foreign_withholding_tax"] == pytest.approx(1800000)
    assert result["domestic_tax_before_credit"] == pytest.approx(1848000)
    assert result["foreign_tax_credit"] == pytest.approx(1800000)
    assert result["domestic_additional_tax"] == pytest.approx(48000)
    assert result["is_comprehensive"] is False


def test_us_dividend_tax_uses_comprehensive_income_branch_above_threshold():
    engine = TaxEngine()

    result = engine.calculate_us_dividend_tax(24000000, other_comprehensive_tax_base=50000000)

    assert result["is_comprehensive"] is True
    assert result["financial_income_total"] == 24000000
    assert result["general_calculated_tax"] == pytest.approx(11000000)
    assert result["comparison_calculated_tax"] == pytest.approx(10560000)
    assert result["domestic_tax_before_credit"] == pytest.approx(4136000)
    assert result["domestic_additional_tax"] == pytest.approx(536000)


def test_us_dividend_tax_uses_comparison_floor_when_other_income_is_zero():
    engine = TaxEngine()

    result = engine.calculate_us_dividend_tax(24000000)

    assert result["is_comprehensive"] is True
    assert result["general_calculated_tax"] == pytest.approx(3344000)
    assert result["comparison_calculated_tax"] == pytest.approx(3696000)
    assert result["domestic_tax_before_credit"] == pytest.approx(3696000)
    assert result["domestic_additional_tax"] == pytest.approx(96000)


def test_us_dividend_tax_allocates_comprehensive_tax_to_current_dividend():
    engine = TaxEngine()

    result = engine.calculate_us_dividend_tax(
        12000000,
        other_financial_income=12000000,
        other_comprehensive_tax_base=50000000,
    )

    assert result["financial_income_total"] == 24000000
    assert result["incremental_financial_income_tax"] == pytest.approx(4136000)
    assert result["domestic_tax_before_credit"] == pytest.approx(2068000)
    assert result["domestic_additional_tax"] == pytest.approx(268000)


def test_us_capital_gains_tax_offsets_annual_losses_and_applies_deduction():
    engine = TaxEngine(
        {
            "us_capital_gains_tax_rate": 0.22,
            "us_capital_gains_annual_deduction": 2500000,
        }
    )

    result = engine.calculate_us_capital_gains_tax(10000000 - 3000000)

    assert result["net_gain_after_loss_offset"] == 7000000
    assert result["taxable_gain"] == 4500000
    assert result["capital_gains_tax"] == pytest.approx(990000)
    assert engine.calculate_us_capital_gains_tax(-1000000)["capital_gains_tax"] == 0
