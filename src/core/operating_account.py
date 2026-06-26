from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class OperatingAccountContext:
    """Active taxable operating account used by the shared investment policy."""

    key: str
    assets: Dict[str, float]
    distribution_run_rates: Dict[str, float]
    stats: Dict[str, Any]


def select_operating_account(
    *,
    corp_enabled: bool,
    personal_enabled: bool,
    corp_assets: Dict[str, float],
    personal_assets: Dict[str, float],
    corp_distribution_run_rates: Dict[str, float],
    personal_distribution_run_rates: Dict[str, float],
    corp_stats: Dict[str, Any],
    personal_stats: Dict[str, Any],
) -> OperatingAccountContext:
    corp_funded = sum(corp_assets.values()) > 0
    personal_funded = sum(personal_assets.values()) > 0
    if personal_enabled and (not corp_enabled or (personal_funded and not corp_funded)):
        return OperatingAccountContext(
            key="personal",
            assets=personal_assets,
            distribution_run_rates=personal_distribution_run_rates,
            stats=personal_stats,
        )
    return OperatingAccountContext(
        key="corp",
        assets=corp_assets,
        distribution_run_rates=corp_distribution_run_rates,
        stats=corp_stats,
    )


def operating_policy_key(account_key: str) -> str:
    """Corporate and Personal share one Operating Account strategy policy."""

    return "corp" if account_key == "personal" else account_key
