import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Info,
  RotateCcw,
  Building2,
  Wallet2,
  Settings2,
  ChevronDown,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";
import {
  DEFAULT_PA_SCENARIO,
  normalizePaScenarioKey,
} from "../lib/paScenarios";
import type {
  PaScenarioKey,
  RetirementConfig,
  SimulationResult,
  MasterPortfolio,
} from "../types";

const USER_VISIBLE_ASSUMPTION_IDS = ["v1", "conservative"] as const;
const ASSUMPTION_NAME_FALLBACK: Record<string, string> = {
  v1: "Standard Profile",
  conservative: "Conservative Profile",
};

function getVisibleAssumptions(config: RetirementConfig | null) {
  const assumptions = config?.assumptions || {};
  return USER_VISIBLE_ASSUMPTION_IDS.map((id) => {
    const item = assumptions[id];
    if (!item) return null;
    return [
      id,
      {
        ...item,
        name: item.name || ASSUMPTION_NAME_FALLBACK[id],
      },
    ] as const;
  }).filter(Boolean) as Array<
    readonly [
      string,
      RetirementConfig["assumptions"][string] & {
        name: string;
      },
    ]
  >;
}

function normalizeVisibleAssumptionId(
  config: RetirementConfig | null,
  candidate?: string,
) {
  const visibleIds = new Set(getVisibleAssumptions(config).map(([id]) => id));
  if (candidate && visibleIds.has(candidate)) {
    return candidate;
  }
  if (visibleIds.has("v1")) {
    return "v1";
  }
  return getVisibleAssumptions(config)[0]?.[0] || "v1";
}

