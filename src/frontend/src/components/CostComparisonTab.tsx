import { useEffect, useState, type CSSProperties } from "react";
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
    monthly_bookkeeping_fee: 0,
    annual_corp_tax_adjustment_fee: 0,
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

function formatPercent(value: number, digits = 2) {
  return `${(value * 100).toFixed(digits)}%`;
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
    return {
      ...raw,
      master_portfolio_id: raw.master_portfolio_id ?? null,
      simulation_mode: "asset",
      corporate: {
        ...raw.corporate,
        monthly_bookkeeping_fee:
          raw.corporate?.monthly_bookkeeping_fee ??
          raw.corporate?.monthly_fixed_cost ??
          0,
        annual_corp_tax_adjustment_fee:
          raw.corporate?.annual_corp_tax_adjustment_fee ?? 0,
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
            label={t("costComparison.monthlyBookkeepingFee")}
            testId="cc-monthly-bookkeeping-fee"
            tooltip={t("costComparison.tooltip.monthlyBookkeepingFee")}
            unit="KRW"
            value={config.corporate.monthly_bookkeeping_fee ?? 0}
            onChange={(value) =>
              updateConfig("corporate", "monthly_bookkeeping_fee", value)
            }
          />
          <NumberField
            label={t("costComparison.annualTaxAdjustmentFee")}
            testId="cc-annual-tax-adjustment-fee"
            tooltip={t("costComparison.tooltip.annualTaxAdjustmentFee")}
            unit="KRW"
            value={config.corporate.annual_corp_tax_adjustment_fee ?? 0}
            onChange={(value) =>
              updateConfig("corporate", "annual_corp_tax_adjustment_fee", value)
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
                  scenario="personal"
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
                  annualNetCashflow={result.personal.kpis.annual_net_cashflow}
                  growthValue={
                    result.assumptions.simulation_mode === "asset"
                      ? formatPercent(
                          (result.personal.kpis.net_yield || 0) / 100,
                        )
                      : undefined
                  }
                  breakdown={result.personal.breakdown}
                  auditDetails={result.personal.breakdown.audit_details}
                />
                <ScenarioCard
                  scenario="corporate"
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
                  annualNetCashflow={result.corporate.kpis.annual_net_cashflow}
                  growthValue={
                    result.assumptions.simulation_mode === "asset"
                      ? formatPercent(
                          (result.corporate.kpis.net_yield || 0) / 100,
                        )
                      : undefined
                  }
                  breakdown={result.corporate.breakdown}
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
  scenario,
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
  annualNetCashflow,
  growthValue, // 추가: 숫자가 아닌 문자열 표시용 (예: % 수익률)
  breakdown,
  auditDetails, // 추가: 상세 감사 내역
}: {
  scenario: "personal" | "corporate";
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
  annualNetCashflow: number;
  growthValue?: string;
  breakdown: CostComparisonScenarioResult["breakdown"];
  auditDetails?: CostComparisonScenarioResult["breakdown"]["audit_details"];
}) {
  const { t } = useI18n();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPosition, setDetailPosition] = useState<CSSProperties>({});
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

      <div className="mt-6 border-t border-slate-200 pt-4">
        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          data-testid={`${testIdPrefix}-detail-button`}
          onClick={() => {
            const viewportHeight = window.innerHeight;
            const left = 8;

            window.scrollTo({
              top: 0,
              behavior: "auto",
            });
            setDetailPosition({
              left,
              top: 2,
              maxHeight:
                scenario === "corporate"
                  ? Math.max(1120, viewportHeight - 2)
                  : Math.max(980, viewportHeight - 4),
            });
            setDetailOpen(true);
          }}
          type="button"
        >
          {t("costComparison.viewDetailedCosts")}
        </button>
      </div>

      {detailOpen ? (
        <ScenarioCostDetailModal
          annualNetCashflow={annualNetCashflow}
          breakdown={breakdown}
          auditDetails={auditDetails}
          onClose={() => setDetailOpen(false)}
          position={detailPosition}
          scenario={scenario}
          testIdPrefix={testIdPrefix}
          title={title}
        />
      ) : null}
    </div>
  );
}

