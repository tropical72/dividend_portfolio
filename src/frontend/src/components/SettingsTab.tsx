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
import {
  DEFAULT_APPRECIATION_RATE_SCENARIOS,
  DEFAULT_PA_SCENARIO,
  normalizeAppreciationScenarios,
  normalizePaScenarioKey,
} from "../lib/paScenarios";
import type {
  PaScenarioKey,
  RetirementConfig,
  AppSettings,
  PlannedCashflow,
  StrategyRules,
  DistributionRules,
  DistributionYieldOverrides,
  CorporateStrategyCategory,
  PensionStrategyCategory,
  MasterPortfolio,
  Portfolio,
  UiLanguage,
} from "../types";

interface SettingsTabProps {
  onSettingsUpdate: () => void;
  globalSettings: AppSettings | null;
  globalRetireConfig: RetirementConfig | null;
}

type StrategyRulesUpdates = {
  rebalance_month?: number;
  corporate?: Partial<StrategyRules["corporate"]>;
  pension?: Partial<StrategyRules["pension"]>;
};

type NormalizableStrategyRules = Partial<
  Omit<StrategyRules, "corporate" | "pension">
> & {
  corporate?: Partial<StrategyRules["corporate"]>;
  pension?: Partial<StrategyRules["pension"]>;
};

type DistributionRulesUpdates = {
  corp?: DistributionRules["corp"];
  pension?: DistributionRules["pension"];
};

type DistributionYieldOverrideUpdates = {
  corp?: DistributionYieldOverrides["corp"];
  pension?: DistributionYieldOverrides["pension"];
};

const USER_VISIBLE_ASSUMPTION_IDS = ["v1", "conservative"] as const;

const DEFAULT_STRATEGY_RULES: StrategyRules = {
  rebalance_month: 5,
  corporate: {
    sgov_target_months: 30,
    november_sgov_target_months: 27,
    bond_floor_months: 12,
    bond_target_months: 18,
    bond_upper_months: 24,
  },
  pension: {
    sgov_target_months: 24,
    sgov_floor_months: 12,
    bond_floor_months: 12,
    bond_target_months: 18,
    bond_upper_months: 24,
  },
};

const DEFAULT_DISTRIBUTION_RULES: DistributionRules = {
  corp: {},
  pension: {},
};

const DEFAULT_DISTRIBUTION_YIELD_OVERRIDES: DistributionYieldOverrides = {
  corp: {},
  pension: {},
};

const CORPORATE_DISTRIBUTION_CATEGORIES: CorporateStrategyCategory[] = [
  "Bond Buffer",
  "High Income",
  "Dividend Growth",
  "Growth Engine",
];

const PENSION_DISTRIBUTION_CATEGORIES: PensionStrategyCategory[] = [
  "Bond Buffer",
  "Dividend Growth",
  "Growth Engine",
];

function normalizeStrategyRules(
  rules?: NormalizableStrategyRules,
): StrategyRules {
  return {
    rebalance_month:
      rules?.rebalance_month ?? DEFAULT_STRATEGY_RULES.rebalance_month,
    corporate: {
      sgov_target_months:
        rules?.corporate?.sgov_target_months ??
        DEFAULT_STRATEGY_RULES.corporate.sgov_target_months,
      november_sgov_target_months:
        rules?.corporate?.november_sgov_target_months ??
        DEFAULT_STRATEGY_RULES.corporate.november_sgov_target_months,
      bond_floor_months:
        rules?.corporate?.bond_floor_months ??
        DEFAULT_STRATEGY_RULES.corporate.bond_floor_months,
      bond_target_months:
        rules?.corporate?.bond_target_months ??
        DEFAULT_STRATEGY_RULES.corporate.bond_target_months,
      bond_upper_months:
        rules?.corporate?.bond_upper_months ??
        DEFAULT_STRATEGY_RULES.corporate.bond_upper_months,
    },
    pension: {
      sgov_target_months:
        rules?.pension?.sgov_target_months ??
        DEFAULT_STRATEGY_RULES.pension.sgov_target_months,
      sgov_floor_months:
        rules?.pension?.sgov_floor_months ??
        DEFAULT_STRATEGY_RULES.pension.sgov_floor_months,
      bond_floor_months:
        rules?.pension?.bond_floor_months ??
        DEFAULT_STRATEGY_RULES.pension.bond_floor_months,
      bond_target_months:
        rules?.pension?.bond_target_months ??
        DEFAULT_STRATEGY_RULES.pension.bond_target_months,
      bond_upper_months:
        rules?.pension?.bond_upper_months ??
        DEFAULT_STRATEGY_RULES.pension.bond_upper_months,
    },
  };
}

function normalizeDistributionRules(
  rules?: Partial<DistributionRules>,
): DistributionRules {
  return {
    corp: { ...(rules?.corp ?? DEFAULT_DISTRIBUTION_RULES.corp) },
    pension: { ...(rules?.pension ?? DEFAULT_DISTRIBUTION_RULES.pension) },
  };
}

function normalizeDistributionYieldOverrides(
  overrides?: Partial<DistributionYieldOverrides>,
): DistributionYieldOverrides {
  return {
    corp: { ...(overrides?.corp ?? DEFAULT_DISTRIBUTION_YIELD_OVERRIDES.corp) },
    pension: {
      ...(overrides?.pension ?? DEFAULT_DISTRIBUTION_YIELD_OVERRIDES.pension),
    },
  };
}

const CORPORATE_TAX_RATE_OPTIONS = [0.1, 0.2, 0.22, 0.25];

function formatDecimalDraft(value: number, fractionDigits = 1) {
  return value.toFixed(fractionDigits).replace(/\.?0+$/, "");
}

function formatPercentValue(
  value: number | null | undefined,
  fractionDigits = 1,
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }
  return `${formatDecimalDraft(value * 100, fractionDigits)}%`;
}

function categoryDividendYield(
  portfolio: Portfolio | undefined,
  category: string,
) {
  if (!portfolio?.items?.length) return null;
  let weightedYield = 0;
  let categoryWeight = 0;
  for (const item of portfolio.items) {
    if (item.category !== category) continue;
    const weight = Number(item.weight || 0);
    categoryWeight += weight;
    weightedYield += (Number(item.dividend_yield || 0) / 100) * weight;
  }
  if (categoryWeight <= 0) return null;
  return weightedYield / categoryWeight;
}

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

