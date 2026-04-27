import datetime

from src.backend.api import DividendBackend


def test_exchange_rate_fetch_failure_keeps_cached_rate(tmp_path):
    backend = DividendBackend(data_dir=str(tmp_path))
    cached_rate = 1485.2
    backend.settings["exchange_rate_cache"] = {
        "last_fetch": (datetime.datetime.now() - datetime.timedelta(hours=13)).isoformat(),
        "rate": cached_rate,
    }
    backend.settings["current_exchange_rate"] = cached_rate

    backend.data_provider.try_get_usd_krw_rate = lambda: None  # type: ignore[method-assign]

    rate = backend.get_exchange_rate()

    assert rate == cached_rate
    assert backend.settings["current_exchange_rate"] == cached_rate
    assert backend.settings["exchange_rate_cache"]["rate"] == cached_rate


def test_exchange_rate_fetch_success_refreshes_cache(tmp_path):
    backend = DividendBackend(data_dir=str(tmp_path))
    backend.settings["exchange_rate_cache"] = {
        "last_fetch": (datetime.datetime.now() - datetime.timedelta(hours=13)).isoformat(),
        "rate": 1485.2,
    }
    backend.settings["current_exchange_rate"] = 1485.2

    backend.data_provider.try_get_usd_krw_rate = lambda: 1499.9  # type: ignore[method-assign]

    rate = backend.get_exchange_rate()

    assert rate == 1499.9
    assert backend.settings["current_exchange_rate"] == 1499.9
    assert backend.settings["exchange_rate_cache"]["rate"] == 1499.9
