from typing import Any, Dict, Optional


class TaxEngine:
    """
    [Domain Layer] 세무 및 비용 계산 엔진
    모든 세무 상수는 외부에서 주입받으며, 미지정 시 기본값을 사용함. [REQ-ARCH-2]
    """

    PROPERTY_POINT_BRACKETS = (
        (450, 22),
        (900, 44),
        (1350, 66),
        (1800, 97),
        (2250, 122),
        (2700, 146),
        (3150, 171),
        (3600, 195),
        (4050, 219),
        (4500, 244),
        (5020, 268),
        (5590, 294),
        (6220, 320),
        (6930, 344),
        (7710, 365),
        (8590, 386),
        (9570, 412),
        (10700, 439),
        (11900, 465),
        (13300, 490),
        (14800, 516),
        (16400, 535),
        (18300, 559),
        (20400, 586),
        (22700, 611),
        (25300, 637),
        (28100, 659),
        (31300, 681),
        (34900, 706),
        (38800, 731),
        (43200, 757),
        (48100, 785),
        (53600, 812),
        (59700, 841),
        (66500, 881),
        (74000, 921),
        (82400, 961),
        (91800, 1001),
        (103000, 1041),
        (114000, 1091),
        (127000, 1141),
        (142000, 1191),
        (158000, 1241),
        (176000, 1291),
        (196000, 1341),
        (218000, 1391),
        (242000, 1451),
        (270000, 1511),
        (300000, 1571),
        (330000, 1641),
        (363000, 1711),
        (399300, 1781),
        (439230, 1851),
        (483153, 1921),
        (531468, 1991),
        (584615, 2061),
        (643077, 2131),
        (707385, 2201),
        (778124, 2271),
        (float("inf"), 2341),
    )

    def __init__(self, config: Optional[Dict[str, Any]] = None) -> None:
        config = config or {}

        # 지역가입자 건강보험 정책값 (2026년 국민건강보험공단 기준)
        self.point_unit_price = float(config.get("point_unit_price", 211.5))
        self.health_insurance_rate = float(config.get("health_insurance_rate", 0.0719))
        self.long_term_care_rate = float(config.get("long_term_care_rate", 0.009448))
        self.property_basic_deduction = float(config.get("property_basic_deduction", 100000000))
        # 기존 UI 호환용: 건강보험료 대비 장기요양보험료 비율
        self.ltc_rate = self.long_term_care_rate / self.health_insurance_rate

        # 법인세 관련 변수
        self.corp_tax_threshold = float(config.get("corp_tax_threshold", 200000000))
        self.corp_tax_nominal_rate = float(config.get("corp_tax_nominal_rate", 0.10))
        self.corp_tax_effective_rate = round(self.corp_tax_nominal_rate * 1.1, 4)
        self.corp_tax_low_rate = float(config.get("corp_tax_low_rate", 0.11))
        self.corp_tax_high_rate = float(config.get("corp_tax_high_rate", 0.22))

        # 4대보험 요율 (근로자/사업자 합산 및 분담 로직용)
        self.pension_rate = float(config.get("pension_rate", 0.045))  # 근로자분
        self.health_rate = float(config.get("health_rate", 0.03545))
        self.employment_rate = float(config.get("employment_rate", 0.009))
        self.income_tax_estimate_rate = float(config.get("income_tax_estimate_rate", 0.05))
        self.us_dividend_foreign_withholding_rate = float(
            config.get("us_dividend_foreign_withholding_rate", 0.15)
        )
        self.domestic_dividend_tax_rate = float(config.get("domestic_dividend_tax_rate", 0.154))
        self.shareholder_distribution_withholding_rate = float(
            config.get(
                "shareholder_distribution_withholding_rate",
                self.domestic_dividend_tax_rate,
            )
        )
        self.financial_income_comprehensive_threshold = float(
            config.get("financial_income_comprehensive_threshold", 20000000)
        )
        self.us_capital_gains_tax_rate = float(config.get("us_capital_gains_tax_rate", 0.22))
        self.us_capital_gains_annual_deduction = float(
            config.get("us_capital_gains_annual_deduction", 2500000)
        )
        self.personal_tax_payment_month = int(config.get("personal_tax_payment_month", 5))
        self.health_financial_income_threshold = float(
            config.get("health_financial_income_threshold", 10000000)
        )
        self.health_income_reflection_month = int(config.get("health_income_reflection_month", 11))
        self.health_income_reflection_lag_years = int(
            config.get("health_income_reflection_lag_years", 1)
        )

    def calculate_corp_tax(self, profit: float) -> float:
        """법인세 산출.

        UI와 설정에는 일반적으로 말하는 명목 법인세율(10/20/22/25%)을 노출하고,
        실제 계산은 지방소득세 10%를 포함한 실효세율로 수행합니다.
        """
        if profit <= 0:
            return 0.0
        if self.corp_tax_nominal_rate:
            return profit * self.corp_tax_effective_rate
        if profit <= self.corp_tax_threshold:
            return profit * self.corp_tax_low_rate
        return (self.corp_tax_threshold * self.corp_tax_low_rate) + (
            (profit - self.corp_tax_threshold) * self.corp_tax_high_rate
        )

    def calculate_income_tax(self, monthly_salary: float) -> Dict[str, float]:
        """근로소득세 및 4대보험 산출 (변수화된 요율 적용)"""
        pension = monthly_salary * self.pension_rate
        health = monthly_salary * self.health_rate
        employment = monthly_salary * self.employment_rate
        income_tax = monthly_salary * self.income_tax_estimate_rate

        total_deduction = pension + health + employment + income_tax
        return {
            "net_salary": monthly_salary - total_deduction,
            "deductions": total_deduction,
            "pension": pension,
            "health": health,
            "income_tax": income_tax,
        }

    @staticmethod
    def _truncate_to_ten_won(amount: float) -> float:
        """공단 모의계산 표시 방식에 맞춰 10원 미만을 절사합니다."""
        return float(int(max(0.0, amount) / 10) * 10)

    def get_property_grade(self, property_val: float) -> tuple[int, int]:
        """1억 원 공제 후 재산세 과세표준액을 60등급 점수로 변환합니다."""
        taxable_property = max(0.0, property_val - self.property_basic_deduction)
        if taxable_property <= 0:
            return 0, 0

        taxable_manwon = taxable_property / 10000
        for grade, (upper_manwon, points) in enumerate(self.PROPERTY_POINT_BRACKETS, start=1):
            if taxable_manwon <= upper_manwon:
                return grade, points
        return 60, 2341

    def get_property_points(self, property_val: float) -> int:
        """재산세 과세표준액의 공제 후 60등급 점수를 반환합니다."""
        return self.get_property_grade(property_val)[1]

    def get_income_points(self, annual_income: float) -> int:
        """폐기된 호환 인터페이스입니다. 2026년 소득보험료는 점수를 쓰지 않습니다."""
        return 0

    def calculate_local_health_insurance_detailed(
        self, property_val: float, annual_income: float
    ) -> Dict[str, Any]:
        """2026년 지역가입자 건강보험료 공식과 재산 60등급을 적용합니다."""
        property_grade, property_points = self.get_property_grade(property_val)
        taxable_property = max(0.0, property_val - self.property_basic_deduction)
        monthly_income = max(0.0, annual_income) / 12
        income_monthly_premium = self._truncate_to_ten_won(
            monthly_income * self.health_insurance_rate
        )
        property_premium = float(int(property_points * self.point_unit_price))
        base_premium = self._truncate_to_ten_won(income_monthly_premium + property_premium)
        long_term_care_premium = self._truncate_to_ten_won(
            base_premium * self.long_term_care_rate / self.health_insurance_rate
        )
        total_premium = base_premium + long_term_care_premium

        return {
            "property_assessed_value": max(0.0, property_val),
            "property_basic_deduction": self.property_basic_deduction,
            "taxable_property_value": taxable_property,
            "property_grade": property_grade,
            "property_points": property_points,
            "point_unit_price": self.point_unit_price,
            "property_premium": property_premium,
            "annual_income": max(0.0, annual_income),
            "monthly_income": monthly_income,
            "health_insurance_rate": self.health_insurance_rate,
            "income_monthly_premium": income_monthly_premium,
            "base_premium": base_premium,
            "long_term_care_rate": self.long_term_care_rate,
            "ltc_rate": self.long_term_care_rate / self.health_insurance_rate,
            "long_term_care_premium": long_term_care_premium,
            "total_premium": total_premium,
        }

    def calculate_local_health_insurance(self, property_val: float, annual_income: float) -> float:
        """기존 인터페이스 유지"""
        result = self.calculate_local_health_insurance_detailed(property_val, annual_income)
        return result["total_premium"]

    @staticmethod
    def _progressive_income_tax_national(tax_base: float) -> float:
        """종합소득 과세표준의 국세 산출세액을 누진구간으로 계산합니다."""
        taxable = max(0.0, tax_base)
        brackets = (
            (14000000.0, 0.06),
            (50000000.0, 0.15),
            (88000000.0, 0.24),
            (150000000.0, 0.35),
            (300000000.0, 0.38),
            (500000000.0, 0.40),
            (1000000000.0, 0.42),
            (float("inf"), 0.45),
        )
        tax = 0.0
        lower = 0.0
        for upper, rate in brackets:
            band = min(taxable, upper) - lower
            if band > 0:
                tax += band * rate
            if taxable <= upper:
                break
            lower = upper
        return tax

    def calculate_progressive_income_tax(self, tax_base: float) -> float:
        """지방소득세 10%를 포함한 종합소득 산출세액 추정값입니다."""
        return self._progressive_income_tax_national(tax_base) * 1.1

    def calculate_us_dividend_tax(
        self,
        gross_dividend: float,
        *,
        other_financial_income: float = 0.0,
        other_comprehensive_tax_base: float = 0.0,
    ) -> Dict[str, Any]:
        """미국 상장 주식·ETF 배당의 원천세와 국내 추가세액을 계산합니다."""
        gross = max(0.0, gross_dividend)
        other_financial = max(0.0, other_financial_income)
        financial_total = gross + other_financial
        foreign_withholding = gross * self.us_dividend_foreign_withholding_rate
        separate_tax_floor = gross * self.domestic_dividend_tax_rate
        is_comprehensive = financial_total > self.financial_income_comprehensive_threshold

        general_calculated_tax = 0.0
        comparison_calculated_tax = 0.0
        incremental_financial_income_tax = separate_tax_floor

        if is_comprehensive:
            base = max(0.0, other_comprehensive_tax_base)
            threshold = self.financial_income_comprehensive_threshold
            comprehensive_excess = max(0.0, financial_total - threshold)
            base_progressive_tax = self.calculate_progressive_income_tax(base)

            # 소득세법 제62조 비교과세 추정:
            # 일반산출세액은 기준금액까지 원천징수세율, 초과분만 누진과세하고
            # 비교산출세액은 다른 종합소득 누진세액과 금융소득 전체 원천징수세액을 합산한다.
            general_calculated_tax = self.calculate_progressive_income_tax(
                base + comprehensive_excess
            ) + (threshold * self.domestic_dividend_tax_rate)
            comparison_calculated_tax = base_progressive_tax + (
                financial_total * self.domestic_dividend_tax_rate
            )
            selected_calculated_tax = max(general_calculated_tax, comparison_calculated_tax)
            incremental_financial_income_tax = max(
                0.0, selected_calculated_tax - base_progressive_tax
            )
            allocated_tax = (
                incremental_financial_income_tax * (gross / financial_total)
                if financial_total
                else 0.0
            )
            domestic_tax_before_credit = max(separate_tax_floor, allocated_tax)
        else:
            domestic_tax_before_credit = separate_tax_floor

        foreign_tax_credit = min(foreign_withholding, domestic_tax_before_credit)
        domestic_additional_tax = max(0.0, domestic_tax_before_credit - foreign_tax_credit)
        return {
            "gross_dividend": gross,
            "foreign_withholding_tax": foreign_withholding,
            "foreign_tax_credit": foreign_tax_credit,
            "domestic_tax_before_credit": domestic_tax_before_credit,
            "domestic_additional_tax": domestic_additional_tax,
            "total_dividend_tax": foreign_withholding + domestic_additional_tax,
            "financial_income_total": financial_total,
            "comprehensive_threshold": self.financial_income_comprehensive_threshold,
            "general_calculated_tax": general_calculated_tax,
            "comparison_calculated_tax": comparison_calculated_tax,
            "incremental_financial_income_tax": incremental_financial_income_tax,
            "is_comprehensive": is_comprehensive,
        }

    def calculate_us_capital_gains_tax(self, annual_realized_gain: float) -> Dict[str, float]:
        """미국 주식 연간 손익통산 후 기본공제와 22% 세율을 적용합니다."""
        net_gain = max(0.0, annual_realized_gain)
        taxable_gain = max(0.0, net_gain - self.us_capital_gains_annual_deduction)
        tax = taxable_gain * self.us_capital_gains_tax_rate
        return {
            "annual_realized_gain": annual_realized_gain,
            "net_gain_after_loss_offset": net_gain,
            "annual_deduction": self.us_capital_gains_annual_deduction,
            "taxable_gain": taxable_gain,
            "tax_rate": self.us_capital_gains_tax_rate,
            "capital_gains_tax": tax,
        }

    def calculate_corp_profitability(
        self,
        assets: float,
        return_rate: float,
        monthly_salary: float,
        fixed_cost: float,
        loan_repayment: float,
    ) -> Dict[str, float]:
        annual_revenue = assets * return_rate
        # 회사 부담 4대보험
        total_rate = self.pension_rate + self.health_rate + self.employment_rate
        corp_insurance = (monthly_salary * total_rate) * 12
        annual_expenses = (fixed_cost * 12) + (monthly_salary * 12) + corp_insurance
        tax_base = max(0, annual_revenue - annual_expenses)
        corp_tax = self.calculate_corp_tax(tax_base)
        salary_info = self.calculate_income_tax(monthly_salary)
        net_profit = annual_revenue - annual_expenses - corp_tax
        residual_surplus = net_profit - (loan_repayment * 12)
        return {
            "tax_base": tax_base,
            "corp_tax": corp_tax,
            "household_income": salary_info["net_salary"] + loan_repayment,
            "after_tax_cagr": residual_surplus / assets if assets > 0 else 0,
            "net_profit": net_profit,
        }

    def calculate_personal_profitability(
        self, assets: float, return_rate: float, property_val: float
    ) -> Dict[str, float]:
        annual_revenue = assets * return_rate
        if annual_revenue <= 20000000:
            income_tax = annual_revenue * 0.154
        else:
            income_tax = (20000000 * 0.154) + ((annual_revenue - 20000000) * 0.264)
        annual_health = self.calculate_local_health_insurance(property_val, annual_revenue) * 12
        annual_net = annual_revenue - income_tax - annual_health
        return {
            "annual_revenue": annual_revenue,
            "income_tax": income_tax,
            "annual_health_premium": annual_health,
            "household_income": annual_net / 12,
            "after_tax_yield": (annual_net / assets) * 100 if assets > 0 else 0,
            "after_tax_cagr": (annual_net / assets) - 1 if assets > 0 else 0,
        }
