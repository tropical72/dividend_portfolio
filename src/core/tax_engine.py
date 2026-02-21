from typing import Dict

class TaxEngine:
    """
    [Domain Layer] 세무 및 비용 계산 엔진
    모든 함수는 입력값에 의존하는 순수 함수(Pure Function)로 설계됨. [REQ-ARCH-2]
    """

    def __init__(self, config: Dict = None):
        # 2024-2025년 대한민국 건강보험료/세법 기준 (추후 2026년 업데이트 및 변수화 예정)
        self.point_unit_price = 208.4  # 점수당 단가
        self.ltc_rate = 0.1295         # 장기요양보험료율 (건보료의 12.95%)
        
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
        income_tax = monthly_salary * 0.05 # 250만 원 수준에서는 약 5% 내외
        
        total_deduction = pension + health + employment + income_tax
        
        return {
            "net_salary": monthly_salary - total_deduction,
            "deductions": total_deduction,
            "pension": pension,
            "health": health,
            "income_tax": income_tax
        }
