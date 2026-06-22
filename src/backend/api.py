import datetime
import os
import uuid
from copy import deepcopy
from typing import Any, Dict, List, Optional, cast

from src.backend.data_provider import StockDataProvider
from src.backend.storage import StorageManager
from src.core.projection_engine import ProjectionEngine
from src.core.tax_engine import TaxEngine

DEFAULT_APPRECIATION_RATES = {
    "cash_sgov": 0.1,
    "bond_buffer": 0.1,
    "high_income": 0.1,
    "dividend_stocks": 9.6,
    "growth_stocks": 8.2,
}
DEFAULT_PA_SCENARIO = "base"
PA_SCENARIO_KEYS = ("conservative", "base", "optimistic")
DEFAULT_APPRECIATION_RATE_SCENARIOS = {
    "conservative": {
        "cash_sgov": 0.0,
        "bond_buffer": -0.8,
        "high_income": 0.5,
        "dividend_stocks": 5.5,
        "growth_stocks": 6.5,
    },
    "base": {
        "cash_sgov": 0.0,
        "bond_buffer": -0.2,
        "high_income": 1.5,
        "dividend_stocks": 6.5,
        "growth_stocks": 7.5,
    },
    "optimistic": {
        "cash_sgov": 0.0,
        "bond_buffer": 0.6,
        "high_income": 2.5,
        "dividend_stocks": 8.0,
        "growth_stocks": 9.0,
    },
}


