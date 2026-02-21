from typing import Dict


class CascadeEngine:
    """
    [Domain Layer] 계층 이동 인출 엔진 (Tier Cascade Engine)
    SGOV 버퍼 유지를 위해 계층별 자산 매도 순서를 결정하는 상태 머신. [REQ-RAMS-3.4]
    """

    def __init__(self, target_buffer: float):
        """
        :param target_buffer: 유지해야 할 안전 자산(SGOV)의 목표 금액 (30개월분 등)
        """
        self.target_buffer = target_buffer
        # 매도 우선순위 정의 (상위 계층부터 소진)
        self.tier_order = ["VOO", "SCHD", "BND"]

    def get_liquidation_decision(self, assets: Dict[str, float]) -> Dict:
        """
        현재 자산 상태를 기반으로 이번 달 인출/매도 의사결정을 반환한다.
        """
        sgov_balance = assets.get("SGOV", 0)

        # 1. 버퍼가 충분한 경우: 추가 매도 불필요 (배당금만으로 충당 가정)
        if sgov_balance >= self.target_buffer:
            return {"state": "STATE_IDLE", "target_asset": None, "reason": "BUFFER_OK"}

        # 2. 버퍼 부족 시 계층 순서에 따라 매도 대상 탐색
        for tier in self.tier_order:
            balance = assets.get(tier, 0)
            if balance > 0:
                return {
                    "state": f"SELL_TIER_{tier}",
                    "target_asset": tier,
                    "reason": "RECHARGE_BUFFER",
                }

        # 3. 모든 상위 자산이 소진된 경우: 최후의 보루인 SGOV 원금 사용
        return {"state": "EMERGENCY", "target_asset": "SGOV", "reason": "ALL_TIERS_EXHAUSTED"}
