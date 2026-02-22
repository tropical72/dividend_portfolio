from typing import Dict, List


class RebalanceEngine:
    """
    [Domain Layer] 리밸런싱 판단 및 세무 마찰 비용 산출 엔진
    [REQ-RAMS-4.1, 4.2] 목표 비중 편차 감시 및 매매 시 발생하는 세무 비용 계산.
    """

    def __init__(self, config: Dict = None):
        config = config or {}
        self.deviation_threshold = config.get("deviation_threshold", 0.05)
        self.corp_tax_rate = config.get("corp_tax_rate", 0.09)

    def check_rebalance_condition(
        self, current_assets: Dict[str, float], target_weights: Dict[str, float]
    ) -> List[Dict]:
        """비중 이탈 확인"""
        total_value = sum(current_assets.values())
        if total_value <= 0:
            return []

        signals = []
        for asset, target_w in target_weights.items():
            curr_val = current_assets.get(asset, 0)
            curr_w = curr_val / total_value

            diff = curr_w - target_w
            if abs(diff) > self.deviation_threshold:
                signals.append(
                    {
                        "asset": asset,
                        "current_weight": curr_w,
                        "target_weight": target_w,
                        "deviation": diff,
                        "type": "REBALANCE_REQUIRED",
                        "level": "YELLOW",
                        "message": (
                            f"{asset} 비중이 목표({target_w * 100:.1f}%) 대비 "
                            f"{diff * 100:+.1f}%p 이탈함."
                        ),
                    }
                )
        return signals

    def calculate_friction_cost(
        self, sell_amount: float, avg_cost_basis: float, curr_price: float
    ) -> float:
        """세무 마찰 비용 계산"""
        # 단순 모델: 매도액의 20%를 수익으로 가정
        estimated_profit = sell_amount * 0.20
        return max(0, estimated_profit * self.corp_tax_rate)
