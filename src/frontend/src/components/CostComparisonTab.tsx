import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useI18n, type TranslationKey } from "../i18n";
import type {
  CostComparisonConfig,
  CostComparisonResult,
  CostComparisonScenarioResult,
} from "../types";

const API_BASE = "http://localhost:8000/api/cost-comparison";
const MASTER_PORTFOLIO_API = "http://localhost:8000/api/master-portfolios";
const CORPORATE_TAX_RATE_OPTIONS = [0.1, 0.2, 0.22, 0.25];
type ConfigSectionKey =
  | "household"
  | "personal_assets"
  | "real_estate"
  | "assumptions"
  | "corporate"
  | "policy_meta";

const defaultConfig: CostComparisonConfig = {
  master_portfolio_id: null,
  simulation_mode: "asset",
  household: {
    members: [],
  },
  personal_assets: {
    investment_assets: 0,
    personal_pension_assets: 0,
  },
  real_estate: {
    official_price: 0,
    ownership_ratio: 1,
  },
  assumptions: {
    price_appreciation_rate: 3,
    simulation_years: 10,
    target_monthly_household_cash_after_tax: 10000000,
  },
  corporate: {
    salary_recipients: [
      {
        id: "self-salary",
        name: "본인",
        relationship: "self",
        monthly_salary: 0,
        is_employee_insured: true,
      },
    ],
    monthly_fixed_cost: 0,
    corp_tax_nominal_rate: 0.1,
    initial_shareholder_loan: 0,
    annual_shareholder_loan_repayment: 0,
  },
  policy_meta: {
    base_year: 2026,
  },
};

type MasterPortfolioOption = {
  id: string;
  name: string;
  is_active?: boolean;
  broken_reference?: boolean;
};

function formatKrw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatAxisKrw(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (absolute >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }
  return `${Math.round(value)}`;
}

function getWinnerLabel(
  winner: CostComparisonResult["comparison"]["winner"],
  t: (key: TranslationKey) => string,
) {
  if (winner === "tie") return t("costComparison.tie");
  return winner === "corporate"
    ? t("costComparison.corporate")
    : t("costComparison.personal");
}

function getLoserLabel(
  winner: CostComparisonResult["comparison"]["winner"],
  t: (key: TranslationKey) => string,
) {
  if (winner === "tie") return t("costComparison.tie");
  return winner === "corporate"
    ? t("costComparison.personal")
    : t("costComparison.corporate");
}

function buildWaterfallSeries(
  revenue: number,
  grossSalary: number,
  tax: number,
  health: number,
  companyInsurance: number,
  fixed: number,
  netSalary: number,
  disposable: number,
) {
  const afterGrossSalary = revenue - grossSalary;
  const afterTax = afterGrossSalary - tax;
  const afterHealth = afterTax - health;
  const afterCompanyInsurance = afterHealth - companyInsurance;
  const afterFixed = afterCompanyInsurance - fixed;
  const afterNetSalary = afterFixed + netSalary;

  return [
    {
      step: "revenue",
      base: 0,
      delta: revenue,
      signedDelta: revenue,
      runningBefore: 0,
      runningAfter: revenue,
      after: revenue,
    },
    {
      step: "grossSalary",
      base: afterGrossSalary,
      delta: grossSalary,
      signedDelta: -grossSalary,
      runningBefore: revenue,
      runningAfter: afterGrossSalary,
      after: afterGrossSalary,
    },
    {
      step: "tax",
      base: afterTax,
      delta: tax,
      signedDelta: -tax,
      runningBefore: afterGrossSalary,
      runningAfter: afterTax,
      after: afterTax,
    },
    {
      step: "health",
      base: afterHealth,
      delta: health,
      signedDelta: -health,
      runningBefore: afterTax,
      runningAfter: afterHealth,
      after: afterHealth,
    },
    {
      step: "companyInsurance",
      base: afterCompanyInsurance,
      delta: companyInsurance,
      signedDelta: -companyInsurance,
      runningBefore: afterHealth,
      runningAfter: afterCompanyInsurance,
      after: afterCompanyInsurance,
    },
    {
      step: "fixed",
      base: afterFixed,
      delta: fixed,
      signedDelta: -fixed,
      runningBefore: afterCompanyInsurance,
      runningAfter: afterFixed,
      after: afterFixed,
    },
    {
      step: "netSalary",
      base: afterFixed,
      delta: netSalary,
      signedDelta: netSalary,
      runningBefore: afterFixed,
      runningAfter: afterNetSalary,
      after: afterNetSalary,
    },
    {
      step: "disposable",
      base: 0,
      delta: disposable,
      signedDelta: disposable,
      runningBefore: afterNetSalary,
      runningAfter: disposable,
      after: disposable,
    },
  ];
}