function ScenarioCostDetailModal({
  scenario,
  title,
  testIdPrefix,
  breakdown,
  annualNetCashflow,
  auditDetails,
  position,
  onClose,
}: {
  scenario: "personal" | "corporate";
  title: string;
  testIdPrefix: string;
  breakdown: CostComparisonScenarioResult["breakdown"];
  annualNetCashflow: number;
  auditDetails?: CostComparisonScenarioResult["breakdown"]["audit_details"];
  position: CSSProperties;
  onClose: () => void;
}) {
  const { t, isKorean } = useI18n();
  const isCorporate = scenario === "corporate";
  const personalTaxRate = auditDetails?.tax?.tax_rate ?? 0;
  const personalTaxMode = auditDetails?.tax?.is_comprehensive
    ? isKorean
      ? "종합과세"
      : "comprehensive taxation"
    : isKorean
      ? "분리과세"
      : "separate taxation";
  const healthLtcRate = auditDetails?.health?.ltc_rate ?? 0;
  const corpNominalRate =
    auditDetails?.corp_tax?.nominal_rate ??
    auditDetails?.corp_tax?.tax_rate_low ??
    0;
  const corpEffectiveRate =
    auditDetails?.corp_tax?.effective_rate ??
    auditDetails?.corp_tax?.tax_rate_low ??
    0;
  const corpTaxRateLabel = auditDetails?.corp_tax
    ? `${(corpNominalRate * 100).toFixed(0)}% -> ${(
        corpEffectiveRate * 100
      ).toFixed(1)}%`
    : "-";
  const revenueTooltip = isCorporate
    ? isKorean
      ? `저장된 master portfolio의 TR을 현재 투자자산에 적용한 연간 총수익입니다. 이후 총급여, 회사부담보험, 운영비, 법인세를 차감하는 출발값입니다.`
      : `Annual investment revenue from applying the selected master portfolio TR to current investment assets. This is the starting amount before salary, company insurance, operating costs, and corporate tax.`
    : isKorean
      ? `저장된 master portfolio의 TR을 현재 투자자산에 적용한 연간 총수익입니다. 이후 소득세와 지역가입자 건보료를 차감합니다.`
      : `Annual investment revenue from applying the selected master portfolio TR to current investment assets. Personal tax and local health insurance are deducted from this amount.`;
  const taxTooltip = isCorporate
    ? isKorean
      ? `법인세는 과세표준 ${formatKrw(
          auditDetails?.corp_tax?.tax_base ?? 0,
        )}에 실효세율 ${formatPercent(corpEffectiveRate, 1)}를 적용해 계산했습니다. 명목세율 ${formatPercent(
          corpNominalRate,
          0,
        )}에 지방소득세가 반영됩니다.`
      : `Corporate tax is calculated on a tax base of ${formatKrw(
          auditDetails?.corp_tax?.tax_base ?? 0,
        )} using an effective rate of ${formatPercent(
          corpEffectiveRate,
          1,
        )}. The nominal rate is ${formatPercent(
          corpNominalRate,
          0,
        )}, with local income tax applied on top.`
    : isKorean
      ? `개인 투자수익 세금은 ${personalTaxMode} 기준 ${formatPercent(
          personalTaxRate,
          1,
        )}를 적용했습니다. 기준선은 ${formatKrw(
          auditDetails?.tax?.threshold ?? 0,
        )}입니다.`
      : `Personal investment income tax uses ${personalTaxMode} at ${formatPercent(
          personalTaxRate,
          1,
        )}. The modeled threshold is ${formatKrw(
          auditDetails?.tax?.threshold ?? 0,
        )}.`;
  const healthTooltip = isKorean
    ? `건보료 본체 ${formatKrw(
        auditDetails?.health?.base_premium ?? 0,
      )}에 장기요양보험 ${formatPercent(
        healthLtcRate,
        1,
      )}를 더해 총 ${formatKrw(
        auditDetails?.health?.total_premium ?? breakdown.health_insurance,
      )}로 계산했습니다.`
    : `Health insurance starts from a base premium of ${formatKrw(
        auditDetails?.health?.base_premium ?? 0,
      )} and adds long-term care insurance at ${formatPercent(
        healthLtcRate,
        1,
      )}, resulting in ${formatKrw(
        auditDetails?.health?.total_premium ?? breakdown.health_insurance,
      )}.`;
  const socialInsuranceTooltip = isKorean
    ? `회사부담 4대보험입니다. 총급여 ${formatKrw(
        breakdown.gross_salary ?? 0,
      )}를 기준으로 회사가 부담하는 보험료만 반영했습니다.`
    : `Employer-side payroll social insurance. This includes only the company burden calculated from gross salary of ${formatKrw(
        breakdown.gross_salary ?? 0,
      )}.`;
  const fixedCostTooltip = isKorean
    ? `연 운영비는 월 기장비 ${formatKrw(
        breakdown.monthly_bookkeeping_fee ?? 0,
      )} x 12와 연 법인세 조정료 ${formatKrw(
        breakdown.annual_corp_tax_adjustment_fee ?? 0,
      )}를 합산했습니다.`
    : `Annual operating cost combines monthly bookkeeping of ${formatKrw(
        breakdown.monthly_bookkeeping_fee ?? 0,
      )} x 12 and annual tax adjustment fee of ${formatKrw(
        breakdown.annual_corp_tax_adjustment_fee ?? 0,
      )}.`;
  const payrollWithholdingTooltip = isKorean
    ? `총급여에서 원천징수된 급여 관련 세금입니다. 투자수익에 대한 세금과는 별도로 순급여 계산에 반영됩니다.`
    : `Salary-related withholding tax deducted from gross salary. It is separate from the tax applied to investment income and is used when calculating net salary.`;
  const netCorporateCashTooltip = isKorean
    ? `법인 내부에 남는 세후 투자현금입니다. 총수익에서 총급여, 회사부담보험, 연 운영비, 법인세를 차감한 값입니다.`
    : `After-tax investment cash left inside the corporation after deducting gross salary, company insurance, annual operating cost, and corporate tax from annual revenue.`;
  const netSalaryTooltip = isKorean
    ? `가계로 넘어오는 세후 급여입니다. 총급여에서 원천징수세와 개인 부담 보험료를 차감한 값입니다.`
    : `After-tax salary reaching the household after deducting withholding tax and employee-side insurance from gross salary.`;
  const annualNetCashflowTooltip = isCorporate
    ? isKorean
      ? `최종 가계 유입 현금입니다. 법인 순현금 ${formatKrw(
          breakdown.net_corporate_cash ?? 0,
        )}과 순급여 ${formatKrw(breakdown.net_salary)}를 합산했습니다.`
      : `Final household cashflow, combining net corporate cash of ${formatKrw(
          breakdown.net_corporate_cash ?? 0,
        )} and net salary of ${formatKrw(breakdown.net_salary)}.`
    : isKorean
      ? `최종 가계 유입 현금입니다. 연 수익에서 세금 ${formatKrw(
          breakdown.tax,
        )}과 건보료 ${formatKrw(breakdown.health_insurance)}를 차감했습니다.`
      : `Final household cashflow after deducting tax of ${formatKrw(
          breakdown.tax,
        )} and health insurance of ${formatKrw(
          breakdown.health_insurance,
        )} from annual revenue.`;

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/15"
      data-testid={`${testIdPrefix}-detail-modal`}
      onClick={onClose}
    >
      <div
        className="fixed z-[91] w-[min(77.5rem,calc(100vw-1rem))] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        style={position}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("costComparison.detailedAudit")}
            </div>
            <h3 className="mt-1 text-xl font-bold text-slate-800">
              {title} {t("costComparison.detailedCostTitle")}
            </h3>
          </div>
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            data-testid={`${testIdPrefix}-detail-close`}
            onClick={onClose}
            type="button"
          >
            {t("costComparison.close")}
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("costComparison.costLineItems")}
            </div>
            <div className="mt-3 space-y-2">
              <DetailRow
                label={t("costComparison.revenue")}
                tooltip={revenueTooltip}
                tooltipTestId={`${testIdPrefix}-detail-revenue-tooltip`}
                value={formatKrw(breakdown.annual_revenue)}
              />
              <DetailRow
                label={t("costComparison.tax")}
                tooltip={taxTooltip}
                tooltipTestId={`${testIdPrefix}-detail-tax-tooltip`}
                value={formatKrw(breakdown.tax)}
              />
              <DetailRow
                label={t("costComparison.healthInsurance")}
                tooltip={healthTooltip}
                tooltipTestId={`${testIdPrefix}-detail-health-tooltip`}
                value={formatKrw(breakdown.health_insurance)}
              />
              <DetailRow
                label={t("costComparison.socialInsurance")}
                tooltip={socialInsuranceTooltip}
                tooltipTestId={`${testIdPrefix}-detail-social-tooltip`}
                value={formatKrw(breakdown.social_insurance)}
              />
              <DetailRow
                label={t("costComparison.fixedCost")}
                tooltip={fixedCostTooltip}
                tooltipTestId={`${testIdPrefix}-detail-fixed-tooltip`}
                value={formatKrw(breakdown.fixed_cost)}
              />
              {typeof breakdown.gross_salary === "number" ? (
                <DetailRow
                  label={t("costComparison.grossSalary")}
                  tooltip={
                    isKorean
                      ? `설정된 월 급여를 12개월로 환산한 연 총급여입니다. 이 값이 급여세와 회사부담보험 계산의 기준이 됩니다.`
                      : `Annual gross salary based on the configured monthly salary x 12. This is the base for payroll tax and employer insurance calculations.`
                  }
                  tooltipTestId={`${testIdPrefix}-detail-gross-salary-tooltip`}
                  value={formatKrw(breakdown.gross_salary)}
                />
              ) : null}
              {typeof breakdown.company_insurance_cost === "number" ? (
                <DetailRow
                  label={t("costComparison.companyInsurance")}
                  tooltip={socialInsuranceTooltip}
                  tooltipTestId={`${testIdPrefix}-detail-company-insurance-tooltip`}
                  value={formatKrw(breakdown.company_insurance_cost)}
                />
              ) : null}
              <DetailRow
                label={t("costComparison.payrollWithholding")}
                tooltip={payrollWithholdingTooltip}
                tooltipTestId={`${testIdPrefix}-detail-payroll-tooltip`}
                value={formatKrw(breakdown.payroll_tax_withholding)}
              />
              {typeof breakdown.net_corporate_cash === "number" ? (
                <DetailRow
                  label={t("costComparison.netCorporateCash")}
                  tooltip={netCorporateCashTooltip}
                  tooltipTestId={`${testIdPrefix}-detail-net-corporate-tooltip`}
                  value={formatKrw(breakdown.net_corporate_cash)}
                  highlight
                />
              ) : null}
              <DetailRow
                label={t("costComparison.netSalary")}
                tooltip={netSalaryTooltip}
                tooltipTestId={`${testIdPrefix}-detail-net-salary-tooltip`}
                value={formatKrw(breakdown.net_salary)}
              />
              <DetailRow
                label={t("costComparison.annualNetCashflow")}
                tooltip={annualNetCashflowTooltip}
                tooltipTestId={`${testIdPrefix}-detail-annual-net-tooltip`}
                value={formatKrw(annualNetCashflow)}
                highlight
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("costComparison.calculationSteps")}
            </div>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {isCorporate ? (
                <>
                  <FormulaBlock
                    title={t("costComparison.operatingCostFormula")}
                    tooltip={fixedCostTooltip}
                    tooltipTestId={`${testIdPrefix}-detail-operating-formula-tooltip`}
                    value={`${formatKrw(
                      breakdown.monthly_bookkeeping_fee ?? 0,
                    )} x 12 + ${formatKrw(
                      breakdown.annual_corp_tax_adjustment_fee ?? 0,
                    )} = ${formatKrw(breakdown.fixed_cost)}`}
                  />
                  <FormulaBlock
                    title={t("costComparison.taxBaseFormula")}
                    tooltip={
                      isKorean
                        ? `과세표준은 연 수익에서 총급여, 연 운영비, 회사부담보험을 차감해 계산합니다. 이 값에 실효 법인세율이 적용됩니다.`
                        : `Tax base is annual revenue minus gross salary, annual operating cost, and employer insurance. The effective corporate tax rate is applied to this amount.`
                    }
                    tooltipTestId={`${testIdPrefix}-detail-tax-base-formula-tooltip`}
                    value={`${formatKrw(breakdown.annual_revenue)} - ${formatKrw(
                      breakdown.gross_salary ?? 0,
                    )} - ${formatKrw(breakdown.fixed_cost)} - ${formatKrw(
                      breakdown.company_insurance_cost ?? 0,
                    )} = ${formatKrw(auditDetails?.corp_tax?.tax_base ?? 0)}`}
                  />
                  <FormulaBlock
                    title={t("costComparison.finalCashFormula")}
                    tooltip={annualNetCashflowTooltip}
                    tooltipTestId={`${testIdPrefix}-detail-final-cash-formula-tooltip`}
                    value={`${formatKrw(
                      breakdown.net_corporate_cash ?? 0,
                    )} + ${formatKrw(breakdown.net_salary)} = ${formatKrw(
                      annualNetCashflow,
                    )}`}
                  />
                </>
              ) : (
                <>
                  <FormulaBlock
                    title={t("costComparison.personalTaxFormula")}
                    tooltip={taxTooltip}
                    tooltipTestId={`${testIdPrefix}-detail-personal-tax-formula-tooltip`}
                    value={`${formatKrw(breakdown.annual_revenue)} x ${(
                      (auditDetails?.tax?.tax_rate ?? 0) * 100
                    ).toFixed(1)}% = ${formatKrw(breakdown.tax)}`}
                  />
                  <FormulaBlock
                    title={t("costComparison.personalHealthFormula")}
                    tooltip={healthTooltip}
                    tooltipTestId={`${testIdPrefix}-detail-personal-health-formula-tooltip`}
                    value={`${formatKrw(
                      auditDetails?.health?.base_premium ?? 0,
                    )} x ${(
                      (1 + (auditDetails?.health?.ltc_rate ?? 0)) *
                      100
                    ).toFixed(1)}% = ${formatKrw(breakdown.health_insurance)}`}
                  />
                  <FormulaBlock
                    title={t("costComparison.finalCashFormula")}
                    tooltip={annualNetCashflowTooltip}
                    tooltipTestId={`${testIdPrefix}-detail-final-cash-formula-tooltip`}
                    value={`${formatKrw(breakdown.annual_revenue)} - ${formatKrw(
                      breakdown.tax,
                    )} - ${formatKrw(breakdown.health_insurance)} = ${formatKrw(
                      annualNetCashflow,
                    )}`}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("costComparison.healthInsurance")}
            </div>
            <div className="mt-3 space-y-2">
              <DetailRow
                label={t("costComparison.propertyPoints")}
                tooltip={
                  isKorean
                    ? `지역가입자 건보료 산정에 반영되는 재산 점수입니다. 부동산 입력값을 점수 체계로 환산한 결과입니다.`
                    : `Property points used in local health insurance scoring. This is derived from the modeled real estate input under the current scoring rules.`
                }
                tooltipTestId={`${testIdPrefix}-detail-property-points-tooltip`}
                value={
                  auditDetails?.health?.property_points !== undefined
                    ? `${auditDetails.health.property_points.toLocaleString()} 점`
                    : "-"
                }
              />
              <DetailRow
                label={t("costComparison.incomePoints")}
                tooltip={
                  isKorean
                    ? `지역가입자 건보료 산정에 반영되는 소득 점수입니다. 개인 투자수익 등 소득 기반 점수입니다.`
                    : `Income points used in local health insurance scoring. This reflects income-based points from personal investment income.`
                }
                tooltipTestId={`${testIdPrefix}-detail-income-points-tooltip`}
                value={
                  auditDetails?.health?.income_points !== undefined
                    ? `${auditDetails.health.income_points.toLocaleString()} 점`
                    : "-"
                }
              />
              <DetailRow
                label={t("costComparison.totalPoints")}
                tooltip={
                  isKorean
                    ? `재산 점수와 소득 점수를 합산한 총점입니다. 이 총점에 점수당 단가를 곱해 건보료 본체를 계산합니다.`
                    : `Combined score from property points and income points. This total is multiplied by the point-unit price to compute the base premium.`
                }
                tooltipTestId={`${testIdPrefix}-detail-total-points-tooltip`}
                value={
                  auditDetails?.health?.total_points !== undefined
                    ? `${auditDetails.health.total_points.toLocaleString()} 점`
                    : "-"
                }
              />
              <DetailRow
                label={t("costComparison.unitPriceLtc")}
                tooltip={
                  isKorean
                    ? `점수당 단가 ${formatKrw(
                        auditDetails?.health?.point_unit_price ?? 0,
                      )}에 장기요양보험 ${formatPercent(
                        healthLtcRate,
                        1,
                      )}를 반영한 계수입니다.`
                    : `Point-unit price of ${formatKrw(
                        auditDetails?.health?.point_unit_price ?? 0,
                      )} with long-term care insurance at ${formatPercent(
                        healthLtcRate,
                        1,
                      )} applied.`
                }
                tooltipTestId={`${testIdPrefix}-detail-unit-price-tooltip`}
                value={
                  auditDetails?.health?.point_unit_price
                    ? `${formatKrw(auditDetails.health.point_unit_price)} x ${(
                        (1 + (auditDetails.health.ltc_rate || 0)) *
                        100
                      ).toFixed(1)}%`
                    : "-"
                }
              />
              <DetailRow
                label={t("costComparison.healthPremiumBase")}
                tooltip={
                  isKorean
                    ? `장기요양보험을 더하기 전 건보료 본체입니다. 총점과 점수당 단가로 계산됩니다.`
                    : `Base health premium before adding long-term care insurance. This is computed from total points and the point-unit price.`
                }
                tooltipTestId={`${testIdPrefix}-detail-health-base-tooltip`}
                value={formatKrw(auditDetails?.health?.base_premium ?? 0)}
              />
              <DetailRow
                label={t("costComparison.healthInsurance")}
                tooltip={healthTooltip}
                tooltipTestId={`${testIdPrefix}-detail-health-total-tooltip`}
                value={formatKrw(
                  auditDetails?.health?.total_premium ??
                    breakdown.health_insurance,
                )}
                highlight
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("costComparison.tax")}
            </div>
            <div className="mt-3 space-y-2">
              {isCorporate ? (
                <>
                  <DetailRow
                    label={t("costComparison.appliedCorpTaxRate")}
                    tooltip={
                      isKorean
                        ? `명목세율 ${formatPercent(
                            corpNominalRate,
                            0,
                          )}에 지방소득세를 반영해 실효세율 ${formatPercent(
                            corpEffectiveRate,
                            1,
                          )}로 계산했습니다.`
                        : `Nominal corporate tax rate of ${formatPercent(
                            corpNominalRate,
                            0,
                          )} becomes an effective rate of ${formatPercent(
                            corpEffectiveRate,
                            1,
                          )} after local income tax is included.`
                    }
                    tooltipTestId={`${testIdPrefix}-detail-applied-corp-tax-rate-tooltip`}
                    value={corpTaxRateLabel}
                  />
                  <DetailRow
                    label={t("costComparison.taxBase")}
                    tooltip={
                      isKorean
                        ? `법인세 계산의 기준이 되는 과세표준입니다. 연 수익에서 총급여, 회사부담보험, 연 운영비를 차감해 계산합니다.`
                        : `Corporate tax base after deducting gross salary, company insurance, and annual operating cost from annual revenue.`
                    }
                    tooltipTestId={`${testIdPrefix}-detail-tax-base-tooltip`}
                    value={formatKrw(auditDetails?.corp_tax?.tax_base ?? 0)}
                  />
                  <DetailRow
                    label={t("costComparison.monthlyBookkeepingFee")}
                    tooltip={
                      isKorean
                        ? `매월 반복되는 기본 기장/신고 지원 비용입니다. 연 운영비 계산에 12개월치가 반영됩니다.`
                        : `Recurring monthly bookkeeping and filing support cost. Twelve months are included in annual operating cost.`
                    }
                    tooltipTestId={`${testIdPrefix}-detail-bookkeeping-tooltip`}
                    value={formatKrw(
                      auditDetails?.operating_costs?.monthly_bookkeeping_fee ??
                        0,
                    )}
                  />
                  <DetailRow
                    label={t("costComparison.annualTaxAdjustmentFee")}
                    tooltip={
                      isKorean
                        ? `연 1회 반영되는 법인세 조정 및 신고 수수료입니다.`
                        : `Annual one-time fee for year-end corporate tax adjustment and filing.`
                    }
                    tooltipTestId={`${testIdPrefix}-detail-tax-adjustment-tooltip`}
                    value={formatKrw(
                      auditDetails?.operating_costs
                        ?.annual_corp_tax_adjustment_fee ?? 0,
                    )}
                  />
                  <DetailRow
                    label={t("costComparison.operatingCostAnnual")}
                    tooltip={fixedCostTooltip}
                    tooltipTestId={`${testIdPrefix}-detail-operating-cost-annual-tooltip`}
                    value={formatKrw(
                      auditDetails?.operating_costs?.annual_total ?? 0,
                    )}
                  />
                </>
              ) : (
                <>
                  <DetailRow
                    label={t("costComparison.appliedTaxRate")}
                    tooltip={taxTooltip}
                    tooltipTestId={`${testIdPrefix}-detail-applied-tax-rate-tooltip`}
                    value={
                      auditDetails?.tax?.tax_rate !== undefined
                        ? `${(auditDetails.tax.tax_rate * 100).toFixed(1)}%${
                            auditDetails.tax.is_comprehensive
                              ? " (종합)"
                              : " (분리)"
                          }`
                        : "-"
                    }
                  />
                  <DetailRow
                    label={t("costComparison.taxThreshold")}
                    tooltip={
                      isKorean
                        ? `이 기준선 위에서는 종합과세, 아래에서는 분리과세 등 현재 세금 분기 규칙을 설명하는 참조값입니다.`
                        : `Reference threshold used by the current tax branch rules, such as separate versus comprehensive taxation.`
                    }
                    tooltipTestId={`${testIdPrefix}-detail-tax-threshold-tooltip`}
                    value={formatKrw(auditDetails?.tax?.threshold ?? 0)}
                  />
                </>
              )}
              <DetailRow
                label={t("costComparison.tax")}
                tooltip={taxTooltip}
                tooltipTestId={`${testIdPrefix}-detail-tax-total-tooltip`}
                value={formatKrw(breakdown.tax)}
                highlight
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  tooltip,
  tooltipTestId,
  value,
  highlight = false,
}: {
  label: string;
  tooltip?: string;
  tooltipTestId?: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-slate-100 py-2 text-sm ${
        highlight ? "font-semibold text-slate-800" : "text-slate-600"
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {tooltip && tooltipTestId ? (
          <TooltipTrigger testId={tooltipTestId} text={tooltip} />
        ) : null}
      </div>
      <span className="font-mono text-right">{value}</span>
    </div>
  );
}

function FormulaBlock({
  title,
  tooltip,
  tooltipTestId,
  value,
}: {
  title: string;
  tooltip?: string;
  tooltipTestId?: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span>{title}</span>
        {tooltip && tooltipTestId ? (
          <TooltipTrigger testId={tooltipTestId} text={tooltip} />
        ) : null}
      </div>
      <div className="mt-2 font-mono text-sm text-slate-700">{value}</div>
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
