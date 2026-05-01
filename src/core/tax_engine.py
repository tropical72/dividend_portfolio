from typing import Any, Dict, Optional


class TaxEngine:
    """
    [Domain Layer] 세무 및 비용 계산 엔진
    모든 세무 상수는 외부에서 주입받으며, 미지정 시 기본값을 사용함. [REQ-ARCH-2]
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None) -> None:
        config = config or {}

        # 건강보험 관련 변수 (2025년 기본값)
        self.point_unit_price = float(config.get("point_unit_price", 208.4))
        self.ltc_rate = float(config.get("ltc_rate", 0.1295))

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

    def get_property_points(self, property_val: float) -> int:
        taxable_property = max(0, property_val - 100000000)
        if taxable_property == 0:
            return 0
        import math

        return int(max(0, 100 * math.log10(max(1, taxable_property / 1000000))))

    def get_income_points(self, annual_income: float) -> int:
        if annual_income <= 3360000:
            return 0
        return int(annual_income / 1000000 * 20)

    def calculate_local_health_insurance_detailed(
        self, property_val: float, annual_income: float
    ) -> Dict[str, Any]:
        """[REQ-CCS-55] 건강보험료 점수 산출 내역 상세 반환"""
        p_points = self.get_property_points(property_val)
        i_points = self.get_income_points(annual_income)
        total_points = p_points + i_points
        base_premium = total_points * self.point_unit_price
        total_premium = base_premium * (1 + self.ltc_rate)

        return {
            "property_points": p_points,
            "income_points": i_points,
            "total_points": total_points,
            "point_unit_price": self.point_unit_price,
            "ltc_rate": self.ltc_rate,
            "base_premium": base_premium,
            "total_premium": total_premium,
        }

    def calculate_local_health_insurance(self, property_val: float, annual_income: float) -> float:
        """기존 인터페이스 유지"""
        result = self.calculate_local_health_insurance_detailed(property_val, annual_income)
        return result["total_premium"]

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