export function CostComparisonTab() {
  const { t } = useI18n();
  const [config, setConfig] = useState<CostComparisonConfig>(defaultConfig);
  const [result, setResult] = useState<CostComparisonResult | null>(null);
  const [masterPortfolios, setMasterPortfolios] = useState<
    MasterPortfolioOption[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const normalizeConfig = (raw: CostComparisonConfig): CostComparisonConfig => {
    const legacyMode = (
      raw.assumptions as CostComparisonConfig["assumptions"] & {
        simulation_mode?: "target" | "asset";
      }
    ).simulation_mode;

    return {
      ...raw,
      master_portfolio_id: raw.master_portfolio_id ?? null,
      simulation_mode: raw.simulation_mode || legacyMode || "asset",
      corporate: {
        ...raw.corporate,
        corp_tax_nominal_rate: raw.corporate?.corp_tax_nominal_rate ?? 0.1,
      },
      assumptions: {
        ...raw.assumptions,
      },
    };
  };

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const [configResponse, masterResponse] = await Promise.all([
          fetch(`${API_BASE}/config`),
          fetch(MASTER_PORTFOLIO_API),
        ]);
        const configPayload = await configResponse.json();
        const masterPayload = await masterResponse.json();
        if (masterPayload?.success && Array.isArray(masterPayload?.data)) {
          setMasterPortfolios(masterPayload.data as MasterPortfolioOption[]);
        }
        if (configPayload?.success && configPayload?.data) {
          setConfig(
            normalizeConfig(configPayload.data as CostComparisonConfig),
          );
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t("costComparison.loadError"),
        );
      } finally {
        setLoading(false);
      }
    };

    void loadConfig();
  }, [t]);

  const updateConfig = (
    section: ConfigSectionKey,
    key: string,
    value: string | number,
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const updateSimulationMode = (value: "target" | "asset") => {
    setConfig((prev) => ({
      ...prev,
      simulation_mode: value,
    }));
  };

  const updateMasterPortfolioId = (value: string) => {
    setConfig((prev) => ({
      ...prev,
      master_portfolio_id: value || null,
    }));
  };

  const updateSalary = (index: number, monthlySalary: number) => {
    setConfig((prev) => {
      const recipients = [...prev.corporate.salary_recipients];
      recipients[index] = {
        ...recipients[index],
        monthly_salary: monthlySalary,
      };
      return {
        ...prev,
        corporate: {
          ...prev.corporate,
          salary_recipients: recipients,
        },
      };
    });
  };

  const saveConfig = async () => {
    setSaveMessage("");
    setErrorMessage("");
    try {
      const response = await fetch(`${API_BASE}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.message || t("costComparison.saveError"));
      }
      setSaveMessage(t("costComparison.saveSuccess"));
      setConfig(normalizeConfig(payload.data as CostComparisonConfig));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("costComparison.saveError"),
      );
    }
  };

  const runSimulation = async () => {
    setRunning(true);
    setErrorMessage("");
    try {
      const response = await fetch(`${API_BASE}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.message || t("costComparison.runError"));
      }
      setResult(payload.data as CostComparisonResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("costComparison.runError"),
      );
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="text-slate-600">{t("costComparison.loading")}</div>;
  }

  const winnerLabel = result
    ? getWinnerLabel(result.comparison.winner, t)
    : t("costComparison.tie");
  const loserLabel = result
    ? getLoserLabel(result.comparison.winner, t)
    : t("costComparison.tie");
  const annualDelta = result ? Math.abs(result.comparison.annual_advantage) : 0;
  const cumulativeDelta = result
    ? Math.abs(result.comparison.cumulative_advantage)
    : 0;
  const resultMode =
    result?.assumptions.simulation_mode ?? config.simulation_mode;
  const isTargetMode = resultMode === "target";
  const activeMasterId =
    masterPortfolios.find((master) => master.is_active)?.id ?? null;
  const effectiveMasterId = config.master_portfolio_id ?? activeMasterId ?? "";
  const winnerBasisFormula = result
    ? result.comparison.winner_basis === "annual_net_cashflow"
      ? t("costComparison.winnerBasisFormulaNetCashflow")
      : result.comparison.winner_basis
    : t("costComparison.winnerBasisFormulaNetCashflow");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2
            className="text-3xl font-bold tracking-tight text-slate-800"
            data-testid="cost-comparison-title"
          >
            {t("costComparison.title")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {t("costComparison.subtitle")}
          </p>
        </div>
      </div>

      {saveMessage ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          data-testid="cost-comparison-save-success"
        >
          {saveMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section
        className="rounded-3xl border border-white/80 bg-white/76 p-5 shadow-sm md:p-6"
        data-testid="cc-input-section"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <span>{t("costComparison.inputSectionEyebrow")}</span>
              <TooltipTrigger
                testId="cc-tooltip-trigger-input-section"
                text={t("costComparison.tooltip.inputSection")}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-800">
                {t("costComparison.inputSection")}
              </h3>
              <TooltipTrigger
                testId="cc-tooltip-trigger-input-section-title"
                text={t("costComparison.tooltip.inputSection")}
              />
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {t("costComparison.inputSectionDescription")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              data-testid="cc-save-button"
              onClick={() => void saveConfig()}
              type="button"
            >
              {t("costComparison.save")}
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              data-testid="cc-run-button"
              onClick={() => void runSimulation()}
              type="button"
            >
              {running ? t("costComparison.running") : t("costComparison.run")}
            </button>
          </div>
        </div>

        <div className="mt-5 mb-5 flex w-fit gap-2 rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm">
          <button
            onClick={() => updateSimulationMode("target")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              config.simulation_mode === "target"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
            data-testid="cc-mode-target"
            type="button"
          >
            {t("costComparison.mode.target")}
          </button>
          <button
            onClick={() => updateSimulationMode("asset")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              config.simulation_mode === "asset"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
            data-testid="cc-mode-asset"
            type="button"
          >
            {t("costComparison.mode.asset")}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MasterPortfolioField
            label={t("costComparison.masterPortfolio")}
            testId="cc-master-portfolio"
            tooltip={t("costComparison.tooltip.masterPortfolio")}
            value={effectiveMasterId}
            options={masterPortfolios}
            onChange={updateMasterPortfolioId}
          />
          <NumberField
            label={t("costComparison.investmentAssets")}
            testId="cc-investment-assets"
            tooltip={t("costComparison.tooltip.investmentAssets")}
            unit="KRW"
            value={config.personal_assets.investment_assets}
            onChange={(value) =>
              updateConfig("personal_assets", "investment_assets", value)
            }
          />
          <NumberField
            label={t("costComparison.pensionAssets")}
            testId="cc-pension-assets"
            tooltip={t("costComparison.tooltip.pensionAssets")}
            unit="KRW"
            value={config.personal_assets.personal_pension_assets}
            onChange={(value) =>
              updateConfig("personal_assets", "personal_pension_assets", value)
            }
          />
          <NumberField
            label={t("costComparison.realEstateValue")}
            testId="cc-real-estate-value"
            tooltip={t("costComparison.tooltip.realEstateValue")}
            unit="KRW"
            value={config.real_estate.official_price}
            onChange={(value) =>
              updateConfig("real_estate", "official_price", value)
            }
          />
          <NumberField
            label={t("costComparison.realEstateRatio")}
            testId="cc-real-estate-ratio"
            step="0.1"
            tooltip={t("costComparison.tooltip.realEstateRatio")}
            unit={t("costComparison.ratioUnit")}
            value={config.real_estate.ownership_ratio}
            onChange={(value) =>
              updateConfig("real_estate", "ownership_ratio", value)
            }
          />
          <NumberField
            label={t("costComparison.paRate")}
            testId="cc-pa-rate"
            step="0.1"
            tooltip={t("costComparison.tooltip.paRate")}
            unit="%"
            value={config.assumptions.price_appreciation_rate}
            onChange={(value) =>
              updateConfig("assumptions", "price_appreciation_rate", value)
            }
          />
          <NumberField
            label={t("costComparison.simulationYears")}
            testId="cc-simulation-years"
            tooltip={t("costComparison.tooltip.simulationYears")}
            unit={t("costComparison.yearUnit")}
            value={config.assumptions.simulation_years}
            onChange={(value) =>
              updateConfig("assumptions", "simulation_years", value)
            }
          />
          <NumberField
            label={t("costComparison.targetMonthlyCash")}
            testId="cc-target-monthly-cash"
            tooltip={t("costComparison.tooltip.targetMonthlyCash")}
            unit="KRW"
            value={config.assumptions.target_monthly_household_cash_after_tax}
            onChange={(value) =>
              updateConfig(
                "assumptions",
                "target_monthly_household_cash_after_tax",
                value,
              )
            }
          />
          <NumberField
            label={t("costComparison.monthlyFixedCost")}
            testId="cc-monthly-fixed-cost"
            tooltip={t("costComparison.tooltip.monthlyFixedCost")}
            unit="KRW"
            value={config.corporate.monthly_fixed_cost}
            onChange={(value) =>
              updateConfig("corporate", "monthly_fixed_cost", value)
            }
          />
          <SelectField
            label={t("costComparison.corpTaxRate")}
            testId="cc-corp-tax-rate"
            tooltip={t("costComparison.tooltip.corpTaxRate")}
            value={config.corporate.corp_tax_nominal_rate}
            options={CORPORATE_TAX_RATE_OPTIONS}
            onChange={(value) =>
              updateConfig("corporate", "corp_tax_nominal_rate", value)
            }
          />
          <NumberField
            label={t("costComparison.salary")}
            testId="cc-salary-0"
            tooltip={t("costComparison.tooltip.salary")}
            unit="KRW"
            value={config.corporate.salary_recipients[0]?.monthly_salary ?? 0}
            onChange={(value) => updateSalary(0, value)}
          />
        </div>
      </section>

      <section
        className="rounded-3xl border border-white/80 bg-white/74 p-5 shadow-sm md:p-6"
        data-testid="cc-result-section"
      >
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            <span>{t("costComparison.resultSectionEyebrow")}</span>
            <TooltipTrigger
              testId="cc-tooltip-trigger-result-section"
              text={t("costComparison.tooltip.resultSection")}
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-bold text-slate-800">
              {t("costComparison.resultSection")}
            </h3>
            <TooltipTrigger
              testId="cc-tooltip-trigger-result-section-title"
              text={t("costComparison.tooltip.resultSection")}
            />
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {t("costComparison.resultSectionDescription")}
          </p>
        </div>

        {result ? (
          <div className="mt-6 space-y-6">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                <span>{t("costComparison.assumptionSection")}</span>
                <TooltipTrigger
                  testId="cc-tooltip-trigger-assumption-section"
                  text={t("costComparison.tooltip.assumptionSection")}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <AssumptionBadge
                  label={t("costComparison.masterPortfolio")}
                  testId="cc-assumption-master-portfolio"
                  tooltip={t("costComparison.tooltip.masterPortfolio")}
                  value={
                    result.assumptions.master_portfolio_name ??
                    result.assumptions.portfolio_name
                  }
                />
                <AssumptionBadge
                  label={t("costComparison.assumptionMode")}
                  testId="cc-assumption-mode"
                  tooltip={t("costComparison.tooltip.assumptionMode")}
                  value={
                    result.assumptions.simulation_mode === "asset"
                      ? t("costComparison.mode.asset")
                      : t("costComparison.mode.target")
                  }
                />
                <AssumptionBadge
                  label={t("costComparison.simulationYears")}
                  testId="cc-assumption-years"
                  tooltip={t("costComparison.tooltip.simulationYears")}
                  value={`${result.assumptions.simulation_years}${t("costComparison.yearUnit")}`}
                />
                <AssumptionBadge
                  label={t("costComparison.assumptionPortfolio")}
                  testId="cc-assumption-portfolio"
                  tooltip={t("costComparison.tooltip.assumptionPortfolio")}
                  value={result.assumptions.portfolio_name}
                />
                <AssumptionBadge
                  label={t("costComparison.assumptionCorporatePortfolio")}
                  testId="cc-assumption-corporate-portfolio"
                  tooltip={t(
                    "costComparison.tooltip.assumptionCorporatePortfolio",
                  )}
                  value={result.assumptions.corporate_portfolio_name ?? "-"}
                />
                <AssumptionBadge
                  label={t("costComparison.assumptionPensionPortfolio")}
                  testId="cc-assumption-pension-portfolio"
                  tooltip={t(
                    "costComparison.tooltip.assumptionPensionPortfolio",
                  )}
                  value={result.assumptions.pension_portfolio_name ?? "-"}
                />
                <AssumptionBadge
                  label="DY"
                  testId="cc-assumption-dy"
                  tooltip={t("costComparison.tooltip.dy")}
                  value={formatPercent(result.assumptions.dy)}
                />
                <AssumptionBadge
                  label="PA"
                  testId="cc-assumption-pa"
                  tooltip={t("costComparison.tooltip.pa")}
                  value={formatPercent(result.assumptions.pa)}
                />
                <AssumptionBadge
                  label="TR"
                  testId="cc-assumption-tr"
                  tooltip={t("costComparison.tooltip.tr")}
                  value={formatPercent(result.assumptions.tr)}
                />
                <AssumptionBadge
                  label={t("costComparison.corpTaxRate")}
                  testId="cc-assumption-corp-tax-rate"
                  tooltip={t("costComparison.tooltip.corpTaxRate")}
                  value={`${(
                    (result.corporate.breakdown.audit_details?.corp_tax
                      ?.nominal_rate ??
                      config.corporate.corp_tax_nominal_rate) * 100
                  ).toFixed(0)}% -> ${(
                    (result.corporate.breakdown.audit_details?.corp_tax
                      ?.effective_rate ??
                      config.corporate.corp_tax_nominal_rate * 1.1) * 100
                  ).toFixed(1)}%`}
                />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                <span>{t("costComparison.scenarioSection")}</span>
                <TooltipTrigger
                  testId="cc-tooltip-trigger-scenario-section"
                  text={t("costComparison.tooltip.scenarioSection")}
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ScenarioCard
                  monthlyCashLabel={
                    result.assumptions.simulation_mode === "asset"
                      ? t("costComparison.disposableCash")
                      : t("costComparison.requiredRevenue")
                  }
                  totalCostLabel={t("costComparison.annualTotalCost")}
                  healthLabel={t("costComparison.healthInsurance")}
                  growthLabel={
                    result.assumptions.simulation_mode === "asset"
                      ? t("costComparison.assetNetYield")
                      : t("costComparison.netGrowth")
                  }
                  title={t("costComparison.personal")}
                  testId="cc-kpi-personal"
                  testIdPrefix="cc-kpi-personal"
                  monthlyCashTooltip={
                    result.assumptions.simulation_mode === "asset"
                      ? t("costComparison.tooltip.disposableCash")
                      : t("costComparison.tooltip.requiredRevenue")
                  }
                  totalCostTooltip={t("costComparison.tooltip.annualTotalCost")}
                  healthTooltip={t("costComparison.tooltip.healthInsurance")}
                  growthTooltip={t("costComparison.tooltip.netGrowth")}
                  monthlyCash={
                    result.assumptions.simulation_mode === "asset"
                      ? result.personal.kpis.monthly_disposable_cashflow
                      : result.personal.kpis.required_annual_revenue
                  }
                  totalCost={result.personal.kpis.annual_total_cost}
                  health={result.personal.kpis.annual_health_insurance}
                  growth={result.personal.kpis.required_assets}
                  growthValue={
                    result.assumptions.simulation_mode === "asset"
                      ? formatPercent(
                          (result.personal.kpis.net_yield || 0) / 100,
                        )
                      : undefined
                  }
                  auditDetails={result.personal.breakdown.audit_details}
                />
                <ScenarioCard
                  monthlyCashLabel={
                    result.assumptions.simulation_mode === "asset"
                      ? t("costComparison.disposableCash")
                      : t("costComparison.requiredRevenue")
                  }
                  totalCostLabel={t("costComparison.annualTotalCost")}
                  healthLabel={t("costComparison.healthInsurance")}
                  growthLabel={
                    result.assumptions.simulation_mode === "asset"
                      ? t("costComparison.assetNetYield")
                      : t("costComparison.netGrowth")
                  }
                  title={t("costComparison.corporate")}
                  testId="cc-kpi-corporate"
                  testIdPrefix="cc-kpi-corporate"
                  monthlyCashTooltip={
                    result.assumptions.simulation_mode === "asset"
                      ? t("costComparison.tooltip.disposableCash")
                      : t("costComparison.tooltip.requiredRevenue")
                  }
                  totalCostTooltip={t("costComparison.tooltip.annualTotalCost")}
                  healthTooltip={t("costComparison.tooltip.healthInsurance")}
                  growthTooltip={t("costComparison.tooltip.netGrowth")}
                  monthlyCash={
                    result.assumptions.simulation_mode === "asset"
                      ? result.corporate.kpis.monthly_disposable_cashflow
                      : result.corporate.kpis.required_annual_revenue
                  }
                  totalCost={result.corporate.kpis.annual_total_cost}
                  health={result.corporate.kpis.annual_health_insurance}
                  growth={result.corporate.kpis.required_assets}
                  growthValue={
                    result.assumptions.simulation_mode === "asset"
                      ? formatPercent(
                          (result.corporate.kpis.net_yield || 0) / 100,
                        )
                      : undefined
                  }
                  auditDetails={result.corporate.breakdown.audit_details}
                />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                <span>{t("costComparison.summarySection")}</span>
                <TooltipTrigger
                  testId="cc-tooltip-trigger-summary-section"
                  text={t("costComparison.tooltip.summarySection")}
                />
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/78 p-5 shadow-sm">
                <div
                  className="text-lg font-bold text-slate-800"
                  data-testid="cc-comparison-winner"
                >
                  {result.comparison.winner === "corporate"
                    ? t("costComparison.corporateWins")
                    : result.comparison.winner === "personal"
                      ? t("costComparison.personalWins")
                      : t("costComparison.tieWins")}
                </div>
                <div
                  className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                  data-testid="cc-winner-summary-annual"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    {t("costComparison.winnerAnnualLabel")}
                  </div>
                  {result.comparison.winner === "tie" ? (
                    <div className="mt-1 text-sm text-slate-700">
                      {t("costComparison.tieAnnualSummary")}
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-slate-700">
                      {t("costComparison.winnerAnnualPrefix")}{" "}
                      <span className="font-semibold text-slate-900">
                        {winnerLabel}
                      </span>
                      {t("costComparison.winnerAnnualMiddle")}
                      <span className="font-semibold text-slate-900">
                        {loserLabel}
                      </span>
                      {t("costComparison.winnerAnnualSuffix")}
                    </div>
                  )}
                  <div
                    className="mt-2 text-2xl font-black text-emerald-700"
                    data-testid="cc-winner-summary-annual-delta"
                  >
                    {formatKrw(annualDelta)}
                  </div>
                </div>
                <div
                  className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  data-testid="cc-winner-summary-cumulative"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("costComparison.winnerCumulativeLabel")}
                  </div>
                  {result.comparison.winner === "tie" ? (
                    <div className="mt-1 text-sm text-slate-600">
                      {t("costComparison.tieCumulativeSummary")}
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-slate-600">
                      {t("costComparison.winnerCumulativePrefix")}{" "}
                      <span className="font-semibold text-slate-900">
                        {winnerLabel}
                      </span>
                      {t("costComparison.winnerCumulativeMiddle")}
                      <span className="font-semibold text-slate-900">
                        {loserLabel}
                      </span>
                      {t("costComparison.winnerCumulativeSuffix")}
                    </div>
                  )}
                  <div
                    className="mt-2 text-lg font-bold text-slate-800"
                    data-testid="cc-winner-summary-cumulative-delta"
                  >
                    {formatKrw(cumulativeDelta)}
                  </div>
                </div>
                <div
                  className="mt-2 flex items-center gap-2 text-sm text-slate-400"
                  data-testid="cc-winner-basis"
                >
                  <span>{t("costComparison.winnerBasis")}:</span>
                  <span>{t("costComparison.annualNetCashflow")}</span>
                  <span
                    className="text-slate-500"
                    data-testid="cc-winner-basis-formula"
                  >
                    ({winnerBasisFormula})
                  </span>
                  <TooltipTrigger
                    testId="cc-tooltip-trigger-cc-winner-basis"
                    text={`${result.comparison.winner_reason} ${t("costComparison.tooltip.winner")}`}
                  />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {result.comparison.top_drivers.map((driver, index) => (
                    <div
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      data-testid={`cc-driver-${index}`}
                      key={`${driver.label}-${index}`}
                    >
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        <span>{driver.label}</span>
                        <TooltipTrigger
                          testId={`cc-tooltip-trigger-driver-${index}`}
                          text={getDriverTooltip(driver.label, t)}
                        />
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-800">
                        {formatKrw(driver.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {result.warnings.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-700">
                  <span>{t("costComparison.warningTitle")}</span>
                  <TooltipTrigger
                    testId="cc-tooltip-trigger-warning"
                    text={t("costComparison.tooltip.warning")}
                  />
                </div>
                <div className="space-y-3">
                  {result.warnings.map((warning, index) => (
                    <div
                      className="rounded-xl border border-amber-200 bg-white/90 px-4 py-3 text-sm text-amber-800"
                      data-testid={`cc-warning-${index}`}
                      key={`${warning}-${index}`}
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                <span>{t("costComparison.chartSection")}</span>
                <TooltipTrigger
                  testId="cc-tooltip-trigger-chart-section"
                  text={t("costComparison.tooltip.chartSection")}
                />
              </div>
              <div
                className="rounded-2xl border border-white/80 bg-white/78 p-5 shadow-sm"
                data-testid="cc-total-value-chart"
              >
                <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                  <span>{t("costComparison.totalValueTitle")}</span>
                  <TooltipTrigger
                    testId="cc-tooltip-trigger-total-value"
                    text={t("costComparison.tooltip.totalValue")}
                  />
                </div>
                <div
                  className="mb-4 text-sm text-slate-600"
                  data-testid="cc-total-value-note"
                >
                  {t("costComparison.totalValueNote")}
                </div>
                <div className="h-80">
                  <CashCompositionChart
                    data={[
                      {
                        name: t("costComparison.personal"),
                        investmentCash:
                          result.personal.kpis.annual_net_cashflow,
                        salary: 0,
                        total: result.personal.kpis.annual_net_cashflow,
                      },
                      {
                        name: t("costComparison.corporate"),
                        investmentCash:
                          result.corporate.breakdown.net_corporate_cash ?? 0,
                        salary: result.corporate.breakdown.net_salary,
                        total: result.corporate.kpis.annual_net_cashflow,
                      },
                    ]}
                  />
                </div>
              </div>

              <div
                className="mt-6 rounded-2xl border border-white/80 bg-white/78 p-5 shadow-sm"
                data-testid="cc-breakdown-chart"
              >
                <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                  <span>{t("costComparison.breakdownTitle")}</span>
                  <TooltipTrigger
                    testId="cc-tooltip-trigger-breakdown"
                    text={t("costComparison.tooltip.breakdown")}
                  />
                </div>
                <div className="mb-4 grid gap-3 md:grid-cols-[88px_minmax(0,1fr)]">
                  <div />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                      data-testid="cc-breakdown-total-personal"
                    >
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <span>
                          {t("costComparison.personal")} ·{" "}
                          {t("costComparison.annualTotalCost")}
                        </span>
                        <TooltipTrigger
                          testId="cc-tooltip-trigger-breakdown-total-personal"
                          text={t("costComparison.tooltip.annualTotalCost")}
                        />
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">
                        {formatKrw(result.personal.kpis.annual_total_cost)}
                      </div>
                    </div>
                    <div
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                      data-testid="cc-breakdown-total-corporate"
                    >
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <span>
                          {t("costComparison.corporate")} ·{" "}
                          {t("costComparison.annualTotalCost")}
                        </span>
                        <TooltipTrigger
                          testId="cc-tooltip-trigger-breakdown-total-corporate"
                          text={t("costComparison.tooltip.annualTotalCost")}
                        />
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">
                        {formatKrw(result.corporate.kpis.annual_total_cost)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: t("costComparison.personal"),
                          tax: result.personal.breakdown.tax,
                          health: result.personal.breakdown.health_insurance,
                          social: result.personal.breakdown.social_insurance,
                          fixed: result.personal.breakdown.fixed_cost,
                        },
                        {
                          name: t("costComparison.corporate"),
                          tax: result.corporate.breakdown.tax,
                          health: result.corporate.breakdown.health_insurance,
                          social: result.corporate.breakdown.social_insurance,
                          fixed: result.corporate.breakdown.fixed_cost,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ea" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis
                        stroke="#64748b"
                        width={88}
                        tickFormatter={(value) =>
                          formatAxisKrw(Number(value || 0))
                        }
                      />
                      <Tooltip
                        content={
                          <ChartTooltip
                            formatter={(value) => formatKrw(Number(value || 0))}
                          />
                        }
                        cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                      />
                      <Legend />
                      <Bar
                        dataKey="tax"
                        name={t("costComparison.tax")}
                        stackId="a"
                        fill="#f97316"
                      />
                      <Bar
                        dataKey="health"
                        name={t("costComparison.healthInsurance")}
                        stackId="a"
                        fill="#10b981"
                      />
                      <Bar
                        dataKey="social"
                        name={t("costComparison.socialInsurance")}
                        stackId="a"
                        fill="#3b82f6"
                      />
                      <Bar
                        dataKey="fixed"
                        name={t("costComparison.fixedCost")}
                        stackId="a"
                        fill="#a855f7"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {isTargetMode ? (
              <div
                className="rounded-2xl border border-white/80 bg-white/78 p-5 shadow-sm"
                data-testid="cc-cumulative-chart"
              >
                <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                  <span>{t("costComparison.cumulativeTitle")}</span>
                  <TooltipTrigger
                    testId="cc-tooltip-trigger-cumulative"
                    text={t("costComparison.tooltip.cumulative")}
                  />
                </div>
                <div
                  className="mb-4 text-sm text-slate-600"
                  data-testid="cc-cumulative-note"
                >
                  {t("costComparison.cumulativeNote")}
                </div>
                <div className="h-80">
                  <ComparisonBarChart
                    data={[
                      {
                        name: t("costComparison.personal"),
                        value: result.personal.kpis.required_assets,
                      },
                      {
                        name: t("costComparison.corporate"),
                        value: result.corporate.kpis.required_assets,
                      },
                    ]}
                  />
                </div>
              </div>
            ) : null}

            {isTargetMode ? (
              <div
                className="rounded-2xl border border-white/80 bg-white/78 p-5 shadow-sm"
                data-testid="cc-household-cash-chart"
              >
                <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                  <span>{t("costComparison.householdCashTitle")}</span>
                  <TooltipTrigger
                    testId="cc-tooltip-trigger-household-cash"
                    text={t("costComparison.tooltip.householdCash")}
                  />
                </div>
                <div
                  className="mb-4 text-sm text-slate-600"
                  data-testid="cc-household-cash-note"
                >
                  {t("costComparison.householdCashNote")}
                </div>
                <div className="h-80">
                  <ComparisonBarChart
                    minPointSize={6}
                    data={[
                      {
                        name: t("costComparison.personal"),
                        value:
                          result.personal.kpis.asset_margin_vs_current || 0,
                      },
                      {
                        name: t("costComparison.corporate"),
                        value:
                          result.corporate.kpis.asset_margin_vs_current || 0,
                      },
                    ]}
                  />
                </div>
              </div>
            ) : null}

            <div
              className="rounded-2xl border border-white/80 bg-white/78 p-5 shadow-sm"
              data-testid="cc-sustainability-chart"
            >
              <div className="mb-4 text-lg font-bold text-slate-800">
                <div className="flex items-center gap-2">
                  <span>{t("costComparison.sustainabilityTitle")}</span>
                  <TooltipTrigger
                    testId="cc-tooltip-trigger-sustainability"
                    text={t("costComparison.tooltip.sustainability")}
                  />
                </div>
              </div>
              <div
                className="mb-4 text-sm text-slate-600"
                data-testid="cc-sustainability-note"
              >
                {t("costComparison.sustainabilityNote")}
              </div>
              <div className="h-80">
                <SustainabilityLineChart
                  annualTargetCash={
                    result.assumptions.target_monthly_household_cash_after_tax *
                    12
                  }
                  personalSeries={result.personal.sustainability_series}
                  corporateSeries={result.corporate.sustainability_series}
                />
              </div>
            </div>

            <div
              className="rounded-2xl border border-white/80 bg-white/78 p-5 shadow-sm"
              data-testid="cc-waterfall-chart"
            >
              <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <span>{t("costComparison.waterfallTitle")}</span>
                <TooltipTrigger
                  testId="cc-tooltip-trigger-waterfall"
                  text={t("costComparison.tooltip.waterfall")}
                />
              </div>
              <div
                className="mb-4 text-sm text-slate-600"
                data-testid="cc-waterfall-note"
              >
                {t("costComparison.waterfallNote")}
              </div>
              <div
                className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                data-testid="cc-waterfall-basis"
              >
                {t("costComparison.waterfallBasis")}
              </div>
              <div className="mb-5 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                <div
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
                  data-testid="cc-waterfall-step-revenue"
                >
                  {t("costComparison.revenue")}
                </div>
                <div
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
                  data-testid="cc-waterfall-step-gross-salary"
                >
                  {t("costComparison.grossSalary")}
                </div>
                <div
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
                  data-testid="cc-waterfall-step-tax"
                >
                  {t("costComparison.tax")}
                </div>
                <div
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
                  data-testid="cc-waterfall-step-health"
                >
                  {t("costComparison.healthInsurance")}
                </div>
                <div
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
                  data-testid="cc-waterfall-step-company-insurance"
                >
                  {t("costComparison.companyInsurance")}
                </div>
                <div
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
                  data-testid="cc-waterfall-step-fixed"
                >
                  {t("costComparison.fixedCost")}
                </div>
                <div
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
                  data-testid="cc-waterfall-step-net-salary"
                >
                  {t("costComparison.netSalary")}
                </div>
                <div
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
                  data-testid="cc-waterfall-step-disposable"
                >
                  {t("costComparison.disposableCash")}
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <WaterfallScenarioChart
                  title={t("costComparison.personal")}
                  revenue={result.personal.breakdown.annual_revenue}
                  grossSalary={0}
                  tax={result.personal.breakdown.tax}
                  health={result.personal.breakdown.health_insurance}
                  companyInsurance={0}
                  fixed={result.personal.breakdown.fixed_cost}
                  netSalary={0}
                  disposable={result.personal.kpis.annual_net_cashflow}
                  positiveColor="#e2e8f0"
                />
                <WaterfallScenarioChart
                  title={t("costComparison.corporate")}
                  revenue={result.corporate.breakdown.annual_revenue}
                  grossSalary={result.corporate.breakdown.gross_salary ?? 0}
                  tax={result.corporate.breakdown.tax}
                  health={0}
                  companyInsurance={
                    result.corporate.breakdown.company_insurance_cost ?? 0
                  }
                  fixed={result.corporate.breakdown.fixed_cost}
                  netSalary={result.corporate.breakdown.net_salary}
                  disposable={result.corporate.kpis.annual_net_cashflow}
                  positiveColor="#10b981"
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-5 py-6 text-sm text-slate-500"
            data-testid="cc-result-empty"
          >
            {t("costComparison.resultSectionEmpty")}
          </div>
        )}
      </section>
    </div>
  );
}

function NumberField({
  label,
  testId,
  tooltip,
  unit,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  testId: string;
  tooltip: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  const formatDisplayValue = (nextValue: number | string) => {
    const raw = String(nextValue ?? "");
    if (raw === "") return "";

    const normalized = raw.replace(/,/g, "");
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
  const [inputValue, setInputValue] = useState(() => formatDisplayValue(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatDisplayValue(value));
    }
  }, [isFocused, value]);

  return (
    <label className="rounded-2xl border border-white/80 bg-white/82 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
        <span data-testid={`${testId}-label`}>{label}</span>
        <TooltipTrigger
          testId={`cc-tooltip-trigger-${testId}`}
          text={tooltip}
        />
      </div>

      <div className="relative">
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-14 text-slate-800 outline-none"
          data-testid={testId}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (inputValue === "") {
              setInputValue(formatDisplayValue(value));
            }
          }}
          onChange={(event) => {
            const sanitized = event.target.value.replace(/[^\d.]/g, "");
            const parts = sanitized.split(".");
            const normalized =
              parts.length > 1
                ? `${parts[0]}.${parts.slice(1).join("")}`
                : (parts[0] ?? "");
            setInputValue(formatDisplayValue(normalized));
            onChange(normalized === "" ? 0 : Number(normalized));
          }}
          inputMode={step.includes(".") ? "decimal" : "numeric"}
          step={step}
          type="text"
          value={inputValue}
        />
        {unit ? (
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500"
            data-testid={`${testId}-unit`}
          >
            {unit}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function SelectField({
  label,
  testId,
  tooltip,
  value,
  options,
  onChange,
}: {
  label: string;
  testId: string;
  tooltip: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-white/80 bg-white/82 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
        <span data-testid={`${testId}-label`}>{label}</span>
        <TooltipTrigger
          testId={`cc-tooltip-trigger-${testId}`}
          text={tooltip}
        />
      </div>
      <select
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none"
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {(option * 100).toFixed(0)}% ({(option * 1.1 * 100).toFixed(1)}%)
          </option>
        ))}
      </select>
    </label>
  );
}

function MasterPortfolioField({
  label,
  testId,
  tooltip,
  value,
  options,
  onChange,
}: {
  label: string;
  testId: string;
  tooltip: string;
  value: string;
  options: MasterPortfolioOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-2xl border border-white/80 bg-white/82 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
        <span data-testid={`${testId}-label`}>{label}</span>
        <TooltipTrigger
          testId={`cc-tooltip-trigger-${testId}`}
          text={tooltip}
        />
      </div>
      <select
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none"
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.length === 0 ? <option value="">-</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssumptionBadge({
  label,
  value,
  testId,
  tooltip,
}: {
  label: string;
  value: string;
  testId: string;
  tooltip: string;
}) {
  return (
    <div
      className="rounded-2xl border border-white/80 bg-white/82 p-4 shadow-sm"
      data-testid={testId}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
        <span data-testid={`${testId}-label`}>{label}</span>
        <TooltipTrigger
          testId={`cc-tooltip-trigger-${testId}`}
          text={tooltip}
        />
      </div>

      <div className="mt-2 text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function ScenarioCard({
  title,
  testId,
  testIdPrefix,
  monthlyCashLabel,
  totalCostLabel,
  healthLabel,
  growthLabel,
  monthlyCashTooltip,
  totalCostTooltip,
  healthTooltip,
  growthTooltip,
  monthlyCash,
  totalCost,
  health,
  growth,
  growthValue, // 추가: 숫자가 아닌 문자열 표시용 (예: % 수익률)
  auditDetails, // 추가: 상세 감사 내역
}: {
  title: string;
  testId: string;
  testIdPrefix: string;
  monthlyCashLabel: string;
  totalCostLabel: string;
  healthLabel: string;
  growthLabel: string;
  monthlyCashTooltip: string;
  totalCostTooltip: string;
  healthTooltip: string;
  growthTooltip: string;
  monthlyCash: number;
  totalCost: number;
  health: number;
  growth: number;
  growthValue?: string;
  auditDetails?: CostComparisonScenarioResult["breakdown"]["audit_details"];
}) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-2xl border border-white/80 bg-white/82 p-5 shadow-sm"
      data-testid={testId}
    >
      <div className="text-lg font-bold text-slate-800">{title}</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Metric
          label={monthlyCashLabel}
          testId={`${testIdPrefix}-cash`}
          tooltip={monthlyCashTooltip}
          value={formatKrw(monthlyCash)}
        />
        <Metric
          label={totalCostLabel}
          testId={`${testIdPrefix}-cost`}
          tooltip={totalCostTooltip}
          value={formatKrw(totalCost)}
        />
        <Metric
          label={healthLabel}
          testId={`${testIdPrefix}-health`}
          tooltip={healthTooltip}
          value={formatKrw(health)}
        />
        <Metric
          label={growthLabel}
          testId={`${testIdPrefix}-growth`}
          tooltip={growthTooltip}
          value={growthValue || formatKrw(growth)}
        />
      </div>

      {auditDetails && auditDetails.health && (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t("costComparison.detailedAudit")}
          </div>
          <div className="space-y-2">
            {auditDetails.health.property_points !== undefined && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-400">
                  {t("costComparison.propertyPoints")}
                </span>
                <span className="font-mono text-slate-700">
                  {auditDetails.health.property_points.toLocaleString()} 점
                </span>
              </div>
            )}
            {auditDetails.health.income_points !== undefined && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-400">
                  {t("costComparison.incomePoints")}
                </span>
                <span className="font-mono text-slate-700">
                  {auditDetails.health.income_points.toLocaleString()} 점
                </span>
              </div>
            )}
            {auditDetails.health.total_points !== undefined && (
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-[13px] font-bold">
                <span className="text-slate-700">
                  {t("costComparison.totalPoints")}
                </span>
                <span className="text-indigo-400 font-mono">
                  {auditDetails.health.total_points.toLocaleString()} 점
                </span>
              </div>
            )}
            {auditDetails.health.point_unit_price && (
              <div className="flex justify-between text-[11px] text-slate-500 italic">
                <span>{t("costComparison.unitPriceLtc")}</span>
                <span>
                  {formatKrw(auditDetails.health.point_unit_price)} x{" "}
                  {((1 + (auditDetails.health.ltc_rate || 0)) * 100).toFixed(1)}
                  %
                </span>
              </div>
            )}
            {auditDetails.tax && (
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-[13px]">
                <span className="text-slate-400">
                  {t("costComparison.appliedTaxRate")}
                </span>
                <span className="text-orange-400 font-mono">
                  {(auditDetails.tax.tax_rate! * 100).toFixed(1)}%
                  {auditDetails.tax.is_comprehensive ? " (종합)" : " (분리)"}
                </span>
              </div>
            )}
            {auditDetails.corp_tax && (
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-[13px]">
                <span className="text-slate-400">
                  {t("costComparison.appliedCorpTaxRate")}
                </span>
                <span className="text-emerald-400 font-mono">
                  {(
                    (auditDetails.corp_tax.nominal_rate ??
                      auditDetails.corp_tax.tax_rate_low ??
                      0) * 100
                  ).toFixed(0)}
                  % -&gt;{" "}
                  {(
                    (auditDetails.corp_tax.effective_rate ??
                      auditDetails.corp_tax.tax_rate_low ??
                      0) * 100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  testId,
  tooltip,
  value,
}: {
  label: string;
  testId: string;
  tooltip: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
        <span data-testid={`${testId}-label`}>{label}</span>
        <TooltipTrigger
          testId={`cc-tooltip-trigger-${testId}`}
          text={tooltip}
        />
      </div>

      <div className="mt-2 text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function TooltipTrigger({
  testId,
  text,
  align = "left",
}: {
  testId: string;
  text: string;
  align?: "left" | "right";
}) {
  return (
    <div className="group relative inline-flex">
      <button
        className="text-slate-500 transition hover:text-slate-700"
        data-testid={testId}
        title={text}
        aria-label={text}
        type="button"
      >
        <Info size={13} />
      </button>
      <div
        className={`absolute bottom-full mb-2 hidden w-56 rounded-xl border border-slate-200 bg-white/95 p-3 text-left text-[11px] font-medium leading-relaxed text-slate-600 shadow-lg group-hover:block group-focus-within:block z-[70] ${align === "right" ? "right-0" : "left-0"}`}
        data-testid={`${testId}-content`}
      >
        {text}
      </div>
    </div>
  );
}

function getDriverTooltip(label: string, t: (key: TranslationKey) => string) {
  if (label.includes("건강")) return t("costComparison.tooltip.driver.health");
  if (label.includes("세금")) return t("costComparison.tooltip.driver.tax");
  if (label.includes("급여")) return t("costComparison.tooltip.driver.salary");
  if (label.includes("고정")) return t("costComparison.tooltip.driver.fixed");
  if (label.includes("사회")) return t("costComparison.tooltip.driver.social");
  if (label.includes("대여금")) return t("costComparison.tooltip.driver.loan");
  return t("costComparison.tooltip.breakdown");
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string | number;
  formatter: (
    value: number | string | undefined,
    entry?: {
      name?: string;
      value?: number | string;
      color?: string;
      payload?: Record<string, unknown>;
    },
  ) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-800 shadow-lg">
      {label !== undefined ? (
        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {label}
        </div>
      ) : null}
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div
            className="flex items-center justify-between gap-4"
            key={`${entry.name ?? "item"}-${index}`}
          >
            <div className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color ?? "#94a3b8" }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-slate-800">
              {formatter(entry.value, entry)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonBarChart({
  data,
  valueFormatter = (value) => formatKrw(value),
  yAxisTickFormatter = (value) => formatAxisKrw(value),
  yAxisWidth = 88,
  minPointSize,
}: {
  data: Array<{
    name: string;
    value: number;
  }>;
  valueFormatter?: (value: number) => string;
  yAxisTickFormatter?: (value: number) => string;
  yAxisWidth?: number;
  minPointSize?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ea" />
        <XAxis dataKey="name" stroke="#64748b" />
        <YAxis
          stroke="#64748b"
          width={yAxisWidth}
          tickFormatter={(value) => yAxisTickFormatter(Number(value || 0))}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(value) => valueFormatter(Number(value || 0))}
            />
          }
          cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
        />
        <Bar
          dataKey="value"
          fill="#10b981"
          minPointSize={minPointSize}
          radius={[10, 10, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SustainabilityLineChart({
  annualTargetCash,
  personalSeries,
  corporateSeries,
}: {
  annualTargetCash: number;
  personalSeries: Array<{
    year: number;
    household_cash: number;
  }>;
  corporateSeries: Array<{
    year: number;
    household_cash: number;
  }>;
}) {
  const { t } = useI18n();
  const maxYears = Math.max(personalSeries.length, corporateSeries.length);
  const data = Array.from({ length: maxYears }, (_, index) => {
    const year = index + 1;
    const personalPoint = personalSeries.find((point) => point.year === year);
    const corporatePoint = corporateSeries.find((point) => point.year === year);

    return {
      year: `${year}${t("costComparison.yearUnit")}`,
      personal: personalPoint?.household_cash ?? 0,
      corporate: corporatePoint?.household_cash ?? 0,
      target: annualTargetCash,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ea" />
        <XAxis dataKey="year" stroke="#64748b" />
        <YAxis
          stroke="#64748b"
          width={88}
          tickFormatter={(value) => formatAxisKrw(Number(value || 0))}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(value) => formatKrw(Number(value || 0))}
            />
          }
        />
        <Legend />
        <ReferenceLine
          y={annualTargetCash}
          stroke="#f59e0b"
          strokeDasharray="6 4"
          ifOverflow="extendDomain"
          label={{
            value: t("costComparison.monthlyCash"),
            position: "insideTopRight",
            fill: "#fbbf24",
            fontSize: 11,
          }}
        />
        <Line
          type="monotone"
          dataKey="personal"
          name={t("costComparison.personal")}
          stroke="#e2e8f0"
          strokeWidth={3}
          dot={{ r: 4, fill: "#e2e8f0" }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="corporate"
          name={t("costComparison.corporate")}
          stroke="#10b981"
          strokeWidth={3}
          dot={{ r: 4, fill: "#10b981" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CashCompositionChart({
  data,
}: {
  data: Array<{
    name: string;
    investmentCash: number;
    salary: number;
    total: number;
  }>;
}) {
  const { t } = useI18n();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" stroke="#64748b" />
        <YAxis
          stroke="#64748b"
          width={88}
          tickFormatter={(value) => formatAxisKrw(Number(value || 0))}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(value) => formatKrw(Number(value || 0))}
            />
          }
          cursor={{ fill: "rgba(51, 65, 85, 0.18)" }}
        />
        <Legend />
        <Bar
          dataKey="investmentCash"
          stackId="a"
          name={t("costComparison.netCorporateCash")}
          fill="#e2e8f0"
        />
        <Bar
          dataKey="salary"
          stackId="a"
          name={t("costComparison.netSalary")}
          fill="#3b82f6"
        >
          <LabelList
            dataKey="total"
            position="top"
            formatter={(value) => formatAxisKrw(Number(value || 0))}
            fill="#e2e8f0"
            fontSize={11}
            offset={8}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function WaterfallScenarioChart({
  title,
  revenue,
  grossSalary,
  tax,
  health,
  companyInsurance,
  fixed,
  netSalary,
  disposable,
  positiveColor,
}: {
  title: string;
  revenue: number;
  grossSalary: number;
  tax: number;
  health: number;
  companyInsurance: number;
  fixed: number;
  netSalary: number;
  disposable: number;
  positiveColor: string;
}) {
  const { t } = useI18n();
  const data = buildWaterfallSeries(
    revenue,
    grossSalary,
    tax,
    health,
    companyInsurance,
    fixed,
    netSalary,
    disposable,
  ).map((item) => ({
    ...item,
    label:
      item.step === "revenue"
        ? t("costComparison.revenue")
        : item.step === "grossSalary"
          ? t("costComparison.grossSalary")
          : item.step === "tax"
            ? t("costComparison.tax")
            : item.step === "health"
              ? t("costComparison.healthInsurance")
              : item.step === "companyInsurance"
                ? t("costComparison.companyInsurance")
                : item.step === "fixed"
                  ? t("costComparison.fixedCost")
                  : item.step === "netSalary"
                    ? t("costComparison.netSalary")
                    : t("costComparison.disposableCash"),
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/82 p-4 shadow-sm">
      <div className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-700">
        {title}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#dbe4ea"
              vertical={false}
            />
            <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
            <YAxis
              stroke="#64748b"
              width={88}
              tickFormatter={(value) => formatAxisKrw(Number(value || 0))}
            />
            <Tooltip
              content={<WaterfallTooltip />}
              cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
            />
            <Bar dataKey="base" stackId="flow" fill="transparent" />
            <Bar
              dataKey="delta"
              stackId="flow"
              name={title}
              fill={positiveColor}
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry) => (
                <Cell
                  key={`${title}-${entry.step}`}
                  fill={
                    entry.step === "tax"
                      ? "#f97316"
                      : entry.step === "health"
                        ? "#eab308"
                        : entry.step === "companyInsurance"
                          ? "#3b82f6"
                          : entry.step === "fixed"
                            ? "#a855f7"
                            : entry.step === "grossSalary"
                              ? "#ef4444"
                              : entry.step === "netSalary"
                                ? "#64748b"
                                : positiveColor
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function WaterfallTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    value?: number | string;
    color?: string;
    payload?: {
      base: number;
      delta: number;
      signedDelta: number;
      after: number;
      runningBefore: number;
      runningAfter: number;
    };
  }>;
  label?: string | number;
}) {
  const { t } = useI18n();
  if (!active || !payload?.length) {
    return null;
  }

  const deltaEntry = payload.find((entry) => entry.dataKey === "delta");
  const point = deltaEntry?.payload;
  if (!deltaEntry || !point) {
    return null;
  }
  const stepKey = String(label ?? "");
  const amountLabel =
    stepKey === t("costComparison.revenue")
      ? t("costComparison.waterfallTooltipRevenue")
      : stepKey === t("costComparison.disposableCash")
        ? t("costComparison.waterfallTooltipFinal")
        : point.signedDelta >= 0
          ? t("costComparison.waterfallTooltipAddition")
          : t("costComparison.waterfallTooltipDeduction");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-800 shadow-lg">
      {label !== undefined ? (
        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {label}
        </div>
      ) : null}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">{amountLabel}</span>
          <span className="font-semibold text-slate-800">
            {formatKrw(point.signedDelta)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">
            {t("costComparison.waterfallTooltipBase")}
          </span>
          <span className="font-semibold text-slate-800">
            {formatKrw(point.runningBefore)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">
            {t("costComparison.waterfallTooltipAfter")}
          </span>
          <span className="font-semibold text-slate-800">
            {formatKrw(point.runningAfter)}
          </span>
        </div>
      </div>
    </div>
  );
}
