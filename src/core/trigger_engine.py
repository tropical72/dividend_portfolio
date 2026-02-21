from typing import Dict, List


class TriggerEngine:
    """
    [Domain Layer] 이벤트 트리거 및 가드레일 엔진
    모든 임계치는 설정 가능하며, 미지정 시 기본 가이드라인을 따름. [REQ-RAMS-6]
    """

    def __init__(self, config: Dict = None):
        config = config or {}
        self.tax_limit = config.get("tax_threshold", 200000000)
        self.buffer_months = config.get("target_buffer_months", 24)
        self.high_income_cap = config.get("high_income_cap_rate", 0.40)
        self.panic_threshold = config.get("market_panic_threshold", -0.20)

    def check_buffer_trigger(self, current_sgov: float, monthly_shortfall: float) -> List[Dict]:
        signals = []
        target_buffer = monthly_shortfall * self.buffer_months
        if current_sgov < target_buffer:
            signals.append(
                {
                    "type": "BUFFER_LOW",
                    "message": f"안전 자산(SGOV)이 {self.buffer_months}개월분 생활비 미만입니다.",
                    "suggestion": "현금 확보를 위해 성장 자산의 일부 이익 실현을 검토하세요.",
                }
            )
        return signals

    def check_tax_trigger(self, tax_base: float) -> List[Dict]:
        signals = []
        if tax_base > self.tax_limit:
            signals.append(
                {
                    "type": "TAX_WARNING",
                    "message": f"법인 과세표준이 {self.tax_limit:,.0f}원을 초과했습니다.",
                    "suggestion": "급여 조정이나 법인 비용 처리를 통해 절세를 검토하세요.",
                }
            )
        return signals

    def check_concentration_trigger(self, high_income_weight: float) -> List[Dict]:
        signals = []
        if high_income_weight > self.high_income_cap:
            signals.append(
                {
                    "type": "CONCENTRATION_RISK",
                    "message": f"고인컴 자산 비중이 {self.high_income_cap * 100}%를 초과했습니다.",
                    "suggestion": "변동성 완화를 위해 성장주 비중 확대를 제안합니다.",
                }
            )
        return signals

    def check_market_trigger(self, mdd: float) -> List[Dict]:
        signals = []
        if mdd <= self.panic_threshold:
            signals.append(
                {
                    "type": "MARKET_PANIC",
                    "message": f"시장이 {mdd * 100:.1f}% 하락했습니다. 비상 시나리오를 가동합니다.",
                    "suggestion": "성장 자산 매매를 중단하고 현금 버퍼를 사용하세요.",
                }
            )
        return signals
