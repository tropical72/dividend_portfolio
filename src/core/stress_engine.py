from typing import Any, Dict


class StressTestEngine:
    """
    [Domain Layer] 스트레스 테스트 엔진
    시나리오별 수치는 기본값을 가지나, 외부 설정을 통해 오버라이드 가능. [REQ-RAMS-5]
    """

    def __init__(self, config: Dict = None):
        config = config or {}
        # 사용자 정의 스트레스 파라미터가 있다면 기본값 대체
        self.bear_drop = config.get("bear_market_drop", -0.30)
        self.stag_inflation = config.get("stagflation_rate", 0.04)
        self.div_cut_rate = config.get("dividend_cut_multiplier", 0.75)

    def apply_scenario(self, base_params: Dict[str, Any], scenario_id: str) -> Dict[str, Any]:
        params = base_params.copy()

        if scenario_id == "BEAR":
            params["stress_event"] = "MARKET_CRASH"
            params["market_drop"] = self.bear_drop

        elif scenario_id == "STAGFLATION":
            params["market_return_rate"] = 0.0
            params["inflation_rate"] = self.stag_inflation

        elif scenario_id == "DIVIDEND_CUT":
            if "dividend_yield" in params:
                params["dividend_yield"] *= self.div_cut_rate
            params["income_multiplier"] = self.div_cut_rate

        params["active_stress_scenario"] = scenario_id
        return params
