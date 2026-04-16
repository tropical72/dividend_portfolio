from src.backend.api import DividendBackend


def test_retirement_config_includes_default_strategy_rules(tmp_path):
    """전략 규칙이 비어 있어도 기본값이 자동 보강되어야 한다."""
    backend = DividendBackend(data_dir=str(tmp_path))

    config = backend.get_retirement_config()

    assert "strategy_rules" in config
    assert config["strategy_rules"]["rebalance_month"] == 1
    assert config["strategy_rules"]["rebalance_week"] == 2
    assert config["strategy_rules"]["bear_market_freeze_enabled"] is True
    assert config["strategy_rules"]["corporate"]["sgov_target_months"] == 36
    assert config["strategy_rules"]["corporate"]["sgov_warn_months"] == 30
    assert config["strategy_rules"]["corporate"]["sgov_crisis_months"] == 24
    assert config["strategy_rules"]["corporate"]["high_income_min_ratio"] == 0.2
    assert config["strategy_rules"]["corporate"]["high_income_max_ratio"] == 0.35
    assert config["strategy_rules"]["corporate"]["growth_sell_years_left_threshold"] == 10
    assert config["strategy_rules"]["pension"]["sgov_min_years"] == 2
    assert config["strategy_rules"]["pension"]["bond_min_years"] == 5
    assert config["strategy_rules"]["pension"]["bond_min_total_ratio"] == 0.05
    assert config["strategy_rules"]["pension"]["dividend_min_ratio"] == 0.1


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
                    "bond_min_years": 7,
                },
            }
        }
    )

    strategy_rules = response["data"]["strategy_rules"]
    assert strategy_rules["rebalance_month"] == 3
    assert strategy_rules["rebalance_week"] == 2
    assert strategy_rules["corporate"]["sgov_target_months"] == 42
    assert strategy_rules["corporate"]["sgov_warn_months"] == 30
    assert strategy_rules["corporate"]["sgov_crisis_months"] == 24
    assert strategy_rules["pension"]["bond_min_years"] == 7
    assert strategy_rules["pension"]["bond_min_total_ratio"] == 0.05
