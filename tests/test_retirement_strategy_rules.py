from pathlib import Path

from src.backend.api import DividendBackend


def test_retirement_config_includes_default_strategy_rules(tmp_path):
    """전략 규칙이 비어 있어도 기본값이 자동 보강되어야 한다."""
    backend = DividendBackend(data_dir=str(tmp_path))

    config = backend.get_retirement_config()

    assert "strategy_rules" in config
    assert config["strategy_rules"]["rebalance_month"] == 5
    assert config["strategy_rules"]["corporate"]["sgov_target_months"] == 30
    assert config["strategy_rules"]["corporate"]["november_sgov_target_months"] == 27
    assert config["strategy_rules"]["corporate"]["bond_floor_months"] == 12
    assert config["strategy_rules"]["corporate"]["bond_target_months"] == 18
    assert config["strategy_rules"]["corporate"]["bond_upper_months"] == 24
    assert config["strategy_rules"]["pension"]["sgov_target_months"] == 24
    assert config["strategy_rules"]["pension"]["sgov_floor_months"] == 12
    assert config["strategy_rules"]["pension"]["bond_floor_months"] == 12
    assert config["strategy_rules"]["pension"]["bond_target_months"] == 18
    assert config["strategy_rules"]["pension"]["bond_upper_months"] == 24
    assert config["distribution_rules"] == {"corp": {}, "pension": {}}
    assert config["distribution_yield_overrides"] == {"corp": {}, "pension": {}}


def test_retirement_config_distribution_rules_partial_update_keeps_defaults(tmp_path):
    """분배금 규칙 일부만 수정해도 나머지 계정 기본 구조는 유지되어야 한다."""
    backend = DividendBackend(data_dir=str(tmp_path))

    response = backend.update_retirement_config(
        {
            "distribution_rules": {
                "corp": {
                    "Growth Engine": {
                        "growth_rate": 0.12,
                        "stress_cut_rate": 0.4,
                    }
                }
            }
        }
    )

    distribution_rules = response["data"]["distribution_rules"]
    assert distribution_rules["corp"]["Growth Engine"]["growth_rate"] == 0.12
    assert distribution_rules["corp"]["Growth Engine"]["stress_cut_rate"] == 0.4
    assert distribution_rules["pension"] == {}


def test_retirement_config_distribution_yield_overrides_partial_update_keeps_defaults(tmp_path):
    """신규 매수분 DY override 일부만 수정해도 나머지 계정 기본 구조는 유지되어야 한다."""
    backend = DividendBackend(data_dir=str(tmp_path))

    response = backend.update_retirement_config(
        {
            "distribution_yield_overrides": {
                "corp": {
                    "Growth Engine": 0.08,
                }
            }
        }
    )

    overrides = response["data"]["distribution_yield_overrides"]
    assert overrides["corp"]["Growth Engine"] == 0.08
    assert overrides["pension"] == {}


def test_retirement_config_strategy_rules_partial_update_keeps_defaults(tmp_path):
    """전략 규칙 일부만 수정해도 나머지 기본값은 유지되어야 한다."""
    backend = DividendBackend(data_dir=str(tmp_path))

    response = backend.update_retirement_config(
        {
            "strategy_rules": {
                "rebalance_month": 3,
                "corporate": {
                    "sgov_target_months": 42,
                },
                "pension": {
                    "bond_target_months": 16,
                },
            }
        }
    )

    strategy_rules = response["data"]["strategy_rules"]
    assert strategy_rules["rebalance_month"] == 3
    assert strategy_rules["corporate"]["sgov_target_months"] == 42
    assert strategy_rules["corporate"]["november_sgov_target_months"] == 27
    assert strategy_rules["corporate"]["bond_floor_months"] == 12
    assert strategy_rules["pension"]["bond_target_months"] == 16
    assert strategy_rules["pension"]["sgov_target_months"] == 24
    assert strategy_rules["pension"]["sgov_floor_months"] == 12


def test_retirement_config_drops_unused_legacy_strategy_rule_fields(tmp_path):
    """저장 전용/레거시 strategy_rules는 현재 엔진 필드로 흡수하고 응답에서는 제거한다."""
    backend = DividendBackend(data_dir=str(tmp_path))

    response = backend.update_retirement_config(
        {
            "strategy_rules": {
                "rebalance_week": 4,
                "bear_market_freeze_enabled": False,
                "corporate": {
                    "sgov_warn_months": 29,
                    "sgov_crisis_months": 24,
                    "high_income_min_ratio": 0.2,
                },
                "pension": {
                    "sgov_min_years": 3,
                    "bond_min_years": 7,
                    "bond_min_total_ratio": 0.05,
                    "dividend_min_ratio": 0.1,
                },
            }
        }
    )

    strategy_rules = response["data"]["strategy_rules"]
    assert "rebalance_week" not in strategy_rules
    assert "bear_market_freeze_enabled" not in strategy_rules
    assert strategy_rules["corporate"]["november_sgov_target_months"] == 29
    assert "sgov_warn_months" not in strategy_rules["corporate"]
    assert "sgov_crisis_months" not in strategy_rules["corporate"]
    assert "high_income_min_ratio" not in strategy_rules["corporate"]
    assert strategy_rules["pension"]["sgov_target_months"] == 36
    assert "sgov_min_years" not in strategy_rules["pension"]
    assert "bond_min_years" not in strategy_rules["pension"]
    assert "bond_min_total_ratio" not in strategy_rules["pension"]
    assert "dividend_min_ratio" not in strategy_rules["pension"]


def test_retirement_config_defaults_file_no_longer_exposes_legacy_strategy_fields(tmp_path):
    """repo defaults로 초기화된 설정도 legacy strategy_rules를 노출하지 않아야 한다."""
    defaults_dir = Path(__file__).resolve().parents[1] / "defaults"
    backend = DividendBackend(data_dir=str(tmp_path), defaults_dir=str(defaults_dir))

    strategy_rules = backend.get_retirement_config()["strategy_rules"]

    assert "rebalance_week" not in strategy_rules
    assert "bear_market_freeze_enabled" not in strategy_rules
    assert strategy_rules["rebalance_month"] == 5
    assert strategy_rules["corporate"]["sgov_target_months"] == 30
    assert strategy_rules["corporate"]["november_sgov_target_months"] == 27
    assert "sgov_warn_months" not in strategy_rules["corporate"]
    assert "sgov_crisis_months" not in strategy_rules["corporate"]
    assert "high_income_min_ratio" not in strategy_rules["corporate"]
    assert "high_income_max_ratio" not in strategy_rules["corporate"]
    assert "growth_sell_years_left_threshold" not in strategy_rules["corporate"]
    assert strategy_rules["pension"]["sgov_target_months"] == 24
    assert "sgov_min_years" not in strategy_rules["pension"]
    assert "bond_min_years" not in strategy_rules["pension"]
    assert "bond_min_total_ratio" not in strategy_rules["pension"]
    assert "dividend_min_ratio" not in strategy_rules["pension"]
