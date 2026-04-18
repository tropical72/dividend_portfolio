import { useState, useEffect } from "react";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Calculator,
  RefreshCcw,
  RotateCcw,
  User,
  Building2,
  Wallet2,
  Settings2,
  Plus,
  Trash2,
  Info,
  Activity,
  ShieldCheck,
  Gauge,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";
import type {
  RetirementConfig,
  AppSettings,
  PlannedCashflow,
  StrategyRules,
  UiLanguage,
} from "../types";

interface SettingsTabProps {
  onSettingsUpdate: () => void;
  globalSettings: AppSettings | null;
  globalRetireConfig: RetirementConfig | null;
}

type StrategyRulesUpdates = {
  rebalance_month?: number;
  rebalance_week?: number;
  bear_market_freeze_enabled?: boolean;
  corporate?: Partial<StrategyRules["corporate"]>;
  pension?: Partial<StrategyRules["pension"]>;
};

const USER_VISIBLE_ASSUMPTION_IDS = ["v1", "conservative"] as const;

const DEFAULT_STRATEGY_RULES: StrategyRules = {
  rebalance_month: 1,
  rebalance_week: 2,
  bear_market_freeze_enabled: true,
  corporate: {
    sgov_target_months: 36,
    sgov_warn_months: 30,
    sgov_crisis_months: 24,
    high_income_min_ratio: 0.2,
    high_income_max_ratio: 0.35,
    growth_sell_years_left_threshold: 10,
  },
  pension: {
    sgov_min_years: 2,
    bond_min_years: 5,
    bond_min_total_ratio: 0.05,
    dividend_min_ratio: 0.1,
  },
};

const DEFAULT_APPRECIATION_RATES = {
  cash_sgov: 0.1,
  fixed_income: 2.5,
  dividend_stocks: 5.5,
  growth_stocks: 9.5,
};

function getVisibleAssumptions(config: RetirementConfig) {
  return USER_VISIBLE_ASSUMPTION_IDS.map((id) => {
    const item = config.assumptions[id];
    if (!item) return null;
    return [id, item] as const;
  }).filter(Boolean) as Array<
    readonly [string, RetirementConfig["assumptions"][string]]
  >;
}

function SectionTitle({
  icon: Icon,
  title,
  color,
  tooltip,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  tooltip: string;
}) {
  const { isKorean } = useI18n();
  return (
    <div className="flex items-center justify-between mb-6">
      <h3
        className={cn(
          "flex items-center gap-3",
          isKorean
            ? "text-sm font-bold tracking-normal"
            : "text-xs font-black uppercase tracking-widest",
          color,
        )}
      >
        <Icon size={18} /> {title}
      </h3>
      <div className="group relative">
        <Info size={14} className="text-slate-600 cursor-help" />
        <div className="absolute right-0 bottom-full mb-2 w-64 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
          {tooltip}
        </div>
      </div>
    </div>
  );
}

