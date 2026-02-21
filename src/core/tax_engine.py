from typing import Dict


class TaxEngine:
    """
    [Domain Layer] 세무 및 비용 계산 엔진
    모든 함수는 입력값에 의존하는 순수 함수(Pure Function)로 설계됨. [REQ-ARCH-2]
    """

    def __init__(self, config: Dict = None):
        # 2024-2025년 대한민국 건강보험료/세법 기준 (추후 2026년 업데이트 및 변수화 예정)
        self.point_unit_price = 208.4  # 점수당 단가
        self.ltc_rate = 0.1295  # 장기요양보험료율 (건보료의 12.95%)

    def get_property_points(self, property_val: float) -> int:
        """
        지역가입자 재산 점수 산출 (부동산 공시가격 기준)
        실제 점수표는 60등급으로 나뉘나, 시뮬레이션을 위해 선형 근사 및 구간 추정 적용.
        """
        # 기본 공제 1억 원 적용 (현행법 기준)
        taxable_property = max(0, property_val - 100000000)

        # 1억 원당 약 50점~100점 분포 (간이 계산식 적용 - 추후 정밀 점수표 매핑 예정)
        if taxable_property == 0:
            return 0

        # 고가 재산일수록 점수 가중치 완만하게 증가 (로그 스케일 근사)
        import math

        return int(max(0, 100 * math.log10(max(1, taxable_property / 1000000))))

    def get_income_points(self, annual_income: float) -> int:
        """
        지역가입자 소득 점수 산출 (배당/이자 등)
        연 소득 336만 원 초과 시 점수 부여.
        """
        if annual_income <= 3360000:
            return 0

        # 소득 점수 산식 (간이형): 소득 100만 원당 점수 매칭
        return int(annual_income / 1000000 * 20)

    def calculate_local_health_insurance(self, property_val: float, annual_income: float) -> float:
        """
        최종 지역건보료 산출 (건보료 + 장기요양보험료 포함)
        [REQ-RAMS-2.2] 개인 운용 시뮬레이션용 핵심 로직.
        """
        p_points = self.get_property_points(property_val)
        i_points = self.get_income_points(annual_income)

        base_premium = (p_points + i_points) * self.point_unit_price
        total_premium = base_premium * (1 + self.ltc_rate)

        return total_premium

    def calculate_corp_tax(self, profit: float) -> float:
        """
        법인세 산출 (2단계 구간 세율 적용)
        [REQ-RAMS-2.1] 법인 수익성 엔진 로직.
        - 2억 이하: 9%
        - 2억 초과: 19%
        """
        if profit <= 200000000:
            return profit * 0.09
        else:
            return (200000000 * 0.09) + ((profit - 200000000) * 0.19)

    def calculate_income_tax(self, monthly_salary: float) -> Dict[str, float]:
        """
        직장가입자(법인 급여) 4대보험 및 근로소득세 산출
        [REQ-RAMS-2.1] 법인 운용 비용 계산용.
        """
        # 국민연금(4.5%), 건강보험(3.545%), 고용보험(0.9%) 등 간이 계산
        pension = monthly_salary * 0.045
        health = monthly_salary * 0.03545
        employment = monthly_salary * 0.009

        # 소득세 (간이세액표 근사)
        income_tax = monthly_salary * 0.05  # 250만 원 수준에서는 약 5% 내외

        total_deduction = pension + health + employment + income_tax

        return {
            "net_salary": monthly_salary - total_deduction,
            "deductions": total_deduction,
            "pension": pension,
            "health": health,
            "income_tax": income_tax,
        }

    def calculate_corp_profitability(
        self,
        assets: float,
        return_rate: float,
        monthly_salary: float,
        fixed_cost: float,
        loan_repayment: float,
    ) -> Dict[str, float]:
        """
        법인 수익성 및 가용 현금 통합 산출 엔진
        [REQ-RAMS-2.1] 법인 세후 현금흐름 시뮬레이션의 심장.
        """
        # 1. 연간 총 수익 (배당 + 자산성장 등)
        annual_revenue = assets * return_rate

        # 2. 법인 운영 비용 (고정비 + 급여 + 회사 부담 4대보험)
        # 회사 부담 4대보험은 대략 급여의 10% 수준으로 가정
        corp_insurance = (monthly_salary * 0.10) * 12
        annual_expenses = (fixed_cost * 12) + (monthly_salary * 12) + corp_insurance

        # 3. 법인 과세표준 (매출 - 비용)
        tax_base = max(0, annual_revenue - annual_expenses)

        # 4. 법인세 계산
        corp_tax = self.calculate_corp_tax(tax_base)

        # 5. 가계 실수령액 계산 (급여 실수령 + 주주대여금 상환액)
        salary_info = self.calculate_income_tax(monthly_salary)
        net_monthly_salary = salary_info["net_salary"]
        total_monthly_household_income = net_monthly_salary + loan_repayment

        # 6. 법인 내 최종 순이익 (세후)
        net_profit = annual_revenue - annual_expenses - corp_tax

        # 7. 세후 복리 성장률 (순이익 - 대여금 인출액을 뺀 후 남은 자산의 비율)
        annual_outflow_loan = loan_repayment * 12
        residual_surplus = net_profit - annual_outflow_loan
        after_tax_cagr = residual_surplus / assets if assets > 0 else 0

        return {
            "tax_base": tax_base,
            "corp_tax": corp_tax,
            "household_income": total_monthly_household_income,
            "after_tax_cagr": after_tax_cagr,
            "annual_revenue": annual_revenue,
            "net_profit": net_profit,
            "annual_expenses": annual_expenses,
        }

    def calculate_personal_profitability(
        self,
        assets: float,
        return_rate: float,
        property_val: float,
    ) -> Dict[str, float]:
        """
        개인 명의 운용 시 실질 수익성 산출 엔진
        [REQ-RAMS-2.2] 금융소득종합과세 및 지역건보료 폭탄 시뮬레이션.
        """
        # 1. 연간 총 배당 수익
        annual_revenue = assets * return_rate

        # 2. 배당소득세 및 종합소득세 계산 (간이)
        # 2,000만 원까지는 15.4% 원천징수, 초과는 종합과세(대략 24%~ 구간 가정)
        if annual_revenue <= 20000000:
            income_tax = annual_revenue * 0.154
        else:
            # 2,000만 원까지 15.4% + 초과분 약 26.4% (지방세 포함 중위구간 가정)
            income_tax = (20000000 * 0.154) + ((annual_revenue - 20000000) * 0.264)

        # 3. 지역건보료 산출 (재산 + 소득 점수)
        monthly_health_premium = self.calculate_local_health_insurance(
            property_val=property_val, annual_income=annual_revenue
        )
        annual_health_premium = monthly_health_premium * 12

        # 4. 가계 가용 현금 (수익 - 세금 - 건보료)
        annual_net_income = annual_revenue - income_tax - annual_health_premium

        # 5. 실질 수익률 (세후)
        after_tax_cagr = (annual_net_income - annual_revenue) / assets  # 인출 전 기준 성장률 계산

        return {
            "annual_revenue": annual_revenue,
            "income_tax": income_tax,
            "annual_health_premium": annual_health_premium,
            "household_income": annual_net_income / 12,  # 월평균 가용현금
            "after_tax_yield": (annual_net_income / assets) * 100 if assets > 0 else 0,
            "after_tax_cagr": after_tax_cagr,
        }
