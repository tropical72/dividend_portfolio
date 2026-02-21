from typing import Dict, List

class TriggerEngine:
    """
    [Domain Layer] 이벤트 트리거 및 가드레일 엔진
    [REQ-RAMS-6] 금융/세무 임계치를 감시하여 경고 및 대응 시나리오 시그널 생성.
    """

    def __init__(self):
        self.tax_limit = 200000000  # 법인세 19% 구간 임계치
        self.buffer_months = 24     # 안전 자산 최소 확보 기간
        self.high_income_cap = 0.40 # 고인컴 자산 최대 비중
        self.panic_threshold = -0.20 # 시장 패닉 임계치 (MDD)

    def check_buffer_trigger(self, current_sgov: float, monthly_shortfall: float) -> List[Dict]:
        """현금 버퍼(SGOV) 부족 감시"""
        signals = []
        target_buffer = monthly_shortfall * self.buffer_months
        if current_sgov < target_buffer:
            signals.append({
                "type": "BUFFER_LOW",
                "level": "RED",
                "message": f"안전 자산(SGOV)이 {self.buffer_months}개월분 생활비 미만으로 하락했습니다.",
                "suggestion": "성장 자산의 일부 이익 실현을 통한 현금 버퍼 확보를 검토하세요."
            })
        return signals

    def check_tax_trigger(self, tax_base: float) -> List[Dict]:
        """법인세 최적화 구간 감시"""
        signals = []
        if tax_base > self.tax_limit:
            signals.append({
                "type": "TAX_WARNING",
                "level": "YELLOW",
                "message": f"법인 과세표준이 {self.tax_limit:,.0f}원을 초과하여 19% 세율 구간에 진입했습니다.",
                "suggestion": "대표이사 급여 상향 또는 법인 비용 집행을 통한 과표 조절을 검토하세요."
            })
        return signals

    def check_concentration_trigger(self, high_income_weight: float) -> List[Dict]:
        """고인컴 자산 편중도 감시"""
        signals = []
        if high_income_weight > self.high_income_cap:
            signals.append({
                "type": "CONCENTRATION_RISK",
                "level": "YELLOW",
                "message": f"고인컴 자산 비중이 {self.high_income_cap*100}%를 초과했습니다.",
                "suggestion": "포트폴리오 변동성 완화를 위해 성장주(VOO 등) 비중 확대를 제안합니다."
            })
        return signals

    def check_market_trigger(self, mdd: float) -> List[Dict]:
        """시장 폭락(Panic) 감시"""
        signals = []
        if mdd <= self.panic_threshold:
            signals.append({
                "type": "MARKET_PANIC",
                "level": "RED",
                "message": f"시장이 고점 대비 {mdd*100:.1f}% 폭락했습니다. 비상 대응 시나리오를 가동합니다.",
                "suggestion": "성장 자산 매도 금지(No-Sell) 로직을 활성화하고 현금 버퍼로 대응하세요."
            })
        return signals
