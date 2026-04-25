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
import type {
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
  const [exchangeRate, setExchangeRate] = useState<number>(1425.5);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const visibleAssumptions = getVisibleAssumptions(config);

  const fetchData = useCallback(
    async (scenarioId: string | null = null) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [configRes, masterRes] = await Promise.all([
          fetch("http://localhost:8000/api/retirement/config"),
          fetch("http://localhost:8000/api/master-portfolios"),
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

        // 실시간 환율 정보 가져오기
        const settingsRes = await fetch("http://localhost:8000/api/settings");
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.data?.current_exchange_rate) {
          setExchangeRate(settingsData.data.current_exchange_rate);
        }

        const currentScenario = normalizedScenario;
        const simUrl = `http://localhost:8000/api/retirement/simulate?scenario=${currentScenario}`;
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
    [t],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSwitchVersion = async (id: string) => {
    if (!config) return;
    setActiveId(id);
    try {
      await fetch("http://localhost:8000/api/retirement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, active_assumption_id: id }),
      });
      await fetchData(id);
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
        await fetchData(activeId);
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
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 shadow-xl backdrop-blur-md relative">
          <div className="absolute left-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-1 relative">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                <p
                  className={cn(
                    "text-emerald-500",
                    isKorean
                      ? "text-xs font-bold tracking-[0.08em]"
                      : "text-[11px] font-black uppercase tracking-[0.3em]",
                  )}
                  data-testid="active-strategy-title"
                >
                  {t("retirement.activeStrategy")}
                </p>
              </div>

              <div
                className="flex items-center gap-3 cursor-pointer group/title w-fit"
                data-testid="master-switcher-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSwitcherOpen(!isSwitcherOpen);
                }}
              >
                <h1 className="text-2xl font-black text-slate-100 tracking-tight group-hover/title:text-emerald-400 transition-all flex items-center gap-3">
                  {simulationData.meta?.master_name ||
                    t("retirement.customStrategyBuilder")}
                </h1>
                <ChevronDown
                  className={cn(
                    "text-slate-600 group-hover/title:text-emerald-400 transition-all",
                    isSwitcherOpen && "rotate-180",
                  )}
                  size={20}
                />
              </div>
              <div
                className="mt-3 flex flex-wrap items-center gap-3"
                data-testid="active-strategy-master-metrics"
              >
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                  <span className="text-[10px] font-black text-emerald-500/70 uppercase">
                    {t("retirement.masterYield")}
                  </span>
                  <span className="ml-1.5 text-sm font-black text-emerald-300">
                    {((simulationData.meta?.combined_dy || 0) * 100).toFixed(2)}
                    %
                  </span>
                </div>
                <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5">
                  <span className="text-[10px] font-black text-blue-500/70 uppercase">
                    {t("retirement.tr")}
                  </span>
                  <span className="ml-1.5 text-sm font-black text-blue-300">
                    {((simulationData.meta?.combined_tr || 0) * 100).toFixed(2)}
                    %
                  </span>
                </div>
              </div>

              {isSwitcherOpen && (
                <div
                  className="absolute top-full left-0 mt-3 w-[380px] bg-slate-900 border border-slate-800 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.7)] py-3 z-[100] animate-in slide-in-from-top-1 duration-200 ring-1 ring-emerald-500/10"
                  data-testid="master-switcher-menu"
                >
                  <p
                    className={cn(
                      "px-6 py-1.5 border-b border-slate-800/50 mb-2",
                      isKorean
                        ? "text-xs font-bold text-slate-400 tracking-normal"
                        : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
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
                          "mx-2 px-6 py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group/item mb-0.5",
                          m.is_active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black tracking-tight truncate">
                              {m.name}
                            </p>
                            {m.combined_tr !== undefined &&
                              m.combined_tr !== null && (
                                <span className="text-[11px] font-black text-emerald-500/80 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                  {(m.combined_tr * 100).toFixed(2)}%
                                </span>
                              )}
                            {m.broken_reference && (
                              <span className="text-[11px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                {t("retirement.broken")}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold opacity-60 uppercase tracking-tight truncate mt-0.5 text-slate-400">
                            Corp: {m.corp_name || "-"} / Pen:{" "}
                            {m.pension_name || "-"}
                          </p>
                          {m.broken_reference && m.broken_reason && (
                            <p className="text-[10px] font-bold text-rose-400/80 mt-1 line-clamp-2">
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

            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[720px]"
              data-testid="active-strategy-summary"
            >
              <div
                className="bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 flex items-start gap-3"
                data-testid="active-strategy-corp-card"
              >
                <Building2 className="text-emerald-500/50" size={18} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        isKorean
                          ? "text-xs font-bold text-slate-400 tracking-normal"
                          : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                      )}
                    >
                      {t("retirement.corporate")}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-200 tracking-tight truncate">
                    {portfolioMeta?.corp?.name || t("retirement.none")}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-bold text-emerald-300/80 tracking-normal"
                            : "text-[10px] font-black text-emerald-500/70 uppercase",
                        )}
                      >
                        {t("settings.dy")}
                      </span>
                      <span className="ml-1 text-xs font-black text-emerald-300">
                        {portfolioMeta?.corp?.yield || "0.00%"}
                      </span>
                    </div>
                    <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-bold text-blue-300/80 tracking-normal"
                            : "text-[10px] font-black text-blue-500/70 uppercase",
                        )}
                      >
                        {t("retirement.tr")}
                      </span>
                      <span className="ml-1 text-xs font-black text-blue-300">
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
                className="bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 flex items-start gap-3"
                data-testid="active-strategy-pension-card"
              >
                <Wallet2 className="text-blue-500/50" size={18} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        isKorean
                          ? "text-xs font-bold text-slate-400 tracking-normal"
                          : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
                      )}
                    >
                      {t("retirement.pension")}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-200 tracking-tight truncate">
                    {portfolioMeta?.pension?.name || t("retirement.none")}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-bold text-blue-300/80 tracking-normal"
                            : "text-[10px] font-black text-blue-500/70 uppercase",
                        )}
                      >
                        {t("settings.dy")}
                      </span>
                      <span className="ml-1 text-xs font-black text-blue-300">
                        {portfolioMeta?.pension?.yield || "0.00%"}
                      </span>
                    </div>
                    <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1">
                      <span
                        className={cn(
                          isKorean
                            ? "text-[11px] font-bold text-cyan-300/80 tracking-normal"
                            : "text-[10px] font-black text-cyan-500/70 uppercase",
                        )}
                      >
                        {t("retirement.tr")}
                      </span>
                      <span className="ml-1 text-xs font-black text-cyan-300">
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
                className="flex items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-2xl px-6 py-4"
                data-testid="active-strategy-exchange-rate"
              >
                <div className="text-right ml-auto">
                  <p
                    className={cn(
                      "leading-none mb-1",
                      isKorean
                        ? "text-xs font-bold text-slate-400 tracking-normal"
                        : "text-[11px] font-black text-slate-600 uppercase tracking-widest",
                    )}
                  >
                    {t("retirement.exchangeRate")}
                  </p>
                  <p className="text-lg font-black text-emerald-500/90 tabular-nums leading-none">
                    {exchangeRate.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                    <span className="text-[11px] text-slate-600 ml-1 font-bold">
                      KRW
                    </span>
                  </p>
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
            <div className="p-2 bg-slate-800 rounded-lg">
              <Settings2 size={20} className="text-slate-400" />
            </div>
            <div>
              <h3
                className={cn(
                  "text-slate-300",
                  isKorean
                    ? "text-lg font-bold tracking-normal"
                    : "text-base font-black uppercase tracking-widest",
                )}
                data-testid="retirement-step-1-title"
              >
                {t("retirement.step1Title")}
              </h3>
              <p
                className={cn(
                  "mt-0.5 font-bold",
                  isKorean
                    ? "text-xs text-slate-400 tracking-normal"
                    : "text-[11px] text-slate-500 uppercase tracking-widest",
                )}
              >
                {t("retirement.step1Subtitle")}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/40 px-5 py-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                {t("retirement.inputGuideLabel")}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-300">
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
                "p-8 rounded-[2rem] border transition-all duration-500 text-left group cursor-pointer",
                activeId === id
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-slate-900/40 border-slate-800",
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                  <h4
                    className={cn(
                      "text-xl font-black",
                      activeId === id ? "text-emerald-400" : "text-slate-400",
                    )}
                  >
                    {id === "v1"
                      ? t("retirement.assumption.standard")
                      : t("retirement.assumption.conservative")}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500">
                    {id === "v1"
                      ? t("retirement.assumptionMasterLocked")
                      : t("retirement.assumptionEditable")}
                  </p>
                </div>
                {activeId === id && (
                  <CheckCircle2
                    size={24}
                    className="text-emerald-400 shadow-glow"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p
                    className={cn(
                      isKorean
                        ? "text-xs font-bold text-slate-400 tracking-normal"
                        : "text-[11px] font-black text-slate-500 uppercase",
                    )}
                  >
                    {t("retirement.tr")}
                  </p>
                  <EditableInput
                    id={`return-${id}`}
                    initialValue={item.expected_return * 100}
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
                        ? "text-xs font-bold text-slate-400 tracking-normal"
                        : "text-[11px] font-black text-slate-50 uppercase",
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
              <p className="mt-6 text-[11px] font-bold text-slate-500">
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
          <div className="p-2 bg-slate-800 rounded-lg">
            <Activity size={20} className="text-slate-400" />
          </div>
          <div>
            <h3
              className={cn(
                "text-slate-300",
                isKorean
                  ? "text-lg font-bold tracking-normal"
                  : "text-base font-black uppercase tracking-widest",
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
            "p-12 rounded-[3.5rem] border shadow-2xl backdrop-blur-md relative overflow-hidden transition-all duration-1000",
            level.bg,
            "border-white/5",
          )}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
            <div className="lg:col-span-5 flex flex-col justify-center space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <span>{t("retirement.statusSection")}</span>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                    level.bg,
                    level.color,
                  )}
                >
                  {level.icon} {level.label} {t("retirement.status")}
                </div>
                {summary.total_survival_years >=
                (config.simulation_params.simulation_years || 30) ? (
                  <h2 className="text-3xl font-black text-slate-50 leading-tight">
                    <span className="text-emerald-400">
                      {t("retirement.canRetire")}
                    </span>
                  </h2>
                ) : (
                  <h2 className="text-3xl font-black text-slate-50 leading-tight">
                    <span className="text-amber-400">
                      {t("retirement.needMoreAssets")}
                    </span>
                  </h2>
                )}
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
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
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    <span>{t("retirement.ruleSection")}</span>
                  </div>
                  <div
                    className="rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5 space-y-4"
                    data-testid="strategy-rules-summary"
                  >
                    <div className="flex items-center gap-2">
                      <Info size={16} className="text-violet-400" />
                      <p
                        className={cn(
                          isKorean
                            ? "text-xs font-bold text-violet-300 tracking-normal"
                            : "text-[11px] font-black text-violet-400 uppercase tracking-widest",
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
              className="lg:col-span-7 h-[400px] bg-slate-950/20 rounded-3xl p-6 relative"
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
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {t("retirement.chartFocusLabel")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-300">
                    {t("retirement.chartFocusBody")}
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f8fafc" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#f8fafc" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCorp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="index"
                    type="number"
                    domain={[0, 360]}
                    tickFormatter={(v) =>
                      `${Math.floor(v / 12)}${t("retirement.chart.yearTick")}`
                    }
                    stroke="#475569"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      `${(v / 100000000).toFixed(0)}${largeCurrencyUnit}`
                    }
                    stroke="#475569"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "1rem",
                      fontSize: "12px",
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
                    stroke="#f8fafc"
                    strokeWidth={4}
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
      </section>

      {/* Step 5. Detailed Log */}
      <section className="space-y-6 pb-20">
        <div className="flex flex-col gap-4 px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Coins size={20} className="text-slate-400" />
            </div>
            <div>
              <h3
                className={cn(
                  "text-slate-300",
                  isKorean
                    ? "text-lg font-bold tracking-normal"
                    : "text-base font-black uppercase tracking-widest",
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
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
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
          <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
            <div className="max-h-[650px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  <tr className="border-b border-slate-800">
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
                    <th className="px-6 py-5 text-right text-blue-400/70 border-l border-slate-800/50">
                      {t("retirement.table.corpBal")}
                    </th>
                    <th className="px-6 py-5 text-right text-blue-400/70">
                      {t("retirement.table.penBal")}
                    </th>
                    <th className="px-6 py-5 text-right text-slate-200 border-l border-slate-800/50">
                      {t("retirement.table.netWorth")}
                    </th>
                    <th className="px-6 py-5 text-right text-emerald-400/50">
                      {t("retirement.table.loanBal")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {monthlyData.map((m, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        "hover:bg-slate-800/40 transition-colors group",
                        m.event ? "bg-emerald-500/5" : "",
                      )}
                    >
                      <td className="px-6 py-4 text-xs font-bold text-slate-400 text-center">
                        {m.year}-{String(m.month).padStart(2, "0")} ({m.age}
                        {t("retirement.table.ageSuffix")})
                      </td>
                      <td className="px-6 py-4 text-left">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-tighter shadow-sm",
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
                      <td className="px-6 py-4 text-xs font-black text-rose-400/80 text-right">
                        {(m.target_cashflow / 10000).toFixed(0)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.tenThousand")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-emerald-400/80 text-right">
                        {(
                          (m.net_salary + (m.pension_draw || 0)) /
                          10000
                        ).toFixed(0)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.tenThousand")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-300 text-right border-l border-slate-800/50">
                        {(m.corp_balance / 100000000).toFixed(2)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.hundredMillion")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-300 text-right">
                        {(m.pension_balance / 100000000).toFixed(2)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.hundredMillion")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-slate-50 text-right border-l border-slate-800/50 group-hover:text-emerald-400 transition-colors">
                        {(m.total_net_worth / 100000000).toFixed(2)}
                        <span className="text-[11px] ml-0.5 opacity-50 text-slate-500">
                          {t("retirement.table.hundredMillion")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-emerald-400/60 text-right">
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
            className="rounded-[2.5rem] border border-dashed border-slate-700 bg-slate-900/20 px-6 py-8"
            data-testid="retirement-detail-collapsed"
          >
            <p className="text-sm font-bold text-slate-400">
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-300">{value}</p>
    </div>
  );
}

function ChartSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/35 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-100">{value}</p>
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
      className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 group relative"
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-2">
        <p
          className={cn(
            isKorean
              ? "text-xs font-bold text-slate-400 tracking-normal"
              : "text-[11px] text-slate-500 uppercase font-black tracking-widest",
          )}
        >
          {label}
        </p>
        <div className="group relative">
          <Info size={12} className="text-slate-600 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal">
            {tooltip}
          </div>
        </div>
      </div>
      <span
        className={cn("text-base font-black text-slate-200", valueClassName)}
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
    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/50 px-5 py-4">
      <p
        className={cn(
          isKorean
            ? "text-[11px] font-bold text-slate-400 tracking-normal"
            : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
        )}
      >
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-100 break-words">
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
      className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3"
      data-testid={testId}
    >
      <p
        className={cn(
          isKorean
            ? "text-xs font-bold text-slate-400 tracking-normal"
            : "text-[11px] font-black text-slate-500 uppercase tracking-widest",
        )}
      >
        {label}:
      </p>
      <p className="text-sm font-black text-slate-200 mt-1">{value}</p>
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
            "border rounded-xl px-4 py-2.5 w-28 text-lg font-black outline-none transition-all pr-10",
            readOnly
              ? "bg-slate-950 border-slate-800 text-slate-300 cursor-default"
              : "bg-slate-950/80 border-slate-700 text-emerald-400 focus:border-emerald-500",
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
              ? "text-[11px] font-bold text-slate-400"
              : "text-xs font-black text-slate-500",
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
          className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500 rounded-xl text-emerald-400 hover:text-slate-950 transition-all shadow-lg flex items-center gap-2"
        >
          <RotateCcw size={16} strokeWidth={3} />
          <span
            className={cn(
              isKorean
                ? "text-xs font-bold tracking-normal"
                : "text-[11px] font-black uppercase",
            )}
          >
            {t("retirement.reset")}
          </span>
        </button>
      )}
    </div>
  );
}
