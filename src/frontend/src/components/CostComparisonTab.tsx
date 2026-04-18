import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useI18n } from "../i18n";
import type { CostComparisonConfig, CostComparisonResult } from "../types";

const API_BASE = "http://localhost:8000/api/cost-comparison";

const defaultConfig: CostComparisonConfig = {
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
    initial_shareholder_loan: 0,
    annual_shareholder_loan_repayment: 0,
  },
  policy_meta: {
    base_year: 2026,
  },
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

export function CostComparisonTab() {
  const { t } = useI18n();
  const [config, setConfig] = useState<CostComparisonConfig>(defaultConfig);
  const [result, setResult] = useState<CostComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await fetch(`${API_BASE}/config`);
        const payload = await response.json();
        if (payload?.success && payload?.data) {
          setConfig(payload.data as CostComparisonConfig);
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
    section: keyof CostComparisonConfig,
    key: string,
    value: number,
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
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
      setConfig(payload.data as CostComparisonConfig);
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
    return <div className="text-slate-300">{t("costComparison.loading")}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2
            className="text-3xl font-black tracking-tight text-slate-50"
            data-testid="cost-comparison-title"
          >
            {t("costComparison.title")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            {t("costComparison.subtitle")}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
            data-testid="cc-save-button"
            onClick={() => void saveConfig()}
            type="button"
          >
            {t("costComparison.save")}
          </button>
          <button
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
            data-testid="cc-run-button"
            onClick={() => void runSimulation()}
            type="button"
          >
            {running ? t("costComparison.running") : t("costComparison.run")}
          </button>
        </div>
      </div>

      {saveMessage ? (
        <div
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          data-testid="cost-comparison-save-success"
        >
          {saveMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NumberField
          label={t("costComparison.investmentAssets")}
          testId="cc-investment-assets"
          value={config.personal_assets.investment_assets}
          onChange={(value) =>
            updateConfig("personal_assets", "investment_assets", value)
          }
        />
        <NumberField
          label={t("costComparison.pensionAssets")}
          testId="cc-pension-assets"
          value={config.personal_assets.personal_pension_assets}
          onChange={(value) =>
            updateConfig("personal_assets", "personal_pension_assets", value)
          }
        />
        <NumberField
          label={t("costComparison.realEstateValue")}
          testId="cc-real-estate-value"
          value={config.real_estate.official_price}
          onChange={(value) =>
            updateConfig("real_estate", "official_price", value)
          }
        />
        <NumberField
          label={t("costComparison.realEstateRatio")}
          testId="cc-real-estate-ratio"
          step="0.1"
          value={config.real_estate.ownership_ratio}
          onChange={(value) =>
            updateConfig("real_estate", "ownership_ratio", value)
          }
        />
        <NumberField
          label={t("costComparison.paRate")}
          testId="cc-pa-rate"
          step="0.1"
          value={config.assumptions.price_appreciation_rate}
          onChange={(value) =>
            updateConfig("assumptions", "price_appreciation_rate", value)
          }
        />
        <NumberField
          label={t("costComparison.simulationYears")}
          testId="cc-simulation-years"
          value={config.assumptions.simulation_years}
          onChange={(value) =>
            updateConfig("assumptions", "simulation_years", value)
          }
        />
        <NumberField
          label={t("costComparison.monthlyFixedCost")}
          testId="cc-monthly-fixed-cost"
          value={config.corporate.monthly_fixed_cost}
          onChange={(value) =>
            updateConfig("corporate", "monthly_fixed_cost", value)
          }
        />
        <NumberField
          label={t("costComparison.initialLoan")}
          testId="cc-initial-loan"
          value={config.corporate.initial_shareholder_loan}
          onChange={(value) =>
            updateConfig("corporate", "initial_shareholder_loan", value)
          }
        />
        <NumberField
          label={t("costComparison.annualLoanRepayment")}
          testId="cc-annual-loan-repayment"
          value={config.corporate.annual_shareholder_loan_repayment}
          onChange={(value) =>
            updateConfig(
              "corporate",
              "annual_shareholder_loan_repayment",
              value,
            )
          }
        />
        <NumberField
          label={t("costComparison.salary")}
          testId="cc-salary-0"
          value={config.corporate.salary_recipients[0]?.monthly_salary ?? 0}
          onChange={(value) => updateSalary(0, value)}
        />
      </div>

      {result ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <AssumptionBadge
              label={t("costComparison.assumptionPortfolio")}
              testId="cc-assumption-portfolio"
              value={result.assumptions.portfolio_name}
            />
            <AssumptionBadge
              label="DY"
              testId="cc-assumption-dy"
              value={formatPercent(result.assumptions.dy)}
            />
            <AssumptionBadge
              label="PA"
              testId="cc-assumption-pa"
              value={formatPercent(result.assumptions.pa)}
            />
            <AssumptionBadge
              label="TR"
              testId="cc-assumption-tr"
              value={formatPercent(result.assumptions.tr)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ScenarioCard
              monthlyCashLabel={t("costComparison.monthlyCash")}
              totalCostLabel={t("costComparison.annualTotalCost")}
              healthLabel={t("costComparison.healthInsurance")}
              growthLabel={t("costComparison.netGrowth")}
              title={t("costComparison.personal")}
              testId="cc-kpi-personal"
              monthlyCash={result.personal.kpis.monthly_disposable_cashflow}
              totalCost={result.personal.kpis.annual_total_cost}
              health={result.personal.kpis.annual_health_insurance}
              growth={result.personal.kpis.after_tax_net_growth}
            />
            <ScenarioCard
              monthlyCashLabel={t("costComparison.monthlyCash")}
              totalCostLabel={t("costComparison.annualTotalCost")}
              healthLabel={t("costComparison.healthInsurance")}
              growthLabel={t("costComparison.netGrowth")}
              title={t("costComparison.corporate")}
              testId="cc-kpi-corporate"
              monthlyCash={result.corporate.kpis.monthly_disposable_cashflow}
              totalCost={result.corporate.kpis.annual_total_cost}
              health={result.corporate.kpis.annual_health_insurance}
              growth={result.corporate.kpis.after_tax_net_growth}
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div
              className="text-lg font-bold text-slate-100"
              data-testid="cc-comparison-winner"
            >
              {result.comparison.winner === "corporate"
                ? t("costComparison.corporateWins")
                : t("costComparison.personalWins")}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {result.comparison.top_drivers.map((driver, index) => (
                <div
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  data-testid={`cc-driver-${index}`}
                  key={`${driver.label}-${index}`}
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {driver.label}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-100">
                    {formatKrw(driver.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            data-testid="cc-breakdown-chart"
          >
            <div className="mb-4 text-lg font-bold text-slate-100">
              {t("costComparison.breakdownTitle")}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "1rem",
                    }}
                    formatter={(value: number | string | undefined) =>
                      formatKrw(Number(value || 0))
                    }
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

          <div
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            data-testid="cc-cumulative-chart"
          >
            <div className="mb-4 text-lg font-bold text-slate-100">
              {t("costComparison.cumulativeTitle")}
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={result.personal.series.map((point, index) => ({
                    year: point.year,
                    personal: point.net_worth,
                    corporate: result.corporate.series[index]?.net_worth ?? 0,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="year" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "1rem",
                    }}
                    formatter={(value: number | string | undefined) =>
                      formatKrw(Number(value || 0))
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="personal"
                    name={t("costComparison.personal")}
                    stroke="#f8fafc"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="corporate"
                    name={t("costComparison.corporate")}
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  testId,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  testId: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <label className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <input
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
        data-testid={testId}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function AssumptionBadge({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
      data-testid={testId}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function ScenarioCard({
  title,
  testId,
  monthlyCashLabel,
  totalCostLabel,
  healthLabel,
  growthLabel,
  monthlyCash,
  totalCost,
  health,
  growth,
}: {
  title: string;
  testId: string;
  monthlyCashLabel: string;
  totalCostLabel: string;
  healthLabel: string;
  growthLabel: string;
  monthlyCash: number;
  totalCost: number;
  health: number;
  growth: number;
}) {
  return (
    <div
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
      data-testid={testId}
    >
      <div className="text-lg font-bold text-slate-100">{title}</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Metric label={monthlyCashLabel} value={formatKrw(monthlyCash)} />
        <Metric label={totalCostLabel} value={formatKrw(totalCost)} />
        <Metric label={healthLabel} value={formatKrw(health)} />
        <Metric label={growthLabel} value={formatKrw(growth)} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}