class DividendBackend:
    """
    배당 포트폴리오 관리기의 핵심 비즈니스 로직을 담당하는 엔진입니다.
    """

    DEFAULT_CORP_PORTFOLIO_ID = "8fd43042-687c-4b87-9f4f-a95499220b10"
    DEFAULT_PENSION_PORTFOLIO_ID = "4203df7d-6708-448b-ab72-4cb05b2b2f9e"
    DEFAULT_MASTER_PORTFOLIO_ID = "5a4f0ac9-c3b3-4561-a813-74a6e653d0d3"
    DEFAULT_STANDARD_PROFILE_RETURN = 0.0485
    SECRET_SETTING_KEYS = ("dart_api_key", "gemini_api_key", "openai_api_key")

    def __init__(
        self,
        data_dir: str = ".",
        defaults_dir: Optional[str] = None,
        ensure_default_master_bundle: bool = False,
    ) -> None:
        self.storage = StorageManager(data_dir=data_dir, defaults_dir=defaults_dir)
        self.data_dir = os.path.abspath(data_dir)
        self.defaults_dir = os.path.abspath(defaults_dir) if defaults_dir else None
        self.ensure_default_master_bundle = ensure_default_master_bundle
        self.watchlist_file = "watchlist.json"
        self.settings_file = "settings.json"
        self.secret_settings_file = "settings.local.json"
        self.portfolios_file = "portfolios.json"
        self.retirement_config_file = "retirement_config.json"
        self.cost_comparison_config_file = "cost_comparison_config.json"

        self.settings = self._load_settings()
        dart_key = self.settings.get("dart_api_key")
        self.data_provider = StockDataProvider(dart_api_key=dart_key)
        self.watchlist: List[Dict[str, Any]] = self.storage.load_json(self.watchlist_file, [])
        self.portfolios: List[Dict[str, Any]] = self.storage.load_json(self.portfolios_file, [])
        self.master_portfolios_file = "master_portfolios.json"
        self.master_portfolios: List[Dict[str, Any]] = self.storage.load_json(
            self.master_portfolios_file, []
        )
        self.retirement_config = self.storage.load_json(self.retirement_config_file, {})
        self.cost_comparison_config = self.storage.load_json(self.cost_comparison_config_file, {})
        self.snapshot_file = "retirement_snapshot.json"
        self._normalize_all_portfolios()
        self._ensure_retirement_config_defaults()
        self._ensure_cost_comparison_config_defaults()
        self._ensure_seeded_defaults_if_enabled()

    def _ensure_seeded_defaults_if_enabled(self) -> None:
        """실앱 모드에서는 기본 watchlist/master bundle이 항상 존재하도록 보장한다."""
        if not self.ensure_default_master_bundle:
            return
        self._migrate_bnd_to_vgit()
        self._ensure_default_master_bundle()
        self._ensure_default_watchlist()

    def _get_vgit_seed(self) -> Dict[str, Any]:
        return {
            "symbol": "VGIT",
            "name": "Vanguard Intermediate-Term Treasury Index Fund ETF Shares",
            "price": 59.015,
            "currency": "USD",
            "dividend_yield": 3.8498686774548845,
            "one_yr_return": 3.5658201817754116,
            "ex_div_date": "2026-05-01",
            "last_div_amount": 0.187,
            "last_div_yield": 0.3168685927306617,
            "past_avg_monthly_div": 0.18933333333333335,
            "dividend_frequency": "Monthly",
            "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            "country": "US",
            "is_system_default": True,
        }

    def _get_bnd_seed(self) -> Dict[str, Any]:
        return {
            "symbol": "BND",
            "name": "Vanguard Total Bond Market Index Fund",
            "price": 73.88,
            "currency": "USD",
            "dividend_yield": 3.9063345966432057,
            "one_yr_return": 5.512784692821852,
            "ex_div_date": "2026-04-01",
            "last_div_amount": 0.25,
            "last_div_yield": 0.3383865728207905,
            "past_avg_monthly_div": 0.24050000000000002,
            "dividend_frequency": "Monthly",
            "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            "country": "US",
            "is_system_default": True,
        }

    def _migrate_bnd_to_vgit(self) -> None:
        """기존 BND 기반 채권 기본값을 VGIT 기준으로 교체한다."""
        vgit_seed = self._get_vgit_seed()
        changed_watchlist = False
        changed_portfolios = False

        migrated_watchlist: List[Dict[str, Any]] = []
        has_existing_vgit = any(item.get("symbol") == "VGIT" for item in self.watchlist)
        has_vgit = False
        for item in self.watchlist:
            if item.get("symbol") == "VGIT":
                if has_vgit:
                    changed_watchlist = True
                    continue
                merged = dict(item)
                merged["dividend_yield"] = vgit_seed["dividend_yield"]
                migrated_watchlist.append(merged)
                has_vgit = True
                continue
            if item.get("symbol") == "BND":
                if not has_existing_vgit and not has_vgit:
                    migrated_watchlist.append(dict(vgit_seed))
                    has_vgit = True
                changed_watchlist = True
                continue
            migrated_watchlist.append(item)

        if not has_vgit:
            migrated_watchlist.append(dict(vgit_seed))
            changed_watchlist = True

        if changed_watchlist:
            self.watchlist = migrated_watchlist
            self.storage.save_json(self.watchlist_file, self.watchlist)

        for portfolio in self.portfolios:
            for item in portfolio.get("items", []):
                if item.get("symbol") == "BND":
                    item["symbol"] = "VGIT"
                    item["name"] = vgit_seed["name"]
                    item["price"] = vgit_seed["price"]
                    item["dividend_yield"] = vgit_seed["dividend_yield"]
                    item["last_div_amount"] = vgit_seed["last_div_amount"]
                    item["payment_months"] = list(vgit_seed["payment_months"])
                    changed_portfolios = True

        if changed_portfolios:
            self.storage.save_json(self.portfolios_file, self.portfolios)

    def _split_settings(self, settings: Dict[str, Any]) -> tuple[Dict[str, Any], Dict[str, Any]]:
        public_settings = deepcopy(settings)
        secret_settings: Dict[str, Any] = {}
        for key in self.SECRET_SETTING_KEYS:
            if key in public_settings:
                secret_settings[key] = public_settings.pop(key)
        return public_settings, secret_settings

    def _load_settings(self) -> Dict[str, Any]:
        public_settings = cast(Dict[str, Any], self.storage.load_json(self.settings_file, {}))
        secret_settings = cast(
            Dict[str, Any], self.storage.load_json(self.secret_settings_file, {})
        )

        legacy_secret_settings = {
            key: public_settings.pop(key)
            for key in self.SECRET_SETTING_KEYS
            if key in public_settings
        }

        if legacy_secret_settings:
            for key, value in legacy_secret_settings.items():
                if secret_settings.get(key) in (None, ""):
                    secret_settings[key] = value
            self.storage.save_json(self.secret_settings_file, secret_settings)
            self.storage.save_json(self.settings_file, public_settings)

        merged_settings = deepcopy(public_settings)
        merged_settings.update(secret_settings)
        return self._normalize_settings(merged_settings)

    def _normalize_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        normalized = deepcopy(settings)
        normalized["appreciation_rates"] = self._normalize_appreciation_rate_scenarios(
            normalized.get("appreciation_rates")
        )
        normalized.setdefault("dart_api_key", "")
        normalized.setdefault("gemini_api_key", "")
        normalized.setdefault("default_capital", 10000.0)
        normalized.setdefault("default_currency", "USD")
        normalized.setdefault("ui_language", "ko")
        normalized.setdefault("price_appreciation_rate", 3.0)
        normalized["default_pa_scenario"] = self._normalize_pa_scenario(
            normalized.get("default_pa_scenario")
        )
        return normalized

    def _normalize_pa_scenario(self, candidate: Optional[Any]) -> str:
        if isinstance(candidate, str) and candidate in PA_SCENARIO_KEYS:
            return candidate
        return DEFAULT_PA_SCENARIO

    def _normalize_appreciation_rate_set(
        self,
        rate_set: Optional[Dict[str, Any]],
        default_rate_set: Dict[str, float],
    ) -> Dict[str, float]:
        normalized_rates = dict(default_rate_set)
        if not isinstance(rate_set, dict):
            return normalized_rates

        legacy_fixed_income = rate_set.get("fixed_income")
        if legacy_fixed_income is not None:
            normalized_rates["bond_buffer"] = float(legacy_fixed_income)
            normalized_rates["high_income"] = float(legacy_fixed_income)

        for key in DEFAULT_APPRECIATION_RATES:
            if key in rate_set and rate_set[key] is not None:
                normalized_rates[key] = float(rate_set[key])
        return normalized_rates

    def _normalize_appreciation_rate_scenarios(self, rates: Any) -> Dict[str, Dict[str, float]]:
        normalized = deepcopy(DEFAULT_APPRECIATION_RATE_SCENARIOS)
        if not isinstance(rates, dict):
            return normalized

        if any(key in rates for key in PA_SCENARIO_KEYS):
            for scenario in PA_SCENARIO_KEYS:
                normalized[scenario] = self._normalize_appreciation_rate_set(
                    cast(Optional[Dict[str, Any]], rates.get(scenario)),
                    DEFAULT_APPRECIATION_RATE_SCENARIOS[scenario],
                )
            return normalized

        normalized["base"] = self._normalize_appreciation_rate_set(
            cast(Optional[Dict[str, Any]], rates),
            DEFAULT_APPRECIATION_RATE_SCENARIOS["base"],
        )
        return normalized

    def get_appreciation_rates_for_scenario(
        self, pa_scenario: Optional[str] = None
    ) -> Dict[str, float]:
        scenario = self._normalize_pa_scenario(
            pa_scenario or self.settings.get("default_pa_scenario")
        )
        all_rates = cast(
            Dict[str, Dict[str, float]],
            self._normalize_appreciation_rate_scenarios(self.settings.get("appreciation_rates")),
        )
        return dict(
            all_rates.get(scenario, DEFAULT_APPRECIATION_RATE_SCENARIOS[DEFAULT_PA_SCENARIO])
        )

    def _save_settings(self) -> None:
        public_settings, secret_settings = self._split_settings(self.settings)
        self.storage.save_json(self.settings_file, public_settings)
        self.storage.save_json(self.secret_settings_file, secret_settings)

    def _get_default_watchlist_seed_data(self) -> List[Dict[str, Any]]:
        return [
            {
                "symbol": "SGOV",
                "name": "iShares 0-3 Month Treasury Bond ETF",
                "price": 100.53,
                "currency": "USD",
                "dividend_yield": 3.9460857455485927,
                "one_yr_return": 4.025528224888379,
                "ex_div_date": "2026-04-01",
                "last_div_amount": 0.293,
                "last_div_yield": 0.29145528697901124,
                "past_avg_monthly_div": 0.3305833333333334,
                "dividend_frequency": "Monthly",
                "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                "country": "US",
                "is_system_default": True,
            },
            {
                "symbol": "JEPI",
                "name": "JPMorgan Equity Premium Income ETF",
                "price": 57.61,
                "currency": "USD",
                "dividend_yield": 8.288491581322688,
                "one_yr_return": 16.86163709965601,
                "ex_div_date": "2026-04-01",
                "last_div_amount": 0.421,
                "last_div_yield": 0.730775906960597,
                "past_avg_monthly_div": 0.3979166666666667,
                "dividend_frequency": "Monthly",
                "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                "country": "US",
                "is_system_default": True,
            },
            {
                "symbol": "JEPQ",
                "name": "JPMorgan Nasdaq Equity Premium Income ETF",
                "price": 58.48,
                "currency": "USD",
                "dividend_yield": 10.574555403556772,
                "one_yr_return": 33.97156340782576,
                "ex_div_date": "2026-04-01",
                "last_div_amount": 0.559,
                "last_div_yield": 0.9558823529411765,
                "past_avg_monthly_div": 0.5153333333333333,
                "dividend_frequency": "Monthly",
                "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                "country": "US",
                "is_system_default": True,
            },
            {
                "symbol": "VOO",
                "name": "Vanguard S&P 500 ETF",
                "price": 643.45,
                "currency": "USD",
                "dividend_yield": 1.1077783821586757,
                "one_yr_return": 34.752238715923326,
                "ex_div_date": "2026-03-27",
                "last_div_amount": 1.872,
                "last_div_yield": 0.2909316963245008,
                "past_avg_monthly_div": 0.594,
                "dividend_frequency": "Quarterly",
                "payment_months": [3, 6, 9, 12],
                "country": "US",
                "is_system_default": True,
            },
            {
                "symbol": "QQQM",
                "name": "Invesco NASDAQ 100 ETF",
                "price": 262.48,
                "currency": "USD",
                "dividend_yield": 0.4834654068881439,
                "one_yr_return": 44.276256673826296,
                "ex_div_date": "2026-03-23",
                "last_div_amount": 0.328,
                "last_div_yield": 0.12496190185918928,
                "past_avg_monthly_div": 0.10575000000000001,
                "dividend_frequency": "Quarterly",
                "payment_months": [3, 6, 9, 12],
                "country": "US",
                "is_system_default": True,
            },
            {
                "symbol": "SCHD",
                "name": "Schwab U.S. Dividend Equity ETF",
                "price": 30.65,
                "currency": "USD",
                "dividend_yield": 3.4420880913539973,
                "one_yr_return": 26.6774697153589,
                "ex_div_date": "2026-03-25",
                "last_div_amount": 0.257,
                "last_div_yield": 0.8384991843393148,
                "past_avg_monthly_div": 0.08791666666666668,
                "dividend_frequency": "Quarterly",
                "payment_months": [3, 6, 9, 12],
                "country": "US",
                "is_system_default": True,
            },
            self._get_bnd_seed(),
            self._get_vgit_seed(),
            {
                "symbol": "DIVO",
                "name": "Amplify CWP Enhanced Dividend Income ETF",
                "price": 45.74,
                "currency": "USD",
                "dividend_yield": 6.366418889374725,
                "one_yr_return": 24.93609189270294,
                "ex_div_date": "2026-03-30",
                "last_div_amount": 0.179,
                "last_div_yield": 0.39134236991692173,
                "past_avg_monthly_div": 0.24266666666666661,
                "dividend_frequency": "Monthly",
                "payment_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                "country": "US",
                "is_system_default": True,
            },
            {
                "symbol": "441640.KS",
                "name": "KODEX 미국배당커버드콜액티브",
                "price": 12830,
                "currency": "KRW",
                "dividend_yield": 8.87763055339049,
                "one_yr_return": 25.93699641789597,
                "ex_div_date": "2026-04-14",
                "last_div_amount": 99,
                "last_div_yield": 0.7716289945440374,
                "past_avg_monthly_div": 94.91666666666667,
                "dividend_frequency": "Monthly",
                "payment_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                "country": "KR",
                "is_system_default": True,
            },
        ]

    def _ensure_default_watchlist(self) -> None:
        """앱 시작 시 기본 관심종목을 보장한다."""
        changed = False
        default_watchlist = self._get_default_watchlist_seed_data()
        existing_watchlist = {item.get("symbol"): item for item in self.watchlist}

        for seed in default_watchlist:
            existing = existing_watchlist.get(seed["symbol"])
            if existing is None:
                self.watchlist.append(dict(seed))
                changed = True
            elif not existing.get("is_system_default"):
                existing["is_system_default"] = True
                changed = True

        if changed:
            self.storage.save_json(self.watchlist_file, self.watchlist)

    def _get_default_portfolio_seed_data(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": self.DEFAULT_PENSION_PORTFOLIO_ID,
                "name": "pension-default",
                "account_type": "Pension",
                "total_capital": 10000.0,
                "currency": "USD",
                "is_system_default": True,
                "items": [
                    {
                        "symbol": "SGOV",
                        "name": "iShares 0-3 Month Treasury Bond ETF",
                        "category": "SGOV Buffer",
                        "weight": 15,
                        "price": 100.53,
                        "dividend_yield": 3.9460857455485927,
                        "last_div_amount": 0.293,
                        "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                    },
                    {
                        "symbol": "SCHD",
                        "name": "Schwab U.S. Dividend Equity ETF",
                        "category": "Dividend Growth",
                        "weight": 20,
                        "price": 30.65,
                        "dividend_yield": 3.4420880913539973,
                        "last_div_amount": 0.257,
                        "payment_months": [3, 6, 9, 12],
                    },
                    {
                        "symbol": "VOO",
                        "name": "Vanguard S&P 500 ETF",
                        "category": "Growth Engine",
                        "weight": 25,
                        "price": 643.45,
                        "dividend_yield": 1.1077783821586757,
                        "last_div_amount": 1.872,
                        "payment_months": [3, 6, 9, 12],
                    },
                    {
                        "symbol": "QQQM",
                        "name": "Invesco NASDAQ 100 ETF",
                        "category": "Growth Engine",
                        "weight": 10,
                        "price": 262.48,
                        "dividend_yield": 0.4834654068881439,
                        "last_div_amount": 0.328,
                        "payment_months": [3, 6, 9, 12],
                    },
                    {
                        "symbol": "VGIT",
                        "name": "Vanguard Intermediate-Term Treasury Index Fund ETF Shares",
                        "category": "Bond Buffer",
                        "weight": 30,
                        "price": 59.015,
                        "dividend_yield": 3.8498686774548845,
                        "last_div_amount": 0.187,
                        "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                    },
                ],
                "created_at": "1776331808.613619",
            },
            {
                "id": self.DEFAULT_CORP_PORTFOLIO_ID,
                "name": "corp-default",
                "account_type": "Corporate",
                "total_capital": 10000.0,
                "currency": "USD",
                "is_system_default": True,
                "items": [
                    {
                        "symbol": "SGOV",
                        "name": "iShares 0-3 Month Treasury Bond ETF",
                        "category": "SGOV Buffer",
                        "weight": 22.5,
                        "price": 100.53,
                        "dividend_yield": 3.9460857455485927,
                        "last_div_amount": 0.293,
                        "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                    },
                    {
                        "symbol": "JEPI",
                        "name": "JPMorgan Equity Premium Income ETF",
                        "category": "High Income",
                        "weight": 15,
                        "price": 57.61,
                        "dividend_yield": 8.288491581322688,
                        "last_div_amount": 0.421,
                        "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                    },
                    {
                        "symbol": "JEPQ",
                        "name": "JPMorgan Nasdaq Equity Premium Income ETF",
                        "category": "High Income",
                        "weight": 10,
                        "price": 58.48,
                        "dividend_yield": 10.574555403556772,
                        "last_div_amount": 0.559,
                        "payment_months": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                    },
                    {
                        "symbol": "DIVO",
                        "name": "Amplify CWP Enhanced Dividend Income ETF",
                        "category": "High Income",
                        "weight": 12,
                        "price": 45.74,
                        "dividend_yield": 6.366418889374725,
                        "last_div_amount": 0.179,
                        "payment_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                    },
                    {
                        "symbol": "SCHD",
                        "name": "Schwab U.S. Dividend Equity ETF",
                        "category": "Dividend Growth",
                        "weight": 12,
                        "price": 30.65,
                        "dividend_yield": 3.4420880913539973,
                        "last_div_amount": 0.257,
                        "payment_months": [3, 6, 9, 12],
                    },
                    {
                        "symbol": "VOO",
                        "name": "Vanguard S&P 500 ETF",
                        "category": "Growth Engine",
                        "weight": 16,
                        "price": 643.45,
                        "dividend_yield": 1.1077783821586757,
                        "last_div_amount": 1.872,
                        "payment_months": [3, 6, 9, 12],
                    },
                    {
                        "symbol": "QQQM",
                        "name": "Invesco NASDAQ 100 ETF",
                        "category": "Growth Engine",
                        "weight": 12.5,
                        "price": 262.48,
                        "dividend_yield": 0.4834654068881439,
                        "last_div_amount": 0.328,
                        "payment_months": [3, 6, 9, 12],
                    },
                ],
                "created_at": "1776331808.613619",
            },
        ]

    def _get_default_master_portfolio_seed_data(self) -> Dict[str, Any]:
        return {
            "id": self.DEFAULT_MASTER_PORTFOLIO_ID,
            "name": "strategy-default",
            "corp_id": self.DEFAULT_CORP_PORTFOLIO_ID,
            "pension_id": self.DEFAULT_PENSION_PORTFOLIO_ID,
            "is_active": True,
            "is_system_default": True,
        }

    def _is_system_default_portfolio(self, portfolio: Dict[str, Any]) -> bool:
        return bool(
            portfolio.get("is_system_default")
            or portfolio.get("id")
            in {self.DEFAULT_CORP_PORTFOLIO_ID, self.DEFAULT_PENSION_PORTFOLIO_ID}
        )

    def _is_system_default_master(self, master: Dict[str, Any]) -> bool:
        return bool(
            master.get("is_system_default") or master.get("id") == self.DEFAULT_MASTER_PORTFOLIO_ID
        )

    def _ensure_default_master_bundle(self) -> None:
        """앱 시작 시 기본 master/corp/pension 번들을 보장한다."""
        changed = False
        default_portfolios = self._get_default_portfolio_seed_data()
        existing_portfolios = {portfolio.get("id"): portfolio for portfolio in self.portfolios}
        for seed in default_portfolios:
            existing = existing_portfolios.get(seed["id"])
            if existing is None:
                self.portfolios.append(self._normalize_portfolio_record(seed))
                changed = True
            elif not self._is_system_default_portfolio(existing):
                existing["is_system_default"] = True
                changed = True

        default_master = self._get_default_master_portfolio_seed_data()
        existing_master = next(
            (
                master
                for master in self.master_portfolios
                if master.get("id") == default_master["id"]
            ),
            None,
        )
        if existing_master is None:
            self.master_portfolios.append(dict(default_master))
            changed = True
        else:
            if not self._is_system_default_master(existing_master):
                existing_master["is_system_default"] = True
                changed = True

        if self.master_portfolios and not any(
            master.get("is_active") for master in self.master_portfolios
        ):
            default_existing = next(
                (
                    master
                    for master in self.master_portfolios
                    if master.get("id") == default_master["id"]
                ),
                None,
            )
            if default_existing is not None:
                for master in self.master_portfolios:
                    master["is_active"] = master.get("id") == default_master["id"]
                changed = True

        if changed:
            self.storage.save_json(self.portfolios_file, self.portfolios)
            self.storage.save_json(self.master_portfolios_file, self.master_portfolios)

    def _get_default_strategy_rules(self) -> Dict[str, Any]:
        """stock-plan 기본값 기반 전략 규칙 기본 스키마를 반환합니다."""
        return {
            "rebalance_month": 5,
            "corporate": {
                "sgov_target_months": 30,
                "november_sgov_target_months": 27,
                "bond_floor_months": 12,
                "bond_target_months": 18,
                "bond_upper_months": 24,
            },
            "pension": {
                "sgov_target_months": 24,
                "sgov_floor_months": 12,
                "bond_floor_months": 12,
                "bond_target_months": 18,
                "bond_upper_months": 24,
            },
        }

    def _get_default_distribution_rules(self) -> Dict[str, Any]:
        """분배금 run-rate 성장/Stress 삭감 규칙 기본 스키마를 반환합니다."""
        return {
            "corp": {},
            "pension": {},
        }

    def _get_default_distribution_yield_overrides(self) -> Dict[str, Any]:
        """신규 매수분 run-rate 생성용 구조적 DY override 기본 스키마를 반환합니다."""
        return {
            "corp": {},
            "pension": {},
        }

    def _normalize_strategy_rules(self, section: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """현재 엔진이 실제로 사용하는 strategy_rules만 유지합니다."""
        defaults = self._get_default_strategy_rules()
        source = dict(section or {})
        corporate_source = dict(source.get("corporate") or {})
        pension_source = dict(source.get("pension") or {})
        return {
            "rebalance_month": source.get("rebalance_month", defaults["rebalance_month"]),
            "corporate": {
                "sgov_target_months": corporate_source.get(
                    "sgov_target_months", defaults["corporate"]["sgov_target_months"]
                ),
                "november_sgov_target_months": corporate_source.get(
                    "november_sgov_target_months",
                    corporate_source.get(
                        "sgov_warn_months",
                        defaults["corporate"]["november_sgov_target_months"],
                    ),
                ),
                "bond_floor_months": corporate_source.get(
                    "bond_floor_months", defaults["corporate"]["bond_floor_months"]
                ),
                "bond_target_months": corporate_source.get(
                    "bond_target_months", defaults["corporate"]["bond_target_months"]
                ),
                "bond_upper_months": corporate_source.get(
                    "bond_upper_months", defaults["corporate"]["bond_upper_months"]
                ),
            },
            "pension": {
                "sgov_target_months": pension_source.get(
                    "sgov_target_months",
                    pension_source.get("sgov_min_years", 2) * 12,
                ),
                "sgov_floor_months": pension_source.get(
                    "sgov_floor_months", defaults["pension"]["sgov_floor_months"]
                ),
                "bond_floor_months": pension_source.get(
                    "bond_floor_months", defaults["pension"]["bond_floor_months"]
                ),
                "bond_target_months": pension_source.get(
                    "bond_target_months", defaults["pension"]["bond_target_months"]
                ),
                "bond_upper_months": pension_source.get(
                    "bond_upper_months", defaults["pension"]["bond_upper_months"]
                ),
            },
        }

    def _normalize_distribution_rules(self, section: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """distribution_rules에서 엔진이 이해하는 성장/삭감 규칙만 유지합니다."""
        defaults = self._get_default_distribution_rules()
        source = dict(section or {})
        normalized: Dict[str, Any] = {}

        for account_key in ("corp", "pension"):
            account_rules = source.get(account_key)
            normalized_account: Dict[str, Any] = {}
            if isinstance(account_rules, dict):
                for category, rule_spec in account_rules.items():
                    if not isinstance(rule_spec, dict):
                        continue
                    normalized_rule: Dict[str, float] = {}
                    if rule_spec.get("growth_rate") is not None:
                        normalized_rule["growth_rate"] = float(rule_spec["growth_rate"])
                    if rule_spec.get("stress_cut_rate") is not None:
                        normalized_rule["stress_cut_rate"] = float(rule_spec["stress_cut_rate"])
                    if normalized_rule:
                        normalized_account[str(category)] = normalized_rule
            normalized[account_key] = normalized_account or defaults[account_key]

        return normalized

    def _normalize_distribution_yield_overrides(
        self, section: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """신규 매수분 구조적 DY override를 계정/카테고리별 비율로 정규화합니다."""
        defaults = self._get_default_distribution_yield_overrides()
        source = dict(section or {})
        normalized: Dict[str, Any] = {}

        for account_key in ("corp", "pension"):
            account_overrides = source.get(account_key)
            normalized_account: Dict[str, float] = {}
            if isinstance(account_overrides, dict):
                for category, value in account_overrides.items():
                    if value is None:
                        continue
                    normalized_account[str(category)] = max(0.0, float(value))
            normalized[account_key] = normalized_account or defaults[account_key]

        return normalized

    def _get_default_assumptions(self) -> Dict[str, Any]:
        """사용자 화면에 노출되는 기본 가정 프로필 스키마를 반환합니다."""
        standard_return = self.get_standard_profile_return()
        return {
            "v1": {
                "name": "Standard Profile",
                "expected_return": standard_return,
                "expected_growth": 0.02,
                "inflation_rate": 0.025,
                "master_return": standard_return,
                "master_inflation": 0.025,
            },
            "conservative": {
                "name": "Conservative Profile",
                "expected_return": 0.035,
                "expected_growth": 0.01,
                "inflation_rate": 0.035,
                "master_return": 0.035,
                "master_inflation": 0.035,
            },
        }

    def get_standard_profile_return(self, pa_scenario: Optional[str] = None) -> float:
        """표준 프로필은 현재 활성 마스터 전략의 TR을 기본값으로 사용한다."""
        active_master = self.get_active_master_portfolio()
        if active_master:
            master_calc = self.calculate_master_portfolio_tr(active_master, pa_scenario)
            if master_calc.get("success"):
                combined_tr = cast(Dict[str, Any], master_calc["data"]).get("combined_tr")
                if combined_tr is not None:
                    return float(combined_tr)

        default_master = next(
            (m for m in self.master_portfolios if m.get("id") == self.DEFAULT_MASTER_PORTFOLIO_ID),
            None,
        )
        if default_master:
            master_calc = self.calculate_master_portfolio_tr(default_master, pa_scenario)
            if master_calc.get("success"):
                combined_tr = cast(Dict[str, Any], master_calc["data"]).get("combined_tr")
                if combined_tr is not None:
                    return float(combined_tr)

        return self.DEFAULT_STANDARD_PROFILE_RETURN

    def _get_default_retirement_config(self) -> Dict[str, Any]:
        """은퇴 설정의 기본 초기값을 반환합니다."""
        return {
            "active_assumption_id": "v1",
            "assumptions": self._get_default_assumptions(),
            "strategy_rules": self._get_default_strategy_rules(),
            "distribution_rules": self._get_default_distribution_rules(),
            "distribution_yield_overrides": self._get_default_distribution_yield_overrides(),
            "user_profile": {
                "birth_year": 1972,
                "birth_month": 8,
                "private_pension_start_age": 55,
                "national_pension_start_age": 65,
            },
            "simulation_params": {
                "household_monthly_need": 11000000,
                "target_monthly_cashflow": 11000000,
                "inflation_rate": 0.025,
                "expected_market_growth": 0.0485,
                "simulation_start_year": 2026,
                "simulation_start_month": 1,
                "national_pension_amount": 2000000,
                "simulation_years": 40,
            },
            "corp_params": {
                "initial_investment": 1600000000,
                "capital_stock": 50000000,
                "initial_shareholder_loan": 1550000000,
                "monthly_salary": 2500000,
                "monthly_bookkeeping_fee": 500000,
                "annual_corp_tax_adjustment_fee": 0,
                "employee_count": 1,
            },
            "pension_params": {
                "initial_investment": 600000000,
                "severance_reserve": 0,
                "other_reserve": 0,
                "monthly_withdrawal_target": 2500000,
            },
            "personal_account_params": {
                "initial_investment": 0,
                "initial_cost_basis": 0,
                "monthly_withdrawal_target": 0,
                "external_financial_income": 0,
                "other_comprehensive_tax_base": 0,
                "property_assessed_value": 0,
            },
            "personal_params": {
                "real_estate_price": 620000000,
                "other_assets": 0,
            },
            "tax_and_insurance": {
                "point_unit_price": 211.5,
                "health_insurance_rate": 0.0719,
                "long_term_care_rate": 0.009448,
                "property_basic_deduction": 100000000,
                "corp_tax_threshold": 200000000,
                "corp_tax_nominal_rate": 0.1,
                "corp_tax_low_rate": 0.11,
                "corp_tax_high_rate": 0.22,
                "pension_rate": 0.045,
                "health_rate": 0.035,
                "employment_rate": 0.009,
                "income_tax_estimate_rate": 0.15,
                "us_dividend_foreign_withholding_rate": 0.15,
                "domestic_dividend_tax_rate": 0.154,
                "shareholder_distribution_withholding_rate": 0.154,
                "financial_income_comprehensive_threshold": 20000000,
                "us_capital_gains_tax_rate": 0.22,
                "us_capital_gains_annual_deduction": 2500000,
                "personal_tax_payment_month": 5,
                "health_financial_income_threshold": 10000000,
                "health_income_reflection_month": 11,
                "health_income_reflection_lag_years": 1,
            },
            "trigger_thresholds": {
                "tax_threshold": 200000000,
                "target_buffer_months": 30,
                "high_income_cap_rate": 0.4,
                "market_panic_threshold": -0.2,
                "equity_yield_multiplier": 1.2,
                "debt_yield_multiplier": 0.6,
            },
            "planned_cashflows": [],
        }

    def _sanitize_retirement_assumptions(self) -> None:
        """사용자 노출용 Assumption 프리셋만 유지하고 활성 ID를 정규화합니다."""
        default_assumptions = self._get_default_assumptions()
        current_assumptions = self.retirement_config.get("assumptions", {})
        sanitized_assumptions: Dict[str, Any] = {}

        for assumption_id, default_value in default_assumptions.items():
            current_value = current_assumptions.get(assumption_id, {})
            if not isinstance(current_value, dict):
                current_value = {}
            sanitized_assumptions[assumption_id] = self._deep_merge_dict(
                default_value, current_value
            )

        standard_return = self.get_standard_profile_return()
        sanitized_assumptions["v1"]["expected_return"] = standard_return
        sanitized_assumptions["v1"]["master_return"] = standard_return

        active_assumption_id = self.retirement_config.get("active_assumption_id")
        if active_assumption_id not in sanitized_assumptions:
            active_assumption_id = "v1"

        self.retirement_config["assumptions"] = sanitized_assumptions
        self.retirement_config["active_assumption_id"] = active_assumption_id

    def _deep_merge_dict(self, base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
        """중첩 딕셔너리를 재귀 병합하여 기본값을 보존합니다."""
        merged = dict(base)
        for key, value in updates.items():
            if isinstance(value, dict) and isinstance(merged.get(key), dict):
                merged[key] = self._deep_merge_dict(merged[key], value)
            else:
                merged[key] = value
        return merged

    def _normalize_corporate_cost_fields(self, section: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """기존 monthly_fixed_cost 입력을 신규 운영비 필드로 흡수합니다."""
        normalized = dict(section or {})
        legacy_monthly_fixed_cost = normalized.pop("monthly_fixed_cost", None)

        if normalized.get("monthly_bookkeeping_fee") is None:
            normalized["monthly_bookkeeping_fee"] = float(legacy_monthly_fixed_cost or 0.0)
        if normalized.get("annual_corp_tax_adjustment_fee") is None:
            normalized["annual_corp_tax_adjustment_fee"] = 0.0

        return normalized

    def _normalize_retirement_simulation_fields(
        self, section: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        normalized = dict(section or {})
        household_need = normalized.get("household_monthly_need")
        target_need = normalized.get("target_monthly_cashflow")
        if household_need is None and target_need is not None:
            household_need = target_need
        if household_need is None:
            household_need = 11000000
        target_need = household_need
        normalized["household_monthly_need"] = float(household_need)
        normalized["target_monthly_cashflow"] = float(target_need)
        return normalized

    def _get_annual_corporate_operating_cost(
        self, section: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        normalized = self._normalize_corporate_cost_fields(section)
        monthly_bookkeeping_fee = float(normalized.get("monthly_bookkeeping_fee") or 0.0)
        annual_corp_tax_adjustment_fee = float(
            normalized.get("annual_corp_tax_adjustment_fee") or 0.0
        )
        return {
            "monthly_bookkeeping_fee": monthly_bookkeeping_fee,
            "annual_corp_tax_adjustment_fee": annual_corp_tax_adjustment_fee,
            "annual_operating_cost": (monthly_bookkeeping_fee * 12)
            + annual_corp_tax_adjustment_fee,
        }

    def _ensure_retirement_config_defaults(self) -> None:
        """은퇴 설정에 필요한 기본 스키마를 보강합니다."""
        stored_simulation_params = deepcopy(
            cast(Dict[str, Any], self.retirement_config.get("simulation_params") or {})
        )
        self.retirement_config = self._deep_merge_dict(
            self._get_default_retirement_config(),
            self.retirement_config,
        )
        if stored_simulation_params:
            normalized_stored_params = self._normalize_retirement_simulation_fields(
                stored_simulation_params
            )
            self.retirement_config["simulation_params"] = self._deep_merge_dict(
                cast(Dict[str, Any], self._get_default_retirement_config()["simulation_params"]),
                normalized_stored_params,
            )
        else:
            self.retirement_config["simulation_params"] = (
                self._normalize_retirement_simulation_fields(
                    cast(
                        Optional[Dict[str, Any]],
                        self.retirement_config.get("simulation_params"),
                    )
                )
            )
        self.retirement_config["corp_params"] = self._normalize_corporate_cost_fields(
            cast(Optional[Dict[str, Any]], self.retirement_config.get("corp_params"))
        )
        self.retirement_config["strategy_rules"] = self._normalize_strategy_rules(
            cast(Optional[Dict[str, Any]], self.retirement_config.get("strategy_rules"))
        )
        self.retirement_config["distribution_rules"] = self._normalize_distribution_rules(
            cast(Optional[Dict[str, Any]], self.retirement_config.get("distribution_rules"))
        )
        self.retirement_config["distribution_yield_overrides"] = (
            self._normalize_distribution_yield_overrides(
                cast(
                    Optional[Dict[str, Any]],
                    self.retirement_config.get("distribution_yield_overrides"),
                )
            )
        )
        self._sanitize_retirement_assumptions()
        assumptions = self.retirement_config.get("assumptions", {})
        for assumption in assumptions.values():
            if assumption.get("master_return") is None:
                assumption["master_return"] = assumption.get("expected_return", 0.0485)
            if assumption.get("master_inflation") is None:
                assumption["master_inflation"] = assumption.get("inflation_rate", 0.025)

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

        tax_policy = config.get("tax_and_insurance", {})
        for key in (
            "us_dividend_foreign_withholding_rate",
            "domestic_dividend_tax_rate",
            "us_capital_gains_tax_rate",
        ):
            rate = float(tax_policy.get(key) or 0.0)
            if rate < 0 or rate > 1:
                return f"tax_and_insurance.{key}는 0과 1 사이여야 합니다."
        for key in (
            "financial_income_comprehensive_threshold",
            "us_capital_gains_annual_deduction",
            "health_financial_income_threshold",
        ):
            if float(tax_policy.get(key) or 0.0) < 0:
                return f"tax_and_insurance.{key}은(는) 음수일 수 없습니다."
        for key in ("personal_tax_payment_month", "health_income_reflection_month"):
            month = int(tax_policy.get(key) or 0)
            if month < 1 or month > 12:
                return f"tax_and_insurance.{key}은(는) 1~12월이어야 합니다."

        return None

    def _get_default_cost_comparison_config(self) -> Dict[str, Any]:
        default_pa = float(self.settings.get("price_appreciation_rate", 3.0))
        default_corp_tax_rate = float(
            cast(Dict[str, Any], self.retirement_config.get("tax_and_insurance", {})).get(
                "corp_tax_nominal_rate", 0.1
            )
        )
        return {
            "master_portfolio_id": None,
            "simulation_mode": "asset",
            "household": {"members": []},
            "personal_assets": {
                "investment_assets": 0.0,
                "personal_pension_assets": 0.0,
            },
            "real_estate": {
                "official_price": 0.0,
                "ownership_ratio": 1.0,
            },
            "assumptions": {
                "pa_scenario": self._normalize_pa_scenario(
                    self.settings.get("default_pa_scenario")
                ),
                "price_appreciation_rate": default_pa,
                "simulation_years": 10,
                "target_monthly_household_cash_after_tax": 10000000.0,
                "personal_capital_gains_tax_rate": 0.22,
                "personal_capital_gains_deduction": 2500000.0,
            },
            "corporate": {
                "salary_recipients": [],
                "monthly_bookkeeping_fee": 0.0,
                "annual_corp_tax_adjustment_fee": 0.0,
                "corp_tax_nominal_rate": default_corp_tax_rate,
                "initial_shareholder_loan": 0.0,
                "annual_shareholder_loan_repayment": 0.0,
            },
            "policy_meta": {
                "base_year": 2026,
            },
        }

    def _normalize_cost_comparison_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """비교 시뮬레이터 설정의 레거시 필드 위치를 정규화합니다."""
        normalized = deepcopy(config)
        assumptions = cast(Dict[str, Any], normalized.get("assumptions", {}))
        assumptions.pop("annual_rebalance_sale_ratio", None)
        if "simulation_mode" not in normalized and assumptions.get("simulation_mode"):
            normalized["simulation_mode"] = assumptions.get("simulation_mode")
        assumptions.pop("simulation_mode", None)
        assumptions["pa_scenario"] = self._normalize_pa_scenario(assumptions.get("pa_scenario"))
        normalized["assumptions"] = assumptions
        normalized["corporate"] = self._normalize_corporate_cost_fields(
            cast(Optional[Dict[str, Any]], normalized.get("corporate"))
        )
        return normalized

    def _ensure_cost_comparison_config_defaults(self) -> None:
        self.cost_comparison_config = self._deep_merge_dict(
            self._get_default_cost_comparison_config(),
            self._normalize_cost_comparison_config(self.cost_comparison_config),
        )

    def _validate_cost_comparison_config(self, config: Dict[str, Any]) -> Optional[str]:
        if config.get("simulation_mode") not in {"target", "asset"}:
            return "simulation_mode는 target 또는 asset 이어야 합니다."

        if config.get("master_portfolio_id") is not None and not isinstance(
            config.get("master_portfolio_id"), str
        ):
            return "master_portfolio_id는 문자열 또는 null 이어야 합니다."

        corporate = cast(Dict[str, Any], config.get("corporate", {}))
        monthly_bookkeeping_fee = float(corporate.get("monthly_bookkeeping_fee") or 0.0)
        annual_corp_tax_adjustment_fee = float(
            corporate.get("annual_corp_tax_adjustment_fee") or 0.0
        )
        if monthly_bookkeeping_fee < 0:
            return "corporate.monthly_bookkeeping_fee는 음수일 수 없습니다."
        if annual_corp_tax_adjustment_fee < 0:
            return "corporate.annual_corp_tax_adjustment_fee는 음수일 수 없습니다."
        corp_tax_nominal_rate = float(corporate.get("corp_tax_nominal_rate") or 0.0)
        if corp_tax_nominal_rate not in {0.10, 0.20, 0.22, 0.25}:
            return "corporate.corp_tax_nominal_rate는 10%, 20%, 22%, 25% 중 하나여야 합니다."

        salary_recipients = cast(List[Dict[str, Any]], corporate.get("salary_recipients", []))
        if len(salary_recipients) > 4:
            return "corporate.salary_recipients는 최대 4명까지만 설정할 수 있습니다."

        for recipient in salary_recipients:
            if float(recipient.get("monthly_salary") or 0.0) < 0:
                return "corporate.salary_recipients.monthly_salary는 음수일 수 없습니다."

        assumptions = cast(Dict[str, Any], config.get("assumptions", {}))
        if int(assumptions.get("simulation_years") or 0) <= 0:
            return "assumptions.simulation_years는 1 이상이어야 합니다."

        if float(assumptions.get("price_appreciation_rate") or 0.0) < 0:
            return "assumptions.price_appreciation_rate는 음수일 수 없습니다."
        if assumptions.get("pa_scenario") not in PA_SCENARIO_KEYS:
            return "assumptions.pa_scenario는 conservative, base, optimistic 중 하나여야 합니다."
        capital_gains_tax_rate = float(assumptions.get("personal_capital_gains_tax_rate") or 0.0)
        capital_gains_deduction = float(assumptions.get("personal_capital_gains_deduction") or 0.0)
        if capital_gains_tax_rate < 0 or capital_gains_tax_rate > 1:
            return "assumptions.personal_capital_gains_tax_rate는 0과 1 사이여야 합니다."
        if capital_gains_deduction < 0:
            return "assumptions.personal_capital_gains_deduction은 음수일 수 없습니다."

        if float(assumptions.get("target_monthly_household_cash_after_tax") or 0.0) <= 0:
            return "assumptions.target_monthly_household_cash_after_tax는 0보다 커야 합니다."

        real_estate = cast(Dict[str, Any], config.get("real_estate", {}))
        ownership_ratio = float(real_estate.get("ownership_ratio") or 0.0)
        if ownership_ratio < 0 or ownership_ratio > 1:
            return "real_estate.ownership_ratio는 0과 1 사이여야 합니다."

        return None

    def get_cost_comparison_config(self) -> Dict[str, Any]:
        self._ensure_cost_comparison_config_defaults()
        return cast(Dict[str, Any], self.cost_comparison_config)

    def update_cost_comparison_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_cost_comparison_config_defaults()
        candidate_config = self._deep_merge_dict(
            self.cost_comparison_config, self._normalize_cost_comparison_config(new_config)
        )
        validation_error = self._validate_cost_comparison_config(candidate_config)
        if validation_error:
            return {
                "success": False,
                "message": validation_error,
                "data": self.cost_comparison_config,
            }

        self.cost_comparison_config = candidate_config
        self.storage.save_json(self.cost_comparison_config_file, self.cost_comparison_config)
        return {
            "success": True,
            "message": "비교 시뮬레이터 설정이 저장되었습니다.",
            "data": self.cost_comparison_config,
        }

    def get_master_portfolio_by_id(self, m_id: Optional[str]) -> Optional[Dict[str, Any]]:
        """ID로 마스터 전략을 조회합니다."""
        self._ensure_seeded_defaults_if_enabled()
        if not m_id:
            return None
        return next((m for m in self.master_portfolios if m.get("id") == m_id), None)

    def _resolve_cost_comparison_master_portfolio(self, config: Dict[str, Any]) -> Dict[str, Any]:
        requested_master_id = config.get("master_portfolio_id")
        if requested_master_id:
            selected_master = self.get_master_portfolio_by_id(cast(str, requested_master_id))
            if not selected_master:
                return {
                    "success": False,
                    "message": (
                        "저장된 비용 비교 기준 master portfolio를 찾을 수 없습니다. "
                        "선택한 전략이 삭제되었는지 확인해 주세요."
                    ),
                }
            return {"success": True, "data": selected_master}

        active_master = self.get_active_master_portfolio()
        if not active_master:
            return {
                "success": False,
                "message": "활성 master portfolio가 없어 비교 시뮬레이션을 실행할 수 없습니다.",
            }
        return {"success": True, "data": active_master}

    def _build_cost_comparison_assumptions(self, config: Dict[str, Any]) -> Dict[str, Any]:
        master_result = self._resolve_cost_comparison_master_portfolio(config)
        if not master_result.get("success"):
            return cast(Dict[str, Any], master_result)

        selected_master = cast(Dict[str, Any], master_result["data"])
        pa_scenario = self._normalize_pa_scenario(
            cast(Dict[str, Any], config.get("assumptions", {})).get("pa_scenario")
        )
        master_calc = self.calculate_master_portfolio_tr(selected_master, pa_scenario)
        if not master_calc.get("success"):
            return cast(Dict[str, Any], master_calc)

        calc_data = cast(Dict[str, Any], master_calc["data"])
        corp_portfolio = cast(Optional[Dict[str, Any]], calc_data.get("corp_portfolio"))
        pension_portfolio = cast(Optional[Dict[str, Any]], calc_data.get("pension_portfolio"))
        dy = float(calc_data.get("combined_yield") or 0.0)
        tr = float(calc_data.get("combined_tr") or 0.0)
        pa = tr - dy

        return {
            "success": True,
            "data": {
                "master_portfolio_id": selected_master.get("id"),
                "master_portfolio_name": selected_master.get("name", "Active Master"),
                "portfolio_name": selected_master.get("name", "Active Master"),
                "corporate_portfolio_name": (
                    corp_portfolio.get("name", "-") if corp_portfolio else "-"
                ),
                "pension_portfolio_name": (
                    pension_portfolio.get("name", "-") if pension_portfolio else "-"
                ),
                "dy": dy,
                "pa": pa,
                "tr": tr,
                "pa_scenario": pa_scenario,
                "simulation_years": int(
                    cast(Dict[str, Any], config.get("assumptions", {})).get("simulation_years", 10)
                ),
                "target_monthly_household_cash_after_tax": float(
                    cast(Dict[str, Any], config.get("assumptions", {})).get(
                        "target_monthly_household_cash_after_tax", 10000000.0
                    )
                ),
                "personal_capital_gains_tax_rate": float(
                    cast(Dict[str, Any], config.get("assumptions", {})).get(
                        "personal_capital_gains_tax_rate", 0.22
                    )
                ),
                "personal_capital_gains_deduction": float(
                    cast(Dict[str, Any], config.get("assumptions", {})).get(
                        "personal_capital_gains_deduction", 2500000.0
                    )
                ),
                "base_year": int(
                    cast(Dict[str, Any], config.get("policy_meta", {})).get("base_year", 2026)
                ),
                "simulation_mode": config.get("simulation_mode", "asset"),
                "_corp_stats": calc_data.get("corp_stats", {}),
                "_pension_stats": calc_data.get("pension_stats", {}),
            },
        }

    def _build_actual_rebalance_schedule(
        self,
        tax_engine: TaxEngine,
        assumptions: Dict[str, Any],
        config: Dict[str, Any],
        account: str,
    ) -> Dict[int, Dict[str, float]]:
        """ProjectionEngine의 실제 category 이동을 연도별 매도 합계로 변환합니다."""
        personal_assets = cast(Dict[str, Any], config.get("personal_assets", {}))
        initial_balance = float(personal_assets.get("investment_assets") or 0.0)
        if initial_balance <= 0:
            return {}

        target_monthly_cash = float(
            assumptions.get("target_monthly_household_cash_after_tax") or 0.0
        )
        strategy_rules = cast(Dict[str, Any], self.retirement_config.get("strategy_rules", {}))
        pension_rules = cast(Dict[str, Any], strategy_rules.get("pension", {}))
        corp_rules = cast(Dict[str, Any], strategy_rules.get("corporate", {}))
        stats = (
            cast(Dict[str, Any], assumptions.get("_corp_stats", {}))
            if account == "corp"
            else cast(
                Dict[str, Any],
                assumptions.get("_pension_stats") or assumptions.get("_corp_stats") or {},
            )
        )
        appreciation_rates = {
            key: value / 100.0
            for key, value in self.get_appreciation_rates_for_scenario(
                cast(Optional[str], assumptions.get("pa_scenario"))
            ).items()
        }
        params = {
            "simulation_years": int(assumptions["simulation_years"]),
            "simulation_start_year": int(assumptions.get("base_year", 2026)),
            "simulation_start_month": 1,
            "birth_year": 1970,
            "birth_month": 1,
            "private_pension_start_age": 0,
            "national_pension_start_age": 200,
            "household_monthly_need": target_monthly_cash if account == "corp" else 0.0,
            "target_monthly_cashflow": target_monthly_cash,
            "pension_withdrawal_target": target_monthly_cash if account == "personal" else 0.0,
            "national_pension_amount": 0.0,
            "initial_shareholder_loan": initial_balance if account == "corp" else 0.0,
            "corp_salary": 0.0,
            "monthly_bookkeeping_fee": 0.0,
            "annual_corp_tax_adjustment_fee": 0.0,
            "employee_count": 0,
            "portfolio_stats": {
                "corp": stats if account == "corp" else {},
                "pension": stats if account == "personal" else {},
            },
            "category_return_rates": {
                "corp": stats.get("category_return_rates", {}) if account == "corp" else {},
                "pension": (
                    stats.get("category_return_rates", {}) if account == "personal" else {}
                ),
            },
            "appreciation_rates": appreciation_rates,
            "rebalance_month": strategy_rules.get("rebalance_month", 5),
            "sgov_target_months": corp_rules.get("sgov_target_months", 30),
            "corp_november_sgov_target_months": corp_rules.get("november_sgov_target_months", 27),
            "corp_bond_floor_months": corp_rules.get("bond_floor_months", 12),
            "corp_bond_target_months": corp_rules.get("bond_target_months", 18),
            "corp_bond_upper_months": corp_rules.get("bond_upper_months", 24),
            "pension_sgov_target_months": pension_rules.get("sgov_target_months", 24),
            "pension_sgov_floor_months": pension_rules.get("sgov_floor_months", 12),
            "pension_bond_floor_months": pension_rules.get("bond_floor_months", 12),
            "pension_bond_target_months": pension_rules.get("bond_target_months", 18),
            "pension_bond_upper_months": pension_rules.get("bond_upper_months", 24),
        }
        initial_assets = {
            "corp": initial_balance if account == "corp" else 0.0,
            "pension": initial_balance if account == "personal" else 0.0,
        }
        projection = ProjectionEngine(tax_engine).run_30yr_simulation(initial_assets, params)
        engine_account = "corp" if account == "corp" else "pension"
        schedule: Dict[int, Dict[str, float]] = {}
        for event in projection.get("trade_events", []):
            if event.get("account") != engine_account:
                continue
            year_index = int(event["year"]) - int(assumptions.get("base_year", 2026)) + 1
            annual = schedule.setdefault(
                year_index,
                {"sale_proceeds": 0.0, "cost_basis_sold": 0.0, "realized_gain": 0.0},
            )
            annual["sale_proceeds"] += float(event["sale_proceeds"])
            annual["cost_basis_sold"] += float(event["cost_basis_sold"])
            annual["realized_gain"] += float(event["realized_gain"])
        return schedule

    def _calculate_rebalance_income(
        self,
        asset_value: float,
        cost_basis: float,
        dy: float,
        pa: float,
        sale_proceeds: float = 0.0,
    ) -> Dict[str, float]:
        """배당, 평가이익과 리밸런싱 매도분의 실현손익을 분리합니다."""
        opening_asset = max(0.0, asset_value)
        opening_basis = max(0.0, cost_basis)
        dividend_income = opening_asset * max(0.0, dy)
        appreciation = opening_asset * pa
        market_value = max(0.0, opening_asset + appreciation)
        sale_proceeds = min(market_value, max(0.0, sale_proceeds))
        sold_fraction = sale_proceeds / market_value if market_value > 0 else 0.0
        basis_sold = opening_basis * sold_fraction
        realized_gain = sale_proceeds - basis_sold
        ending_basis_before_income = opening_basis - basis_sold + sale_proceeds
        return {
            "dividend_income": dividend_income,
            "unrealized_appreciation": (market_value - sale_proceeds)
            - (opening_basis - basis_sold),
            "realized_capital_gain": realized_gain,
            "rebalance_sale_proceeds": sale_proceeds,
            "cost_basis_sold": basis_sold,
            "market_value_after_appreciation": market_value,
            "ending_cost_basis_before_income": ending_basis_before_income,
        }

    def _calculate_personal_investment_year(
        self,
        tax_engine: TaxEngine,
        asset_value: float,
        cost_basis: float,
        property_value: float,
        assumptions: Dict[str, Any],
        sale_proceeds: float = 0.0,
    ) -> Dict[str, Any]:
        income = self._calculate_rebalance_income(
            asset_value,
            cost_basis,
            float(assumptions["dy"]),
            float(assumptions["pa"]),
            sale_proceeds,
        )
        dividend_income = income["dividend_income"]
        if dividend_income <= 20000000:
            dividend_tax = dividend_income * 0.154
            tax_rate = 0.154
        else:
            dividend_tax = (20000000 * 0.154) + ((dividend_income - 20000000) * 0.264)
            tax_rate = 0.264
        taxable_gain = max(
            0.0,
            income["realized_capital_gain"]
            - float(assumptions.get("personal_capital_gains_deduction", 2500000.0)),
        )
        capital_gains_tax = taxable_gain * float(
            assumptions.get("personal_capital_gains_tax_rate", 0.22)
        )
        health = tax_engine.calculate_local_health_insurance_detailed(
            property_value, dividend_income
        )
        annual_health = health["total_premium"] * 12
        net_cash = dividend_income - dividend_tax - capital_gains_tax - annual_health
        ending_asset = max(0.0, income["market_value_after_appreciation"] + net_cash)
        ending_basis = min(
            ending_asset,
            income["ending_cost_basis_before_income"] + max(0.0, net_cash),
        )
        income.update(
            {
                "health_insurance_income": dividend_income,
                "dividend_tax": dividend_tax,
                "capital_gains_tax": capital_gains_tax,
            }
        )
        return {
            "ending_asset": ending_asset,
            "ending_cost_basis": ending_basis,
            "net_cash": net_cash,
            "total_tax": dividend_tax + capital_gains_tax,
            "annual_health": annual_health,
            "audit_details": {
                "health": health,
                "tax": {"tax_rate": tax_rate, "is_comprehensive": dividend_income > 20000000},
                "investment_income": income,
            },
        }

    def _solve_personal_required_assets(
        self,
        tax_engine: TaxEngine,
        annual_target_cash: float,
        property_value: float,
        assumptions: Dict[str, Any],
    ) -> Dict[str, Any]:
        low = 0.0
        dy = max(float(assumptions["dy"]), 0.001)
        high = max(annual_target_cash / dy * 2, 1000000.0)
        result = self._calculate_personal_investment_year(
            tax_engine, high, high, property_value, assumptions
        )
        while result["net_cash"] < annual_target_cash and high < 1e15:
            high *= 2
            result = self._calculate_personal_investment_year(
                tax_engine, high, high, property_value, assumptions
            )
        if result["net_cash"] < annual_target_cash:
            return {"required_assets": float("inf"), "result": result}
        for _ in range(80):
            mid = (low + high) / 2
            result = self._calculate_personal_investment_year(
                tax_engine, mid, mid, property_value, assumptions
            )
            if result["net_cash"] >= annual_target_cash:
                high = mid
            else:
                low = mid
        return {
            "required_assets": high,
            "result": self._calculate_personal_investment_year(
                tax_engine, high, high, property_value, assumptions
            ),
        }

    def _calculate_corporate_investment_year(
        self,
        tax_engine: TaxEngine,
        asset_value: float,
        cost_basis: float,
        assumptions: Dict[str, Any],
        gross_salary: float,
        fixed_cost: float,
        company_insurance: float,
        sale_proceeds: float = 0.0,
    ) -> Dict[str, Any]:
        income = self._calculate_rebalance_income(
            asset_value,
            cost_basis,
            float(assumptions["dy"]),
            float(assumptions["pa"]),
            sale_proceeds,
        )
        taxable_income = income["dividend_income"] + income["realized_capital_gain"]
        tax_base = max(
            0.0,
            taxable_income - gross_salary - fixed_cost - company_insurance,
        )
        corp_tax = tax_engine.calculate_corp_tax(tax_base)
        net_cash = (
            income["dividend_income"] - gross_salary - fixed_cost - company_insurance - corp_tax
        )
        ending_asset = max(0.0, income["market_value_after_appreciation"] + net_cash)
        ending_basis = max(
            0.0,
            min(
                ending_asset,
                income["ending_cost_basis_before_income"] + max(0.0, net_cash),
            ),
        )
        income.update({"health_insurance_income": 0.0, "capital_gains_tax": corp_tax})
        return {
            "investment_income": income,
            "tax_base": tax_base,
            "corp_tax": corp_tax,
            "net_cash": net_cash,
            "ending_asset": ending_asset,
            "ending_cost_basis": ending_basis,
        }

    def _solve_corporate_required_tax_base(
        self, tax_engine: TaxEngine, required_post_tax_profit: float
    ) -> float:
        low = 0.0
        high = max(required_post_tax_profit * 2, 1000000.0)

        def post_tax_profit(tax_base: float) -> float:
            return tax_base - tax_engine.calculate_corp_tax(tax_base)

        while post_tax_profit(high) < required_post_tax_profit:
            high *= 2

        for _ in range(80):
            mid = (low + high) / 2
            if post_tax_profit(mid) >= required_post_tax_profit:
                high = mid
            else:
                low = mid

        return high

    def _build_sustainability_summary(self, series: List[Dict[str, Any]]) -> Dict[str, Any]:
        years_fully_funded = 0
        for point in series:
            if bool(point.get("target_met", False)):
                years_fully_funded += 1
            else:
                break
        return {
            "years_fully_funded": years_fully_funded,
            "final_asset_balance": float(series[-1]["asset_balance"]) if series else 0.0,
        }

    def _simulate_personal_asset_driven_scenario(
        self,
        tax_engine: TaxEngine,
        assumptions: Dict[str, Any],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """[REQ-CCS-95] 보유 자산 중심(Asset-driven) 개인운용 시나리오"""
        personal_assets = cast(Dict[str, Any], config.get("personal_assets", {}))
        real_estate = cast(Dict[str, Any], config.get("real_estate", {}))
        current_assets = float(personal_assets.get("investment_assets") or 0.0)
        property_value = float(real_estate.get("official_price") or 0.0) * float(
            real_estate.get("ownership_ratio") or 0.0
        )
        tr = float(assumptions["tr"])
        simulation_years = int(assumptions["simulation_years"])
        sale_schedule = self._build_actual_rebalance_schedule(
            tax_engine, assumptions, config, "personal"
        )

        # 현재 자산 기반 순방향 계산 (1년차 집중)
        annual_revenue = current_assets * tr
        result = self._calculate_personal_investment_year(
            tax_engine,
            current_assets,
            current_assets,
            property_value,
            assumptions,
            sale_schedule.get(1, {}).get("sale_proceeds", 0.0),
        )

        annual_net_cash = float(result["net_cash"])
        income_tax = float(result["total_tax"])
        annual_health = float(result["annual_health"])

        # 시계열 (복리 반영 30년 등)
        series: List[Dict[str, Any]] = []
        sustainability_series: List[Dict[str, Any]] = []
        asset_base = current_assets
        cost_basis = current_assets
        cumulative_net_cashflow = 0.0
        target_monthly_cash = float(assumptions.get("target_monthly_household_cash_after_tax", 0))
        target_annual_cash = target_monthly_cash * 12

        for year in range(1, simulation_years + 1):
            year_result = self._calculate_personal_investment_year(
                tax_engine,
                asset_base,
                cost_basis,
                property_value,
                assumptions,
                sale_schedule.get(year, {}).get("sale_proceeds", 0.0),
            )
            year_net_cash = float(year_result["net_cash"])
            cumulative_net_cashflow += year_net_cash
            asset_base = float(year_result["ending_asset"])
            cost_basis = float(year_result["ending_cost_basis"])

            series.append(
                {
                    "year": year,
                    "net_worth": asset_base,
                    "disposable_cash": year_net_cash,
                    "cumulative_household_cash": 0.0,
                    "total_economic_value": asset_base,
                }
            )
            sustainability_series.append(
                {
                    "year": year,
                    "asset_balance": asset_base,
                    "household_cash": year_net_cash,
                    "cumulative_household_cash": 0.0,
                    "target_met": year_net_cash >= (target_annual_cash - 1.0),
                }
            )

        return {
            "kpis": {
                "monthly_disposable_cashflow": annual_net_cash / 12,
                "annual_net_cashflow": annual_net_cash,
                "cumulative_net_cashflow": cumulative_net_cashflow,
                "annual_total_cost": income_tax + annual_health,
                "annual_health_insurance": annual_health,
                "after_tax_net_growth": float(result["ending_asset"]) - current_assets,
                "required_annual_revenue": annual_revenue,
                "required_assets": current_assets,
                "net_yield": (annual_net_cash / current_assets * 100) if current_assets > 0 else 0,
            },
            "breakdown": {
                "annual_revenue": annual_revenue,
                "tax": income_tax,
                "health_insurance": annual_health,
                "social_insurance": 0.0,
                "fixed_cost": 0.0,
                "payroll_tax_withholding": 0.0,
                "shareholder_loan_repayment": 0.0,
                "retained_earnings": 0.0,
                "net_corporate_cash": annual_net_cash,
                "net_salary": 0.0,
                "target_household_cash": annual_net_cash,
                "audit_details": result["audit_details"],
            },
            "series": series,
            "sustainability_series": sustainability_series,
            "sustainability": self._build_sustainability_summary(sustainability_series),
        }

    def _simulate_personal_cost_scenario(
        self,
        tax_engine: TaxEngine,
        assumptions: Dict[str, Any],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        personal_assets = cast(Dict[str, Any], config.get("personal_assets", {}))
        real_estate = cast(Dict[str, Any], config.get("real_estate", {}))
        current_assets = float(personal_assets.get("investment_assets") or 0.0)
        property_value = float(real_estate.get("official_price") or 0.0) * float(
            real_estate.get("ownership_ratio") or 0.0
        )
        tr = float(assumptions["tr"])
        simulation_years = int(assumptions["simulation_years"])
        annual_target_cash = float(assumptions["target_monthly_household_cash_after_tax"]) * 12
        required_solution = self._solve_personal_required_assets(
            tax_engine, annual_target_cash, property_value, assumptions
        )
        required_assets = float(required_solution["required_assets"])
        required = cast(Dict[str, Any], required_solution["result"])
        annual_revenue = required_assets * tr
        income_tax = float(required["total_tax"])
        annual_health = float(required["annual_health"])
        asset_margin = current_assets - required_assets
        series: List[Dict[str, Any]] = []
        sustainability_series: List[Dict[str, Any]] = []
        cumulative_household_cash = 0.0
        cumulative_net_cashflow = 0.0
        asset_base = current_assets
        cost_basis = current_assets
        for year in range(1, simulation_years + 1):
            annual_result = self._calculate_personal_investment_year(
                tax_engine, asset_base, cost_basis, property_value, assumptions
            )
            available_cash = max(0.0, float(annual_result["net_cash"]))
            actual_cash = min(annual_target_cash, available_cash)
            asset_base = max(0.0, float(annual_result["ending_asset"]) - actual_cash)
            cost_basis = max(
                0.0,
                min(
                    asset_base,
                    float(annual_result["ending_cost_basis"]) - actual_cash,
                ),
            )
            cumulative_household_cash += actual_cash
            cumulative_net_cashflow += actual_cash
            series.append(
                {
                    "year": year,
                    "net_worth": asset_base,
                    "disposable_cash": actual_cash,
                    "cumulative_household_cash": cumulative_household_cash,
                    "total_economic_value": asset_base + cumulative_household_cash,
                }
            )
            sustainability_series.append(
                {
                    "year": year,
                    "asset_balance": asset_base,
                    "household_cash": actual_cash,
                    "cumulative_household_cash": cumulative_household_cash,
                    "target_met": actual_cash >= annual_target_cash - 1.0,
                }
            )

        return {
            "kpis": {
                "monthly_disposable_cashflow": annual_target_cash / 12,
                "annual_net_cashflow": annual_target_cash,
                "cumulative_net_cashflow": cumulative_net_cashflow,
                "annual_total_cost": income_tax + annual_health,
                "annual_health_insurance": annual_health,
                "after_tax_net_growth": asset_margin,
                "required_annual_revenue": annual_revenue,
                "required_assets": required_assets,
                "asset_margin_vs_current": asset_margin,
                "achieves_target_with_current_assets": asset_margin >= 0,
            },
            "breakdown": {
                "annual_revenue": annual_revenue,
                "tax": income_tax,
                "health_insurance": annual_health,
                "social_insurance": 0.0,
                "fixed_cost": 0.0,
                "payroll_tax_withholding": 0.0,
                "shareholder_loan_repayment": 0.0,
                "retained_earnings": 0.0,
                "net_corporate_cash": annual_target_cash,
                "net_salary": 0.0,
                "target_household_cash": annual_target_cash,
                "audit_details": required["audit_details"],
            },
            "series": series,
            "sustainability_series": sustainability_series,
            "sustainability": self._build_sustainability_summary(sustainability_series),
        }

    def _simulate_corporate_asset_driven_scenario(
        self,
        tax_engine: TaxEngine,
        assumptions: Dict[str, Any],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """[REQ-CCS-95] 보유 자산 중심(Asset-driven) 법인운용 시나리오"""
        personal_assets = cast(Dict[str, Any], config.get("personal_assets", {}))
        corporate = cast(Dict[str, Any], config.get("corporate", {}))
        salary_recipients = cast(List[Dict[str, Any]], corporate.get("salary_recipients", []))
        current_assets = float(personal_assets.get("investment_assets") or 0.0)
        tr = float(assumptions["tr"])
        dy = float(assumptions["dy"])
        pa = float(assumptions["pa"])
        simulation_years = int(assumptions["simulation_years"])
        sale_schedule = self._build_actual_rebalance_schedule(
            tax_engine, assumptions, config, "corp"
        )
        operating_costs = self._get_annual_corporate_operating_cost(corporate)
        monthly_bookkeeping_fee = operating_costs["monthly_bookkeeping_fee"]
        annual_corp_tax_adjustment_fee = operating_costs["annual_corp_tax_adjustment_fee"]
        fixed_cost_annual = operating_costs["annual_operating_cost"]
        # 고정비 및 급여 기반 비용 산출
        company_health_total = 0.0
        employee_health_total = 0.0
        total_social_insurance = 0.0
        total_net_salary = 0.0
        total_gross_salary = 0.0
        payroll_tax = 0.0

        for s in salary_recipients:
            sal = float(s.get("monthly_salary") or 0.0)
            if sal <= 0:
                continue
            res = tax_engine.calculate_income_tax(sal)
            total_net_salary += float(res["net_salary"]) * 12
            total_gross_salary += sal * 12
            payroll_tax += float(res["income_tax"]) * 12

            # 회사분 4대보험
            c_rate = tax_engine.pension_rate + tax_engine.health_rate + tax_engine.employment_rate
            company_health_total += (sal * tax_engine.health_rate) * 12
            employee_health_total += float(res["health"]) * 12
            total_social_insurance += (
                (sal * c_rate) * 12 + float(res["deductions"]) * 12 - float(res["income_tax"]) * 12
            )

        # 1년차 계산
        annual_revenue = current_assets * tr
        investment_income = self._calculate_rebalance_income(
            current_assets,
            current_assets,
            dy,
            pa,
            sale_schedule.get(1, {}).get("sale_proceeds", 0.0),
        )
        company_social_insurance = total_gross_salary * (
            tax_engine.pension_rate + tax_engine.health_rate + tax_engine.employment_rate
        )

        taxable_investment_income = (
            investment_income["dividend_income"] + investment_income["realized_capital_gain"]
        )
        tax_base = max(
            0.0,
            taxable_investment_income
            - total_gross_salary
            - fixed_cost_annual
            - company_social_insurance,
        )
        corp_tax = tax_engine.calculate_corp_tax(tax_base)
        net_profit = (
            investment_income["dividend_income"]
            - total_gross_salary
            - fixed_cost_annual
            - company_social_insurance
            - corp_tax
        )

        retained_earnings = (
            investment_income["unrealized_appreciation"]
            + investment_income["realized_capital_gain"]
            + net_profit
        )
        achievable_household_cash = total_net_salary + net_profit

        # 시계열 및 복리
        series = []
        sustainability_series = []
        asset_base = current_assets
        cost_basis = current_assets
        cumulative_cash = 0.0
        cumulative_net_cashflow = 0.0
        target_monthly_cash = float(assumptions.get("target_monthly_household_cash_after_tax", 0))
        target_annual_cash = target_monthly_cash * 12

        for year in range(1, simulation_years + 1):
            y_income = self._calculate_rebalance_income(
                asset_base,
                cost_basis,
                dy,
                pa,
                sale_schedule.get(year, {}).get("sale_proceeds", 0.0),
            )
            y_taxable_income = y_income["dividend_income"] + y_income["realized_capital_gain"]
            y_tax_base = max(
                0.0,
                y_taxable_income
                - total_gross_salary
                - fixed_cost_annual
                - company_social_insurance,
            )
            y_corp_tax = tax_engine.calculate_corp_tax(y_tax_base)
            y_net_profit = (
                y_income["dividend_income"]
                - total_gross_salary
                - fixed_cost_annual
                - company_social_insurance
                - y_corp_tax
            )
            asset_base = max(0.0, y_income["market_value_after_appreciation"] + y_net_profit)
            cost_basis = min(
                asset_base,
                y_income["ending_cost_basis_before_income"] + max(0.0, y_net_profit),
            )
            year_cash = total_net_salary + y_net_profit
            cumulative_cash += year_cash
            cumulative_net_cashflow += year_cash

            series.append(
                {
                    "year": year,
                    "net_worth": asset_base,
                    "disposable_cash": year_cash,
                    "cumulative_household_cash": cumulative_cash,
                    "total_economic_value": asset_base,
                }
            )
            sustainability_series.append(
                {
                    "year": year,
                    "asset_balance": asset_base,
                    "household_cash": year_cash,
                    "cumulative_household_cash": cumulative_cash,
                    "target_met": year_cash >= (target_annual_cash - 1.0),
                }
            )

        return {
            "kpis": {
                "monthly_disposable_cashflow": achievable_household_cash / 12,
                "annual_net_cashflow": achievable_household_cash,
                "cumulative_net_cashflow": cumulative_net_cashflow,
                "annual_total_cost": corp_tax
                + (total_social_insurance)
                + fixed_cost_annual
                + payroll_tax,
                "annual_health_insurance": (company_health_total + employee_health_total)
                * (1 + tax_engine.ltc_rate),
                "after_tax_net_growth": retained_earnings,
                "required_annual_revenue": annual_revenue,
                "required_assets": current_assets,
                "net_yield": (
                    (achievable_household_cash / current_assets * 100) if current_assets > 0 else 0
                ),
            },
            "breakdown": {
                "annual_revenue": annual_revenue,
                "tax": corp_tax,
                "health_insurance": (company_health_total + employee_health_total)
                * (1 + tax_engine.ltc_rate),
                "social_insurance": total_social_insurance,
                "fixed_cost": fixed_cost_annual,
                "monthly_bookkeeping_fee": monthly_bookkeeping_fee,
                "annual_corp_tax_adjustment_fee": annual_corp_tax_adjustment_fee,
                "gross_salary": total_gross_salary,
                "company_insurance_cost": company_social_insurance,
                "payroll_tax_withholding": payroll_tax,
                "shareholder_loan_repayment": 0.0,
                "retained_earnings": retained_earnings,
                "net_corporate_cash": net_profit,
                "net_salary": total_net_salary,
                "target_household_cash": achievable_household_cash,
                "audit_details": {
                    "investment_income": {
                        **investment_income,
                        "health_insurance_income": 0.0,
                        "capital_gains_tax": corp_tax,
                    },
                    "corp_tax": {
                        "tax_base": tax_base,
                        "nominal_rate": tax_engine.corp_tax_nominal_rate,
                        "effective_rate": tax_engine.corp_tax_effective_rate,
                        "tax_rate_low": tax_engine.corp_tax_effective_rate,
                    },
                    "operating_costs": {
                        "monthly_bookkeeping_fee": monthly_bookkeeping_fee,
                        "annual_corp_tax_adjustment_fee": annual_corp_tax_adjustment_fee,
                        "annual_total": fixed_cost_annual,
                    },
                    "health": {"is_employee": True, "recipients": len(salary_recipients)},
                },
            },
            "series": series,
            "sustainability_series": sustainability_series,
            "sustainability": self._build_sustainability_summary(sustainability_series),
        }

    def _simulate_corporate_cost_scenario(
        self,
        tax_engine: TaxEngine,
        assumptions: Dict[str, Any],
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        personal_assets = cast(Dict[str, Any], config.get("personal_assets", {}))
        corporate = cast(Dict[str, Any], config.get("corporate", {}))
        salary_recipients = cast(List[Dict[str, Any]], corporate.get("salary_recipients", []))
        current_assets = float(personal_assets.get("investment_assets") or 0.0)
        tr = float(assumptions["tr"])
        simulation_years = int(assumptions["simulation_years"])
        annual_target_cash = float(assumptions["target_monthly_household_cash_after_tax"]) * 12
        operating_costs = self._get_annual_corporate_operating_cost(corporate)
        monthly_bookkeeping_fee = operating_costs["monthly_bookkeeping_fee"]
        annual_corp_tax_adjustment_fee = operating_costs["annual_corp_tax_adjustment_fee"]
        company_health_component = 0.0
        employee_health_component = 0.0
        social_insurance = 0.0
        net_salary_annual = 0.0
        gross_salary_annual = 0.0
        annual_revenue = 0.0
        corp_tax = 0.0
        fixed_cost_annual = 0.0
        retained_earnings = 0.0
        payroll_tax_withholding = 0.0
        cumulative_household_cash = 0.0
        series: List[Dict[str, Any]] = []
        gross_salary_annual = 0.0
        net_salary_annual = 0.0
        company_health_component = 0.0
        employee_health_component = 0.0
        social_insurance = 0.0
        payroll_tax_withholding = 0.0

        for recipient in salary_recipients:
            monthly_salary = float(recipient.get("monthly_salary") or 0.0)
            salary_info = tax_engine.calculate_income_tax(monthly_salary)
            gross_salary_annual += monthly_salary * 12
            net_salary_annual += float(salary_info["net_salary"]) * 12
            employee_health_component += float(salary_info["health"]) * 12
            payroll_tax_withholding += float(salary_info["income_tax"]) * 12
            company_health_component += monthly_salary * tax_engine.health_rate * 12
            social_insurance += (
                float(salary_info["pension"]) + (monthly_salary * tax_engine.employment_rate)
            ) * 12
            social_insurance += (
                monthly_salary * (tax_engine.pension_rate + tax_engine.employment_rate) * 12
            )

        fixed_cost_annual = operating_costs["annual_operating_cost"]
        company_insurance_total = gross_salary_annual * (
            tax_engine.pension_rate + tax_engine.health_rate + tax_engine.employment_rate
        )
        low = 0.0
        dy = max(float(assumptions["dy"]), 0.001)
        high = max(annual_target_cash / dy * 2, 1000000.0)
        required_result = self._calculate_corporate_investment_year(
            tax_engine,
            high,
            high,
            assumptions,
            gross_salary_annual,
            fixed_cost_annual,
            company_insurance_total,
        )
        while net_salary_annual + required_result["net_cash"] < annual_target_cash:
            high *= 2
            required_result = self._calculate_corporate_investment_year(
                tax_engine,
                high,
                high,
                assumptions,
                gross_salary_annual,
                fixed_cost_annual,
                company_insurance_total,
            )
        for _ in range(80):
            mid = (low + high) / 2
            candidate = self._calculate_corporate_investment_year(
                tax_engine,
                mid,
                mid,
                assumptions,
                gross_salary_annual,
                fixed_cost_annual,
                company_insurance_total,
            )
            if net_salary_annual + candidate["net_cash"] >= annual_target_cash:
                high = mid
                required_result = candidate
            else:
                low = mid
        required_assets = high
        annual_revenue = required_assets * tr
        required_tax_base = float(required_result["tax_base"])
        corp_tax = float(required_result["corp_tax"])
        asset_margin = current_assets - required_assets
        annual_net_corporate_cash = float(required_result["net_cash"])
        annual_net_cashflow = annual_net_corporate_cash + net_salary_annual

        asset_base = current_assets
        cost_basis = current_assets
        cumulative_net_cashflow = 0.0
        sustainability_series: List[Dict[str, Any]] = []
        for year in range(1, simulation_years + 1):
            annual_result = self._calculate_corporate_investment_year(
                tax_engine,
                asset_base,
                cost_basis,
                assumptions,
                gross_salary_annual,
                fixed_cost_annual,
                company_insurance_total,
            )
            available_cash = max(0.0, net_salary_annual + annual_result["net_cash"])
            actual_cash = min(annual_target_cash, available_cash)
            corporate_distribution = max(0.0, actual_cash - net_salary_annual)
            asset_base = max(0.0, float(annual_result["ending_asset"]) - corporate_distribution)
            cost_basis = max(
                0.0,
                min(
                    asset_base,
                    float(annual_result["ending_cost_basis"]) - corporate_distribution,
                ),
            )
            retained_earnings = asset_base - current_assets
            cumulative_household_cash += actual_cash
            cumulative_net_cashflow += actual_cash
            series.append(
                {
                    "year": year,
                    "net_worth": asset_base,
                    "disposable_cash": actual_cash,
                    "cumulative_household_cash": cumulative_household_cash,
                    "total_economic_value": asset_base + cumulative_household_cash,
                }
            )
            sustainability_series.append(
                {
                    "year": year,
                    "asset_balance": asset_base,
                    "household_cash": actual_cash,
                    "cumulative_household_cash": cumulative_household_cash,
                    "target_met": actual_cash >= annual_target_cash - 1.0,
                }
            )

        annual_health = (company_health_component + employee_health_component) * (
            1 + tax_engine.ltc_rate
        )
        return {
            "kpis": {
                "monthly_disposable_cashflow": annual_target_cash / 12,
                "annual_net_cashflow": annual_net_cashflow,
                "cumulative_net_cashflow": cumulative_net_cashflow,
                "annual_total_cost": corp_tax
                + annual_health
                + social_insurance
                + fixed_cost_annual
                + payroll_tax_withholding,
                "annual_health_insurance": annual_health,
                "after_tax_net_growth": asset_margin,
                "required_annual_revenue": annual_revenue,
                "required_assets": required_assets,
                "asset_margin_vs_current": asset_margin,
                "achieves_target_with_current_assets": asset_margin >= 0,
            },
            "breakdown": {
                "annual_revenue": annual_revenue,
                "tax": corp_tax,
                "health_insurance": annual_health,
                "social_insurance": social_insurance,
                "fixed_cost": fixed_cost_annual,
                "monthly_bookkeeping_fee": monthly_bookkeeping_fee,
                "annual_corp_tax_adjustment_fee": annual_corp_tax_adjustment_fee,
                "gross_salary": gross_salary_annual,
                "company_insurance_cost": company_insurance_total,
                "payroll_tax_withholding": payroll_tax_withholding,
                "shareholder_loan_repayment": 0.0,
                "retained_earnings": retained_earnings,
                "net_corporate_cash": annual_net_corporate_cash,
                "net_salary": net_salary_annual,
                "target_household_cash": annual_target_cash,
                "audit_details": {
                    "investment_income": required_result["investment_income"],
                    "corp_tax": {
                        "tax_base": required_tax_base,
                        "nominal_rate": tax_engine.corp_tax_nominal_rate,
                        "effective_rate": tax_engine.corp_tax_effective_rate,
                        "tax_rate_low": tax_engine.corp_tax_effective_rate,
                    },
                    "operating_costs": {
                        "monthly_bookkeeping_fee": monthly_bookkeeping_fee,
                        "annual_corp_tax_adjustment_fee": annual_corp_tax_adjustment_fee,
                        "annual_total": fixed_cost_annual,
                    },
                    "health": {"is_employee": True, "recipients": len(salary_recipients)},
                },
            },
            "series": series,
            "sustainability_series": sustainability_series,
            "sustainability": self._build_sustainability_summary(sustainability_series),
        }

    def _build_cost_comparison_summary(
        self, personal: Dict[str, Any], corporate: Dict[str, Any]
    ) -> Dict[str, Any]:
        personal_net_cashflow = float(personal["kpis"]["annual_net_cashflow"])
        corporate_net_cashflow = float(corporate["kpis"]["annual_net_cashflow"])
        personal_cumulative_net_cashflow = float(personal["kpis"]["cumulative_net_cashflow"])
        corporate_cumulative_net_cashflow = float(corporate["kpis"]["cumulative_net_cashflow"])
        annual_advantage = corporate_net_cashflow - personal_net_cashflow
        cumulative_advantage = corporate_cumulative_net_cashflow - personal_cumulative_net_cashflow
        if abs(annual_advantage) < 1e-6:
            winner = "tie"
        else:
            winner = "corporate" if annual_advantage > 0 else "personal"

        driver_map = {
            "건강보험료": float(personal["breakdown"]["health_insurance"])
            - float(corporate["breakdown"]["health_insurance"]),
            "세금": float(personal["breakdown"]["tax"]) - float(corporate["breakdown"]["tax"]),
            "급여 비용": float(personal["breakdown"].get("gross_salary", 0.0))
            - float(corporate["breakdown"].get("gross_salary", 0.0)),
            "고정 운영비": float(personal["breakdown"]["fixed_cost"])
            - float(corporate["breakdown"]["fixed_cost"]),
            "사회보험": float(personal["breakdown"]["social_insurance"])
            - float(corporate["breakdown"]["social_insurance"]),
        }
        sorted_drivers = sorted(driver_map.items(), key=lambda item: abs(item[1]), reverse=True)
        top_drivers = [{"label": label, "amount": amount} for label, amount in sorted_drivers[:3]]
        while len(top_drivers) < 3:
            top_drivers.append({"label": "-", "amount": 0.0})

        return {
            "winner": winner,
            "winner_basis": "annual_net_cashflow",
            "winner_reason": (
                "연간 순현금흐름 기준으로 법인운용이 더 큽니다."
                if winner == "corporate"
                else (
                    "연간 순현금흐름 기준으로 개인운용이 더 큽니다."
                    if winner == "personal"
                    else "연간 순현금흐름 기준으로 두 구조의 결과가 같습니다."
                )
            ),
            "annual_advantage": annual_advantage,
            "cumulative_advantage": cumulative_advantage,
            "top_drivers": top_drivers,
        }

    def run_cost_comparison(
        self, config_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        self._ensure_cost_comparison_config_defaults()
        effective_config = self.cost_comparison_config
        if config_override:
            effective_config = self._deep_merge_dict(
                self.cost_comparison_config,
                self._normalize_cost_comparison_config(config_override),
            )

        validation_error = self._validate_cost_comparison_config(effective_config)
        if validation_error:
            return {"success": False, "message": validation_error}

        assumptions_result = self._build_cost_comparison_assumptions(effective_config)
        if not assumptions_result.get("success"):
            return cast(Dict[str, Any], assumptions_result)

        assumptions = cast(Dict[str, Any], assumptions_result["data"])
        tax_config = dict(self.retirement_config.get("tax_and_insurance", {}))
        corporate_config = cast(Dict[str, Any], effective_config.get("corporate", {}))
        if corporate_config.get("corp_tax_nominal_rate") is not None:
            tax_config["corp_tax_nominal_rate"] = corporate_config["corp_tax_nominal_rate"]
        tax_engine = TaxEngine(config=tax_config)

        simulation_mode = effective_config.get("simulation_mode", "target")

        if simulation_mode == "asset":
            personal = self._simulate_personal_asset_driven_scenario(
                tax_engine, assumptions, effective_config
            )
            corporate = self._simulate_corporate_asset_driven_scenario(
                tax_engine, assumptions, effective_config
            )
        else:
            personal = self._simulate_personal_cost_scenario(
                tax_engine, assumptions, effective_config
            )
            corporate = self._simulate_corporate_cost_scenario(
                tax_engine, assumptions, effective_config
            )

        warnings: List[str] = []
        current_assets = float(
            effective_config.get("personal_assets", {}).get("investment_assets", 0.0)
        )
        if not cast(
            List[Dict[str, Any]], effective_config.get("corporate", {}).get("salary_recipients", [])
        ):
            warnings.append(
                "법인운용 시나리오에 급여 수령자가 없어 "
                "직장건보 절감 효과가 과소/과대 추정될 수 있습니다."
            )
        elif float(personal["breakdown"]["annual_revenue"]) > 20000000:
            warnings.append(
                "법인운용에서 급여를 받는 구조라도, 개인 명의 투자소득이 연 2,000만원을 넘으면 "
                "보수 외 소득월액보험료가 추가될 수 있습니다."
            )
        if current_assets < float(personal["kpis"]["required_assets"]):
            warnings.append(
                "현재 개인 투자자산만으로는 입력한 "
                "세후 월현금 목표를 개인운용으로 충족하기 어렵습니다."
            )
        if current_assets < float(corporate["kpis"]["required_assets"]):
            warnings.append(
                "현재 투자자산만으로는 입력한 세후 월현금 목표를 법인운용으로 충족하기 어렵습니다."
            )
        return {
            "success": True,
            "data": {
                "assumptions": {
                    key: value for key, value in assumptions.items() if not key.startswith("_")
                },
                "personal": personal,
                "corporate": corporate,
                "comparison": self._build_cost_comparison_summary(personal, corporate),
                "warnings": warnings,
            },
        }

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
            "Bond Buffer": "Bond Buffer",
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
        if self._is_system_default_portfolio(normalized):
            normalized["is_system_default"] = True
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

    def get_exchange_rate_info(self, force_refresh: bool = False) -> Dict[str, Any]:
        """실시간 환율 메타데이터를 반환합니다. (기본 12시간 주기 갱신)"""
        now = datetime.datetime.now()
        # settings.json 내의 캐시 정보 확인
        cache = self.settings.get("exchange_rate_cache", {})
        last_fetch_str = cache.get("last_fetch")
        last_rate = float(cache.get("rate", self.settings.get("current_exchange_rate", 1425.5)))

        should_fetch = force_refresh
        if not force_refresh:
            should_fetch = True
        if last_fetch_str and not force_refresh:
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
                new_rate = self.data_provider.try_get_usd_krw_rate()
                if new_rate is not None and new_rate > 0:
                    refreshed_at = now.isoformat()
                    self.settings["exchange_rate_cache"] = {
                        "last_fetch": refreshed_at,
                        "rate": new_rate,
                    }
                    self.settings["current_exchange_rate"] = new_rate
                    self._save_settings()
                    return {
                        "rate": new_rate,
                        "last_fetch": refreshed_at,
                        "source": "live",
                    }
            except Exception as e:
                print(f"[Backend] Exchange rate fetch failed: {e}")

        # 캐시된 값이 있으면 동기화 (UI 노출용)
        if (
            "current_exchange_rate" not in self.settings
            or self.settings["current_exchange_rate"] != last_rate
        ):
            self.settings["current_exchange_rate"] = last_rate
            self._save_settings()

        return {
            "rate": last_rate,
            "last_fetch": last_fetch_str,
            "source": "cache",
        }

    def get_exchange_rate(self, force_refresh: bool = False) -> float:
        """실시간 환율을 가져오거나 캐시된 값을 반환합니다. (12시간 주기 갱신)"""
        return float(self.get_exchange_rate_info(force_refresh=force_refresh)["rate"])

    def get_portfolio_stats_by_id(
        self, p_id: Optional[str], pa_scenario: Optional[str] = None
    ) -> Dict[str, Any]:
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
            "category_dividend_yields": {},
            "category_return_rates": {},
        }
        weight_buckets = cast(Dict[str, float], stats["weights"])
        strategy_buckets = cast(Dict[str, float], stats["strategy_weights"])
        category_dividend_yields = cast(Dict[str, float], stats["category_dividend_yields"])
        category_return_rates = cast(Dict[str, Dict[str, float]], stats["category_return_rates"])

        # [REQ-GLB-13] 자산군별 기대주가상승률(PA) 로드
        a_rates = self.get_appreciation_rates_for_scenario(pa_scenario)

        for item in items:
            w = item.get("weight", 0.0) / total_weight
            strategy_cat = self._normalize_portfolio_category(
                account_type, item.get("category", "Growth Engine")
            )
            cat = self._strategy_category_to_stats_bucket(
                account_type, item.get("category", "Growth Engine")
            )
            weight_buckets[cat] = weight_buckets.get(cat, 0.0) + w
            strategy_buckets[strategy_cat] = strategy_buckets.get(strategy_cat, 0.0) + w

            # 카테고리별 PA 매칭
            cat_name = item.get("category", "Growth Engine")
            pa = 0.0
            if cat_name == "SGOV Buffer":
                pa = a_rates.get("cash_sgov", 0.1)
            elif cat_name == "Bond Buffer":
                pa = a_rates.get("bond_buffer", 0.1)
            elif cat_name == "High Income":
                pa = a_rates.get("high_income", 0.1)
            elif cat_name == "Dividend Growth":
                pa = a_rates.get("dividend_stocks", 9.6)
            elif cat_name == "Growth Engine":
                pa = a_rates.get("growth_stocks", 8.2)

            div_y = float(item.get("dividend_yield") or 0.0)
            category_dividend_yields[strategy_cat] = category_dividend_yields.get(
                strategy_cat, 0.0
            ) + (div_y / 100.0 * w)
            # TR(expected_return) = (배당수익률 + 기대주가상승률) * 비중
            stats["expected_return"] = float(stats["expected_return"]) + ((div_y + pa) / 100.0 * w)
            stats["dividend_yield"] = float(stats["dividend_yield"]) + (div_y / 100.0 * w)

        for strategy_cat, weight in strategy_buckets.items():
            if weight <= 0:
                continue
            category_dividend_yields[strategy_cat] = (
                category_dividend_yields.get(strategy_cat, 0.0) / weight
            )
            category_pa = 0.0
            if strategy_cat == "SGOV Buffer":
                category_pa = a_rates.get("cash_sgov", 0.1) / 100.0
            elif strategy_cat == "Bond Buffer":
                category_pa = a_rates.get("bond_buffer", 0.1) / 100.0
            elif strategy_cat == "High Income":
                category_pa = a_rates.get("high_income", 0.1) / 100.0
            elif strategy_cat == "Dividend Growth":
                category_pa = a_rates.get("dividend_stocks", 9.6) / 100.0
            elif strategy_cat == "Growth Engine":
                category_pa = a_rates.get("growth_stocks", 8.2) / 100.0
            category_dy = category_dividend_yields[strategy_cat]
            category_return_rates[strategy_cat] = {
                "dy": category_dy,
                "pa": category_pa,
                "tr": category_dy + category_pa,
            }

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
                if key == "simulation_params":
                    value = dict(value)
                    if "target_monthly_cashflow" in value and "household_monthly_need" not in value:
                        value["household_monthly_need"] = value["target_monthly_cashflow"]
                    if "household_monthly_need" in value and "target_monthly_cashflow" not in value:
                        value["target_monthly_cashflow"] = value["household_monthly_need"]
                if key == "corp_params":
                    value = dict(value)
                    if "monthly_fixed_cost" in value and "monthly_bookkeeping_fee" not in value:
                        value["monthly_bookkeeping_fee"] = value["monthly_fixed_cost"]
                    if (
                        "monthly_fixed_cost" in value
                        and "annual_corp_tax_adjustment_fee" not in value
                    ):
                        value["annual_corp_tax_adjustment_fee"] = 0.0
                if key == "strategy_rules":
                    value = self._normalize_strategy_rules(cast(Dict[str, Any], value))
                if key == "distribution_rules":
                    value = self._normalize_distribution_rules(cast(Dict[str, Any], value))
                    candidate_config[key] = value
                    continue
                if key == "distribution_yield_overrides":
                    value = self._normalize_distribution_yield_overrides(
                        cast(Dict[str, Any], value)
                    )
                    candidate_config[key] = value
                    continue
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
        self.retirement_config["simulation_params"] = self._normalize_retirement_simulation_fields(
            cast(Optional[Dict[str, Any]], self.retirement_config.get("simulation_params"))
        )
        self.retirement_config["corp_params"] = self._normalize_corporate_cost_fields(
            cast(Optional[Dict[str, Any]], self.retirement_config.get("corp_params"))
        )
        self.retirement_config["distribution_rules"] = self._normalize_distribution_rules(
            cast(Optional[Dict[str, Any]], self.retirement_config.get("distribution_rules"))
        )
        self.retirement_config["distribution_yield_overrides"] = (
            self._normalize_distribution_yield_overrides(
                cast(
                    Optional[Dict[str, Any]],
                    self.retirement_config.get("distribution_yield_overrides"),
                )
            )
        )

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
        self._ensure_seeded_defaults_if_enabled()
        self._ensure_retirement_config_defaults()
        return {
            "settings": deepcopy(self.get_settings()),
            "watchlist": deepcopy(self.watchlist),
            "portfolios": deepcopy(self.portfolios),
            "master_portfolios": deepcopy(self.master_portfolios),
            "retirement_config": deepcopy(self.retirement_config),
            "cost_comparison_config": deepcopy(self.cost_comparison_config),
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
        self.cost_comparison_config = cast(
            Dict[str, Any], restored.get("cost_comparison_config", {})
        )

        self._normalize_all_portfolios()
        self._ensure_seeded_defaults_if_enabled()
        self._ensure_retirement_config_defaults()
        self._ensure_cost_comparison_config_defaults()

        self._save_settings()
        self.storage.save_json(self.watchlist_file, self.watchlist)
        self.storage.save_json(self.portfolios_file, self.portfolios)
        self.storage.save_json(self.master_portfolios_file, self.master_portfolios)
        self.storage.save_json(self.retirement_config_file, self.retirement_config)
        self.storage.save_json(self.cost_comparison_config_file, self.cost_comparison_config)
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
        self._ensure_seeded_defaults_if_enabled()
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
        self._ensure_seeded_defaults_if_enabled()
        self._normalize_all_portfolios()
        return self.portfolios

    def get_master_reference_status(self, master: Dict[str, Any]) -> Dict[str, Any]:
        """마스터 전략의 포트폴리오 참조 상태와 계산 가능 여부를 반환합니다."""
        corp_id = master.get("corp_id")
        pension_id = master.get("pension_id")
        personal_id = master.get("personal_id")
        corp_portfolio = self.get_portfolio_by_id(corp_id)
        pension_portfolio = self.get_portfolio_by_id(pension_id)
        personal_portfolio = self.get_portfolio_by_id(personal_id)
        missing_refs: List[str] = []

        if corp_id and corp_portfolio is None:
            missing_refs.append("Corporate")
        if pension_id and pension_portfolio is None:
            missing_refs.append("Pension")
        if personal_id and personal_portfolio is None:
            missing_refs.append("Personal")

        message = None
        if missing_refs:
            joined = ", ".join(missing_refs)
            message = (
                f"Master strategy '{master.get('name', '-')}' has broken portfolio references: "
                f"{joined} portfolio not found."
            )

        return {
            "corp_portfolio": corp_portfolio,
            "pension_portfolio": pension_portfolio,
            "personal_portfolio": personal_portfolio,
            "missing_refs": missing_refs,
            "is_broken": bool(missing_refs),
            "message": message,
        }

    def calculate_master_portfolio_tr(
        self, master: Dict[str, Any], pa_scenario: Optional[str] = None
    ) -> Dict[str, Any]:
        """마스터 전략의 TR 계산 결과 또는 깨진 참조 오류를 반환합니다."""
        reference_status = self.get_master_reference_status(master)
        if reference_status["is_broken"]:
            return {
                "success": False,
                "message": reference_status["message"],
                "data": reference_status,
            }

        corp_portfolio = cast(Optional[Dict[str, Any]], reference_status["corp_portfolio"])
        pension_portfolio = cast(Optional[Dict[str, Any]], reference_status["pension_portfolio"])
        personal_portfolio = cast(Optional[Dict[str, Any]], reference_status["personal_portfolio"])
        corp_stats = self.get_portfolio_stats_by_id(master.get("corp_id"), pa_scenario)
        pension_stats = self.get_portfolio_stats_by_id(master.get("pension_id"), pa_scenario)
        personal_stats = self.get_portfolio_stats_by_id(master.get("personal_id"), pa_scenario)

        corp_capital = corp_portfolio["total_capital"] if corp_portfolio else 0
        pension_capital = pension_portfolio["total_capital"] if pension_portfolio else 0
        personal_capital = personal_portfolio["total_capital"] if personal_portfolio else 0
        total_capital = corp_capital + pension_capital + personal_capital

        combined_tr = 0.0
        combined_yield = 0.0
        if total_capital > 0:
            combined_tr = (
                corp_stats["expected_return"] * corp_capital
                + pension_stats["expected_return"] * pension_capital
                + personal_stats["expected_return"] * personal_capital
            ) / total_capital
            combined_yield = (
                corp_stats["dividend_yield"] * corp_capital
                + pension_stats["dividend_yield"] * pension_capital
                + personal_stats["dividend_yield"] * personal_capital
            ) / total_capital
        elif corp_portfolio:
            combined_tr = corp_stats["expected_return"]
            combined_yield = corp_stats["dividend_yield"]
        elif pension_portfolio:
            combined_tr = pension_stats["expected_return"]
            combined_yield = pension_stats["dividend_yield"]
        else:
            combined_tr = None
            combined_yield = None

        return {
            "success": True,
            "data": {
                **reference_status,
                "corp_stats": corp_stats,
                "pension_stats": pension_stats,
                "personal_stats": personal_stats,
                "combined_tr": combined_tr,
                "combined_yield": combined_yield,
            },
        }

    def _build_master_portfolio_summary(
        self, master: Dict[str, Any], pa_scenario: Optional[str] = None
    ) -> Dict[str, Any]:
        """마스터 전략 응답용 요약 정보를 구성합니다."""
        summary = dict(master)
        master_calc = self.calculate_master_portfolio_tr(master, pa_scenario)

        if master_calc["success"]:
            data = cast(Dict[str, Any], master_calc["data"])
            corp_p = cast(Optional[Dict[str, Any]], data["corp_portfolio"])
            pen_p = cast(Optional[Dict[str, Any]], data["pension_portfolio"])
            personal_p = cast(Optional[Dict[str, Any]], data["personal_portfolio"])
            combined_tr = data.get("combined_tr")
            combined_yield = data.get("combined_yield")

            summary["corp_name"] = corp_p["name"] if corp_p else "-"
            summary["pension_name"] = pen_p["name"] if pen_p else "-"
            summary["personal_name"] = personal_p["name"] if personal_p else "-"
            summary["combined_yield"] = (
                combined_yield * 100.0 if combined_yield is not None else 0.0
            )
            summary["combined_tr"] = combined_tr * 100.0 if combined_tr is not None else 0.0
            summary["broken_reference"] = False
            summary["broken_reason"] = None
        else:
            data = cast(Dict[str, Any], master_calc["data"])
            corp_p = cast(Optional[Dict[str, Any]], data["corp_portfolio"])
            pen_p = cast(Optional[Dict[str, Any]], data["pension_portfolio"])
            personal_p = cast(Optional[Dict[str, Any]], data["personal_portfolio"])

            summary["corp_name"] = corp_p["name"] if corp_p else "-"
            summary["pension_name"] = pen_p["name"] if pen_p else "-"
            summary["personal_name"] = personal_p["name"] if personal_p else "-"
            summary["combined_yield"] = None
            summary["combined_tr"] = None
            summary["broken_reference"] = True
            summary["broken_reason"] = master_calc["message"]

        summary["is_system_default"] = self._is_system_default_master(master)
        return summary

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
            if (
                m.get("corp_id") == p_id
                or m.get("pension_id") == p_id
                or m.get("personal_id") == p_id
            ):
                return True
        return False

    def remove_portfolio(self, p_id: str) -> Dict[str, Any]:
        """특정 포트폴리오를 삭제합니다. [의존성 검사 추가]"""
        portfolio = self.get_portfolio_by_id(p_id)
        if portfolio and self._is_system_default_portfolio(portfolio):
            return {
                "success": False,
                "message": "기본 포트폴리오는 삭제할 수 없습니다.",
            }

        if self.is_portfolio_used_in_master(p_id):
            # 사용 중인 마스터 전략 이름 찾기
            master = next(
                (
                    m
                    for m in self.master_portfolios
                    if m.get("corp_id") == p_id
                    or m.get("pension_id") == p_id
                    or m.get("personal_id") == p_id
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

    def get_master_portfolios(self, pa_scenario: Optional[str] = None) -> List[Dict[str, Any]]:
        """저장된 모든 마스터 포트폴리오를 반환합니다. [REQ-PRT-09.2 요약 정보 포함]"""
        self._ensure_seeded_defaults_if_enabled()
        for m in self.master_portfolios:
            m.update(self._build_master_portfolio_summary(m, pa_scenario))

        return self.master_portfolios

    def get_portfolio_by_id(self, p_id: Optional[str]) -> Optional[Dict[str, Any]]:
        """ID로 개별 포트폴리오를 찾습니다."""
        self._ensure_seeded_defaults_if_enabled()
        if not p_id:
            return None
        portfolio = next((p for p in self.portfolios if p["id"] == p_id), None)
        return self._normalize_portfolio_record(portfolio) if portfolio else None

    @staticmethod
    def _validate_master_account_mix(
        corp_id: Optional[str], personal_id: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        if corp_id and personal_id:
            return {
                "success": False,
                "message": (
                    "법인운용과 개인운용은 하나의 마스터 전략에 함께 구성할 수 없습니다. "
                    "Corporate 또는 Personal 중 하나만 선택해주세요."
                ),
            }
        return None

    def add_master_portfolio(
        self,
        name: str,
        corp_id: Optional[str] = None,
        pension_id: Optional[str] = None,
        personal_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """새로운 마스터 전략을 생성합니다. [REQ-PRT-08.1]"""
        if not corp_id and not pension_id and not personal_id:
            return {"success": False, "message": "최소 하나 이상의 포트폴리오를 선택해야 합니다."}

        invalid_mix = self._validate_master_account_mix(corp_id, personal_id)
        if invalid_mix:
            return invalid_mix

        new_m = {
            "id": str(uuid.uuid4()),
            "name": name,
            "corp_id": corp_id,
            "pension_id": pension_id,
            "personal_id": personal_id,
            "is_active": len(self.master_portfolios) == 0,  # 첫 번째면 자동 활성
        }
        self.master_portfolios.append(new_m)
        self.storage.save_json(self.master_portfolios_file, self.master_portfolios)
        return {"success": True, "data": self._build_master_portfolio_summary(new_m)}

    def activate_master_portfolio(self, m_id: str) -> Dict[str, Any]:
        """특정 마스터 전략을 활성화합니다."""
        found_m = next((m for m in self.master_portfolios if m["id"] == m_id), None)
        if not found_m:
            return {"success": False, "message": "전략을 찾을 수 없습니다."}

        invalid_mix = self._validate_master_account_mix(
            found_m.get("corp_id"), found_m.get("personal_id")
        )
        if invalid_mix:
            return invalid_mix

        master_calc = self.calculate_master_portfolio_tr(found_m)
        if not master_calc["success"]:
            return {
                "success": False,
                "message": master_calc["message"],
                "broken_reference": True,
            }

        for master in self.master_portfolios:
            master["is_active"] = master["id"] == m_id

        combined_tr = cast(Dict[str, Any], master_calc["data"])["combined_tr"]

        self.storage.save_json(self.master_portfolios_file, self.master_portfolios)
        return {
            "success": True,
            "message": "전략이 활성화되었습니다.",
            "yield": combined_tr,
        }

    def update_master_portfolio(self, m_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """특정 마스터 전략의 정보를 업데이트합니다."""
        for master in self.master_portfolios:
            if master["id"] == m_id:
                candidate = {**master, **updates}
                invalid_mix = self._validate_master_account_mix(
                    candidate.get("corp_id"), candidate.get("personal_id")
                )
                if invalid_mix:
                    return invalid_mix
                master.update(updates)
                self.storage.save_json(self.master_portfolios_file, self.master_portfolios)
                return {"success": True, "data": self._build_master_portfolio_summary(master)}
        return {"success": False, "message": "전략을 찾을 수 없습니다."}

    def remove_master_portfolio(self, m_id: str) -> Dict[str, Any]:
        """마스터 전략을 삭제합니다. [활성 전략 보호 추가]"""
        for i, m in enumerate(self.master_portfolios):
            if m["id"] == m_id:
                if self._is_system_default_master(m):
                    return {
                        "success": False,
                        "message": "기본 마스터 전략은 삭제할 수 없습니다.",
                    }
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
        self._ensure_seeded_defaults_if_enabled()
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
        usd_krw_rate = self.get_exchange_rate()

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
        self.settings = self._normalize_settings(self.settings)
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
        # 1. 시스템 기본 종목 삭제 보호 [REQ-WCH-01.8]
        for item in self.watchlist:
            if item["symbol"] == ticker.upper():
                if item.get("is_system_default"):
                    return {
                        "success": False,
                        "message": "기본 관심종목은 삭제할 수 없습니다.",
                    }
                break

        # 2. 포트폴리오 무결성 체크: 삭제 전 사용 여부 확인
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
        merged = deepcopy(self.settings)
        merged.update(new_settings)
        self.settings = self._normalize_settings(merged)
        self._save_settings()
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