/** 은퇴 전략 시뮬레이션 결과 및 시각화 탭 [REQ-RAMS-07, REQ-GLB-13] */
export function RetirementTab() {
  const { isKorean, t } = useI18n();
  const [config, setConfig] = useState<RetirementConfig | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(
    null,
  );
  const [masterPortfolios, setMasterPortfolios] = useState<MasterPortfolio[]>(
    [],
  );
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("v1");
  const [paScenario, setPaScenario] =
    useState<PaScenarioKey>(DEFAULT_PA_SCENARIO);
  const [exchangeRate, setExchangeRate] = useState<number>(1425.5);
  const [exchangeRateLastUpdated, setExchangeRateLastUpdated] = useState<
    string | null
  >(null);
  const [isRefreshingExchangeRate, setIsRefreshingExchangeRate] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const visibleAssumptions = getVisibleAssumptions(config);

  const fetchExchangeRate = useCallback(
    async (forceRefresh = false) => {
      setIsRefreshingExchangeRate(true);
      try {
        const url = forceRefresh
          ? "http://localhost:8000/api/exchange-rate?force=true"
          : "http://localhost:8000/api/exchange-rate";
        const rateRes = await fetch(url);
        const rateData = await rateRes.json();

        if (rateData.success && rateData.data?.rate) {
          setExchangeRate(rateData.data.rate);
          setExchangeRateLastUpdated(rateData.data.last_fetch || null);
          return;
        }

        throw new Error(t("retirement.exchangeRateRefreshFailed"));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMessage(message);
      } finally {
        setIsRefreshingExchangeRate(false);
      }
    },
    [t],
  );

  const fetchData = useCallback(
    async (
      scenarioId: string | null = null,
      selectedPaScenario: PaScenarioKey = paScenario,
    ) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [configRes, masterRes] = await Promise.all([
          fetch("http://localhost:8000/api/retirement/config"),
          fetch(
            `http://localhost:8000/api/master-portfolios?pa_scenario=${selectedPaScenario}`,
          ),
        ]);

        const configData = await configRes.json();
        const masterData = await masterRes.json();

        if (!configData.success) {
          throw new Error(configData.message || t("retirement.errorTitle"));
        }

        const normalizedScenario = normalizeVisibleAssumptionId(
          configData.data,
          scenarioId || configData.data.active_assumption_id || "v1",
        );

        setConfig(configData.data);
        setMasterPortfolios(masterData.data || []);
        setActiveId(normalizedScenario);

        await fetchExchangeRate();

        const currentScenario = normalizedScenario;
        const simUrl = `http://localhost:8000/api/retirement/simulate?scenario=${currentScenario}&pa_scenario=${selectedPaScenario}`;
        const simRes = await fetch(simUrl);
        const simData = await simRes.json();

        if (simData.success) {
          setSimulationData(simData.data);
        } else {
          throw new Error(simData.message || t("retirement.errorTitle"));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchExchangeRate, t],
  );

  useEffect(() => {
    fetch("http://localhost:8000/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.data) {
          setPaScenario(
            normalizePaScenarioKey(data.data.default_pa_scenario || "base"),
          );
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchData(null, paScenario);
  }, [fetchData, paScenario]);

  const handleSwitchVersion = async (id: string) => {
    if (!config) return;
    setActiveId(id);
    try {
      await fetch("http://localhost:8000/api/retirement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, active_assumption_id: id }),
      });
      await fetchData(id, paScenario);
    } catch (err) {
      console.error(err);
    }
  };

  /** 마스터 전략 교체 핸들러 */
  const handleSwitchMaster = async (m_id: string) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/master-portfolios/${m_id}/activate`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.success) {
        setMasterPortfolios((prev) =>
          prev.map((m) => ({ ...m, is_active: m.id === m_id })),
        );
        setIsSwitcherOpen(false);
        await fetchData(activeId, paScenario);
      } else {
        setErrorMessage(data.message || "전략을 활성화할 수 없습니다.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading && !simulationData)
    return (
      <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-[0.2em] animate-pulse">
        {t("retirement.loading")}
      </div>
    );
  if (errorMessage)
    return (
      <div className="p-20 text-center space-y-6">
        <div className="flex justify-center">
          <AlertTriangle size={64} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-50">
          {t("retirement.errorTitle")}
        </h2>
        <p>{errorMessage}</p>
        <button
          onClick={() => fetchData()}
          className="px-8 py-3 bg-slate-800 text-slate-200 rounded-xl"
        >
          {t("retirement.retry")}
        </button>
      </div>
    );
  if (!simulationData || !config) return null;

  const summary = simulationData.summary || {};
  const monthlyData = simulationData.monthly_data || [];
  const strategyRulesSummary = simulationData.meta?.strategy_rules_summary;
  const portfolioMeta = simulationData.meta?.used_portfolios;
  const standardMasterReturn =
    simulationData.meta?.master_tr ??
    simulationData.meta?.master_yield ??
    config.assumptions?.v1?.master_return ??
    0.0485;
  const chartData = monthlyData.filter(
    (d) => d.index % 12 === 0 || d.index === 1,
  );
  const largeCurrencyUnit = t("retirement.table.hundredMillion");
  const initialNetWorth = monthlyData[0]?.total_net_worth || 0;
  const latestNetWorth =
    monthlyData[monthlyData.length - 1]?.total_net_worth || 0;
  const minimumNetWorth = monthlyData.reduce(
    (min, item) => Math.min(min, item.total_net_worth || 0),
    initialNetWorth || 0,
  );
  const formattedExchangeRateUpdatedAt = (() => {
    if (!exchangeRateLastUpdated) {
      return t("retirement.exchangeRateUpdatedUnknown");
    }
    const parsed = new Date(exchangeRateLastUpdated);
    if (Number.isNaN(parsed.getTime())) {
      return t("retirement.exchangeRateUpdatedUnknown");
    }
    return parsed.toLocaleString(isKorean ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  })();

  const level = (() => {
    const years = summary.total_survival_years || 0;
    if (years > 40)
      return {
        label: t("retirement.unshakable"),
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        icon: <CheckCircle2 size={24} />,
      };
    if (years > 25)
      return {
        label: t("retirement.solid"),
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        icon: <ShieldCheck size={24} />,
      };
    return {
      label: t("retirement.fragile"),
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      icon: <AlertTriangle size={24} />,
    };
  })();

  return (
    <div
      className="space-y-8 animate-in fade-in duration-700 pb-32 max-w-6xl mx-auto px-4"
      data-testid="retirement-tab-content"
      onClick={() => isSwitcherOpen && setIsSwitcherOpen(false)}
    >
      <section className="animate-in fade-in slide-in-from-top-4 duration-700 relative z-50">
        <div className="relative rounded-[2rem] border border-white/70 bg-white/78 p-7 shadow-sm backdrop-blur-md">
          <div className="pointer-events-none absolute left-0 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/50 blur-[55px]" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-1 relative">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-1 rounded-full bg-emerald-500" />
                <p
                  className={cn(
                    "text-emerald-700",
                    isKorean
                      ? "text-xs font-semibold tracking-normal"
                      : "text-[11px] font-semibold tracking-[0.08em]",
                  )}
                  data-testid="active-strategy-title"
                >
                  {t("retirement.activeStrategy")}
                </p>
              </div>

              <div className="relative mt-3">
                <div
                  className="flex items-center gap-3 cursor-pointer group/title w-fit"
                  data-testid="master-switcher-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSwitcherOpen(!isSwitcherOpen);
                  }}
                >
                  <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-800 transition-all group-hover/title:text-emerald-700">
                    {simulationData.meta?.master_name ||
                      t("retirement.customStrategyBuilder")}
                  </h1>
                  <ChevronDown
                    className={cn(
                      "text-slate-400 transition-all group-hover/title:text-emerald-700",
                      isSwitcherOpen && "rotate-180",
                    )}
                    size={20}
                  />
                </div>

                {isSwitcherOpen && (
                  <div
                    className="absolute top-full left-0 z-[100] mt-3 w-[380px] animate-in slide-in-from-top-1 rounded-[1.5rem] border border-white/80 bg-white/95 py-3 shadow-xl duration-200 ring-1 ring-emerald-100"
                    data-testid="master-switcher-menu"
                  >
                    <p
                      className={cn(
                        "mb-2 border-b border-slate-200 px-6 py-1.5",
                        isKorean
                          ? "text-xs font-semibold text-slate-500 tracking-normal"
                          : "text-[11px] font-semibold text-slate-500 tracking-[0.08em]",
                      )}
                    >
                      {t("retirement.changePlan")}
                    </p>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {masterPortfolios.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleSwitchMaster(m.id)}
                          data-testid={`master-switcher-item-${m.id}`}
                          className={cn(
                            "group/item mx-2 mb-0.5 flex cursor-pointer items-center justify-between rounded-xl px-6 py-3.5 transition-all",
                            m.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-bold tracking-tight">
                                {m.name}
                              </p>
                              {m.combined_tr !== undefined &&
                                m.combined_tr !== null && (
                                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    {m.combined_tr.toFixed(2)}%
                                  </span>
                                )}
                              {m.broken_reference && (
                                <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600">
                                  {t("retirement.broken")}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                              Corp: {m.corp_name || "-"} / Pen:{" "}
                              {m.pension_name || "-"}
                            </p>
                            {m.broken_reference && m.broken_reason && (
                              <p className="mt-1 line-clamp-2 text-[10px] font-medium text-rose-500">
                                {m.broken_reason}
                              </p>
                            )}
                          </div>

                          {m.is_active && (
                            <CheckCircle2
                              size={16}
                              className="text-emerald-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 p-1.5 shadow-sm">
              {(["conservative", "base", "optimistic"] as PaScenarioKey[]).map(
                (scenario) => (
                  <button
                    key={scenario}
                    type="button"
                    onClick={() => setPaScenario(scenario)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-normal transition-all",
                      paScenario === scenario
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                    )}
                  >
                    {scenario === "conservative"
                      ? isKorean
                        ? "보수적"
                        : "Conservative"
                      : scenario === "base"
                        ? isKorean
                          ? "기본"
                          : "Base"
                        : isKorean
                          ? "낙관적"
                          : "Optimistic"}
                  </button>
                ),
              )}
            </div>

            <div
              className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4"
              data-testid="active-strategy-summary"
            >
              <div
                className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 px-5 py-4 shadow-sm"
                data-testid="active-strategy-master-metrics"
              >
                <Activity className="text-emerald-600/70" size={18} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        isKorean
                          ? "text-xs font-semibold text-slate-500 tracking-normal"
                          : "text-[11px] font-semibold text-slate-500 tracking-[0.08em]",
                      )}
                    >
                      {t("retirement.snapshotMaster")}
                    </p>
                  </div>
                  <p className="truncate text-sm font-bold tracking-tight text-slate-800">
                    {simulationData.meta?.master_name ||
                      t("retirement.customStrategyBuilder")}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-semibold text-emerald-700 tracking-normal"
                            : "text-[10px] font-semibold text-emerald-700",
                        )}
                      >
                        {t("retirement.masterYield")}
                      </span>
                      <span className="ml-1 text-xs font-bold text-emerald-700">
                        {(
                          (simulationData.meta?.combined_dy || 0) * 100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                    <div className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-semibold text-sky-700 tracking-normal"
                            : "text-[10px] font-semibold text-sky-700",
                        )}
                      >
                        {t("retirement.tr")}
                      </span>
                      <span className="ml-1 text-xs font-bold text-sky-700">
                        {(
                          (simulationData.meta?.combined_tr || 0) * 100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 px-5 py-4 shadow-sm"
                data-testid="active-strategy-corp-card"
              >
                <Building2 className="text-emerald-600/70" size={18} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        isKorean
                          ? "text-xs font-semibold text-slate-500 tracking-normal"
                          : "text-[11px] font-semibold text-slate-500 tracking-[0.08em]",
                      )}
                    >
                      {t("retirement.corporate")}
                    </p>
                  </div>
                  <p className="truncate text-sm font-bold tracking-tight text-slate-800">
                    {portfolioMeta?.corp?.name || t("retirement.none")}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-semibold text-emerald-700 tracking-normal"
                            : "text-[10px] font-semibold text-emerald-700",
                        )}
                      >
                        {t("settings.dy")}
                      </span>
                      <span className="ml-1 text-xs font-bold text-emerald-700">
                        {portfolioMeta?.corp?.yield || "0.00%"}
                      </span>
                    </div>
                    <div className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-semibold text-sky-700 tracking-normal"
                            : "text-[10px] font-semibold text-sky-700",
                        )}
                      >
                        {t("retirement.tr")}
                      </span>
                      <span className="ml-1 text-xs font-bold text-sky-700">
                        {(
                          (portfolioMeta?.corp?.expected_return || 0) * 100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 px-5 py-4 shadow-sm"
                data-testid="active-strategy-pension-card"
              >
                <Wallet2 className="text-sky-600/70" size={18} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        isKorean
                          ? "text-xs font-semibold text-slate-500 tracking-normal"
                          : "text-[11px] font-semibold text-slate-500 tracking-[0.08em]",
                      )}
                    >
                      {t("retirement.pension")}
                    </p>
                  </div>
                  <p className="truncate text-sm font-bold tracking-tight text-slate-800">
                    {portfolioMeta?.pension?.name || t("retirement.none")}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-semibold text-sky-700 tracking-normal"
                            : "text-[10px] font-semibold text-sky-700",
                        )}
                      >
                        {t("settings.dy")}
                      </span>
                      <span className="ml-1 text-xs font-bold text-sky-700">
                        {portfolioMeta?.pension?.yield || "0.00%"}
                      </span>
                    </div>
                    <div className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-semibold text-cyan-700 tracking-normal"
                            : "text-[10px] font-semibold text-cyan-700",
                        )}
                      >
                        {t("retirement.tr")}
                      </span>
                      <span className="ml-1 text-xs font-bold text-cyan-700">
                        {(
                          (portfolioMeta?.pension?.expected_return || 0) * 100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="rounded-2xl border border-white/80 bg-white/75 px-6 py-4 shadow-sm"
                data-testid="active-strategy-exchange-rate"
              >
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="text-right">
                    <p
                      className={cn(
                        "leading-none mb-1",
                        isKorean
                          ? "text-xs font-semibold text-slate-500 tracking-normal"
                          : "text-[11px] font-semibold text-slate-500 tracking-[0.08em]",
                      )}
                    >
                      {t("retirement.exchangeRate")}
                    </p>
                    <p className="text-lg font-bold leading-none text-emerald-700 tabular-nums">
                      {exchangeRate.toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                      <span className="ml-1 text-[11px] font-semibold text-slate-500">
                        KRW
                      </span>
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-slate-500">
                      {t("retirement.exchangeRateUpdatedAt")}{" "}
                      <span className="font-semibold text-slate-600">
                        {formattedExchangeRateUpdatedAt}
                      </span>
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void fetchExchangeRate(true)}
                      disabled={isRefreshingExchangeRate}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="retirement-refresh-exchange-rate"
                    >
                      {isRefreshingExchangeRate
                        ? t("retirement.exchangeRateRefreshing")
                        : t("retirement.exchangeRateRefresh")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 1. Assumptions */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-slate-200">
              <Settings2 size={20} className="text-slate-500" />
            </div>
            <div>
              <h3
                className={cn(
                  "text-slate-700",
                  isKorean
                    ? "text-lg font-bold tracking-normal"
                    : "text-base font-bold tracking-tight",
                )}
                data-testid="retirement-step-1-title"
              >
                {t("retirement.step1Title")}
              </h3>
              <p
                className={cn(
                  "mt-0.5 font-bold",
                  isKorean
                    ? "text-xs text-slate-500 tracking-normal"
                    : "text-[11px] text-slate-500 tracking-[0.08em]",
                )}
              >
                {t("retirement.step1Subtitle")}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-white/80 bg-white/72 px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                {t("retirement.inputGuideLabel")}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600">
                {t("retirement.inputGuideBody")}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InlineHint
                label={t("retirement.inputGuideLocked")}
                value={t("retirement.inputGuideLockedBody")}
              />
              <InlineHint
                label={t("retirement.inputGuideEditable")}
                value={t("retirement.inputGuideEditableBody")}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleAssumptions.map(([id, item]) => (
            <div
              key={id}
              data-testid={`assumption-card-${id}`}
              onClick={() => activeId !== id && handleSwitchVersion(id)}
              className={cn(
                "group cursor-pointer rounded-[1.75rem] border p-8 text-left transition-all duration-300 shadow-sm",
                activeId === id
                  ? "border-emerald-200 bg-emerald-50/85"
                  : "border-white/80 bg-white/72 hover:bg-white/86",
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                  <h4
                    className={cn(
                      "text-xl font-black",
                      activeId === id ? "text-emerald-700" : "text-slate-700",
                    )}
                  >
                    {id === "v1"
                      ? t("retirement.assumption.standard")
                      : t("retirement.assumption.conservative")}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500">
                    {id === "v1"
                      ? t("retirement.assumptionMasterLocked")
                      : t("retirement.assumptionEditable")}
                  </p>
                </div>
                {activeId === id && (
                  <CheckCircle2 size={24} className="text-emerald-600" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p
                    className={cn(
                      isKorean
                        ? "text-xs font-semibold text-slate-500 tracking-normal"
                        : "text-[11px] font-semibold text-slate-500",
                    )}
                  >
                    {t("retirement.tr")}
                  </p>
                  <EditableInput
                    id={`return-${id}`}
                    initialValue={
                      (id === "v1"
                        ? standardMasterReturn
                        : item.expected_return) * 100
                    }
                    masterValue={
                      (id === "v1"
                        ? standardMasterReturn
                        : (item.master_return ?? 0.0485)) * 100
                    }
                    readOnly={id === "v1"}
                    onCommit={async (v) => {
                      const nc = {
                        ...config,
                        active_assumption_id: id,
                        assumptions: {
                          ...config.assumptions,
                          [id]: {
                            ...item,
                            expected_return:
                              id === "v1" ? item.expected_return : v / 100,
                          },
                        },
                      };
                      setConfig(nc);
                      setActiveId(id);
                      await fetch(
                        "http://localhost:8000/api/retirement/config",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(nc),
                        },
                      );
                      await fetchData(id);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <p
                    className={cn(
                      isKorean
                        ? "text-xs font-semibold text-slate-500 tracking-normal"
                        : "text-[11px] font-semibold text-slate-500",
                    )}
                  >
                    {t("retirement.inflation")}
                  </p>
                  <EditableInput
                    id={`inflation-${id}`}
                    initialValue={item.inflation_rate * 100}
                    masterValue={(item.master_inflation ?? 0.025) * 100}
                    onCommit={async (v) => {
                      const nc = {
                        ...config,
                        active_assumption_id: id,
                        assumptions: {
                          ...config.assumptions,
                          [id]: { ...item, inflation_rate: v / 100 },
                        },
                      };
                      setConfig(nc);
                      setActiveId(id);
                      await fetch(
                        "http://localhost:8000/api/retirement/config",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(nc),
                        },
                      );
                      await fetchData(id);
                    }}
                  />
                </div>
              </div>
              <p className="mt-6 text-[11px] font-medium text-slate-500">
                {id === "v1"
                  ? t("retirement.assumptionMasterHint")
                  : t("retirement.assumptionEditableHint")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2. Projection Result */}
      <section className="space-y-10 animate-in slide-in-from-bottom-4 duration-1000 delay-200">
        <div className="flex items-center gap-3 px-4">
          <div className="rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-slate-200">
            <Activity size={20} className="text-slate-500" />
          </div>
          <div>
            <h3
              className={cn(
                "text-slate-700",
                isKorean
                  ? "text-lg font-bold tracking-normal"
                  : "text-base font-bold tracking-tight",
              )}
              data-testid="retirement-step-2-title"
            >
              {t("retirement.step2Title")}
            </h3>
          </div>
        </div>
        <div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          data-testid="retirement-result-snapshot"
        >
          <ResultSnapshotCard
            label={t("retirement.snapshotAssumption")}
            value={
              activeId === "v1"
                ? t("retirement.assumption.standard")
                : t("retirement.assumption.conservative")
            }
          />
          <ResultSnapshotCard
            label={t("retirement.snapshotDuration")}
            value={`${config.simulation_params.simulation_years || 30}${t("retirement.chart.yearTick")}`}
          />
          <ResultSnapshotCard
            label={t("retirement.snapshotMonthlyTarget")}
            value={`₩${(
              config.simulation_params.target_monthly_cashflow || 0
            ).toLocaleString()}`}
          />
          <ResultSnapshotCard
            label={t("retirement.snapshotMaster")}
            value={
              simulationData.meta?.master_name ||
              t("retirement.customStrategyBuilder")
            }
          />
        </div>
        <div
          className={cn(
            "relative overflow-hidden rounded-[2.5rem] border p-10 shadow-sm backdrop-blur-md transition-all duration-700",
            level.bg,
            "border-white/70",
          )}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
            <div className="lg:col-span-5 flex flex-col justify-center space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                  <span>{t("retirement.statusSection")}</span>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold",
                    level.bg,
                    level.color,
                  )}
                >
                  {level.icon} {level.label} {t("retirement.status")}
                </div>
                {summary.total_survival_years >=
                (config.simulation_params.simulation_years || 30) ? (
                  <h2 className="text-3xl font-bold leading-tight text-slate-800">
                    <span className="text-emerald-700">
                      {t("retirement.canRetire")}
                    </span>
                  </h2>
                ) : (
                  <h2 className="text-3xl font-bold leading-tight text-slate-800">
                    <span className="text-amber-600">
                      {t("retirement.needMoreAssets")}
                    </span>
                  </h2>
                )}
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                  <span>{t("retirement.metricsSection")}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricCard
                    label={t("retirement.yearsSustainableMetric")}
                    value={`${summary.total_survival_years || 0}${t("retirement.chart.yearTick")}`}
                    tooltip={t("retirement.yearsSustainableTooltip")}
                    testId="retirement-metric-survival-years"
                    valueTestId="survival-years"
                    valueClassName={cn(
                      (summary.total_survival_years || 0) >= 25
                        ? "text-slate-200"
                        : "text-amber-400",
                    )}
                  />
                  <MetricCard
                    label={t("retirement.finalNw")}
                    value={`₩${(summary.is_permanent ? monthlyData[monthlyData.length - 1].total_net_worth / 100000000 : 0).toFixed(1)}${largeCurrencyUnit}`}
                    tooltip={t("retirement.finalNwTooltip")}
                    testId="retirement-metric-final-nw"
                  />
                  <MetricCard
                    label={t("retirement.cashExhaust")}
                    value={summary.sgov_exhaustion_date || "-"}
                    tooltip={t("retirement.cashExhaustTooltip")}
                    testId="retirement-metric-cash-exhaust"
                  />
                </div>
              </div>
              {strategyRulesSummary && (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                    <span>{t("retirement.ruleSection")}</span>
                  </div>
                  <div
                    className="space-y-4 rounded-[1.75rem] border border-white/80 bg-white/74 p-5 shadow-sm"
                    data-testid="strategy-rules-summary"
                  >
                    <div className="flex items-center gap-2">
                      <Info size={16} className="text-violet-600" />
                      <p
                        className={cn(
                          isKorean
                            ? "text-xs font-semibold text-violet-700 tracking-normal"
                            : "text-[11px] font-semibold text-violet-700 tracking-[0.08em]",
                        )}
                      >
                        {t("retirement.appliedRules")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <RuleBadge
                        label={t("retirement.rebalance")}
                        value={`${strategyRulesSummary.rebalance_month}M / ${strategyRulesSummary.rebalance_week}W`}
                      />
                      <RuleBadge
                        label={t("retirement.corpSgov")}
                        value={`${strategyRulesSummary.corporate_sgov_target_months} Mo`}
                      />
                      <RuleBadge
                        label={t("retirement.pensionSgov")}
                        value={`${strategyRulesSummary.pension_sgov_min_years} Yr`}
                      />
                      <RuleBadge
                        label={t("retirement.bearFreeze")}
                        value={
                          strategyRulesSummary.bear_market_freeze_enabled
                            ? t("retirement.enabled")
                            : t("retirement.disabled")
                        }
                      />
                      <RuleBadge
                        label={t("retirement.monthlyCost")}
                        value={`₩${(
                          config.simulation_params.target_monthly_cashflow || 0
                        ).toLocaleString()}`}
                        testId="rule-badge-monthly-cost"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div
              className="relative flex h-[460px] flex-col rounded-[1.75rem] border border-white/80 bg-white/68 p-6 shadow-sm lg:col-span-7"
              data-testid="retirement-projection-chart"
            >
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <ChartSummaryCard
                  label={t("retirement.chartStartAssets")}
                  value={`₩${(initialNetWorth / 100000000).toFixed(1)}${largeCurrencyUnit}`}
                />
                <ChartSummaryCard
                  label={t("retirement.chartLatestAssets")}
                  value={`₩${(latestNetWorth / 100000000).toFixed(1)}${largeCurrencyUnit}`}
                />
                <ChartSummaryCard
                  label={t("retirement.chartMinimumAssets")}
                  value={`₩${(minimumNetWorth / 100000000).toFixed(1)}${largeCurrencyUnit}`}
                />
              </div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                    {t("retirement.chartFocusLabel")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {t("retirement.chartFocusBody")}
                  </p>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorTotal"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f8fafc"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f8fafc"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorCorp"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="colorPen" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#cbd5e1"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="index"
                      type="number"
                      domain={[0, 360]}
                      tickFormatter={(v) =>
                        `${Math.floor(v / 12)}${t("retirement.chart.yearTick")}`
                      }
                      stroke="#64748b"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        `${(v / 100000000).toFixed(0)}${largeCurrencyUnit}`
                      }
                      stroke="#64748b"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255,255,255,0.96)",
                        border: "1px solid rgba(138,157,150,0.32)",
                        borderRadius: "1rem",
                        fontSize: "12px",
                        boxShadow: "0 14px 34px rgba(102,124,114,0.12)",
                      }}
                      labelFormatter={(l) =>
                        `${Math.floor(Number(l) / 12)} ${t("retirement.chart.yearLabel")} (${l}${t("retirement.chart.monthLabel")})`
                      }
                      formatter={(
                        v: number | string | undefined,
                        name: string | undefined,
                        entry,
                      ) => [
                        `${(Number(v || 0) / 100000000).toFixed(1)}${largeCurrencyUnit}`,
                        entry?.dataKey === "total_net_worth"
                          ? t("retirement.chart.totalAssets")
                          : entry?.dataKey === "corp_balance"
                            ? t("retirement.chart.corpAssets")
                            : name || t("retirement.chart.pensionAssets"),
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={36}
                      iconType="circle"
                    />
                    <Area
                      name={t("retirement.chart.totalAssets")}
                      type="monotone"
                      dataKey="total_net_worth"
                      stroke="#334155"
                      strokeWidth={3}
                      fill="url(#colorTotal)"
                      isAnimationActive={true}
                    />
                    <Area
                      name={t("retirement.chart.corpAssets")}
                      type="monotone"
                      dataKey="corp_balance"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorCorp)"
                      isAnimationActive={true}
                    />
                    <Area
                      name={t("retirement.chart.pensionAssets")}
                      type="monotone"
                      dataKey="pension_balance"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorPen)"
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 5. Detailed Log */}
      <section className="space-y-6 pb-20">
        <div className="flex flex-col gap-4 px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-slate-200">
              <Coins size={20} className="text-slate-500" />
            </div>
            <div>
              <h3
                className={cn(
                  "text-slate-700",
                  isKorean
                    ? "text-lg font-bold tracking-normal"
                    : "text-base font-bold tracking-tight",
                )}
              >
                {t("retirement.step5Title")}
              </h3>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {t("retirement.detailLogHelper")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDetailOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
            data-testid="retirement-detail-toggle"
          >
            <span>
              {isDetailOpen
                ? t("retirement.hideDetailLog")
                : t("retirement.showDetailLog")}
            </span>
            <ChevronDown
              size={16}
              className={cn(
                "transition-transform",
                isDetailOpen && "rotate-180",
              )}
            />
          </button>
        </div>
        {isDetailOpen ? (
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/76 shadow-sm">
            <div className="custom-scrollbar max-h-[650px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white/95 text-[11px] font-semibold tracking-[0.08em] text-slate-500 backdrop-blur-md">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-5 text-center">
                      {t("retirement.table.dateAge")}
                    </th>
                    <th className="px-6 py-5">{t("retirement.table.phase")}</th>
                    <th className="px-6 py-5 text-right text-rose-500/70">
                      {t("retirement.table.targetCf")}
                    </th>
                    <th className="px-6 py-5 text-right text-emerald-500/70">
                      {t("retirement.table.totalDraw")}
                    </th>
                    <th className="border-l border-slate-200 px-6 py-5 text-right text-blue-400/70">
                      {t("retirement.table.corpBal")}
                    </th>
                    <th className="px-6 py-5 text-right text-blue-400/70">
                      {t("retirement.table.penBal")}
                    </th>
                    <th className="border-l border-slate-200 px-6 py-5 text-right text-slate-200">
                      {t("retirement.table.netWorth")}
                    </th>
                    <th className="px-6 py-5 text-right text-emerald-400/50">
                      {t("retirement.table.loanBal")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {monthlyData.map((m, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        "group transition-colors hover:bg-slate-50",
                        m.event ? "bg-emerald-50/60" : "",
                      )}
                    >
                      <td className="px-6 py-4 text-center text-xs font-medium text-slate-500">
                        {m.year}-{String(m.month).padStart(2, "0")} ({m.age}
                        {t("retirement.table.ageSuffix")})
                      </td>
                      <td className="px-6 py-4 text-left">
                        <span
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-[11px] font-semibold shadow-sm",
                            m.phase === "Phase 1"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : m.phase === "Phase 2"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                          )}
                        >
                          {m.phase}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-semibold text-rose-500">
                        {(m.target_cashflow / 10000).toFixed(0)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.tenThousand")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-semibold text-emerald-700">
                        {(
                          (m.net_salary + (m.pension_draw || 0)) /
                          10000
                        ).toFixed(0)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.tenThousand")}
                        </span>
                      </td>
                      <td className="border-l border-slate-200 px-6 py-4 text-right text-xs font-medium text-slate-600">
                        {(m.corp_balance / 100000000).toFixed(2)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.hundredMillion")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-medium text-slate-600">
                        {(m.pension_balance / 100000000).toFixed(2)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.hundredMillion")}
                        </span>
                      </td>
                      <td className="border-l border-slate-200 px-6 py-4 text-right text-sm font-bold text-slate-800 transition-colors group-hover:text-emerald-700">
                        {(m.total_net_worth / 100000000).toFixed(2)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.hundredMillion")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-medium text-emerald-600">
                        {(m.loan_balance / 100000000).toFixed(2)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.hundredMillion")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            className="rounded-[2rem] border border-dashed border-slate-300 bg-white/46 px-6 py-8"
            data-testid="retirement-detail-collapsed"
          >
            <p className="text-sm font-medium text-slate-500">
              {t("retirement.detailLogCollapsed")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function InlineHint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/72 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-600">{value}</p>
    </div>
  );
}

function ChartSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/74 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tooltip,
  testId,
  valueTestId,
  valueClassName,
}: {
  label: string;
  value: string;
  tooltip: string;
  testId?: string;
  valueTestId?: string;
  valueClassName?: string;
}) {
  const { isKorean } = useI18n();
  return (
    <div
      className="group relative rounded-[1.5rem] border border-white/80 bg-white/76 p-6 shadow-sm"
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-2">
        <p
          className={cn(
            isKorean
              ? "text-xs font-semibold text-slate-500 tracking-normal"
              : "text-[11px] font-semibold text-slate-500 tracking-[0.08em]",
          )}
        >
          {label}
        </p>
        <div className="group relative">
          <Info size={12} className="text-slate-600 cursor-help" />
          <div className="absolute left-0 bottom-full z-50 mb-2 hidden w-48 rounded-xl border border-white/80 bg-white/95 p-3 text-left text-[11px] font-medium leading-relaxed text-slate-600 normal-case tracking-normal shadow-lg group-hover:block">
            {tooltip}
          </div>
        </div>
      </div>
      <span
        className={cn("text-base font-bold text-slate-800", valueClassName)}
        data-testid={valueTestId}
      >
        {value}
      </span>
    </div>
  );
}

function ResultSnapshotCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { isKorean } = useI18n();
  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-white/76 px-5 py-4 shadow-sm">
      <p
        className={cn(
          isKorean
            ? "text-[11px] font-semibold text-slate-500 tracking-normal"
            : "text-[11px] font-semibold text-slate-500 tracking-[0.08em]",
        )}
      >
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function RuleBadge({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  const { isKorean } = useI18n();
  return (
    <div
      className="rounded-2xl border border-white/80 bg-white/72 px-4 py-3 shadow-sm"
      data-testid={testId}
    >
      <p
        className={cn(
          isKorean
            ? "text-xs font-semibold text-slate-500 tracking-normal"
            : "text-[11px] font-semibold text-slate-500 tracking-[0.08em]",
        )}
      >
        {label}:
      </p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function EditableInput({
  id,
  initialValue,
  masterValue,
  readOnly = false,
  onCommit,
}: {
  id: string;
  initialValue: number;
  masterValue: number;
  readOnly?: boolean;
  onCommit: (val: number) => void;
}) {
  const { isKorean, t } = useI18n();
  const [value, setValue] = useState(initialValue.toFixed(1));
  useEffect(() => {
    setValue(initialValue.toFixed(1));
  }, [initialValue]);

  return (
    <div
      className="flex items-center gap-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative flex items-center">
        <input
          id={id}
          data-testid={id}
          type="text"
          readOnly={readOnly}
          className={cn(
            "w-28 rounded-xl border px-4 py-2.5 pr-10 text-lg font-bold outline-none transition-all",
            readOnly
              ? "cursor-default border-slate-200 bg-slate-50 text-slate-500"
              : "border-white/80 bg-white/90 text-emerald-700 focus:border-emerald-300",
          )}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() =>
            !readOnly &&
            !isNaN(parseFloat(value)) &&
            onCommit(parseFloat(value))
          }
          onKeyDown={(e) =>
            e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()
          }
        />
        <span
          className={cn(
            "absolute right-4",
            isKorean
              ? "text-[11px] font-semibold text-slate-500"
              : "text-xs font-semibold text-slate-500",
          )}
        >
          %
        </span>
      </div>
      {!readOnly && Math.abs(initialValue - masterValue) > 0.05 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCommit(masterValue);
          }}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700 transition-all hover:bg-emerald-100"
        >
          <RotateCcw size={16} strokeWidth={3} />
          <span
            className={cn(
              isKorean
                ? "text-xs font-semibold tracking-normal"
                : "text-[11px] font-semibold",
            )}
          >
            {t("retirement.reset")}
          </span>
        </button>
      )}
    </div>
  );
}
