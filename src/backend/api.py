import datetime
import os
import uuid
from copy import deepcopy
from typing import Any, Dict, List, Optional, cast

from src.backend.data_provider import StockDataProvider
from src.backend.storage import StorageManager


class DividendBackend:
    """
    배당 포트폴리오 관리기의 핵심 비즈니스 로직을 담당하는 엔진입니다.
    """

    def __init__(self, data_dir: str = ".") -> None:
        self.storage = StorageManager(data_dir=data_dir)
        self.data_dir = os.path.abspath(data_dir)
        self.watchlist_file = "watchlist.json"
        self.settings_file = "settings.json"
        self.portfolios_file = "portfolios.json"
        self.retirement_config_file = "retirement_config.json"

        self.settings = self.storage.load_json(self.settings_file, {})
        dart_key = self.settings.get("dart_api_key")
        self.data_provider = StockDataProvider(dart_api_key=dart_key)
        self.watchlist: List[Dict[str, Any]] = self.storage.load_json(self.watchlist_file, [])
        self.portfolios: List[Dict[str, Any]] = self.storage.load_json(self.portfolios_file, [])
        self.master_portfolios_file = "master_portfolios.json"
        self.master_portfolios: List[Dict[str, Any]] = self.storage.load_json(
            self.master_portfolios_file, []
        )
        self.retirement_config = self.storage.load_json(self.retirement_config_file, {})
        self.snapshot_file = "retirement_snapshot.json"
        self._normalize_all_portfolios()
        self._ensure_retirement_config_defaults()

    def _get_default_strategy_rules(self) -> Dict[str, Any]:
        """stock-plan 기본값 기반 전략 규칙 기본 스키마를 반환합니다."""
        return {
            "rebalance_month": 1,
            "rebalance_week": 2,
            "bear_market_freeze_enabled": True,
            "corporate": {
                "sgov_target_months": 36,
                "sgov_warn_months": 30,
                "sgov_crisis_months": 24,
                "high_income_min_ratio": 0.20,
                "high_income_max_ratio": 0.35,
                "growth_sell_years_left_threshold": 10,
            },
            "pension": {
                "sgov_min_years": 2,
                "bond_min_years": 5,
                "bond_min_total_ratio": 0.05,
                "dividend_min_ratio": 0.10,
            },
        }

    def _deep_merge_dict(self, base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
        """중첩 딕셔너리를 재귀 병합하여 기본값을 보존합니다."""
        merged = dict(base)
        for key, value in updates.items():
            if isinstance(value, dict) and isinstance(merged.get(key), dict):
                merged[key] = self._deep_merge_dict(merged[key], value)
            else:
                merged[key] = value
        return merged

    def _ensure_retirement_config_defaults(self) -> None:
        """은퇴 설정에 필요한 기본 스키마를 보강합니다."""
        self.retirement_config = self._deep_merge_dict(
            {"strategy_rules": self._get_default_strategy_rules()},
            self.retirement_config,
        )

    def _validate_retirement_config(self, config: Dict[str, Any]) -> Optional[str]:
        """은퇴 설정의 핵심 회계 관계를 검증하고 오류 메시지를 반환합니다."""
        corp_params = config.get("corp_params", {})
        initial_investment = float(corp_params.get("initial_investment") or 0)
        capital_stock = float(corp_params.get("capital_stock") or 0)
        shareholder_loan = float(corp_params.get("initial_shareholder_loan") or 0)

        if initial_investment < capital_stock + shareholder_loan:
            return (
                "corp_params.initial_investment는 capital_stock + "
                "initial_shareholder_loan 이상이어야 합니다."
            )

        return None

    def _normalize_portfolio_category(self, account_type: str, category: str) -> str:
        """계좌 타입 기준 전략 카테고리 이름을 정규화합니다."""
        normalized_account = account_type or "Corporate"
        corporate_map = {
            "Cash": "SGOV Buffer",
            "Fixed": "High Income",
            "Dividend": "Dividend Growth",
            "Growth": "Growth Engine",
            "HighIncome": "High Income",
            "SGOV Buffer": "SGOV Buffer",
            "High Income": "High Income",
            "Dividend Growth": "Dividend Growth",
            "Growth Engine": "Growth Engine",
        }
        pension_map = {
            "Cash": "SGOV Buffer",
            "Fixed": "Bond Buffer",
            "Dividend": "Dividend Growth",
            "Growth": "Growth Engine",
            "HighIncome": "Dividend Growth",
            "SGOV Buffer": "SGOV Buffer",
            "Bond Buffer": "Bond Buffer",
            "Dividend Growth": "Dividend Growth",
            "Growth Engine": "Growth Engine",
        }
        category_map = corporate_map if normalized_account == "Corporate" else pension_map
        return category_map.get(category or "Growth", "Growth Engine")

    def _strategy_category_to_stats_bucket(self, account_type: str, category: str) -> str:
        """신규 전략 카테고리를 기존 엔진 호환 버킷으로 매핑합니다."""
        if category == "SGOV Buffer":
            return "Cash"
        if category == "Bond Buffer":
            return "Fixed"
        if category == "High Income":
            return "Dividend"
        if category == "Dividend Growth":
            return "Dividend"
        return "Growth"

    def _normalize_portfolio_items(
        self, account_type: str, items: Optional[List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """포트폴리오 항목을 계좌 타입 기준의 전략 카테고리로 정규화합니다."""
        normalized_items: List[Dict[str, Any]] = []
        for item in items or []:
            normalized = dict(item)
            normalized["category"] = self._normalize_portfolio_category(
                account_type, item.get("category", "Growth")
            )
            normalized_items.append(normalized)
        return normalized_items

    def _normalize_portfolio_record(self, portfolio: Dict[str, Any]) -> Dict[str, Any]:
        """저장 포트폴리오 레코드의 기본 필드와 카테고리를 정규화합니다."""
        normalized = dict(portfolio)
        normalized["account_type"] = normalized.get("account_type") or "Corporate"
        normalized["items"] = self._normalize_portfolio_items(
            normalized["account_type"], normalized.get("items", [])
        )
        return normalized

    def _normalize_all_portfolios(self) -> None:
        """메모리 상의 모든 포트폴리오를 정규화하고, 변경 시 저장합니다."""
        changed = False
        normalized_portfolios = []
        for portfolio in self.portfolios:
            normalized = self._normalize_portfolio_record(portfolio)
            if normalized != portfolio:
                changed = True
            normalized_portfolios.append(normalized)
        self.portfolios = normalized_portfolios
        if changed:
            self.storage.save_json(self.portfolios_file, self.portfolios)

    def get_exchange_rate(self) -> float:
        """실시간 환율을 가져오거나 캐시된 값을 반환합니다. (12시간 주기 갱신)"""
        now = datetime.datetime.now()
        # settings.json 내의 캐시 정보 확인
        cache = self.settings.get("exchange_rate_cache", {})
        last_fetch_str = cache.get("last_fetch")
        last_rate = float(cache.get("rate", 1425.5))

        should_fetch = True
        if last_fetch_str:
            try:
                last_fetch = datetime.datetime.fromisoformat(last_fetch_str)
                # 12시간(하루 2회) 이내면 캐시 사용
                if (now - last_fetch).total_seconds() < 12 * 3600:
                    should_fetch = False
            except ValueError:
                pass

        if should_fetch:
            try:
                print("[Backend] Fetching real-time exchange rate...")
                new_rate = self.data_provider.get_usd_krw_rate()
                if new_rate > 0:
                    self.settings["exchange_rate_cache"] = {
                        "last_fetch": now.isoformat(),
                        "rate": new_rate,
                    }
                    self.storage.save_json(self.settings_file, self.settings)
                    return new_rate
            except Exception as e:
                print(f"[Backend] Exchange rate fetch failed: {e}")

        return last_rate

    def get_portfolio_stats_by_id(self, p_id: Optional[str]) -> Dict[str, Any]:
        """특정 ID의 포트폴리오 통계를 산출합니다.
        데이터가 없거나 비어있으면 기본값(4%/3.5%)을 반환합니다.
        """
        # 기본값 설정
        default_stats = self._portfolio_default_stats()

        if not p_id:
            return default_stats

        portfolio = self.get_portfolio_by_id(p_id)
        if not portfolio or not portfolio.get("items") or len(portfolio["items"]) == 0:
            return default_stats

        items = portfolio["items"]
        account_type = portfolio.get("account_type", "Corporate")
        total_weight = sum(item.get("weight", 0.0) for item in items)
        if total_weight <= 0:
            return default_stats

        stats: Dict[str, Any] = {
            "dividend_yield": 0.0,
            "expected_return": 0.0,
            "weights": {},
            "strategy_weights": {},
        }
        weight_buckets = cast(Dict[str, float], stats["weights"])
        strategy_buckets = cast(Dict[str, float], stats["strategy_weights"])
        for item in items:
            w = item.get("weight", 0.0) / total_weight
            strategy_cat = self._normalize_portfolio_category(
                account_type, item.get("category", "Growth")
            )
            cat = self._strategy_category_to_stats_bucket(
                account_type, item.get("category", "Growth")
            )
            weight_buckets[cat] = weight_buckets.get(cat, 0.0) + w
            strategy_buckets[strategy_cat] = strategy_buckets.get(strategy_cat, 0.0) + w
            div_y = float(item.get("dividend_yield") or 0.0) / 100.0
            stats["dividend_yield"] = float(stats["dividend_yield"]) + (div_y * w)

        # [REQ-GLB-01] Total Return = Portfolio Weighted Yield + Global Price Appreciation
        pa_rate = float(self.settings.get("price_appreciation_rate", 3.0)) / 100.0
        stats["expected_return"] = stats["dividend_yield"] + pa_rate

        return stats

    def get_retirement_config(self) -> Dict[str, Any]:
        """저장된 은퇴 운용 설정 정보를 반환합니다."""
        self._ensure_retirement_config_defaults()
        return cast(Dict[str, Any], self.retirement_config)

    def update_retirement_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        """은퇴 운용 설정을 업데이트합니다. [REQ-RAMS-1.2]"""
        self._ensure_retirement_config_defaults()
        candidate_config = dict(self.retirement_config)
        # 개별 필드 업데이트 (딕셔너리 depth 고려)
        for key, value in new_config.items():
            if (
                isinstance(value, dict)
                and key in candidate_config
                and isinstance(candidate_config[key], dict)
            ):
                candidate_config[key] = self._deep_merge_dict(candidate_config[key], value)
            else:
                candidate_config[key] = value

        validation_error = self._validate_retirement_config(candidate_config)
        if validation_error:
            return {
                "success": False,
                "message": validation_error,
                "data": self.retirement_config,
            }

        self.retirement_config = candidate_config

        self.storage.save_json(self.retirement_config_file, self.retirement_config)
        return {
            "success": True,
            "message": "은퇴 설정이 저장되었습니다.",
            "data": self.retirement_config,
        }

    def save_retirement_snapshot(self, snapshot_data: Dict[str, Any]) -> Dict[str, Any]:
        """현재 상태를 '은퇴일 스냅샷'으로 영구 저장합니다. [REQ-RAMS-7.4]"""
        self.storage.save_json(self.snapshot_file, snapshot_data)
        return {"success": True, "message": "은퇴일 스냅샷이 저장되었습니다."}

    def get_retirement_snapshot(self) -> Dict[str, Any]:
        """저장된 은퇴일 스냅샷을 반환합니다."""
        return cast(Dict[str, Any], self.storage.load_json(self.snapshot_file, {}))

    def export_test_state(self) -> Dict[str, Any]:
        """E2E 테스트용 현재 백엔드 상태 스냅샷을 반환합니다."""
        self._ensure_retirement_config_defaults()
        return {
            "settings": deepcopy(self.settings),
            "watchlist": deepcopy(self.watchlist),
            "portfolios": deepcopy(self.portfolios),
            "master_portfolios": deepcopy(self.master_portfolios),
            "retirement_config": deepcopy(self.retirement_config),
            "retirement_snapshot": deepcopy(self.get_retirement_snapshot()),
        }

    def restore_test_state(self, snapshot: Dict[str, Any]) -> Dict[str, Any]:
        """E2E 테스트용 백엔드 상태를 스냅샷 기준으로 복구합니다."""
        restored = deepcopy(snapshot)
        self.settings = cast(Dict[str, Any], restored.get("settings", {}))
        dart_key = self.settings.get("dart_api_key")
        self.data_provider = StockDataProvider(dart_api_key=dart_key)

        self.watchlist = cast(List[Dict[str, Any]], restored.get("watchlist", []))
        self.portfolios = cast(List[Dict[str, Any]], restored.get("portfolios", []))
        self.master_portfolios = cast(List[Dict[str, Any]], restored.get("master_portfolios", []))
        self.retirement_config = cast(Dict[str, Any], restored.get("retirement_config", {}))

        self._normalize_all_portfolios()
        self._ensure_retirement_config_defaults()

        self.storage.save_json(self.settings_file, self.settings)
        self.storage.save_json(self.watchlist_file, self.watchlist)
        self.storage.save_json(self.portfolios_file, self.portfolios)
        self.storage.save_json(self.master_portfolios_file, self.master_portfolios)
        self.storage.save_json(self.retirement_config_file, self.retirement_config)
        self.storage.save_json(
            self.snapshot_file, cast(Dict[str, Any], restored.get("retirement_snapshot", {}))
        )

        return {
            "success": True,
            "message": "테스트 상태가 복구되었습니다.",
            "data": self.export_test_state(),
        }

    def get_watchlist(self) -> List[Dict[str, Any]]:
        """저장된 관심 종목 목록을 반환합니다. (필드 누락 방지 포함)"""
        # 기존 데이터 호환성을 위해 필수 필드 기본값 보정
        for item in self.watchlist:
            item.setdefault("one_yr_return", 0.0)
            item.setdefault("ex_div_date", "-")
            item.setdefault("last_div_amount", 0.0)
            item.setdefault("last_div_yield", 0.0)
            item.setdefault("past_avg_monthly_div", 0.0)
            item.setdefault("dividend_frequency", "None")
            item.setdefault("payment_months", [])
        return self.watchlist

    def get_portfolios(self) -> List[Dict[str, Any]]:
        """저장된 모든 포트폴리오 목록을 반환합니다."""
        self._normalize_all_portfolios()
        return self.portfolios

    def add_portfolio(
        self,
        name: str,
        account_type: str = "Corporate",
        total_capital: float = 0.0,
        currency: str = "USD",
        items: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """새로운 포트폴리오를 생성합니다."""
        new_p = {
            "id": str(uuid.uuid4()),
            "name": name,
            "account_type": account_type,
            "total_capital": total_capital,
            "currency": currency,
            "items": self._normalize_portfolio_items(account_type, items or []),
            "created_at": str(
                os.path.getmtime(self.data_dir)
            ),  # 실제 생성 시간 대신 더미 활용 가능
        }
        self.portfolios.append(new_p)
        self.storage.save_json(self.portfolios_file, self.portfolios)
        return {"success": True, "data": new_p}

    def is_portfolio_used_in_master(self, p_id: str) -> bool:
        """포트폴리오가 마스터 전략에서 사용 중인지 확인합니다. [REQ-PRT-08.3]"""
        for m in self.master_portfolios:
            if m.get("corp_id") == p_id or m.get("pension_id") == p_id:
                return True
        return False

    def remove_portfolio(self, p_id: str) -> Dict[str, Any]:
        """특정 포트폴리오를 삭제합니다. [의존성 검사 추가]"""
        if self.is_portfolio_used_in_master(p_id):
            # 사용 중인 마스터 전략 이름 찾기
            master = next(
                (
                    m
                    for m in self.master_portfolios
                    if m.get("corp_id") == p_id or m.get("pension_id") == p_id
                ),
                None,
            )
            m_name = master["name"] if master else "알 수 없는 전략"
            return {
                "success": False,
                "message": f"마스터 전략 '{m_name}'에서 사용 중이므로 삭제할 수 없습니다.",
            }

        for i, p in enumerate(self.portfolios):
            if p["id"] == p_id:
                removed = self.portfolios.pop(i)
                self.storage.save_json(self.portfolios_file, self.portfolios)
                return {"success": True, "message": f"{removed['name']} 삭제됨"}
        return {"success": False, "message": "포트폴리오를 찾을 수 없습니다."}

    def get_master_portfolios(self) -> List[Dict[str, Any]]:
        """저장된 모든 마스터 포트폴리오를 반환합니다. [REQ-PRT-09.2 요약 정보 포함]"""
        for m in self.master_portfolios:
            corp_p = self.get_portfolio_by_id(m.get("corp_id"))
            pen_p = self.get_portfolio_by_id(m.get("pension_id"))

            m["corp_name"] = corp_p["name"] if corp_p else "-"
            m["pension_name"] = pen_p["name"] if pen_p else "-"

            # 통합 수익률(TR) 계산: (법인자산*법인수익률 + 연금자산*연금수익률) / 총자산
            c_stats = self.get_portfolio_stats_by_id(m.get("corp_id"))
            p_stats = self.get_portfolio_stats_by_id(m.get("pension_id"))

            c_cap = corp_p["total_capital"] if corp_p else 0
            p_cap = pen_p["total_capital"] if pen_p else 0
            total_cap = c_cap + p_cap

            if total_cap > 0:
                combined_tr = (
                    c_stats["expected_return"] * c_cap + p_stats["expected_return"] * p_cap
                ) / total_cap
            else:
                combined_tr = c_stats["expected_return"] or p_stats["expected_return"] or 0.07

            m["combined_yield"] = combined_tr

        return self.master_portfolios

    def get_portfolio_by_id(self, p_id: Optional[str]) -> Optional[Dict[str, Any]]:
        """ID로 개별 포트폴리오를 찾습니다."""
        if not p_id:
            return None
        portfolio = next((p for p in self.portfolios if p["id"] == p_id), None)
        return self._normalize_portfolio_record(portfolio) if portfolio else None

    def add_master_portfolio(
        self,
        name: str,
        corp_id: Optional[str] = None,
        pension_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """새로운 마스터 전략을 생성합니다. [REQ-PRT-08.1]"""
        if not corp_id and not pension_id:
            return {"success": False, "message": "최소 하나 이상의 포트폴리오를 선택해야 합니다."}

        new_m = {
            "id": str(uuid.uuid4()),
            "name": name,
            "corp_id": corp_id,
            "pension_id": pension_id,
            "is_active": len(self.master_portfolios) == 0,  # 첫 번째면 자동 활성
        }
        self.master_portfolios.append(new_m)
        self.storage.save_json(self.master_portfolios_file, self.master_portfolios)
        return {"success": True, "data": new_m}

    def activate_master_portfolio(self, m_id: str) -> Dict[str, Any]:
        """특정 마스터 전략을 활성화하고, 해당 수익률을 Standard Profile(v1)에 자동 반영합니다."""
        found_m = None
        for m in self.master_portfolios:
            if m["id"] == m_id:
                m["is_active"] = True
                found_m = m
            else:
                m["is_active"] = False

        if found_m:
            # [NEW] 선택된 마스터 전략의 통합 수익률 계산
            c_stats = self.get_portfolio_stats_by_id(found_m.get("corp_id"))
            p_stats = self.get_portfolio_stats_by_id(found_m.get("pension_id"))
            corp_p = self.get_portfolio_by_id(found_m.get("corp_id"))
            pen_p = self.get_portfolio_by_id(found_m.get("pension_id"))

            c_cap = corp_p["total_capital"] if corp_p else 0
            p_cap = pen_p["total_capital"] if pen_p else 0
            total_cap = c_cap + p_cap

            if total_cap > 0:
                combined_tr = (
                    c_stats["expected_return"] * c_cap + p_stats["expected_return"] * p_cap
                ) / total_cap
            else:
                combined_tr = c_stats["expected_return"] or p_stats["expected_return"] or 0.07

            # [NEW] retirement_config.json의 v1(Standard) 수익률 자동 업데이트
            if (
                "assumptions" in self.retirement_config
                and "v1" in self.retirement_config["assumptions"]
            ):
                self.retirement_config["assumptions"]["v1"]["expected_return"] = combined_tr
                self.storage.save_json(self.retirement_config_file, self.retirement_config)

            self.storage.save_json(self.master_portfolios_file, self.master_portfolios)
            return {
                "success": True,
                "message": "전략이 활성화되었으며 Standard Profile에 반영되었습니다.",
                "yield": combined_tr,
            }
        return {"success": False, "message": "전략을 찾을 수 없습니다."}

    def remove_master_portfolio(self, m_id: str) -> Dict[str, Any]:
        """마스터 전략을 삭제합니다. [활성 전략 보호 추가]"""
        for i, m in enumerate(self.master_portfolios):
            if m["id"] == m_id:
                if m.get("is_active"):
                    return {
                        "success": False,
                        "message": (
                            f"마스터 전략 '{m['name']}'은(는) 현재 사용 중입니다. "
                            "삭제하려면 다른 전략을 먼저 활성화해 주세요."
                        ),
                    }
                removed = self.master_portfolios.pop(i)
                self.storage.save_json(self.master_portfolios_file, self.master_portfolios)
                return {"success": True, "message": f"{removed['name']} 전략 삭제됨"}
        return {"success": False, "message": "전략을 찾을 수 없습니다."}

    def get_active_master_portfolio(self) -> Optional[Dict[str, Any]]:
        """현재 활성화된 마스터 포트폴리오를 반환합니다."""
        return next((m for m in self.master_portfolios if m.get("is_active")), None)

    def update_portfolio(self, p_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """특정 포트폴리오의 정보를 업데이트합니다. [REQ-PRT-04.2]"""
        for p in self.portfolios:
            if p["id"] == p_id:
                merged = dict(p)
                merged.update(updates)
                account_type = merged.get("account_type") or "Corporate"
                if "items" in merged:
                    merged["items"] = self._normalize_portfolio_items(
                        account_type, merged.get("items", [])
                    )
                merged["account_type"] = account_type
                p.update(merged)
                self.storage.save_json(self.portfolios_file, self.portfolios)
                return {"success": True, "data": p}
        return {"success": False, "message": "포트폴리오를 찾을 수 없습니다."}

    def analyze_portfolio(self, p_id: str, mode: str = "TTM") -> Dict[str, Any]:
        """포트폴리오의 실시간 분석 결과를 반환합니다. [REQ-PRT-03.4, 05.1]"""
        portfolio = next((p for p in self.portfolios if p["id"] == p_id), None)
        if not portfolio:
            return {"success": False, "message": "포트폴리오를 찾을 수 없습니다."}

        total_capital = portfolio.get("total_capital", 0.0)
        items = portfolio.get("items", [])
        usd_krw_rate = self.data_provider.get_usd_krw_rate()

        total_weight = sum(item.get("weight", 0.0) for item in items)
        weighted_yield = 0.0

        # 월별 배당금 합계 저장 (1~12월)
        monthly_distribution = {m: 0.0 for m in range(1, 13)}

        for item in items:
            symbol = item.get("symbol")
            weight = item.get("weight", 0.0)
            if weight <= 0:
                continue

            # 종목의 할당 금액 (포트폴리오 통화 기준)
            allocated_amount = total_capital * (weight / 100.0)

            # 종목의 기본 정보 및 수익률 (저장된 값 사용 - 필요시 refresh 로직 추가)
            ticker_yield = item.get("dividend_yield", 0.0)
            weighted_yield += (weight / 100.0) * ticker_yield if total_weight > 0 else 0.0

            # 월별 분포 계산
            if mode == "Forward":
                # Forward: Last Amt * Months
                months = item.get("payment_months", [])
                last_amt = item.get("last_div_amount", 0.0)
                price = item.get("price", 1.0)
                if price > 0:
                    # (할당금 / 주가) = 보유 주식 수
                    shares = allocated_amount / price
                    for m in months:
                        monthly_distribution[m] += shares * last_amt
            else:
                # TTM: 실제 과거 1년 합산
                monthly_map = self.data_provider.get_monthly_dividend_map(symbol)
                price = item.get("price", 1.0)
                if price > 0:
                    shares = allocated_amount / price
                    for m, amt in monthly_map.items():
                        monthly_distribution[m] += shares * amt

        # 통화 환산 (KRW 기준)
        p_currency = portfolio.get("currency", "USD")

        def to_krw(amt):
            return amt * usd_krw_rate if p_currency == "USD" else amt

        # 최종 요약 계산
        annual_income_val = total_capital * (weighted_yield / 100.0)

        # [REQ-GLB-01] Weighted Total Return = Weighted Yield + Global PA
        pa_rate = float(self.settings.get("price_appreciation_rate", 3.0))
        weighted_return = weighted_yield + pa_rate

        # 통화별 연간 수입 계산
        if p_currency == "USD":
            annual_usd = annual_income_val
            annual_krw = annual_income_val * usd_krw_rate
        else:
            annual_krw = annual_income_val
            annual_usd = annual_income_val / usd_krw_rate

        return {
            "success": True,
            "data": {
                "total_weight": total_weight,
                "weighted_yield": weighted_yield,
                "weighted_return": weighted_return,
                "pa_rate": pa_rate,
                "mode": mode,
                "currency": p_currency,
                "exchange_rate": usd_krw_rate,
                "summary": {"annual": {"usd": annual_usd, "krw": annual_krw}},
                "monthly_chart": [
                    {"month": m, "amount_krw": to_krw(amt), "amount_origin": amt}
                    for m, amt in monthly_distribution.items()
                ],
            },
        }
        """저장된 관심 종목 목록을 반환합니다. (필드 누락 방지 포함)"""
        # 기존 데이터 호환성을 위해 필수 필드 기본값 보정
        for item in self.watchlist:
            item.setdefault("one_yr_return", 0.0)
            item.setdefault("ex_div_date", "-")
            item.setdefault("last_div_amount", 0.0)
            item.setdefault("last_div_yield", 0.0)
            item.setdefault("past_avg_monthly_div", 0.0)
            item.setdefault("dividend_frequency", "None")
            item.setdefault("payment_months", [])
        return self.watchlist

    def get_settings(self) -> Dict[str, Any]:
        """저장된 설정 정보를 반환합니다."""
        # 필수 필드 기본값 보정
        self.settings.setdefault("dart_api_key", "")
        self.settings.setdefault("gemini_api_key", "")
        self.settings.setdefault("default_capital", 10000.0)
        self.settings.setdefault("default_currency", "USD")
        self.settings.setdefault("price_appreciation_rate", 3.0)
        return cast(Dict[str, Any], self.settings)

    def add_to_watchlist(self, ticker: str, country: str = "US") -> Dict[str, Any]:
        """새로운 종목을 추가하고 저장합니다."""
        formatted_ticker = ticker.upper().strip()

        # [REQ-WCH-01.7] 스마트 티커 감지: 6자리(숫자+영문 가능)면 자동으로 한국 종목 처리
        # 한국 티커는 보통 6자리이며, ETF나 우선주의 경우 영문자가 포함될 수 있음 (예: 0104H0)
        is_kr_ticker_format = len(formatted_ticker) == 6

        if (country == "KR" or is_kr_ticker_format) and not (
            formatted_ticker.endswith(".KS") or formatted_ticker.endswith(".KQ")
        ):
            formatted_ticker += ".KS"

        for item in self.watchlist:
            if item["symbol"] == formatted_ticker:
                return {"success": False, "message": "이미 등록된 종목입니다."}

        info = self.data_provider.get_stock_info(formatted_ticker)
        if "error" in info:
            return {"success": False, "message": f"조회 실패: {info['error']}"}

        info["country"] = country
        self.watchlist.append(info)
        self.storage.save_json(self.watchlist_file, self.watchlist)
        return {"success": True, "message": f"{info['name']} 추가됨", "data": info}

    def is_stock_in_portfolio(self, ticker: str) -> bool:
        """
        특정 종목이 현재 저장된 어떤 포트폴리오에라도 포함되어 있는지 확인합니다.
        """
        search_ticker = ticker.upper().strip()
        for p in self.portfolios:
            items = p.get("items", [])
            if any(item.get("symbol", "").upper() == search_ticker for item in items):
                return True
        return False

    def remove_from_watchlist(self, ticker: str) -> Dict[str, Any]:
        """관심종목에서 특정 종목을 제거합니다. (무결성 검사 포함)"""
        # 1. 포트폴리오 무결성 체크: 삭제 전 사용 여부 확인
        if self.is_stock_in_portfolio(ticker.upper()):
            return {
                "success": False,
                "message": (
                    "포트폴리오에 포함된 종목은 삭제할 수 없습니다. "
                    "먼저 포트폴리오에서 제거해 주세요."
                ),
            }

        # 2. 리스트에서 찾아 삭제
        for i, item in enumerate(self.watchlist):
            if item["symbol"] == ticker.upper():
                removed = self.watchlist.pop(i)
                self.storage.save_json(self.watchlist_file, self.watchlist)
                return {"success": True, "message": f"{removed['name']} 제거됨"}
        return {"success": False, "message": "종목을 찾을 수 없습니다."}

    def update_settings(self, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        """설정을 업데이트합니다."""
        self.settings.update(new_settings)
        self.storage.save_json(self.settings_file, self.settings)
        if "dart_api_key" in new_settings:
            self.data_provider = StockDataProvider(dart_api_key=self.settings["dart_api_key"])
        return {"success": True, "message": "설정이 저장되었습니다."}

    def _portfolio_default_stats(self) -> Dict[str, Any]:
        return {
            "dividend_yield": 0.04,
            "expected_return": 0.07,
            "weights": {"Growth": 1.0},
            "strategy_weights": {"Growth Engine": 1.0},
        }