export function SettingsTab({
  onSettingsUpdate,
  globalSettings,
  globalRetireConfig,
}: SettingsTabProps) {
  const { isKorean, setLanguage, t } = useI18n();
  const [settings, setSettings] = useState<AppSettings>({
    dart_api_key: "",
    gemini_api_key: "",
    default_capital: 10000,
    default_currency: "USD",
    ui_language: "ko" as UiLanguage,
    price_appreciation_rate: 3.0,
    appreciation_rates: { ...DEFAULT_APPRECIATION_RATES },
  });

  const [retireConfig, setRetireConfig] = useState<RetirementConfig | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
    if (globalSettings) {
      setSettings({
        dart_api_key: globalSettings.dart_api_key || "",
        gemini_api_key: globalSettings.gemini_api_key || "",
        default_capital: globalSettings.default_capital ?? 10000,
        default_currency: globalSettings.default_currency || "USD",
        ui_language: globalSettings.ui_language || "ko",
        price_appreciation_rate: globalSettings.price_appreciation_rate ?? 3.0,
        appreciation_rates: globalSettings.appreciation_rates || {
          ...DEFAULT_APPRECIATION_RATES,
        },
      });
    }
    if (globalRetireConfig) {
      setRetireConfig({
        ...JSON.parse(JSON.stringify(globalRetireConfig)),
        strategy_rules: {
          ...DEFAULT_STRATEGY_RULES,
          ...globalRetireConfig.strategy_rules,
          corporate: {
            ...DEFAULT_STRATEGY_RULES.corporate,
            ...globalRetireConfig.strategy_rules?.corporate,
          },
          pension: {
            ...DEFAULT_STRATEGY_RULES.pension,
            ...globalRetireConfig.strategy_rules?.pension,
          },
        },
      });
    }
  }, [globalSettings, globalRetireConfig]);

  const updateStrategyRules = (updates: StrategyRulesUpdates) => {
    if (!retireConfig) return;
    setRetireConfig({
      ...retireConfig,
      strategy_rules: {
        ...DEFAULT_STRATEGY_RULES,
        ...retireConfig.strategy_rules,
        ...updates,
        corporate: {
          ...DEFAULT_STRATEGY_RULES.corporate,
          ...retireConfig.strategy_rules?.corporate,
          ...updates.corporate,
        },
        pension: {
          ...DEFAULT_STRATEGY_RULES.pension,
          ...retireConfig.strategy_rules?.pension,
          ...updates.pension,
        },
      },
    });
  };

  const resetExecutionPolicy = () => {
    updateStrategyRules({
      rebalance_month: DEFAULT_STRATEGY_RULES.rebalance_month,
      rebalance_week: DEFAULT_STRATEGY_RULES.rebalance_week,
      bear_market_freeze_enabled:
        DEFAULT_STRATEGY_RULES.bear_market_freeze_enabled,
    });
  };

  const resetCorporateRules = () => {
    updateStrategyRules({ corporate: DEFAULT_STRATEGY_RULES.corporate });
  };

  const resetPensionRules = () => {
    updateStrategyRules({ pension: DEFAULT_STRATEGY_RULES.pension });
  };

  const resetAllStrategyRules = () => {
    updateStrategyRules(DEFAULT_STRATEGY_RULES);
  };

  const handleSave = async () => {
    if (!retireConfig) return;
    setLoading(true);
    setStatus(null);
    try {
      await fetch("http://localhost:8000/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      await fetch("http://localhost:8000/api/retirement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retireConfig),
      });
      setStatus({
        type: "success",
        message: t("settings.saveSuccess"),
      });
      onSettingsUpdate();
    } catch {
      setStatus({ type: "error", message: t("settings.saveError") });
    } finally {
      setLoading(false);
    }
  };

  const addCashflow = () => {
    if (!retireConfig) return;
    const newEvent: PlannedCashflow = {
      id: crypto.randomUUID(),
      type: "INFLOW",
      entity: "CORP",
      amount: 0,
      currency: "USD",
      year: 2030,
      month: 1,
      description: t("settings.descriptionPlaceholder"),
    };
    setRetireConfig({
      ...retireConfig,
      planned_cashflows: [...(retireConfig.planned_cashflows || []), newEvent],
    });
  };

  const updateCashflow = (id: string, updates: Partial<PlannedCashflow>) => {
    if (!retireConfig || !retireConfig.planned_cashflows) return;
    if (updates.month !== undefined) {
      if (updates.month < 1) updates.month = 1;
      if (updates.month > 12) updates.month = 12;
    }
    setRetireConfig({
      ...retireConfig,
      planned_cashflows: retireConfig.planned_cashflows.map((ev) =>
        ev.id === id ? { ...ev, ...updates } : ev,
      ),
    });
  };

  const removeCashflow = (id: string) => {
    if (!retireConfig || !retireConfig.planned_cashflows) return;
    setRetireConfig({
      ...retireConfig,
      planned_cashflows: retireConfig.planned_cashflows.filter(
        (e) => e.id !== id,
      ),
    });
  };

  if (!retireConfig || !retireConfig.user_profile)
    return (
      <div className="p-20 text-center animate-pulse text-sm font-black uppercase text-slate-500">
        {t("settings.loading")}
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-12 pb-40 px-4">
      <div className="border-b border-slate-800 pb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-50 flex items-center gap-4 tracking-tight">
            <Calculator className="text-emerald-400" size={32} />
            <span data-testid="settings-title">{t("settings.title")}</span>
          </h2>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            {t("settings.subtitle")}
          </p>
        </div>
        <div className="group relative">
          <Info size={20} className="text-slate-600 cursor-help" />
          <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 p-4 rounded-2xl text-[11px] text-slate-200 font-bold hidden group-hover:block z-[60] border border-slate-700 shadow-2xl leading-relaxed text-left animate-in fade-in slide-in-from-top-2">
            {t("settings.tooltip")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <SectionTitle
                icon={User}
                title={t("settings.userProfile")}
                color="text-blue-400"
                tooltip={t("settings.userProfileTooltip")}
              />
              <div className="grid grid-cols-2 gap-4">
                <InputGroup
                  label={t("settings.birthYear")}
                  unit={t("settings.year")}
                  tooltip={t("settings.birthYearTooltip")}
                  value={retireConfig.user_profile.birth_year}
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      user_profile: {
                        ...retireConfig.user_profile,
                        birth_year: Math.floor(parseInt(v) || 0),
                      },
                    })
                  }
                />
                <InputGroup
                  label={t("settings.birthMonth")}
                  unit={t("settings.month")}
                  tooltip={t("settings.birthMonthTooltip")}
                  value={retireConfig.user_profile.birth_month}
                  onChange={(v) => {
                    let val = Math.floor(parseInt(v) || 1);
                    val = Math.max(1, Math.min(12, val));
                    setRetireConfig({
                      ...retireConfig,
                      user_profile: {
                        ...retireConfig.user_profile,
                        birth_month: val,
                      },
                    });
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
                <InputGroup
                  label={t("settings.privatePension")}
                  unit={t("settings.age")}
                  tooltip={t("settings.privatePensionTooltip")}
                  value={retireConfig.user_profile.private_pension_start_age}
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      user_profile: {
                        ...retireConfig.user_profile,
                        private_pension_start_age: Math.floor(parseInt(v) || 0),
                      },
                    })
                  }
                />
              </div>
            </section>

            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <SectionTitle
                icon={ShieldCheck}
                title={t("settings.retirementIncome")}
                color="text-cyan-400"
                tooltip={t("settings.retirementIncomeTooltip")}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup
                  label={t("settings.nationalPension")}
                  unit={t("settings.age")}
                  tooltip={t("settings.nationalPensionTooltip")}
                  testId="input-group-national-pension-start-age"
                  value={retireConfig.user_profile.national_pension_start_age}
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      user_profile: {
                        ...retireConfig.user_profile,
                        national_pension_start_age: Math.floor(
                          parseInt(v) || 0,
                        ),
                      },
                    })
                  }
                />
                <InputGroup
                  label={t("settings.nationalPensionAmount")}
                  isCurrency
                  tooltip={t("settings.nationalPensionAmountTooltip")}
                  testId="input-group-national-pension-amount"
                  value={retireConfig.simulation_params.national_pension_amount}
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      simulation_params: {
                        ...retireConfig.simulation_params,
                        national_pension_amount: parseInt(v) || 0,
                      },
                    })
                  }
                />
              </div>
            </section>

            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <SectionTitle
                icon={Wallet2}
                title={t("settings.pensionAssets")}
                color="text-amber-400"
                tooltip={t("settings.pensionAssetsTooltip")}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup
                  label={t("settings.initialCapital")}
                  value={retireConfig.pension_params.initial_investment}
                  isCurrency
                  tooltip={t("settings.initialCapitalTooltip")}
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      pension_params: {
                        ...retireConfig.pension_params,
                        initial_investment: parseInt(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={t("settings.withdrawal")}
                  value={retireConfig.pension_params.monthly_withdrawal_target}
                  isCurrency
                  tooltip={t("settings.withdrawalTooltip")}
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      pension_params: {
                        ...retireConfig.pension_params,
                        monthly_withdrawal_target: parseInt(v) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup
                  label={t("settings.severance")}
                  value={retireConfig.pension_params.severance_reserve}
                  isCurrency
                  tooltip={t("settings.severanceTooltip")}
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      pension_params: {
                        ...retireConfig.pension_params,
                        severance_reserve: parseInt(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={t("settings.other")}
                  value={retireConfig.pension_params.other_reserve}
                  isCurrency
                  tooltip={t("settings.otherTooltip")}
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      pension_params: {
                        ...retireConfig.pension_params,
                        other_reserve: parseInt(v) || 0,
                      },
                    })
                  }
                />
              </div>
            </section>
          </div>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle
              icon={Building2}
              title={t("settings.corporateSetup")}
              color="text-emerald-400"
              tooltip={t("settings.corporateSetupTooltip")}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputGroup
                label={t("settings.totalInv")}
                isCurrency
                tooltip={t("settings.totalInvTooltip")}
                value={retireConfig.corp_params.initial_investment}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    corp_params: {
                      ...retireConfig.corp_params,
                      initial_investment: parseInt(v) || 0,
                    },
                  })
                }
              />
              <InputGroup
                label={t("settings.capital")}
                isCurrency
                tooltip={t("settings.capitalTooltip")}
                value={retireConfig.corp_params.capital_stock}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    corp_params: {
                      ...retireConfig.corp_params,
                      capital_stock: parseInt(v) || 0,
                    },
                  })
                }
              />
              <InputGroup
                label={t("settings.loan")}
                isCurrency
                tooltip={t("settings.loanTooltip")}
                value={retireConfig.corp_params.initial_shareholder_loan}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    corp_params: {
                      ...retireConfig.corp_params,
                      initial_shareholder_loan: parseInt(v) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-800 pt-6">
              <InputGroup
                label={t("settings.salary")}
                isCurrency
                tooltip={t("settings.salaryTooltip")}
                value={retireConfig.corp_params.monthly_salary}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    corp_params: {
                      ...retireConfig.corp_params,
                      monthly_salary: parseInt(v) || 0,
                    },
                  })
                }
              />
              <InputGroup
                label={t("settings.fixedCost")}
                isCurrency
                tooltip={t("settings.fixedCostTooltip")}
                value={retireConfig.corp_params.monthly_fixed_cost}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    corp_params: {
                      ...retireConfig.corp_params,
                      monthly_fixed_cost: parseInt(v) || 0,
                    },
                  })
                }
              />
              <InputGroup
                label={t("settings.employees")}
                unit="Count"
                tooltip={t("settings.employeesTooltip")}
                value={retireConfig.corp_params.employee_count}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    corp_params: {
                      ...retireConfig.corp_params,
                      employee_count: parseInt(v) || 0,
                    },
                  })
                }
              />
            </div>
          </section>

          <section
            className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-8"
            data-testid="strategy-rules-section"
          >
            <div className="flex items-center justify-between gap-4">
              <SectionTitle
                icon={Settings2}
                title={t("settings.strategyRules")}
                color="text-violet-400"
                tooltip={t("settings.strategyRulesTooltip")}
              />
              <button
                onClick={resetAllStrategyRules}
                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-black rounded-xl border border-slate-700 uppercase tracking-widest"
                data-testid="reset-strategy-rules"
              >
                <RotateCcw size={14} />
                {t("settings.resetAll")}
              </button>
            </div>

            <div className="bg-slate-950/40 rounded-[2rem] border border-slate-800 p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h4
                  className={cn(
                    isKorean
                      ? "text-sm font-bold tracking-normal text-sky-300"
                      : "text-xs font-black uppercase tracking-widest text-sky-400",
                  )}
                >
                  {t("settings.executionPolicy")}
                </h4>
                <button
                  onClick={resetExecutionPolicy}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-black rounded-xl border border-slate-700 uppercase tracking-widest"
                  data-testid="reset-execution-policy"
                >
                  <RotateCcw size={12} />
                  {t("settings.reset")}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputGroup
                  label={t("settings.rebalanceMonth")}
                  unit={t("settings.month")}
                  tooltip={t("settings.rebalanceMonthTooltip")}
                  testId="input-group-rebalance-month"
                  value={retireConfig.strategy_rules.rebalance_month}
                  onChange={(v) =>
                    updateStrategyRules({
                      rebalance_month: Math.max(
                        1,
                        Math.min(12, parseInt(v) || 1),
                      ),
                    })
                  }
                />
                <InputGroup
                  label={t("settings.rebalanceWeek")}
                  unit="Week"
                  tooltip={t("settings.rebalanceWeekTooltip")}
                  value={retireConfig.strategy_rules.rebalance_week}
                  onChange={(v) =>
                    updateStrategyRules({
                      rebalance_week: Math.max(
                        1,
                        Math.min(5, parseInt(v) || 1),
                      ),
                    })
                  }
                />
                <BooleanRuleCard
                  label={t("settings.bearFreeze")}
                  tooltip={t("settings.bearFreezeTooltip")}
                  testId="toggle-bear-freeze"
                  checked={
                    retireConfig.strategy_rules.bear_market_freeze_enabled
                  }
                  onChange={(checked) =>
                    updateStrategyRules({ bear_market_freeze_enabled: checked })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-slate-950/40 rounded-[2rem] border border-slate-800 p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <h4
                    className={cn(
                      isKorean
                        ? "text-sm font-bold tracking-normal text-emerald-300"
                        : "text-xs font-black uppercase tracking-widest text-emerald-400",
                    )}
                  >
                    {t("settings.corporateRules")}
                  </h4>
                  <button
                    onClick={resetCorporateRules}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-black rounded-xl border border-slate-700 uppercase tracking-widest"
                    data-testid="reset-corporate-rules"
                  >
                    <RotateCcw size={12} />
                    {t("settings.reset")}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup
                    label={t("settings.corpTargetBuffer")}
                    unit="Mo"
                    tooltip={t("settings.corpTargetBufferTooltip")}
                    testId="input-group-corp-target-buffer"
                    value={
                      retireConfig.strategy_rules.corporate.sgov_target_months
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        corporate: {
                          sgov_target_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.corpWarnBuffer")}
                    unit="Mo"
                    tooltip={t("settings.corpWarnBufferTooltip")}
                    value={
                      retireConfig.strategy_rules.corporate.sgov_warn_months
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        corporate: {
                          sgov_warn_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.corpCrisisBuffer")}
                    unit="Mo"
                    tooltip={t("settings.corpCrisisBufferTooltip")}
                    value={
                      retireConfig.strategy_rules.corporate.sgov_crisis_months
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        corporate: {
                          sgov_crisis_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.growthSellYears")}
                    unit="Years"
                    tooltip={t("settings.growthSellYearsTooltip")}
                    value={
                      retireConfig.strategy_rules.corporate
                        .growth_sell_years_left_threshold
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        corporate: {
                          growth_sell_years_left_threshold: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <PercentRuleInput
                    label={t("settings.highIncomeMin")}
                    tooltip={t("settings.highIncomeMinTooltip")}
                    value={
                      retireConfig.strategy_rules.corporate
                        .high_income_min_ratio
                    }
                    onChange={(value) =>
                      updateStrategyRules({
                        corporate: {
                          high_income_min_ratio: value,
                        },
                      })
                    }
                  />
                  <PercentRuleInput
                    label={t("settings.highIncomeMax")}
                    tooltip={t("settings.highIncomeMaxTooltip")}
                    value={
                      retireConfig.strategy_rules.corporate
                        .high_income_max_ratio
                    }
                    onChange={(value) =>
                      updateStrategyRules({
                        corporate: {
                          high_income_max_ratio: value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="bg-slate-950/40 rounded-[2rem] border border-slate-800 p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <h4
                    className={cn(
                      isKorean
                        ? "text-sm font-bold tracking-normal text-amber-300"
                        : "text-xs font-black uppercase tracking-widest text-amber-400",
                    )}
                  >
                    {t("settings.pensionRules")}
                  </h4>
                  <button
                    onClick={resetPensionRules}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-black rounded-xl border border-slate-700 uppercase tracking-widest"
                    data-testid="reset-pension-rules"
                  >
                    <RotateCcw size={12} />
                    {t("settings.reset")}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup
                    label={t("settings.pensionSgovMin")}
                    unit="Years"
                    tooltip={t("settings.pensionSgovMinTooltip")}
                    value={retireConfig.strategy_rules.pension.sgov_min_years}
                    onChange={(v) =>
                      updateStrategyRules({
                        pension: {
                          sgov_min_years: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.bondMinYears")}
                    unit="Years"
                    tooltip={t("settings.bondMinYearsTooltip")}
                    value={retireConfig.strategy_rules.pension.bond_min_years}
                    onChange={(v) =>
                      updateStrategyRules({
                        pension: {
                          bond_min_years: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <PercentRuleInput
                    label={t("settings.bondMinRatio")}
                    tooltip={t("settings.bondMinRatioTooltip")}
                    testId="input-group-bond-min-ratio"
                    value={
                      retireConfig.strategy_rules.pension.bond_min_total_ratio
                    }
                    onChange={(value) =>
                      updateStrategyRules({
                        pension: {
                          bond_min_total_ratio: value,
                        },
                      })
                    }
                  />
                  <PercentRuleInput
                    label={t("settings.dividendMinRatio")}
                    tooltip={t("settings.dividendMinRatioTooltip")}
                    value={
                      retireConfig.strategy_rules.pension.dividend_min_ratio
                    }
                    onChange={(value) =>
                      updateStrategyRules({
                        pension: {
                          dividend_min_ratio: value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <div className="flex justify-between items-center">
              <h3
                className={cn(
                  "flex items-center gap-3 text-rose-400",
                  isKorean
                    ? "text-sm font-bold tracking-normal"
                    : "text-xs font-black uppercase tracking-widest",
                )}
              >
                <Activity size={18} /> {t("settings.cashflowEvents")}
              </h3>
              <div className="flex items-center gap-4">
                <div className="group relative">
                  <Info size={14} className="text-slate-600 cursor-help" />
                  <div className="absolute right-0 bottom-full mb-2 w-64 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                    {t("settings.cashflowEventsTooltip")}
                  </div>
                </div>
                <button
                  onClick={addCashflow}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-xl border border-slate-700 transition-all uppercase tracking-widest"
                >
                  <Plus size={16} /> {t("settings.addEvent")}
                </button>
              </div>
            </div>
            <div className="space-y-6">
              {!retireConfig.planned_cashflows ||
              retireConfig.planned_cashflows.length === 0 ? (
                <p className="text-center py-10 text-slate-600 text-[11px] font-black uppercase border border-dashed border-slate-800 rounded-2xl">
                  {t("settings.noEvents")}
                </p>
              ) : (
                retireConfig.planned_cashflows.map((ev) => (
                  <div
                    key={ev.id}
                    data-testid={`cashflow-event-${ev.id}`}
                    className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-6 group relative"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-3 flex flex-col gap-2">
                        <label
                          className={cn(
                            "ml-1",
                            isKorean
                              ? "text-xs font-bold text-slate-400 tracking-normal"
                              : "text-[11px] font-black text-slate-500 uppercase",
                          )}
                        >
                          {t("settings.typeTarget")}
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={ev.type}
                            onChange={(e) =>
                              updateCashflow(ev.id, {
                                type: e.target.value as PlannedCashflow["type"],
                              })
                            }
                            className="h-11 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 text-[11px] font-black uppercase text-slate-300 outline-none"
                          >
                            <option value="INFLOW">
                              {t("settings.inflow")}
                            </option>
                            <option value="OUTFLOW">
                              {t("settings.outflow")}
                            </option>
                          </select>
                          <select
                            value={ev.entity}
                            onChange={(e) =>
                              updateCashflow(ev.id, {
                                entity: e.target
                                  .value as PlannedCashflow["entity"],
                              })
                            }
                            className="h-11 flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2 text-[11px] font-black uppercase text-slate-300 outline-none"
                          >
                            <option value="CORP">
                              {t("settings.corpShort")}
                            </option>
                            <option value="PENSION">
                              {t("settings.penShort")}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div className="md:col-span-5 flex flex-col gap-2">
                        <label
                          className={cn(
                            "ml-1",
                            isKorean
                              ? "text-xs font-bold text-slate-400 tracking-normal"
                              : "text-[11px] font-black text-slate-500 uppercase",
                          )}
                        >
                          {t("settings.amount")}
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={ev.currency || "USD"}
                            onChange={(e) =>
                              updateCashflow(ev.id, {
                                currency: e.target
                                  .value as PlannedCashflow["currency"],
                              })
                            }
                            className="h-11 w-20 bg-slate-800 border border-slate-700 rounded-xl px-2 text-[11px] font-black text-slate-400 outline-none"
                          >
                            <option value="USD">$</option>
                            <option value="KRW">₩</option>
                          </select>
                          <input
                            type="text"
                            value={Math.floor(ev.amount || 0).toLocaleString()}
                            onChange={(e) => {
                              const val =
                                parseInt(e.target.value.replace(/,/g, "")) || 0;
                              updateCashflow(ev.id, { amount: val });
                            }}
                            className="h-11 flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 text-base font-black text-emerald-400 outline-none focus:border-emerald-500/50"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 flex flex-col gap-2">
                        <label
                          className={cn(
                            "ml-1",
                            isKorean
                              ? "text-xs font-bold text-slate-400 tracking-normal"
                              : "text-[11px] font-black text-slate-500 uppercase",
                          )}
                        >
                          {t("settings.year")}
                        </label>
                        <input
                          type="number"
                          value={Math.floor(ev.year || 2030)}
                          onChange={(e) =>
                            updateCashflow(ev.id, {
                              year: parseInt(e.target.value) || 2030,
                            })
                          }
                          className="h-11 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 text-sm font-black text-slate-200 text-center outline-none"
                        />
                      </div>
                      <div className="md:col-span-2 flex flex-col gap-2">
                        <label
                          className={cn(
                            "ml-1",
                            isKorean
                              ? "text-xs font-bold text-slate-400 tracking-normal"
                              : "text-[11px] font-black text-slate-500 uppercase",
                          )}
                        >
                          {t("settings.month")}
                        </label>
                        <input
                          type="number"
                          value={Math.floor(ev.month || 1)}
                          onChange={(e) =>
                            updateCashflow(ev.id, {
                              month: parseInt(e.target.value) || 1,
                            })
                          }
                          className="h-11 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 text-sm font-black text-slate-200 text-center outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-900">
                      <label
                        className={cn(
                          "ml-1",
                          isKorean
                            ? "text-xs font-bold text-slate-400 tracking-normal"
                            : "text-[11px] font-black text-slate-500 uppercase",
                        )}
                      >
                        {t("settings.description")}
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={ev.description || ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            updateCashflow(ev.id, {
                              description: e.target.value,
                            })
                          }
                          className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 placeholder:text-slate-700 outline-none focus:border-slate-600 focus:bg-slate-900"
                          placeholder={t("settings.descriptionPlaceholder")}
                        />
                        <button
                          onClick={() => removeCashflow(ev.id)}
                          type="button"
                          aria-label={t("settings.deleteEvent")}
                          data-testid={`delete-cashflow-${ev.id}`}
                          className="inline-flex items-center gap-2 px-4 py-3 text-slate-500 hover:text-rose-400 bg-slate-900 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-800"
                        >
                          <Trash2 size={20} />
                          <span
                            className={cn(
                              isKorean
                                ? "text-xs font-bold tracking-normal"
                                : "text-[11px] font-black uppercase tracking-widest",
                            )}
                          >
                            {t("settings.deleteEvent")}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle
              icon={Clock}
              title={t("settings.simControl")}
              color="text-slate-400"
              tooltip={t("settings.simControlTooltip")}
            />
            <div className="grid grid-cols-1 gap-4">
              <InputGroup
                label={t("settings.monthlyLivingCost")}
                isCurrency
                tooltip={t("settings.monthlyLivingCostTooltip")}
                testId="input-group-monthly-living-cost"
                value={retireConfig.simulation_params.target_monthly_cashflow}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    simulation_params: {
                      ...retireConfig.simulation_params,
                      target_monthly_cashflow: parseInt(v) || 0,
                    },
                  })
                }
              />
              <InputGroup
                label={t("settings.duration")}
                unit="Years"
                tooltip={t("settings.durationTooltip")}
                testId="input-group-duration"
                value={retireConfig.simulation_params.simulation_years}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    simulation_params: {
                      ...retireConfig.simulation_params,
                      simulation_years: parseInt(v) || 30,
                    },
                  })
                }
              />
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle
              icon={Settings2}
              title={t("settings.basicConstants")}
              color="text-slate-400"
              tooltip={t("settings.basicConstantsTooltip")}
            />
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 ml-1">
                  <label
                    className={cn(
                      isKorean
                        ? "text-xs font-bold text-slate-400 tracking-normal"
                        : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                    )}
                  >
                    {t("settings.uiLanguage")}
                  </label>
                  <div className="group relative">
                    <Info size={12} className="text-slate-600 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-56 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                      {t("settings.uiLanguageTooltip")}
                    </div>
                  </div>
                </div>
                <select
                  data-testid="ui-language-select"
                  value={settings.ui_language}
                  onChange={(e) => {
                    const nextLanguage = e.target.value as UiLanguage;
                    setSettings({
                      ...settings,
                      ui_language: nextLanguage,
                    });
                    setLanguage(nextLanguage);
                  }}
                  className="h-11 w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="ko">{t("settings.korean")}</option>
                  <option value="en">{t("settings.english")}</option>
                </select>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-1.5 ml-1">
                  <label
                    className={cn(
                      isKorean
                        ? "text-xs font-bold text-slate-400 tracking-normal"
                        : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                    )}
                  >
                    {t("settings.healthUnitPrice")}
                  </label>
                  <div className="group relative">
                    <Info size={12} className="text-slate-600 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                      {t("settings.healthUnitPriceTooltip")}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={
                      retireConfig.tax_and_insurance?.point_unit_price || 208.4
                    }
                    onChange={(e) =>
                      setRetireConfig({
                        ...retireConfig,
                        tax_and_insurance: {
                          ...retireConfig.tax_and_insurance,
                          point_unit_price: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-600">
                    KRW
                  </span>
                </div>
              </div>
              <InputGroup
                label={t("settings.sgovBuffer")}
                unit="Mo"
                tooltip={t("settings.sgovBufferTooltip")}
                value={
                  retireConfig.trigger_thresholds?.target_buffer_months || 24
                }
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    trigger_thresholds: {
                      ...retireConfig.trigger_thresholds,
                      target_buffer_months: parseInt(v) || 0,
                    },
                  })
                }
              />
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <SectionTitle
                icon={Layers}
                title={t("settings.appreciationRates")}
                color="text-emerald-400"
                tooltip={t("settings.appreciationRatesTooltip")}
              />
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    appreciation_rates: { ...DEFAULT_APPRECIATION_RATES },
                  })
                }
                className="shrink-0 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700 transition-all"
                title={t("settings.restoreSystemDefault")}
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                <InputGroup
                  label={t("settings.catCash")}
                  unit="%"
                  value={(settings.appreciation_rates?.cash_sgov || 0) * 1}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      appreciation_rates: {
                        ...settings.appreciation_rates!,
                        cash_sgov: parseFloat(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={t("settings.catFixed")}
                  unit="%"
                  value={(settings.appreciation_rates?.fixed_income || 0) * 1}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      appreciation_rates: {
                        ...settings.appreciation_rates!,
                        fixed_income: parseFloat(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={t("settings.catDividend")}
                  unit="%"
                  value={
                    (settings.appreciation_rates?.dividend_stocks || 0) * 1
                  }
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      appreciation_rates: {
                        ...settings.appreciation_rates!,
                        dividend_stocks: parseFloat(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={t("settings.catGrowth")}
                  unit="%"
                  value={(settings.appreciation_rates?.growth_stocks || 0) * 1}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      appreciation_rates: {
                        ...settings.appreciation_rates!,
                        growth_stocks: parseFloat(v) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle
              icon={ShieldCheck}
              title={t("settings.assumptions")}
              color="text-slate-400"
              tooltip={t("settings.assumptionsTooltip")}
            />
            <div className="space-y-4">
              {getVisibleAssumptions(retireConfig).map(([id, item]) => (
                <div
                  key={id}
                  className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4
                      className={cn(
                        isKorean
                          ? "text-xs font-bold text-slate-400 tracking-normal"
                          : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                      )}
                    >
                      {id === "v1"
                        ? t("retirement.assumption.standard")
                        : t("retirement.assumption.conservative")}
                    </h4>
                    <div className="group relative">
                      <Info size={12} className="text-slate-700 cursor-help" />
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                        {id === "v1"
                          ? t("settings.assumptionStandardTooltip")
                          : t("settings.assumptionConservativeTooltip")}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <EditableInput
                      label={t("settings.tr")}
                      unit="%"
                      initialValue={
                        (item.master_return || item.expected_return) * 100
                      }
                      systemDefault={
                        (id === "v1"
                          ? item.master_return || item.expected_return
                          : 0.035) * 100
                      }
                      tooltip={t("settings.trTooltip")}
                      resetTitle={t("settings.restoreSystemDefault")}
                      readOnly={id === "v1"}
                      onCommit={(v) =>
                        setRetireConfig({
                          ...retireConfig,
                          assumptions: {
                            ...retireConfig.assumptions,
                            [id]: {
                              ...item,
                              master_return:
                                id === "v1" ? item.master_return : v / 100,
                              expected_return:
                                id === "v1" ? item.expected_return : v / 100,
                            },
                          },
                        })
                      }
                    />
                    <EditableInput
                      label={t("settings.inflationRate")}
                      unit="%"
                      initialValue={
                        (item.master_inflation || item.inflation_rate) * 100
                      }
                      systemDefault={id === "v1" ? 0.025 : 0.035}
                      tooltip={t("settings.inflationRateTooltip")}
                      resetTitle={t("settings.restoreSystemDefault")}
                      onCommit={(v) =>
                        setRetireConfig({
                          ...retireConfig,
                          assumptions: {
                            ...retireConfig.assumptions,
                            [id]: {
                              ...item,
                              master_inflation: v / 100,
                              inflation_rate: v / 100,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 relative">
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full p-8 flex items-center justify-between hover:bg-slate-800/20 transition-all group rounded-[2.5rem]"
              data-testid="advanced-settings-toggle"
            >
              <div
                className={cn(
                  "flex items-center gap-3 text-amber-500",
                  isKorean
                    ? "text-sm font-bold tracking-normal"
                    : "text-xs font-black uppercase tracking-widest",
                )}
              >
                <Gauge size={18} /> {t("settings.advancedEngine")}
                <div className="group relative ml-2">
                  <Info size={14} className="text-slate-700 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-200 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                    {t("settings.advancedEngineTooltip")}
                  </div>
                </div>
              </div>
              {isAdvancedOpen ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>
            {isAdvancedOpen && (
              <div
                className="px-8 pb-8 space-y-6 animate-in slide-in-from-top duration-300"
                data-testid="advanced-settings-content"
              >
                <div className="space-y-6 border-t border-slate-800 pt-6">
                  <InputGroup
                    label={t("settings.highIncomeCap")}
                    unit="%"
                    tooltip={t("settings.highIncomeCapTooltip")}
                    value={
                      retireConfig.trigger_thresholds.high_income_cap_rate * 100
                    }
                    onChange={(v) =>
                      setRetireConfig({
                        ...retireConfig,
                        trigger_thresholds: {
                          ...retireConfig.trigger_thresholds,
                          high_income_cap_rate: parseFloat(v) / 100,
                        },
                      })
                    }
                  />
                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <h4
                        className={cn(
                          isKorean
                            ? "text-xs font-bold text-slate-400 tracking-normal"
                            : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                        )}
                      >
                        {t("settings.yieldMultipliers")}
                      </h4>
                      <div className="group relative">
                        <Info
                          size={12}
                          className="text-slate-700 cursor-help"
                        />
                        <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                          {t("settings.yieldMultipliersTooltip")}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup
                        label={t("settings.equityMult")}
                        unit="x"
                        tooltip={t("settings.equityMultTooltip")}
                        testId="input-group-equity-mult"
                        value={
                          retireConfig.trigger_thresholds
                            .equity_yield_multiplier * 100
                        }
                        onChange={(v) =>
                          setRetireConfig({
                            ...retireConfig,
                            trigger_thresholds: {
                              ...retireConfig.trigger_thresholds,
                              equity_yield_multiplier: parseFloat(v) / 100,
                            },
                          })
                        }
                      />
                      <InputGroup
                        label={t("settings.debtMult")}
                        unit="x"
                        tooltip={t("settings.debtMultTooltip")}
                        testId="input-group-debt-mult"
                        tooltipAlign="right"
                        value={
                          retireConfig.trigger_thresholds
                            .debt_yield_multiplier * 100
                        }
                        onChange={(v) =>
                          setRetireConfig({
                            ...retireConfig,
                            trigger_thresholds: {
                              ...retireConfig.trigger_thresholds,
                              debt_yield_multiplier: parseFloat(v) / 100,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <h4
                        className={cn(
                          isKorean
                            ? "text-xs font-bold text-slate-400 tracking-normal"
                            : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                        )}
                      >
                        {t("settings.triggerThresholds")}
                      </h4>
                      <div className="group relative">
                        <Info
                          size={12}
                          className="text-slate-700 cursor-help"
                        />
                        <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                          {t("settings.triggerThresholdsTooltip")}
                        </div>
                      </div>
                    </div>
                    <InputGroup
                      label={t("settings.marketPanic")}
                      unit="%"
                      tooltip={t("settings.marketPanicTooltip")}
                      value={
                        retireConfig.trigger_thresholds.market_panic_threshold *
                        100
                      }
                      onChange={(v) =>
                        setRetireConfig({
                          ...retireConfig,
                          trigger_thresholds: {
                            ...retireConfig.trigger_thresholds,
                            market_panic_threshold: parseFloat(v) / 100,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-10">
          <div className="flex-1">
            {status && (
              <div
                className={cn(
                  "flex items-center gap-3 text-sm font-bold",
                  status.type === "success"
                    ? "text-emerald-400"
                    : "text-red-400",
                )}
              >
                {status.type === "success" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                {status.message}
              </div>
            )}
            {!status && (
              <div className="flex items-center gap-2 px-2">
                <p
                  className={cn(
                    isKorean
                      ? "text-xs font-bold text-slate-400 tracking-normal"
                      : "text-slate-500 text-[11px] font-black uppercase tracking-widest",
                  )}
                >
                  {t("settings.commitHint")}
                </p>
                <div className="group relative">
                  <Info size={12} className="text-slate-700 cursor-help" />
                  <div className="absolute bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                    {t("settings.commitTooltip")}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            data-testid="apply-settings-button"
            className="flex items-center gap-3 px-10 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-slate-950 font-black rounded-xl transition-all shadow-lg text-xs"
          >
            {loading ? (
              <RefreshCcw className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {loading ? t("settings.syncing") : t("settings.applyAllChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputGroup({
  label,
  value,
  onChange,
  isCurrency = false,
  unit,
  tooltip,
  tooltipAlign = "left",
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  isCurrency?: boolean;
  unit?: string;
  tooltip?: string;
  tooltipAlign?: "left" | "right";
  testId?: string;
}) {
  const { isKorean } = useI18n();
  const numericValue = value || 0;
  const displayValue = isCurrency
    ? Math.floor(numericValue).toLocaleString()
    : numericValue.toString();
  return (
    <div
      className="space-y-1.5"
      data-testid={
        testId ?? `input-group-${label.toLowerCase().replace(/\s+/g, "-")}`
      }
    >
      <div className="flex items-center gap-1.5 ml-1">
        <label
          className={cn(
            isKorean
              ? "text-xs font-bold text-slate-400 tracking-normal"
              : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
          )}
        >
          {label}
        </label>
        {tooltip && (
          <div className="group relative">
            <Info
              size={12}
              className="text-slate-600 cursor-help"
              data-testid="tooltip-icon"
            />
            <div
              className={cn(
                "absolute bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95",
                tooltipAlign === "right" ? "right-0" : "left-0",
              )}
            >
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            const rawValue = e.target.value.replace(/,/g, "");
            onChange(rawValue === "" ? "0" : rawValue);
          }}
          className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500 transition-all"
        />
        {(isCurrency || unit) && (
          <span
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2",
              isKorean
                ? "text-xs font-bold text-slate-500"
                : "text-[11px] font-black text-slate-600",
            )}
          >
            {isCurrency ? "KRW" : unit}
          </span>
        )}
      </div>
    </div>
  );
}

function EditableInput({
  id,
  label,
  unit,
  initialValue,
  systemDefault,
  tooltip,
  resetTitle,
  readOnly = false,
  onCommit,
}: {
  id?: string;
  label: string;
  unit?: string;
  initialValue: number;
  systemDefault: number;
  tooltip: string;
  resetTitle: string;
  readOnly?: boolean;
  onCommit: (val: number) => void;
}) {
  const { isKorean } = useI18n();
  const [value, setValue] = useState(initialValue.toFixed(2));
  useEffect(() => {
    setValue(initialValue.toFixed(2));
  }, [initialValue]);
  const handleBlur = () => {
    if (readOnly) {
      setValue(initialValue.toFixed(2));
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onCommit(num);
      setValue(num.toFixed(2));
    } else {
      setValue(initialValue.toFixed(2));
    }
  };
  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 ml-1">
        <label
          className={cn(
            isKorean
              ? "text-xs font-bold text-slate-400 tracking-normal"
              : "text-[11px] font-black text-slate-500 uppercase",
          )}
        >
          {label}
        </label>
        <div className="group relative">
          <Info size={10} className="text-slate-700 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
            {tooltip}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 flex items-center">
          <input
            id={id}
            data-testid={id}
            type="text"
            readOnly={readOnly}
            className={cn(
              "w-full border rounded-xl h-11 px-4 text-sm font-black outline-none pr-10",
              readOnly
                ? "bg-slate-950 text-slate-300 border-slate-800 cursor-default"
                : "bg-slate-900 text-emerald-400 border-slate-800 focus:border-blue-500/50",
            )}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.target as HTMLInputElement).blur()
            }
          />
          {unit && (
            <span
              className={cn(
                "absolute right-4",
                isKorean
                  ? "text-xs font-bold text-slate-500"
                  : "text-[11px] font-black text-slate-600",
              )}
            >
              {unit}
            </span>
          )}
        </div>
        {!readOnly && Math.abs(initialValue - systemDefault) > 0.01 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommit(systemDefault);
            }}
            className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl text-blue-400 transition-all flex-shrink-0"
            title={resetTitle}
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function PercentRuleInput({
  label,
  tooltip,
  value,
  onChange,
  testId,
}: {
  label: string;
  tooltip: string;
  value: number;
  onChange: (value: number) => void;
  testId?: string;
}) {
  const { isKorean } = useI18n();
  return (
    <div
      className="space-y-1.5"
      data-testid={
        testId ?? `input-group-${label.toLowerCase().replace(/\s+/g, "-")}`
      }
    >
      <div className="flex items-center gap-1.5 ml-1">
        <label
          className={cn(
            isKorean
              ? "text-xs font-bold text-slate-400 tracking-normal"
              : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
          )}
        >
          {label}
        </label>
        <div className="group relative">
          <Info
            size={12}
            className="text-slate-600 cursor-help"
            data-testid="tooltip-icon"
          />
          <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
            {tooltip}
          </div>
        </div>
      </div>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          value={(value * 100).toFixed(1)}
          onChange={(e) => onChange((parseFloat(e.target.value) || 0) / 100)}
          className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500 transition-all"
        />
        <span
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2",
            isKorean
              ? "text-xs font-bold text-slate-500"
              : "text-[11px] font-black text-slate-600",
          )}
        >
          %
        </span>
      </div>
    </div>
  );
}

function BooleanRuleCard({
  label,
  tooltip,
  checked,
  onChange,
  testId,
}: {
  label: string;
  tooltip: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
}) {
  const { isKorean, t } = useI18n();
  return (
    <div
      className="space-y-3 border border-slate-800 rounded-2xl bg-slate-950/40 p-4"
      data-testid={
        testId ?? `toggle-${label.toLowerCase().replace(/\s+/g, "-")}`
      }
    >
      <div className="flex items-center gap-1.5">
        <label
          className={cn(
            isKorean
              ? "text-xs font-bold text-slate-400 tracking-normal"
              : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
          )}
        >
          {label}
        </label>
        <div className="group relative">
          <Info size={12} className="text-slate-600 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
            {tooltip}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "w-full h-11 rounded-xl border text-sm transition-all",
          isKorean
            ? "font-bold tracking-normal"
            : "font-black uppercase tracking-widest",
          checked
            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
            : "bg-slate-900 border-slate-800 text-slate-400",
        )}
      >
        {checked ? t("settings.enabled") : t("settings.disabled")}
      </button>
    </div>
  );
}
