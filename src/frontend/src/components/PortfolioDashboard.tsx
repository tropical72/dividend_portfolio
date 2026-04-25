import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  TrendingUp,
  PieChart,
  Edit3,
  CheckSquare,
  Square,
  BarChart3,
  RotateCcw,
  PlusCircle,
  Layout,
  X,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";
import type { Portfolio, MasterPortfolio } from "../types";

/** [REQ-PRT-06, REQ-GLB-13] 포트폴리오 대시보드 및 비교 탭 */
export function PortfolioDashboard({
  onLoad,
}: {
  onLoad: (p: Portfolio) => void;
}) {
  const { isKorean } = useI18n();
  const copy = isKorean
    ? {
        deleteMasterConfirm: "이 마스터 전략을 삭제하시겠습니까?",
        masterDeleteFailed: "전략을 삭제할 수 없습니다.",
        renameTitle: "이름 변경",
        syncData: "데이터 동기화 중...",
        masterStrategy: "마스터 전략",
        masterStrategySubtitle: "은퇴 시뮬레이션에 주입할 최종 포트폴리오 세트",
        newStrategy: "새 전략",
        strategyNamePlaceholder: "전략 명칭 입력",
        corpPortfolio: "법인 포트폴리오",
        pensionPortfolio: "연금 포트폴리오",
        none: "없음",
        saveStrategy: "전략 저장",
        noMasterStrategies: "저장된 마스터 전략이 없습니다.",
        active: "활성",
        corpShort: "법인",
        penShort: "연금",
        dividendYield: "배당수익률",
        expectedTr: "TR",
        activateStrategy: "전략 활성화",
        cannotDeleteDefaultStrategy: "기본 전략은 삭제할 수 없습니다",
        cannotDeleteActiveStrategy: "활성 전략은 삭제할 수 없습니다",
        deleteStrategy: "전략 삭제",
        globalSimulator: "전체 시뮬레이터",
        overrideCapital:
          "아래 모든 포트폴리오에 공통으로 적용할 투자금을 설정합니다",
        globalUsdCapital: "전체 USD 투자금",
        globalKrwCapital: "전체 KRW 투자금",
        monthlyDividendComparison: "월 배당 비교",
        aggregatedIncome: "선택한 포트폴리오의 월별 현금흐름 비교",
        clearSelection: "선택 해제",
        income: "현금흐름",
        strategyCharacter: "전략 성격",
        assetMix: "자산 배분",
        comparisonMatrix: "비교 매트릭스",
        indicator: "지표",
        avgYield: "평균 배당률",
        estimatedIncome: "예상 현금흐름",
        assetCount: "종목 수",
        coreAsset: "핵심 종목",
        savedPortfolios: "저장된 포트폴리오",
        totalSets: "총",
        sets: "세트",
        assets: "종목",
        yield: "배당률",
        loadIntoDesigner: "설계 화면으로 불러오기",
        cannotDeleteDefaultPortfolio: "기본 포트폴리오는 삭제할 수 없습니다",
        deletePortfolio: "포트폴리오 삭제",
        individualPerformance: "개별 종목 성과",
        basedOnCapital: "시뮬레이션 투자금 기준",
        ticker: "티커",
        weight: "비중",
        annualUsd: "연간 (USD)",
        annualKrw: "연간 (KRW)",
        monthlyUsd: "월간 (USD)",
        monthlyKrw: "월간 (KRW)",
      }
    : {
        deleteMasterConfirm: "Delete this master strategy?",
        masterDeleteFailed: "Unable to delete the strategy.",
        renameTitle: "Rename",
        syncData: "Synchronizing Data...",
        masterStrategy: "Master Strategy",
        masterStrategySubtitle:
          "Final portfolio sets injected into retirement simulation",
        newStrategy: "New Strategy",
        strategyNamePlaceholder: "Strategy name",
        corpPortfolio: "Corporate Portfolio",
        pensionPortfolio: "Pension Portfolio",
        none: "None",
        saveStrategy: "Save Strategy",
        noMasterStrategies: "No saved master strategies.",
        active: "Active",
        corpShort: "Corp",
        penShort: "Pen",
        dividendYield: "Dividend Yield",
        expectedTr: "TR",
        activateStrategy: "Activate Strategy",
        cannotDeleteDefaultStrategy: "Default strategies cannot be deleted",
        cannotDeleteActiveStrategy: "Active strategies cannot be deleted",
        deleteStrategy: "Delete Strategy",
        globalSimulator: "Global Simulator",
        overrideCapital: "Override capital used for all portfolios below",
        globalUsdCapital: "Global USD Capital",
        globalKrwCapital: "Global KRW Capital",
        monthlyDividendComparison: "Monthly Dividend Comparison",
        aggregatedIncome: "Aggregated income across selected portfolios",
        clearSelection: "Clear Selection",
        income: "Income",
        strategyCharacter: "Strategy Character",
        assetMix: "Asset Mix",
        comparisonMatrix: "Comparison Matrix",
        indicator: "Indicator",
        avgYield: "Avg Yield (DY)",
        estimatedIncome: "Est. Income",
        assetCount: "Assets Count",
        coreAsset: "Core Asset",
        savedPortfolios: "Saved Portfolios",
        totalSets: "Total",
        sets: "Sets",
        assets: "Assets",
        yield: "Yield",
        loadIntoDesigner: "Load into Designer",
        cannotDeleteDefaultPortfolio: "Default portfolios cannot be deleted",
        deletePortfolio: "Delete Portfolio",
        individualPerformance: "Individual Asset Performance",
        basedOnCapital: "Based on Simulation Capital",
        ticker: "Ticker",
        weight: "Weight",
        annualUsd: "Annual (USD)",
        annualKrw: "Annual (KRW)",
        monthlyUsd: "Monthly (USD)",
        monthlyKrw: "Monthly (KRW)",
      };
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [masterPortfolios, setMasterPortfolios] = useState<MasterPortfolio[]>(
    [],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // 마스터 전략 생성 폼 상태
  const [newMasterName, setNewMasterName] = useState("");
  const [selectedCorpId, setSelectedCorpId] = useState<string>("");
  const [selectedPenId, setSelectedPenId] = useState<string>("");

  // 전역 시뮬레이션 상태 [REQ-PRT-06.3]
  const [globalCapitalUsd, setGlobalCapitalUsd] = useState<number | null>(null);
  const [globalCurrency, setGlobalCurrency] = useState<"USD" | "KRW">("USD");
  const [exchangeRate, setExchangeRate] = useState<number>(1425.5);
  const [paRates, setPaRates] = useState<Record<string, number>>({});

  /** 가중 평균 배당률 계산 공통 함수 */
  const getDY = useCallback((p: Portfolio | undefined) => {
    if (!p || !p.items || p.items.length === 0) return 0;
    return p.items.reduce(
      (s, i) => s + (i.dividend_yield || 0) * ((i.weight || 0) / 100),
      0,
    );
  }, []);

  /** [REQ-GLB-13] 차등 PA를 반영한 포트폴리오별 TR 계산 */
  const getTR = useCallback(
    (p: Portfolio | undefined) => {
      if (!p || !p.items || p.items.length === 0) return 0;
      return p.items.reduce((sum, item) => {
        let pa = 0;
        const cat = item.category;
        if (cat === "SGOV Buffer") pa = paRates.cash_sgov || 0.1;
        else if (cat === "High Income" || cat === "Bond Buffer")
          pa = paRates.fixed_income || 2.5;
        else if (cat === "Dividend Growth") pa = paRates.dividend_stocks || 5.5;
        else if (cat === "Growth Engine") pa = paRates.growth_stocks || 9.5;
        return (
          sum + ((item.dividend_yield || 0) + pa) * ((item.weight || 0) / 100)
        );
      }, 0);
    },
    [paRates],
  );

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, mRes] = await Promise.all([
          fetch("http://localhost:8000/api/portfolios"),
          fetch("http://localhost:8000/api/master-portfolios"),
        ]);
        const pData = await pRes.json();
        const mData = await mRes.json();
        setPortfolios(pData.data || []);
        setMasterPortfolios(mData.data || []);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    };
    fetchData();

    // 기본 설정에서 초기값 가져오기
    fetch("http://localhost:8000/api/settings")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          const s = res.data;
          if (s.current_exchange_rate) setExchangeRate(s.current_exchange_rate);
          if (s.appreciation_rates) setPaRates(s.appreciation_rates);

          if (s.default_capital) {
            const cap = s.default_capital;
            if (s.default_currency === "KRW") {
              setGlobalCapitalUsd(cap / (s.current_exchange_rate || 1425.5));
              setGlobalCurrency("KRW");
            } else {
              setGlobalCapitalUsd(cap);
              setGlobalCurrency("USD");
            }
          }
        }
      })
      .catch(console.error);
  }, []);

  /** 투자금 입력 핸들러 */
  const handleGlobalUsdChange = (val: string) => {
    const num = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
    setGlobalCapitalUsd(num);
    setGlobalCurrency("USD");
  };

  const handleGlobalKrwChange = (val: string) => {
    const num = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
    setGlobalCapitalUsd(num / exchangeRate);
    setGlobalCurrency("KRW");
  };

  /** 마스터 전략 생성 */
  const handleCreateMaster = async () => {
    if (!newMasterName || (!selectedCorpId && !selectedPenId)) return;
    try {
      const res = await fetch("http://localhost:8000/api/master-portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMasterName,
          corp_id: selectedCorpId || null,
          pension_id: selectedPenId || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMasterPortfolios((prev) => [...prev, data.data]);
        setNewMasterName("");
        setSelectedCorpId("");
        setSelectedPenId("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  /** 마스터 전략 활성화 */
  const handleActivateMaster = async (id: string) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/master-portfolios/${id}/activate`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.success) {
        setMasterPortfolios((prev) =>
          prev.map((m) => ({ ...m, is_active: m.id === id })),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  /** 마스터 전략 삭제 */
  const handleDeleteMaster = async (id: string) => {
    if (!window.confirm(copy.deleteMasterConfirm)) return;
    try {
      const res = await fetch(
        `http://localhost:8000/api/master-portfolios/${id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        setMasterPortfolios((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert(data.message || copy.masterDeleteFailed);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  /** 이름 변경 실행 */
  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/api/portfolios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });
      const result = await res.json();
      if (result.success) {
        setPortfolios((prev) =>
          prev.map((p) => (p.id === id ? { ...p, name: editingName } : p)),
        );
        setEditingId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /** 차트 데이터 계산 */
  const chartData = useMemo(() => {
    if (!portfolios || portfolios.length === 0 || selectedIds.size === 0)
      return [];
    const selectedPortfolios = portfolios.filter((p) => selectedIds.has(p.id));
    if (selectedPortfolios.length === 0) return [];

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    return months.map((m) => {
      const dataPoint: Record<string, string | number> = { name: `${m}월` };
      selectedPortfolios.forEach((p) => {
        const capital = globalCapitalUsd ?? (p.total_capital || 0);
        const items = p.items || [];
        const monthlySum = items.reduce((sum, item) => {
          if (item && item.payment_months && item.payment_months.includes(m)) {
            const allocated = capital * ((item.weight || 0) / 100);
            const shares = allocated / (item.price || 1);
            let amt = shares * (item.last_div_amount || 0);
            if (globalCurrency === "KRW") amt *= exchangeRate;
            return sum + amt;
          }
          return sum;
        }, 0);
        dataPoint[p.name || "Untitled"] = parseFloat(
          monthlySum.toFixed(globalCurrency === "KRW" ? 0 : 2),
        );
      });
      return dataPoint;
    });
  }, [portfolios, selectedIds, globalCapitalUsd, globalCurrency, exchangeRate]);

  /** 레이더 차트 및 지표 데이터 계산 */
  const { radarData, metrics } = useMemo(() => {
    const selectedPortfolios = portfolios.filter((p) => selectedIds.has(p.id));
    if (selectedPortfolios.length === 0) return { radarData: [], metrics: [] };

    // 1. Radar Data (Asset Mix)
    const categories = [
      "SGOV Buffer",
      "Bond Buffer",
      "High Income",
      "Dividend Growth",
      "Growth Engine",
    ];
    const radar = categories.map((cat) => {
      const point: Record<string, string | number> = { subject: cat };
      selectedPortfolios.forEach((p) => {
        const catWeight =
          p.items
            ?.filter((i) => i.category === cat)
            .reduce((s, i) => s + (i.weight || 0), 0) || 0;
        point[p.name] = catWeight;
      });
      return point;
    });

    // 2. Metrics (Comparison Matrix)
    const comparisonMetrics = selectedPortfolios.map((p) => {
      const totalYield = getDY(p);
      const totalTR = getTR(p);
      const capital = globalCapitalUsd ?? (p.total_capital || 0);
      const annualIncome = capital * (totalYield / 100);

      return {
        name: p.name,
        yield: totalYield,
        tr: totalTR,
        annualIncome: annualIncome,
        assetCount: p.items?.length || 0,
        topAsset:
          p.items?.sort((a, b) => (b.weight || 0) - (a.weight || 0))[0]
            ?.symbol || "-",
      };
    });

    return { radarData: radar, metrics: comparisonMetrics };
  }, [portfolios, selectedIds, globalCapitalUsd, paRates, getDY, getTR]);

  /** 선택 핸들러 */
  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  /** 로드 핸들러 */
  const handleLoad = (e: React.MouseEvent, p: Portfolio) => {
    e.stopPropagation();
    onLoad(p);
  };

  /** 삭제 핸들러 */
  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
    name: string,
  ) => {
    e.stopPropagation();
    if (
      !window.confirm(
        isKorean
          ? `"${name}" 포트폴리오를 삭제하시겠습니까?`
          : `Delete portfolio "${name}"?`,
      )
    )
      return;
    try {
      const res = await fetch(`http://localhost:8000/api/portfolios/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        setPortfolios((prev) => prev.filter((p) => p.id !== id));
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading)
    return (
      <div className="p-10 text-center text-sm font-semibold tracking-[0.08em] text-slate-500 animate-pulse">
        {copy.syncData}
      </div>
    );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* 0. Master Strategy Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <div className="rounded-2xl bg-emerald-50 p-3">
            <TrendingUp size={20} className="text-emerald-700" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-800">
              {copy.masterStrategy}
            </h3>
            <p className="text-xs font-medium text-slate-500">
              {copy.masterStrategySubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 전략 생성 카드 */}
          <div className="space-y-6 rounded-[2.5rem] border border-white/80 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
            <h4 className="text-sm font-semibold tracking-[0.08em] text-slate-500">
              {copy.newStrategy}
            </h4>
            <div className="space-y-4">
              <input
                type="text"
                placeholder={copy.strategyNamePlaceholder}
                value={newMasterName}
                onChange={(e) => setNewMasterName(e.target.value)}
                data-testid="master-strategy-name-input"
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-emerald-300"
              />
              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                  {copy.corpPortfolio}
                </p>
                <select
                  value={selectedCorpId}
                  onChange={(e) => setSelectedCorpId(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-emerald-300"
                >
                  <option value="">{copy.none}</option>
                  {portfolios
                    .filter((p) => p.account_type === "Corporate")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                  {copy.pensionPortfolio}
                </p>
                <select
                  value={selectedPenId}
                  onChange={(e) => setSelectedPenId(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-emerald-300"
                >
                  <option value="">{copy.none}</option>
                  {portfolios
                    .filter((p) => p.account_type === "Pension")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <button
                onClick={handleCreateMaster}
                disabled={!newMasterName || (!selectedCorpId && !selectedPenId)}
                data-testid="save-master-strategy-btn"
                className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-emerald-500 py-4 text-sm font-semibold text-white transition-all hover:bg-emerald-600 disabled:opacity-30"
              >
                <PlusCircle size={18} /> {copy.saveStrategy}
              </button>
            </div>
          </div>

          {/* 전략 리스트 */}
          <div className="lg:col-span-2 space-y-4">
            {masterPortfolios.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-slate-300 bg-white/60 p-12 text-sm font-medium italic text-slate-500">
                {copy.noMasterStrategies}
              </div>
            ) : (
              masterPortfolios.map((m) => {
                const c_p = portfolios.find((p) => p.id === m.corp_id);
                const p_p = portfolios.find((p) => p.id === m.pension_id);

                // [REQ-GLB-13] 백엔드에서 미리 계산해 준 값을 우선 사용하거나 프론트에서 가중 평균 계산
                const avg_dy = m.combined_yield ?? 0;
                const avg_tr = m.combined_tr ?? 0;

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "group flex items-center justify-between rounded-[2rem] border p-8 transition-all duration-500",
                      m.is_active
                        ? "border-emerald-200 bg-emerald-50/90 shadow-sm"
                        : "border-white/80 bg-white/78 shadow-sm hover:border-emerald-100",
                    )}
                  >
                    <div className="flex items-center gap-8">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="text-xl font-bold tracking-tight text-slate-800">
                            {m.name}
                          </h4>
                          {m.is_active && (
                            <div className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-white shadow-sm">
                              {copy.active}
                            </div>
                          )}
                        </div>
                        <p className="flex items-center gap-3 text-[11px] font-medium tracking-[0.08em] text-slate-500">
                          <span className="font-semibold text-emerald-700">
                            {copy.corpShort}:
                          </span>{" "}
                          {c_p?.name || "-"}
                          <span className="mx-1 text-slate-300">/</span>
                          <span className="font-semibold text-blue-700">
                            {copy.penShort}:
                          </span>{" "}
                          {p_p?.name || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-12">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 mb-1 group/tip relative">
                          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                            {copy.dividendYield}
                          </p>
                          <Info
                            size={10}
                            className="text-slate-400 cursor-help"
                          />
                          <div className="absolute right-0 bottom-full z-50 mb-2 hidden w-48 rounded-xl border border-slate-200 bg-white p-3 text-[11px] font-medium leading-relaxed text-slate-600 shadow-lg group-hover/tip:block animate-in fade-in zoom-in-95">
                            포트폴리오 구성 종목들의 가중 평균 배당수익률입니다.
                            (세전 기준)
                          </div>
                        </div>
                        <p className="text-xl font-bold tabular-nums text-slate-700">
                          {avg_dy.toFixed(2)}
                          <span className="ml-1 text-xs text-slate-400">%</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 mb-1 group/tip-tr relative">
                          <p className="text-[11px] font-semibold tracking-[0.08em] text-emerald-700">
                            {copy.expectedTr}
                          </p>
                          <Info
                            size={10}
                            className="text-emerald-500 cursor-help"
                          />
                          <div className="absolute right-0 bottom-full z-50 mb-2 hidden w-52 rounded-xl border border-slate-200 bg-white p-3 text-[11px] font-medium leading-relaxed text-slate-600 shadow-lg group-hover/tip-tr:block animate-in fade-in zoom-in-95">
                            배당수익률({avg_dy.toFixed(2)}%)에 자산군별
                            기대주가상승률을 합산한 가중 평균 총수익률입니다.
                          </div>
                        </div>
                        <p className="text-2xl font-bold tabular-nums text-emerald-700">
                          {avg_tr.toFixed(2)}
                          <span className="ml-1 text-xs text-emerald-500">
                            %
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {!m.is_active && (
                          <button
                            onClick={() => handleActivateMaster(m.id)}
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-500 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            title={copy.activateStrategy}
                            data-testid={`activate-master-${m.id}`}
                          >
                            <CheckSquare size={20} />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            !m.is_active &&
                            !m.is_system_default &&
                            handleDeleteMaster(m.id)
                          }
                          disabled={m.is_active || m.is_system_default}
                          data-testid={`delete-master-${m.id}`}
                          className={cn(
                            "rounded-2xl border p-4 transition-all",
                            m.is_active || m.is_system_default
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 opacity-70"
                              : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600",
                          )}
                          title={
                            m.is_system_default
                              ? copy.cannotDeleteDefaultStrategy
                              : m.is_active
                                ? copy.cannotDeleteActiveStrategy
                                : copy.deleteStrategy
                          }
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 1. Global Simulator [REQ-PRT-06.3] */}
      <div className="rounded-[2.5rem] border border-white/80 bg-white/78 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h3 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight text-slate-800">
              <TrendingUp className="text-emerald-700" size={20} />{" "}
              {copy.globalSimulator}
            </h3>
            <p className="text-xs font-medium text-slate-500">
              {copy.overrideCapital}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative group min-w-[220px]">
              <input
                type="text"
                placeholder={copy.globalUsdCapital}
                value={
                  globalCapitalUsd
                    ? Math.round(globalCapitalUsd).toLocaleString()
                    : ""
                }
                onChange={(e) => handleGlobalUsdChange(e.target.value)}
                className={cn(
                  "w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-lg font-semibold text-slate-800 outline-none transition-all group-hover:border-slate-300 focus:border-emerald-300",
                  globalCurrency === "USD" &&
                    globalCapitalUsd !== null &&
                    "border-emerald-300 ring-2 ring-emerald-100",
                )}
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 font-semibold text-slate-400">
                $
              </span>
            </div>
            <div className="relative group min-w-[220px]">
              <input
                type="text"
                placeholder={copy.globalKrwCapital}
                value={
                  globalCapitalUsd
                    ? Math.round(
                        globalCapitalUsd * exchangeRate,
                      ).toLocaleString()
                    : ""
                }
                onChange={(e) => handleGlobalKrwChange(e.target.value)}
                className={cn(
                  "w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-lg font-semibold text-slate-800 outline-none transition-all group-hover:border-slate-300 focus:border-emerald-300",
                  globalCurrency === "KRW" &&
                    globalCapitalUsd !== null &&
                    "border-emerald-300 ring-2 ring-emerald-100",
                )}
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 font-semibold text-slate-400">
                ₩
              </span>
            </div>
            {globalCapitalUsd !== null && (
              <button
                onClick={() => {
                  setGlobalCapitalUsd(null);
                  setGlobalCurrency("USD");
                }}
                className="rounded-2xl p-3 text-slate-500 transition-colors hover:bg-slate-50 hover:text-emerald-700"
              >
                <RotateCcw size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Advanced Analysis Cluster */}
      {selectedIds.size > 0 && (
        <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
          {/* 2.1 Monthly Dividend Bar Chart */}
          <div className="rounded-[2.5rem] border border-white/80 bg-white/82 p-10 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-800">
                  <BarChart3 className="text-emerald-700" size={24} />{" "}
                  {copy.monthlyDividendComparison} ({globalCurrency})
                </h3>
                <p className="ml-9 mt-1 text-xs font-medium text-slate-500">
                  {copy.aggregatedIncome}
                </p>
              </div>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700"
              >
                {copy.clearSelection}
              </button>
            </div>
            <div className="h-[350px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#d8e0e7"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(val) =>
                      globalCurrency === "USD"
                        ? `$${val}`
                        : `₩${(val / 10000).toFixed(0)}만`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "#d9e6ee", opacity: 0.45 }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #d8e0e7",
                      borderRadius: "16px",
                      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                    }}
                    formatter={(val: number | string | undefined) => [
                      globalCurrency === "USD"
                        ? `$${Number(val || 0).toLocaleString()}`
                        : `₩${Number(val || 0).toLocaleString()}`,
                      copy.income,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "30px" }}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="ml-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                        {value}
                      </span>
                    )}
                  />
                  {portfolios
                    .filter((p) => selectedIds.has(p.id))
                    .map((p, idx) => (
                      <Bar
                        key={p.id}
                        dataKey={p.name}
                        fill={
                          [
                            "#10b981",
                            "#3b82f6",
                            "#f59e0b",
                            "#8b5cf6",
                            "#ec4899",
                          ][idx % 5]
                        }
                        radius={[6, 6, 0, 0]}
                        barSize={selectedIds.size > 2 ? 15 : 30}
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 2.2 Asset Mix Radar Chart */}
            <div className="rounded-[2.5rem] border border-white/80 bg-white/80 p-10 shadow-sm">
              <h4 className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-slate-500">
                <PieChart size={18} className="text-blue-700" />{" "}
                {copy.strategyCharacter} ({copy.assetMix})
              </h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    data={radarData}
                  >
                    <PolarGrid stroke="#d8e0e7" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    {portfolios
                      .filter((p) => selectedIds.has(p.id))
                      .map((p, idx) => (
                        <Radar
                          key={p.id}
                          name={p.name}
                          dataKey={p.name}
                          stroke={
                            [
                              "#10b981",
                              "#3b82f6",
                              "#f59e0b",
                              "#8b5cf6",
                              "#ec4899",
                            ][idx % 5]
                          }
                          fill={
                            [
                              "#10b981",
                              "#3b82f6",
                              "#f59e0b",
                              "#8b5cf6",
                              "#ec4899",
                            ][idx % 5]
                          }
                          fillOpacity={0.3}
                        />
                      ))}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #d8e0e7",
                        borderRadius: "12px",
                        fontSize: "11px",
                        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2.3 Metrics Comparison Matrix */}
            <div className="rounded-[2.5rem] border border-white/80 bg-white/80 p-10 shadow-sm">
              <h4 className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-slate-500">
                <Layout size={18} className="text-emerald-700" />{" "}
                {copy.comparisonMatrix}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-4 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                        {copy.indicator}
                      </th>
                      {metrics.map((m) => (
                        <th
                          key={m.name}
                          className="max-w-[100px] truncate px-4 py-4 text-right text-[11px] font-semibold tracking-[0.08em] text-slate-600"
                        >
                          {m.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-4 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                        {copy.avgYield}
                      </td>
                      {metrics.map((m) => (
                        <td
                          key={m.name}
                          className="px-4 py-4 text-right font-semibold text-slate-700"
                        >
                          {m.yield.toFixed(2)}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 text-[11px] font-semibold tracking-[0.08em] text-emerald-700">
                        {copy.expectedTr}
                      </td>
                      {metrics.map((m) => (
                        <td
                          key={m.name}
                          className="px-4 py-4 text-right font-semibold text-emerald-700"
                        >
                          {m.tr.toFixed(2)}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                        {copy.estimatedIncome} ({globalCurrency})
                      </td>
                      {metrics.map((m) => (
                        <td
                          key={m.name}
                          className="px-4 py-4 text-right font-semibold text-slate-800"
                        >
                          {globalCurrency === "USD"
                            ? `$${Math.round(m.annualIncome).toLocaleString()}`
                            : `₩${Math.round(m.annualIncome * exchangeRate).toLocaleString()}`}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                        {copy.assetCount}
                      </td>
                      {metrics.map((m) => (
                        <td
                          key={m.name}
                          className="px-4 py-4 text-right font-semibold text-slate-700"
                        >
                          {m.assetCount}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                        {copy.coreAsset}
                      </td>
                      {metrics.map((m) => (
                        <td
                          key={m.name}
                          className="px-4 py-4 text-right font-semibold text-blue-700"
                        >
                          {m.topAsset}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Portfolio List */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-800">
          <PieChart className="text-emerald-700" /> {copy.savedPortfolios}
        </h2>
        <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-slate-500 shadow-sm">
          {copy.totalSets} {portfolios.length} {copy.sets}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {portfolios.map((p) => {
          const isExpanded = expandedId === p.id;
          const isSelected = selectedIds.has(p.id);
          const capitalUsd = globalCapitalUsd ?? p.total_capital;
          const capitalKrw = capitalUsd * exchangeRate;
          const items = p.items || [];

          return (
            <div
              key={p.id}
              className={cn(
                "portfolio-card group overflow-hidden rounded-[2rem] border transition-all duration-300",
                isExpanded
                  ? "border-emerald-200 bg-white shadow-md"
                  : "cursor-pointer border-white/80 bg-white/74 shadow-sm hover:border-emerald-100 hover:bg-white/88",
                isSelected &&
                  !isExpanded &&
                  "border-emerald-200 bg-emerald-50/60",
              )}
              onClick={() => setExpandedId(isExpanded ? null : p.id)}
            >
              <div className="p-8 flex items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <button
                    onClick={(e) => toggleSelect(e, p.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      isSelected
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                    )}
                  >
                    {isSelected ? (
                      <CheckSquare size={24} />
                    ) : (
                      <Square size={24} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 group/name">
                      {editingId === p.id ? (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleRename(p.id)
                            }
                            className="w-full max-w-[250px] rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xl font-bold text-slate-800 outline-none"
                          />
                          <button
                            onClick={() => handleRename(p.id)}
                            className="rounded-lg bg-emerald-50 p-2 text-emerald-700 transition-all hover:bg-emerald-500 hover:text-white"
                          >
                            <CheckSquare size={18} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-500 transition-all hover:bg-slate-200"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="truncate text-xl font-bold tracking-tight text-slate-800">
                            {p.name}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(p.id);
                              setEditingName(p.name);
                            }}
                            className="p-1 text-slate-400 opacity-0 transition-all group-hover/name:opacity-100 hover:text-emerald-700"
                            title={copy.renameTitle}
                          >
                            <Edit3 size={14} />
                          </button>
                        </>
                      )}
                      <span
                        className={cn(
                          "rounded-lg border px-3 py-1 text-xs font-semibold tracking-[0.08em] transition-all duration-500",
                          p.account_type?.toLowerCase() === "pension"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-blue-200 bg-blue-50 text-blue-700",
                        )}
                      >
                        {p.account_type === "Pension"
                          ? copy.pensionPortfolio
                          : copy.corpPortfolio}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-4 text-xs font-semibold tracking-[0.08em]">
                      <span className="text-slate-500">
                        {items.length} {copy.assets}
                      </span>
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                      <span
                        className={cn(
                          "font-semibold",
                          globalCapitalUsd !== null
                            ? "text-emerald-700"
                            : "text-slate-600",
                        )}
                      >
                        USD {Math.round(capitalUsd).toLocaleString()} / KRW{" "}
                        {Math.round(capitalKrw).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] font-medium tracking-[0.08em] text-slate-400">
                      * Rate: 1 USD = {exchangeRate.toFixed(1)} KRW (Daily Sync)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div className="text-right">
                    <p className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                      {copy.yield}
                    </p>
                    <p className="text-xl font-bold tabular-nums text-slate-700">
                      {getDY(p).toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 mb-1 group/ytip-card relative">
                      <p className="text-[11px] font-semibold tracking-[0.08em] text-emerald-700">
                        {copy.expectedTr}
                      </p>
                      <Info
                        size={10}
                        className="text-emerald-500 cursor-help"
                      />
                      <div className="absolute right-0 bottom-full z-50 mb-2 hidden w-56 rounded-xl border border-slate-200 bg-white p-3 text-[11px] font-medium leading-relaxed text-slate-600 shadow-lg group-hover/ytip-card:block animate-in fade-in zoom-in-95">
                        가중 평균 배당수익률과 자산군별 설정된 기대주가상승률을
                        합산한 총수익률입니다.
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-emerald-700">
                      {getTR(p).toFixed(2)}%
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => handleLoad(e, p)}
                      className="hidden items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-500 hover:text-white md:flex"
                    >
                      <Edit3 size={16} /> {copy.loadIntoDesigner}
                    </button>
                    <button
                      onClick={(e) =>
                        !p.is_system_default && handleDelete(e, p.id, p.name)
                      }
                      disabled={p.is_system_default}
                      className={cn(
                        "rounded-2xl p-3 transition-all",
                        p.is_system_default
                          ? "cursor-not-allowed text-slate-300 opacity-70"
                          : "text-slate-400 hover:bg-rose-50 hover:text-rose-600",
                      )}
                      title={
                        p.is_system_default
                          ? copy.cannotDeleteDefaultPortfolio
                          : copy.deletePortfolio
                      }
                    >
                      <Trash2 size={20} />
                    </button>
                    <div className="p-2 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp size={24} />
                      ) : (
                        <ChevronDown size={24} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Detailed View */}
              <div
                className={cn(
                  "portfolio-details overflow-hidden border-t border-slate-200 bg-slate-50/70 transition-all duration-500 ease-in-out",
                  isExpanded
                    ? "max-h-[2000px] opacity-100 p-8"
                    : "max-h-0 opacity-0",
                )}
              >
                <div className="space-y-6">
                  <h4 className="flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-slate-500">
                    <PieChart size={16} /> {copy.individualPerformance} (
                    {copy.basedOnCapital})
                  </h4>
                  <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-6 py-5 text-[11px] font-semibold tracking-[0.08em]">
                            {copy.ticker}
                          </th>
                          <th className="px-4 py-5 text-right text-[11px] font-semibold tracking-[0.08em]">
                            {copy.weight}
                          </th>
                          <th className="border-l border-slate-200 px-4 py-5 text-right text-[11px] font-semibold tracking-[0.08em] text-emerald-700">
                            {copy.annualUsd}
                          </th>
                          <th className="px-4 py-5 text-right text-[11px] font-semibold tracking-[0.08em] text-emerald-700">
                            {copy.annualKrw}
                          </th>
                          <th className="border-l border-slate-200 px-4 py-5 text-right text-[11px] font-semibold tracking-[0.08em] text-blue-700">
                            {copy.monthlyUsd}
                          </th>
                          <th className="px-6 py-5 text-right text-[11px] font-semibold tracking-[0.08em] text-blue-700">
                            {copy.monthlyKrw}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {items.map((item, idx) => {
                          const itemWeight = item.weight || 0;
                          const itemAlloc = capitalUsd * (itemWeight / 100);
                          const monthsCount = item.payment_months?.length || 0;
                          const itemPrice = item.price || 1;
                          const itemDivAmount = item.last_div_amount || 0;

                          const shares = itemAlloc / itemPrice;
                          const annualUsd =
                            shares * (itemDivAmount * monthsCount);
                          const annualKrw = annualUsd * exchangeRate;

                          return (
                            <tr
                              key={idx}
                              className="group transition-colors hover:bg-slate-50"
                            >
                              <td className="px-6 py-5 font-semibold text-slate-700">
                                <div className="flex flex-col">
                                  <span className="text-base font-bold text-emerald-700">
                                    {item.symbol || "Unknown"}
                                  </span>
                                  <span className="max-w-[150px] truncate text-xs text-slate-500">
                                    {item.name || "Untitled Asset"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-right font-semibold text-slate-600 group-hover:text-slate-700">
                                {itemWeight.toFixed(1)}%
                              </td>
                              <td className="border-l border-slate-200 px-4 py-5 text-right font-semibold text-slate-800">
                                $
                                {annualUsd.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-4 py-5 text-right font-medium text-slate-600">
                                ₩{Math.round(annualKrw).toLocaleString()}
                              </td>
                              <td className="border-l border-slate-200 px-4 py-5 text-right font-semibold text-emerald-700">
                                $
                                {(annualUsd / 12).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-6 py-5 text-right font-medium text-emerald-700">
                                ₩{Math.round(annualKrw / 12).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