function estimateNetSalary(
  monthlySalary: number,
  rates?: RetirementConfig["tax_and_insurance"],
) {
  const pensionRate = rates?.pension_rate ?? 0.045;
  const healthRate = rates?.health_rate ?? 0.035;
  const employmentRate = rates?.employment_rate ?? 0.009;
  const incomeTaxRate = rates?.income_tax_estimate_rate ?? 0.05;
  const totalRate = pensionRate + healthRate + employmentRate + incomeTaxRate;
  return Math.max(0, monthlySalary * (1 - totalRate));
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
    default_pa_scenario: DEFAULT_PA_SCENARIO,
    price_appreciation_rate: 3.0,
    appreciation_rates: { ...DEFAULT_APPRECIATION_RATE_SCENARIOS },
  });
  const [editingPaScenario, setEditingPaScenario] =
    useState<PaScenarioKey>(DEFAULT_PA_SCENARIO);

  const [retireConfig, setRetireConfig] = useState<RetirementConfig | null>(
    null,
  );
  const [masterPortfolios, setMasterPortfolios] = useState<MasterPortfolio[]>(
    [],
  );
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
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
        default_pa_scenario: normalizePaScenarioKey(
          globalSettings.default_pa_scenario,
        ),
        price_appreciation_rate: globalSettings.price_appreciation_rate ?? 3.0,
        appreciation_rates: normalizeAppreciationScenarios(
          globalSettings.appreciation_rates,
        ),
      });
      setEditingPaScenario(
        normalizePaScenarioKey(globalSettings.default_pa_scenario),
      );
    }
    if (globalRetireConfig) {
      const rawCorpParams = (globalRetireConfig.corp_params ?? {}) as Record<
        string,
        unknown
      >;
      const normalizedCorpParams = { ...rawCorpParams };
      delete normalizedCorpParams.monthly_fixed_cost;
      setRetireConfig({
        ...JSON.parse(JSON.stringify(globalRetireConfig)),
        corp_params: {
          ...normalizedCorpParams,
          monthly_bookkeeping_fee:
            globalRetireConfig.corp_params?.monthly_bookkeeping_fee ??
            Number(rawCorpParams.monthly_fixed_cost ?? 0),
          annual_corp_tax_adjustment_fee:
            globalRetireConfig.corp_params?.annual_corp_tax_adjustment_fee ?? 0,
        },
        simulation_params: {
          ...globalRetireConfig.simulation_params,
          household_monthly_need:
            globalRetireConfig.simulation_params?.household_monthly_need ??
            globalRetireConfig.simulation_params?.target_monthly_cashflow ??
            0,
          target_monthly_cashflow:
            globalRetireConfig.simulation_params?.target_monthly_cashflow ??
            globalRetireConfig.simulation_params?.household_monthly_need ??
            0,
        },
        tax_and_insurance: {
          ...globalRetireConfig.tax_and_insurance,
          corp_tax_nominal_rate:
            globalRetireConfig.tax_and_insurance?.corp_tax_nominal_rate ?? 0.1,
        },
        strategy_rules: normalizeStrategyRules(
          globalRetireConfig.strategy_rules,
        ),
        distribution_rules: normalizeDistributionRules(
          globalRetireConfig.distribution_rules,
        ),
        distribution_yield_overrides: normalizeDistributionYieldOverrides(
          globalRetireConfig.distribution_yield_overrides,
        ),
      });
    }
  }, [globalSettings, globalRetireConfig]);

  useEffect(() => {
    const loadPortfolioContext = async () => {
      try {
        const [masterResponse, portfolioResponse] = await Promise.all([
          fetch("http://localhost:8000/api/master-portfolios"),
          fetch("http://localhost:8000/api/portfolios"),
        ]);
        const masterPayload = await masterResponse.json();
        const portfolioPayload = await portfolioResponse.json();
        if (masterPayload?.success && Array.isArray(masterPayload.data)) {
          setMasterPortfolios(masterPayload.data as MasterPortfolio[]);
        }
        if (portfolioPayload?.success && Array.isArray(portfolioPayload.data)) {
          setPortfolios(portfolioPayload.data as Portfolio[]);
        }
      } catch {
        setMasterPortfolios([]);
        setPortfolios([]);
      }
    };

    void loadPortfolioContext();
  }, []);

  const updateStrategyRules = (updates: StrategyRulesUpdates) => {
    setRetireConfig((currentConfig) => {
      if (!currentConfig) return currentConfig;
      const currentRules = normalizeStrategyRules(currentConfig.strategy_rules);
      return {
        ...currentConfig,
        strategy_rules: normalizeStrategyRules({
          ...currentRules,
          ...updates,
          corporate: {
            ...currentRules.corporate,
            ...updates.corporate,
          },
          pension: {
            ...currentRules.pension,
            ...updates.pension,
          },
        }),
      };
    });
  };

  const updateDistributionRules = (updates: DistributionRulesUpdates) => {
    setRetireConfig((currentConfig) => {
      if (!currentConfig) return currentConfig;
      const currentRules = normalizeDistributionRules(
        currentConfig.distribution_rules,
      );
      return {
        ...currentConfig,
        distribution_rules: normalizeDistributionRules({
          ...currentRules,
          ...updates,
          corp: {
            ...currentRules.corp,
            ...updates.corp,
          },
          pension: {
            ...currentRules.pension,
            ...updates.pension,
          },
        }),
      };
    });
  };

  const updateDistributionYieldOverrides = (
    updates: DistributionYieldOverrideUpdates,
  ) => {
    setRetireConfig((currentConfig) => {
      if (!currentConfig) return currentConfig;
      const currentOverrides = normalizeDistributionYieldOverrides(
        currentConfig.distribution_yield_overrides,
      );
      return {
        ...currentConfig,
        distribution_yield_overrides: normalizeDistributionYieldOverrides({
          ...currentOverrides,
          ...updates,
          corp: {
            ...currentOverrides.corp,
            ...updates.corp,
          },
          pension: {
            ...currentOverrides.pension,
            ...updates.pension,
          },
        }),
      };
    });
  };

  const updateDistributionRuleValue = (
    accountKey: "corp" | "pension",
    category: CorporateStrategyCategory | PensionStrategyCategory,
    field: "growth_rate" | "stress_cut_rate",
    rawValue: string,
  ) => {
    if (!retireConfig) return;
    const currentRules = normalizeDistributionRules(
      retireConfig.distribution_rules,
    );
    const normalizedValue =
      rawValue === "" ? 0 : (parseFloat(rawValue) || 0) / 100;
    if (accountKey === "corp") {
      const corpCategory = category as CorporateStrategyCategory;
      const currentCategoryRules = currentRules.corp[corpCategory] ?? {};
      updateDistributionRules({
        corp: {
          ...currentRules.corp,
          [corpCategory]: {
            ...currentCategoryRules,
            [field]: normalizedValue,
          },
        },
      });
      return;
    }

    const pensionCategory = category as PensionStrategyCategory;
    const currentCategoryRules = currentRules.pension[pensionCategory] ?? {};
    updateDistributionRules({
      pension: {
        ...currentRules.pension,
        [pensionCategory]: {
          ...currentCategoryRules,
          [field]: normalizedValue,
        },
      },
    });
  };

  const updateDistributionYieldOverrideValue = (
    accountKey: "corp" | "pension",
    category: CorporateStrategyCategory | PensionStrategyCategory,
    rawValue: string,
  ) => {
    if (!retireConfig) return;
    const currentOverrides = normalizeDistributionYieldOverrides(
      retireConfig.distribution_yield_overrides,
    );
    const normalizedValue =
      rawValue === "" ? 0 : (parseFloat(rawValue) || 0) / 100;

    if (accountKey === "corp") {
      const corpCategory = category as CorporateStrategyCategory;
      updateDistributionYieldOverrides({
        corp: {
          ...currentOverrides.corp,
          [corpCategory]: normalizedValue,
        },
      });
      return;
    }

    const pensionCategory = category as PensionStrategyCategory;
    updateDistributionYieldOverrides({
      pension: {
        ...currentOverrides.pension,
        [pensionCategory]: normalizedValue,
      },
    });
  };

  const resetExecutionPolicy = () => {
    updateStrategyRules({
      rebalance_month: DEFAULT_STRATEGY_RULES.rebalance_month,
    });
  };

  const resetCorporateRules = () => {
    updateStrategyRules({ corporate: DEFAULT_STRATEGY_RULES.corporate });
  };

  const resetPensionRules = () => {
    updateStrategyRules({ pension: DEFAULT_STRATEGY_RULES.pension });
  };

  const resetCorporateDistributionRules = () => {
    updateDistributionRules({ corp: DEFAULT_DISTRIBUTION_RULES.corp });
    updateDistributionYieldOverrides({
      corp: DEFAULT_DISTRIBUTION_YIELD_OVERRIDES.corp,
    });
  };

  const resetPensionDistributionRules = () => {
    updateDistributionRules({ pension: DEFAULT_DISTRIBUTION_RULES.pension });
    updateDistributionYieldOverrides({
      pension: DEFAULT_DISTRIBUTION_YIELD_OVERRIDES.pension,
    });
  };

  const resetAllStrategyRules = () => {
    updateStrategyRules(DEFAULT_STRATEGY_RULES);
    updateDistributionRules(DEFAULT_DISTRIBUTION_RULES);
    updateDistributionYieldOverrides(DEFAULT_DISTRIBUTION_YIELD_OVERRIDES);
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

  const estimatedNetSalary = estimateNetSalary(
    retireConfig.corp_params.monthly_salary,
    retireConfig.tax_and_insurance,
  );
  const corporateOperatingCost =
    (retireConfig.corp_params.monthly_bookkeeping_fee ?? 0) +
    (retireConfig.corp_params.annual_corp_tax_adjustment_fee ?? 0) / 12;
  const personalSplitMode =
    retireConfig.personal_account_params.split_mode || "single";
  const personalSelfInitial =
    retireConfig.personal_account_params.self_initial_investment ?? 0;
  const personalSpouseInitial =
    retireConfig.personal_account_params.spouse_initial_investment ?? 0;
  const personalInitialInvestmentTotal =
    personalSplitMode === "couple"
      ? personalSelfInitial + personalSpouseInitial
      : retireConfig.personal_account_params.initial_investment;
  const activeMaster = masterPortfolios.find((master) => master.is_active);
  const activeCorpPortfolio = portfolios.find(
    (portfolio) => portfolio.id === activeMaster?.corp_id,
  );
  const activePensionPortfolio = portfolios.find(
    (portfolio) => portfolio.id === activeMaster?.pension_id,
  );
  const buildNewBuyYieldTooltip = (
    accountKey: "corp" | "pension",
    category: CorporateStrategyCategory | PensionStrategyCategory,
    hasOverride: boolean,
    overrideYield: number,
  ) => {
    const portfolio =
      accountKey === "corp" ? activeCorpPortfolio : activePensionPortfolio;
    const fallbackYield = categoryDividendYield(portfolio, category);
    const actualYield = hasOverride ? overrideYield : fallbackYield;
    const accountLabel =
      accountKey === "corp"
        ? isKorean
          ? "법인"
          : "Corporate"
        : isKorean
          ? "연금"
          : "Pension";

    if (isKorean) {
      return [
        "이 카테고리로 새 자금이 배치될 때 적용할 구조적 배당률입니다.",
        `실제 적용: ${formatPercentValue(actualYield)} ${
          hasOverride ? "(사용자 override)" : "(활성 포트폴리오 카테고리 DY)"
        }.`,
        `기본 DY 출처: ${accountLabel} ${
          portfolio?.name ?? "활성 포트폴리오 없음"
        } / ${category} = ${formatPercentValue(fallbackYield)}.`,
        "기존 보유분의 초기 run-rate 장부값은 덮어쓰지 않습니다.",
      ].join("\n");
    }

    return [
      "Structural dividend yield used only when new money is deployed into this category.",
      `Actual value: ${formatPercentValue(actualYield)} ${
        hasOverride ? "(user override)" : "(active portfolio category DY)"
      }.`,
      `Default DY source: ${accountLabel} ${
        portfolio?.name ?? "no active portfolio"
      } / ${category} = ${formatPercentValue(fallbackYield)}.`,
      "It does not override the current holding's initial run-rate.",
    ].join("\n");
  };

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

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-8">
          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle
              icon={Settings2}
              title={t("settings.programSettings")}
              color="text-slate-300"
              tooltip={t("settings.programSettingsTooltip")}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </section>

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
                  label={
                    isKorean ? "월 개인연금 수령액" : "Monthly Pension Income"
                  }
                  testId="settings-monthly-pension-income"
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

            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <SectionTitle
                icon={Wallet2}
                title={t("settings.personalTaxableAccount")}
                color="text-sky-400"
                tooltip={t("settings.personalTaxableAccountTooltip")}
              />
              <div
                data-testid="settings-single-household-withdrawal-policy"
                className="rounded-2xl border border-sky-500/30 bg-sky-950/30 p-4 text-xs leading-relaxed text-sky-200"
              >
                {isKorean
                  ? "월 가계필요비용이 유일한 인출 목표입니다. 연금과 국민연금을 먼저 반영하고 남은 부족액만 활성 주 운용계좌의 SGOV에서 지급합니다."
                  : "Household need is the only withdrawal target. Pension income is applied first, and only the remaining gap is paid from the active operating account SGOV."}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                  <label
                    className={
                      isKorean
                        ? "text-xs font-bold text-slate-400"
                        : "text-[11px] font-black uppercase text-slate-500"
                    }
                  >
                    {isKorean ? "개인운용 방식" : "Personal Account Mode"}
                  </label>
                  <select
                    value={personalSplitMode}
                    onChange={(e) =>
                      setRetireConfig({
                        ...retireConfig,
                        personal_account_params: {
                          ...retireConfig.personal_account_params,
                          split_mode: e.target.value as "single" | "couple",
                        },
                      })
                    }
                    className="h-11 rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm font-bold text-slate-200 outline-none"
                    data-testid="settings-personal-split-mode"
                  >
                    <option value="single">
                      {isKorean ? "1인 운용" : "Single"}
                    </option>
                    <option value="couple">
                      {isKorean ? "본인 / 배우자 2인 운용" : "Self / Spouse"}
                    </option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                  <label
                    className={
                      isKorean
                        ? "text-xs font-bold text-slate-400"
                        : "text-[11px] font-black uppercase text-slate-500"
                    }
                  >
                    {isKorean ? "금융소득 배분" : "Income Allocation"}
                  </label>
                  <select
                    value={
                      retireConfig.personal_account_params.income_allocation ||
                      "split_50_50"
                    }
                    onChange={(e) =>
                      setRetireConfig({
                        ...retireConfig,
                        personal_account_params: {
                          ...retireConfig.personal_account_params,
                          income_allocation: e.target.value as
                            | "split_50_50"
                            | "self_100",
                        },
                      })
                    }
                    className="h-11 rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm font-bold text-slate-200 outline-none"
                    data-testid="settings-personal-income-allocation"
                  >
                    <option value="split_50_50">
                      {isKorean ? "본인 50% / 배우자 50%" : "50% / 50%"}
                    </option>
                    <option value="self_100">
                      {isKorean ? "본인 100%" : "Self 100%"}
                    </option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup
                  label={t("settings.initialCapital")}
                  value={personalInitialInvestmentTotal}
                  isCurrency
                  tooltip={
                    personalSplitMode === "couple"
                      ? isKorean
                        ? "2인 운용에서는 본인/배우자 초기 운용금액의 합계가 시뮬레이션에 반영됩니다."
                        : "In couple mode, this is the read-only sum of self and spouse capital."
                      : t("settings.initialCapitalTooltip")
                  }
                  readOnly={personalSplitMode === "couple"}
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      personal_account_params: {
                        ...retireConfig.personal_account_params,
                        initial_investment: parseInt(v) || 0,
                      },
                    })
                  }
                />
                {personalSplitMode === "couple" && (
                  <>
                    <InputGroup
                      label={
                        isKorean ? "본인 초기 운용금액" : "Self Initial Capital"
                      }
                      value={
                        retireConfig.personal_account_params
                          .self_initial_investment ?? 0
                      }
                      isCurrency
                      testId="settings-personal-self-initial-investment"
                      onChange={(v) =>
                        setRetireConfig({
                          ...retireConfig,
                          personal_account_params: {
                            ...retireConfig.personal_account_params,
                            self_initial_investment: parseInt(v) || 0,
                          },
                        })
                      }
                    />
                    <InputGroup
                      label={
                        isKorean
                          ? "배우자 초기 운용금액"
                          : "Spouse Initial Capital"
                      }
                      value={
                        retireConfig.personal_account_params
                          .spouse_initial_investment ?? 0
                      }
                      isCurrency
                      testId="settings-personal-spouse-initial-investment"
                      onChange={(v) =>
                        setRetireConfig({
                          ...retireConfig,
                          personal_account_params: {
                            ...retireConfig.personal_account_params,
                            spouse_initial_investment: parseInt(v) || 0,
                          },
                        })
                      }
                    />
                  </>
                )}
                <InputGroup
                  label={isKorean ? "초기 취득원가" : "Initial Cost Basis"}
                  value={
                    retireConfig.personal_account_params.initial_cost_basis ||
                    personalInitialInvestmentTotal
                  }
                  isCurrency
                  testId="settings-personal-initial-cost-basis"
                  tooltip={
                    isKorean
                      ? "현재 평가액과 별개의 세무상 총 취득원가입니다. 자산 수익률이나 평가액은 바꾸지 않고, 매도원가·실현손익·양도세 계산에만 사용합니다."
                      : "Tax cost basis separate from market value. It affects realized gains and capital-gains tax, not returns or valuation."
                  }
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      personal_account_params: {
                        ...retireConfig.personal_account_params,
                        initial_cost_basis: parseInt(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "외부 연간 금융소득"
                      : "External Financial Income"
                  }
                  value={
                    retireConfig.personal_account_params
                      .external_financial_income ?? 0
                  }
                  isCurrency
                  testId="settings-personal-external-financial-income"
                  tooltip={
                    isKorean
                      ? "이 계좌 밖의 연간 이자·배당소득으로 종합과세와 건보 판단에 사용합니다."
                      : "Annual interest and dividend income outside this account."
                  }
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      personal_account_params: {
                        ...retireConfig.personal_account_params,
                        external_financial_income: parseInt(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "기타 종합소득 과세표준"
                      : "Other Comprehensive Tax Base"
                  }
                  value={
                    retireConfig.personal_account_params
                      .other_comprehensive_tax_base ?? 0
                  }
                  isCurrency
                  testId="settings-personal-other-comprehensive-tax-base"
                  tooltip={
                    isKorean
                      ? "금융소득 종합과세 누진세액 추정에 사용하는 다른 소득의 과세표준입니다."
                      : "Other taxable income base used for the comprehensive tax estimate."
                  }
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      personal_account_params: {
                        ...retireConfig.personal_account_params,
                        other_comprehensive_tax_base: parseInt(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "재산세 과세표준액"
                      : "Property Tax Assessed Value"
                  }
                  value={
                    retireConfig.personal_account_params
                      .property_assessed_value ?? 0
                  }
                  isCurrency
                  testId="settings-personal-property-assessed-value"
                  tooltip={
                    isKorean
                      ? "공시가격이나 시가가 아닌 지역건보 계산용 재산세 과세표준액입니다."
                      : "Property-tax assessed value for local health insurance, not market value."
                  }
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      personal_account_params: {
                        ...retireConfig.personal_account_params,
                        property_assessed_value: parseInt(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "미국 배당 원천세율"
                      : "U.S. Dividend Withholding"
                  }
                  value={
                    (retireConfig.tax_and_insurance
                      .us_dividend_foreign_withholding_rate ?? 0.15) * 100
                  }
                  unit="%"
                  fractionDigits={1}
                  testId="settings-us-dividend-withholding-rate"
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: {
                        ...retireConfig.tax_and_insurance,
                        us_dividend_foreign_withholding_rate:
                          (parseFloat(v) || 0) / 100,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "국내 배당 명목세율"
                      : "Domestic Dividend Tax Rate"
                  }
                  value={
                    (retireConfig.tax_and_insurance
                      .domestic_dividend_tax_rate ?? 0.154) * 100
                  }
                  unit="%"
                  fractionDigits={1}
                  testId="settings-domestic-dividend-tax-rate"
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: {
                        ...retireConfig.tax_and_insurance,
                        domestic_dividend_tax_rate: (parseFloat(v) || 0) / 100,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "법인 주주분배 원천징수 추정률"
                      : "Shareholder Distribution Withholding"
                  }
                  value={
                    (retireConfig.tax_and_insurance
                      .shareholder_distribution_withholding_rate ?? 0.154) * 100
                  }
                  unit="%"
                  fractionDigits={1}
                  testId="settings-shareholder-distribution-withholding-rate"
                  tooltip={
                    isKorean
                      ? "주주대여금 소진 후 가계 부족액을 과세 분배로 지급할 때 사용하는 원천징수 추정률입니다."
                      : "Estimated withholding used when taxable shareholder distributions fund the household gap after the loan is exhausted."
                  }
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: {
                        ...retireConfig.tax_and_insurance,
                        shareholder_distribution_withholding_rate:
                          (parseFloat(v) || 0) / 100,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "금융소득 종합과세 기준"
                      : "Financial Income Threshold"
                  }
                  value={
                    retireConfig.tax_and_insurance
                      .financial_income_comprehensive_threshold ?? 20000000
                  }
                  isCurrency
                  testId="settings-financial-income-threshold"
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: {
                        ...retireConfig.tax_and_insurance,
                        financial_income_comprehensive_threshold:
                          parseInt(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "해외주식 양도세율"
                      : "U.S. Capital Gains Tax Rate"
                  }
                  value={
                    (retireConfig.tax_and_insurance.us_capital_gains_tax_rate ??
                      0.22) * 100
                  }
                  unit="%"
                  fractionDigits={1}
                  testId="settings-us-capital-gains-tax-rate"
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: {
                        ...retireConfig.tax_and_insurance,
                        us_capital_gains_tax_rate: (parseFloat(v) || 0) / 100,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "해외주식 연간 기본공제"
                      : "Annual Capital Gains Deduction"
                  }
                  value={
                    retireConfig.tax_and_insurance
                      .us_capital_gains_annual_deduction ?? 2500000
                  }
                  isCurrency
                  testId="settings-us-capital-gains-deduction"
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: {
                        ...retireConfig.tax_and_insurance,
                        us_capital_gains_annual_deduction: parseInt(v) || 0,
                      },
                    })
                  }
                />
                <InputGroup
                  label={
                    isKorean
                      ? "건보 금융소득 반영 기준"
                      : "Health Financial Income Threshold"
                  }
                  value={
                    retireConfig.tax_and_insurance
                      .health_financial_income_threshold ?? 10000000
                  }
                  isCurrency
                  testId="settings-health-financial-income-threshold"
                  onChange={(v) =>
                    setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: {
                        ...retireConfig.tax_and_insurance,
                        health_financial_income_threshold: parseInt(v) || 0,
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-slate-800 pt-6">
              <InputGroup
                label={t("settings.salary")}
                isCurrency
                tooltip={t("settings.salaryTooltip")}
                testId="input-group-monthly-salary"
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
              <div
                className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                data-testid="net-salary-estimate-card"
              >
                <p
                  className={cn(
                    isKorean
                      ? "text-xs font-bold text-slate-400 tracking-normal"
                      : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                  )}
                >
                  {t("settings.netSalaryEstimate")}
                </p>
                <p
                  className="mt-2 text-sm font-bold text-emerald-300"
                  data-testid="net-salary-estimate-value"
                >
                  {Math.round(estimatedNetSalary).toLocaleString()}
                  <span className="ml-1 text-[11px] text-slate-500">
                    {t("settings.krwPerMonth")}
                  </span>
                </p>
              </div>
              <div
                className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                data-testid="corporate-need-estimate-card"
              >
                <p
                  className={cn(
                    isKorean
                      ? "text-xs font-bold text-slate-400 tracking-normal"
                      : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                  )}
                >
                  {t("settings.corporateNeedEstimate")}
                </p>
                <p
                  className="mt-2 text-sm font-bold text-cyan-300"
                  data-testid="corporate-need-estimate-value"
                >
                  {Math.round(corporateOperatingCost).toLocaleString()}
                  <span className="ml-1 text-[11px] text-slate-500">
                    {t("settings.krwPerMonth")}
                  </span>
                </p>
              </div>
              <InputGroup
                label={t("settings.monthlyBookkeepingFee")}
                isCurrency
                tooltip={t("settings.monthlyBookkeepingFeeTooltip")}
                testId="input-group-monthly-bookkeeping-fee"
                value={retireConfig.corp_params.monthly_bookkeeping_fee ?? 0}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    corp_params: {
                      ...retireConfig.corp_params,
                      monthly_bookkeeping_fee: parseInt(v) || 0,
                    },
                  })
                }
              />
              <InputGroup
                label={t("settings.annualTaxAdjustmentFee")}
                isCurrency
                tooltip={t("settings.annualTaxAdjustmentFeeTooltip")}
                testId="input-group-annual-tax-adjustment-fee"
                value={
                  retireConfig.corp_params.annual_corp_tax_adjustment_fee ?? 0
                }
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    corp_params: {
                      ...retireConfig.corp_params,
                      annual_corp_tax_adjustment_fee: parseInt(v) || 0,
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-800 pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 ml-1">
                  <label
                    className={cn(
                      isKorean
                        ? "text-xs font-bold text-slate-400 tracking-normal"
                        : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                    )}
                  >
                    {t("settings.corpTaxRate")}
                  </label>
                  <div className="group relative">
                    <Info size={12} className="text-slate-600 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                      {t("settings.corpTaxRateTooltip")}
                    </div>
                  </div>
                </div>
                <select
                  data-testid="settings-corp-tax-rate"
                  value={retireConfig.tax_and_insurance.corp_tax_nominal_rate}
                  onChange={(event) =>
                    setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: {
                        ...retireConfig.tax_and_insurance,
                        corp_tax_nominal_rate: Number(event.target.value),
                      },
                    })
                  }
                  className="h-11 w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500"
                >
                  {CORPORATE_TAX_RATE_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>
                      {(rate * 100).toFixed(0)}% (
                      {(rate * 1.1 * 100).toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>
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

            <div
              className="rounded-[2rem] border border-violet-500/30 bg-violet-950/20 p-6"
              data-testid="os-v11-summary-card"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-violet-200">
                  OS v11.1
                </div>
                <h4
                  className={cn(
                    isKorean
                      ? "text-sm font-bold tracking-normal text-slate-100"
                      : "text-xs font-black uppercase tracking-widest text-slate-100",
                  )}
                >
                  {t("settings.osV11Title")}
                </h4>
              </div>
              <p className="max-w-5xl text-xs font-semibold leading-relaxed text-slate-300">
                {t("settings.osV11Body")}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  t("settings.osV11PointAssets"),
                  t("settings.osV11PointAccounts"),
                  t("settings.osV11PointCalendar"),
                ].map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-[11px] font-semibold leading-relaxed text-slate-300"
                  >
                    {point}
                  </div>
                ))}
              </div>
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
                    label={t("settings.corpNovemberSgovTarget")}
                    unit="Mo"
                    tooltip={t("settings.corpNovemberSgovTargetTooltip")}
                    testId="input-group-corp-november-sgov-target"
                    value={
                      retireConfig.strategy_rules.corporate
                        .november_sgov_target_months ?? 27
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        corporate: {
                          november_sgov_target_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.corpBondFloor")}
                    unit="Mo"
                    tooltip={t("settings.corpBondFloorTooltip")}
                    testId="input-group-corp-bond-floor"
                    value={
                      retireConfig.strategy_rules.corporate.bond_floor_months ??
                      12
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        corporate: {
                          bond_floor_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.corpBondTarget")}
                    unit="Mo"
                    tooltip={t("settings.corpBondTargetTooltip")}
                    testId="input-group-corp-bond-target"
                    value={
                      retireConfig.strategy_rules.corporate
                        .bond_target_months ?? 18
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        corporate: {
                          bond_target_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.corpBondUpper")}
                    unit="Mo"
                    tooltip={t("settings.corpBondUpperTooltip")}
                    testId="input-group-corp-bond-upper"
                    value={
                      retireConfig.strategy_rules.corporate.bond_upper_months ??
                      24
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        corporate: {
                          bond_upper_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h5 className="text-xs font-black uppercase tracking-widest text-emerald-200">
                        {t("settings.distributionRules")}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        {t("settings.distributionRulesTooltip")}
                      </p>
                    </div>
                    <button
                      onClick={resetCorporateDistributionRules}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-black rounded-xl border border-slate-700 uppercase tracking-widest"
                      data-testid="reset-corporate-distribution-rules"
                    >
                      <RotateCcw size={12} />
                      {t("settings.reset")}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {CORPORATE_DISTRIBUTION_CATEGORIES.map((category) => {
                      const rule =
                        retireConfig.distribution_rules.corp?.[category] ?? {};
                      const yieldOverrides =
                        retireConfig.distribution_yield_overrides.corp ?? {};
                      const hasYieldOverride =
                        Object.prototype.hasOwnProperty.call(
                          yieldOverrides,
                          category,
                        );
                      const yieldOverride = yieldOverrides[category] ?? 0;
                      return (
                        <div
                          key={category}
                          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4"
                        >
                          <div className="text-xs font-black uppercase tracking-widest text-slate-300">
                            {category}
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <InputGroup
                              label={t("settings.distributionGrowthRate")}
                              unit="% / Yr"
                              tooltip={t(
                                "settings.distributionGrowthRateTooltip",
                              )}
                              testId={`input-group-corp-${category.toLowerCase().replace(/\s+/g, "-")}-distribution-growth-rate`}
                              value={(rule.growth_rate ?? 0) * 100}
                              fractionDigits={1}
                              onChange={(v) =>
                                updateDistributionRuleValue(
                                  "corp",
                                  category,
                                  "growth_rate",
                                  v,
                                )
                              }
                            />
                            <InputGroup
                              label={t("settings.distributionStressCutRate")}
                              unit="%"
                              tooltip={t(
                                "settings.distributionStressCutRateTooltip",
                              )}
                              testId={`input-group-corp-${category.toLowerCase().replace(/\s+/g, "-")}-distribution-stress-cut-rate`}
                              value={(rule.stress_cut_rate ?? 0) * 100}
                              fractionDigits={1}
                              onChange={(v) =>
                                updateDistributionRuleValue(
                                  "corp",
                                  category,
                                  "stress_cut_rate",
                                  v,
                                )
                              }
                            />
                            <InputGroup
                              label={t("settings.distributionNewBuyYield")}
                              unit="%"
                              tooltip={buildNewBuyYieldTooltip(
                                "corp",
                                category,
                                hasYieldOverride,
                                yieldOverride,
                              )}
                              testId={`input-group-corp-${category.toLowerCase().replace(/\s+/g, "-")}-distribution-new-buy-yield`}
                              value={yieldOverride * 100}
                              fractionDigits={1}
                              onChange={(v) =>
                                updateDistributionYieldOverrideValue(
                                  "corp",
                                  category,
                                  v,
                                )
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                    label={t("settings.pensionSgovTarget")}
                    unit="Mo"
                    tooltip={t("settings.pensionSgovTargetTooltip")}
                    testId="input-group-pension-sgov-target"
                    value={
                      retireConfig.strategy_rules.pension.sgov_target_months ??
                      24
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        pension: {
                          sgov_target_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.pensionSgovFloor")}
                    unit="Mo"
                    tooltip={t("settings.pensionSgovFloorTooltip")}
                    testId="input-group-pension-sgov-floor"
                    value={
                      retireConfig.strategy_rules.pension.sgov_floor_months ??
                      12
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        pension: {
                          sgov_floor_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.pensionBondFloor")}
                    unit="Mo"
                    tooltip={t("settings.pensionBondFloorTooltip")}
                    testId="input-group-pension-bond-floor"
                    value={
                      retireConfig.strategy_rules.pension.bond_floor_months ??
                      12
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        pension: {
                          bond_floor_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.pensionBondTarget")}
                    unit="Mo"
                    tooltip={t("settings.pensionBondTargetTooltip")}
                    testId="input-group-pension-bond-target"
                    value={
                      retireConfig.strategy_rules.pension.bond_target_months ??
                      18
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        pension: {
                          bond_target_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                  <InputGroup
                    label={t("settings.pensionBondUpper")}
                    unit="Mo"
                    tooltip={t("settings.pensionBondUpperTooltip")}
                    testId="input-group-pension-bond-upper"
                    value={
                      retireConfig.strategy_rules.pension.bond_upper_months ??
                      24
                    }
                    onChange={(v) =>
                      updateStrategyRules({
                        pension: {
                          bond_upper_months: parseInt(v) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h5 className="text-xs font-black uppercase tracking-widest text-amber-200">
                        {t("settings.distributionRules")}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        {t("settings.distributionRulesTooltip")}
                      </p>
                    </div>
                    <button
                      onClick={resetPensionDistributionRules}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-black rounded-xl border border-slate-700 uppercase tracking-widest"
                      data-testid="reset-pension-distribution-rules"
                    >
                      <RotateCcw size={12} />
                      {t("settings.reset")}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {PENSION_DISTRIBUTION_CATEGORIES.map((category) => {
                      const rule =
                        retireConfig.distribution_rules.pension?.[category] ??
                        {};
                      const yieldOverrides =
                        retireConfig.distribution_yield_overrides.pension ?? {};
                      const hasYieldOverride =
                        Object.prototype.hasOwnProperty.call(
                          yieldOverrides,
                          category,
                        );
                      const yieldOverride = yieldOverrides[category] ?? 0;
                      return (
                        <div
                          key={category}
                          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4"
                        >
                          <div className="text-xs font-black uppercase tracking-widest text-slate-300">
                            {category}
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <InputGroup
                              label={t("settings.distributionGrowthRate")}
                              unit="% / Yr"
                              tooltip={t(
                                "settings.distributionGrowthRateTooltip",
                              )}
                              testId={`input-group-pension-${category.toLowerCase().replace(/\s+/g, "-")}-distribution-growth-rate`}
                              value={(rule.growth_rate ?? 0) * 100}
                              fractionDigits={1}
                              onChange={(v) =>
                                updateDistributionRuleValue(
                                  "pension",
                                  category,
                                  "growth_rate",
                                  v,
                                )
                              }
                            />
                            <InputGroup
                              label={t("settings.distributionStressCutRate")}
                              unit="%"
                              tooltip={t(
                                "settings.distributionStressCutRateTooltip",
                              )}
                              testId={`input-group-pension-${category.toLowerCase().replace(/\s+/g, "-")}-distribution-stress-cut-rate`}
                              value={(rule.stress_cut_rate ?? 0) * 100}
                              fractionDigits={1}
                              onChange={(v) =>
                                updateDistributionRuleValue(
                                  "pension",
                                  category,
                                  "stress_cut_rate",
                                  v,
                                )
                              }
                            />
                            <InputGroup
                              label={t("settings.distributionNewBuyYield")}
                              unit="%"
                              tooltip={buildNewBuyYieldTooltip(
                                "pension",
                                category,
                                hasYieldOverride,
                                yieldOverride,
                              )}
                              testId={`input-group-pension-${category.toLowerCase().replace(/\s+/g, "-")}-distribution-new-buy-yield`}
                              value={yieldOverride * 100}
                              fractionDigits={1}
                              onChange={(v) =>
                                updateDistributionYieldOverrideValue(
                                  "pension",
                                  category,
                                  v,
                                )
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                      <div className="md:col-span-3 flex flex-col gap-2">
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
                            className="h-11 min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 text-base font-black text-emerald-400 outline-none focus:border-emerald-500/50"
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

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle
              icon={Clock}
              title={t("settings.simControl")}
              color="text-slate-400"
              tooltip={t("settings.simControlTooltip")}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <InputGroup
                label={t("settings.simulationStartYear")}
                unit={t("settings.year")}
                tooltip={t("settings.simulationStartYearTooltip")}
                testId="input-group-simulation-start-year"
                value={retireConfig.simulation_params.simulation_start_year}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    simulation_params: {
                      ...retireConfig.simulation_params,
                      simulation_start_year: parseInt(v) || 2026,
                    },
                  })
                }
              />
              <InputGroup
                label={t("settings.simulationStartMonth")}
                unit={t("settings.month")}
                tooltip={t("settings.simulationStartMonthTooltip")}
                testId="input-group-simulation-start-month"
                value={retireConfig.simulation_params.simulation_start_month}
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    simulation_params: {
                      ...retireConfig.simulation_params,
                      simulation_start_month: Math.max(
                        1,
                        Math.min(12, parseInt(v) || 1),
                      ),
                    },
                  })
                }
              />
              <InputGroup
                label={t("settings.monthlyLivingCost")}
                isCurrency
                tooltip={t("settings.monthlyLivingCostTooltip")}
                testId="input-group-monthly-living-cost"
                value={
                  retireConfig.simulation_params.household_monthly_need ??
                  retireConfig.simulation_params.target_monthly_cashflow
                }
                onChange={(v) =>
                  setRetireConfig({
                    ...retireConfig,
                    simulation_params: {
                      ...retireConfig.simulation_params,
                      household_monthly_need: parseInt(v) || 0,
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
                    appreciation_rates: {
                      ...DEFAULT_APPRECIATION_RATE_SCENARIOS,
                    },
                    default_pa_scenario: DEFAULT_PA_SCENARIO,
                  })
                }
                className="shrink-0 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700 transition-all"
                title={t("settings.restoreSystemDefault")}
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,260px)_1fr]">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 ml-1">
                  <label
                    className={cn(
                      isKorean
                        ? "text-xs font-bold text-slate-400 tracking-normal"
                        : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                    )}
                  >
                    {t("settings.defaultPaScenario")}
                  </label>
                  <div className="group relative">
                    <Info size={12} className="text-slate-600 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                      {t("settings.defaultPaScenarioTooltip")}
                    </div>
                  </div>
                </div>
                <select
                  data-testid="settings-default-pa-scenario"
                  value={settings.default_pa_scenario || DEFAULT_PA_SCENARIO}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_pa_scenario: normalizePaScenarioKey(
                        e.target.value,
                      ),
                    })
                  }
                  className="h-11 w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="conservative">
                    {t("scenario.conservative")}
                  </option>
                  <option value="base">{t("scenario.base")}</option>
                  <option value="optimistic">{t("scenario.optimistic")}</option>
                </select>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(
                    ["conservative", "base", "optimistic"] as PaScenarioKey[]
                  ).map((scenario) => (
                    <button
                      key={scenario}
                      type="button"
                      data-testid={`settings-pa-scenario-${scenario}`}
                      onClick={() => setEditingPaScenario(scenario)}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-xs font-black tracking-wide transition-all",
                        editingPaScenario === scenario
                          ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                          : "border-slate-700 bg-slate-900/50 text-slate-400 hover:text-slate-200",
                      )}
                    >
                      {t(`scenario.${scenario}` as const)}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  {t("settings.editingPaScenario")}{" "}
                  <span className="text-slate-300">
                    {t(`scenario.${editingPaScenario}` as const)}
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <InputGroup
                testId="input-group-pa-cash-sgov"
                label={t("settings.catCash")}
                unit="%"
                tooltip={t("settings.catCashTooltip")}
                value={
                  settings.appreciation_rates?.[editingPaScenario]?.cash_sgov ||
                  0
                }
                fractionDigits={1}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    appreciation_rates: {
                      ...settings.appreciation_rates!,
                      [editingPaScenario]: {
                        ...settings.appreciation_rates?.[editingPaScenario],
                        cash_sgov: parseFloat(v) || 0,
                      },
                    },
                  })
                }
              />
              <InputGroup
                testId="input-group-pa-bond-buffer"
                label={t("settings.catBond")}
                unit="%"
                tooltip={t("settings.catBondTooltip")}
                value={
                  settings.appreciation_rates?.[editingPaScenario]
                    ?.bond_buffer || 0
                }
                fractionDigits={1}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    appreciation_rates: {
                      ...settings.appreciation_rates!,
                      [editingPaScenario]: {
                        ...settings.appreciation_rates?.[editingPaScenario],
                        bond_buffer: parseFloat(v) || 0,
                      },
                    },
                  })
                }
              />
              <InputGroup
                testId="input-group-pa-high-income"
                label={t("settings.catHighIncome")}
                unit="%"
                tooltip={t("settings.catHighIncomeTooltip")}
                value={
                  settings.appreciation_rates?.[editingPaScenario]
                    ?.high_income || 0
                }
                fractionDigits={1}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    appreciation_rates: {
                      ...settings.appreciation_rates!,
                      [editingPaScenario]: {
                        ...settings.appreciation_rates?.[editingPaScenario],
                        high_income: parseFloat(v) || 0,
                      },
                    },
                  })
                }
              />
              <InputGroup
                testId="input-group-pa-dividend-stocks"
                label={t("settings.catDividend")}
                unit="%"
                tooltip={t("settings.catDividendTooltip")}
                value={
                  settings.appreciation_rates?.[editingPaScenario]
                    ?.dividend_stocks || 0
                }
                fractionDigits={1}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    appreciation_rates: {
                      ...settings.appreciation_rates!,
                      [editingPaScenario]: {
                        ...settings.appreciation_rates?.[editingPaScenario],
                        dividend_stocks: parseFloat(v) || 0,
                      },
                    },
                  })
                }
              />
              <InputGroup
                testId="input-group-pa-growth-stocks"
                label={t("settings.catGrowth")}
                unit="%"
                tooltip={t("settings.catGrowthTooltip")}
                value={
                  settings.appreciation_rates?.[editingPaScenario]
                    ?.growth_stocks || 0
                }
                fractionDigits={1}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    appreciation_rates: {
                      ...settings.appreciation_rates!,
                      [editingPaScenario]: {
                        ...settings.appreciation_rates?.[editingPaScenario],
                        growth_stocks: parseFloat(v) || 0,
                      },
                    },
                  })
                }
              />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      systemDefault={(id === "v1" ? 0.025 : 0.035) * 100}
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
                  <div className="space-y-2">
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
                        <Info
                          size={12}
                          className="text-slate-600 cursor-help"
                        />
                        <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                          {t("settings.healthUnitPriceTooltip")}
                        </div>
                      </div>
                    </div>
                    <HealthUnitPriceInput
                      value={
                        retireConfig.tax_and_insurance?.point_unit_price ||
                        208.4
                      }
                      onCommit={(pointUnitPrice) =>
                        setRetireConfig({
                          ...retireConfig,
                          tax_and_insurance: {
                            ...retireConfig.tax_and_insurance,
                            point_unit_price: pointUnitPrice,
                          },
                        })
                      }
                    />
                  </div>
                  <div
                    className="pt-4 border-t border-slate-800/50"
                    data-testid="advanced-trigger-settings-notice"
                  >
                    <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/10 p-5">
                      <div className="flex items-center gap-2 text-amber-300">
                        <Info size={14} />
                        <h4
                          className={cn(
                            isKorean
                              ? "text-sm font-bold tracking-normal"
                              : "text-xs font-black uppercase tracking-widest",
                          )}
                        >
                          {t("settings.unusedTriggerSettingsTitle")}
                        </h4>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">
                        {t("settings.unusedTriggerSettingsBody")}
                      </p>
                    </div>
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
  fractionDigits,
  readOnly = false,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  isCurrency?: boolean;
  unit?: string;
  tooltip?: string;
  tooltipAlign?: "left" | "right";
  testId?: string;
  fractionDigits?: number;
  readOnly?: boolean;
}) {
  const { isKorean } = useI18n();
  const formatDisplayValue = (
    nextValue: number | string,
    fixedDigits?: number,
  ) => {
    const raw = String(nextValue ?? "");
    if (raw === "") return "";

    const normalized =
      typeof nextValue === "number" && fixedDigits !== undefined
        ? nextValue.toFixed(fixedDigits)
        : raw.replace(/,/g, "");
    const [integerPart = "", decimalPart] = normalized.split(".");
    const formattedInteger =
      integerPart === ""
        ? ""
        : Number(integerPart).toLocaleString("ko-KR", {
            maximumFractionDigits: 0,
          });

    if (decimalPart !== undefined) {
      return `${formattedInteger}.${decimalPart}`;
    }

    return formattedInteger;
  };
  const [inputValue, setInputValue] = useState(() =>
    formatDisplayValue(value, fractionDigits),
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatDisplayValue(value, fractionDigits));
    }
  }, [fractionDigits, isFocused, value]);

  return (
    <div
      className="group space-y-1.5"
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
          <div className="relative">
            <Info
              size={12}
              className="text-slate-600 cursor-help"
              data-testid="tooltip-icon"
            />
          </div>
        )}
      </div>
      {tooltip && (
        <div
          className={cn(
            "hidden rounded-xl border border-slate-700 bg-slate-800/95 p-3 text-left text-[11px] font-bold leading-relaxed tracking-normal text-slate-300 shadow-xl whitespace-pre-line group-hover:block group-focus-within:block",
            tooltipAlign === "right" ? "text-right" : "text-left",
          )}
        >
          {tooltip}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (inputValue === "") {
              setInputValue(formatDisplayValue(value, fractionDigits));
            }
          }}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            const sanitized = e.target.value.replace(/[^\d.]/g, "");
            const parts = sanitized.split(".");
            const normalized =
              parts.length > 1
                ? `${parts[0]}.${parts.slice(1).join("")}`
                : (parts[0] ?? "");
            setInputValue(formatDisplayValue(normalized));
            onChange(normalized);
          }}
          className={cn(
            "w-full rounded-xl border border-slate-800 h-11 px-4 pr-16 text-sm font-black outline-none transition-all",
            readOnly
              ? "bg-slate-900/70 text-slate-400 cursor-not-allowed"
              : "bg-slate-950/50 text-slate-200 focus:border-emerald-500",
          )}
        />
        {(isCurrency || unit) && (
          <span
            data-testid={`${testId ?? `input-group-${label.toLowerCase().replace(/\s+/g, "-")}`}-unit`}
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

function HealthUnitPriceInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => formatDecimalDraft(value, 1));

  useEffect(() => {
    setDraft(formatDecimalDraft(value, 1));
  }, [value]);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(formatDecimalDraft(value, 1));
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraft(formatDecimalDraft(value, 1));
      return;
    }
    onCommit(parsed);
    setDraft(formatDecimalDraft(parsed, 1));
  };

  return (
    <div className="relative">
      <input
        type="number"
        step="0.1"
        inputMode="decimal"
        data-testid="health-unit-price-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-600">
        KRW
      </span>
    </div>
  );
}
