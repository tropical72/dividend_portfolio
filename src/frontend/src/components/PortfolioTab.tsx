import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  PlusCircle,
  RotateCcw,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Layout,
  PieChart,
  Edit3,
  Plus,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";
import type {
  AccountType,
  AppSettings,
  Portfolio,
  PortfolioCategory,
  PortfolioItem,
} from "../types";
import { PortfolioDashboard } from "./PortfolioDashboard";

/**
 * [REQ-PRT-01, 03, 06, REQ-GLB-13] 포트폴리오 설계 및 시뮬레이션 탭
 */
export function PortfolioTab({
  items,
  setItems,
  activeTab,
  globalSettings,
  accountType,
  setAccountType,
}: {
  items: PortfolioItem[];
  setItems: React.Dispatch<React.SetStateAction<PortfolioItem[]>>;
  activeTab: string;
  globalSettings: AppSettings | null;
  accountType: AccountType;
  setAccountType: React.Dispatch<React.SetStateAction<AccountType>>;
}) {
  const { isKorean } = useI18n();
  const copy = isKorean
    ? {
        defaultName: "새 포트폴리오",
        loaded: "로드 완료",
        inputTickerAndName: "티커와 종목명을 입력해주세요.",
        itemAdded: "종목이 추가되었습니다.",
        resetConfirm: "현재 작성 중인 내용이 모두 사라집니다. 초기화할까요?",
        resetDone: "초기화되었습니다.",
        addItemsFirst: "종목을 먼저 추가해주세요.",
        nameRequired: "포트폴리오 이름을 입력해주세요.",
        weightMustBe100: "비중 합계가 정확히 100%여야 합니다.",
        updated: "업데이트되었습니다.",
        savedNew: "새 포트폴리오로 저장되었습니다.",
        saveFailed: "저장 실패",
        serverError: "서버 통신 오류",
        manualAddTitle: "자산 직접 추가",
        category: "카테고리",
        tickerSymbol: "티커",
        stockName: "종목명",
        allocationWeight: "비중 (%)",
        cancel: "취소",
        addAsset: "자산 추가",
        portfolioDesigner: "포트폴리오 설계",
        manageCompare: "관리 및 비교",
        designMode: "설계 모드",
        designDescription:
          "계좌 타입별 4단 전략 카테고리로 자산 배분과 우선순위를 설계합니다.",
        reset: "새로만들기",
        savePortfolio: "포트폴리오 저장",
        simulationSettings: "시뮬레이션 설정",
        totalCapitalUsd: "총 투자금 (USD)",
        totalCapitalKrw: "총 투자금 (KRW)",
        usdAmount: "USD 금액",
        krwAmount: "KRW 금액",
        dailySync: "실시간 반영",
        expectedIncome: "예상 현금흐름 (세전)",
        annualDividend: "연간 배당금",
        monthlyIncome: "월 현금흐름",
        perYear: "/ 연",
        perMonth: "/ 월",
        expectedYield: "배당수익률",
        expectedTr: "TR",
        pa: "기대주가상승률",
        addManually: "직접 추가",
        ticker: "티커",
        action: "작업",
        noAssets: "이 카테고리에 자산이 없습니다",
        totalAssetCount: "총 종목 수",
        totalAllocation: "총 비중",
        weightNeed100: "비중 합계가 100%여야 합니다",
        needAdjustment: "추가 조정 필요",
        readyToSave: "저장 및 시뮬레이션 준비 완료",
        savePortfolioTitle: "포트폴리오 저장",
        savePortfolioSubtitle: "이름을 확인하고 저장하세요",
        portfolioName: "포트폴리오 이름",
        saveAsCopy: "사본으로 저장",
        saveAsCopyDesc: "다른 이름으로 새 항목 저장",
        confirmSave: "저장하기",
        corporate: "법인",
        pension: "연금",
      }
    : {
        defaultName: "My New Portfolio",
        loaded: "loaded",
        inputTickerAndName: "Enter both ticker and stock name.",
        itemAdded: "Asset added.",
        resetConfirm:
          "This will remove everything in the current design. Reset now?",
        resetDone: "Reset complete.",
        addItemsFirst: "Add assets first.",
        nameRequired: "Enter a portfolio name.",
        weightMustBe100: "Total allocation must be exactly 100%.",
        updated: "Updated.",
        savedNew: "Saved as a new portfolio.",
        saveFailed: "Save failed",
        serverError: "Server communication error",
        manualAddTitle: "Add Asset Manually",
        category: "Category",
        tickerSymbol: "Ticker Symbol",
        stockName: "Stock Name",
        allocationWeight: "Allocation Weight (%)",
        cancel: "Cancel",
        addAsset: "Add Asset",
        portfolioDesigner: "Portfolio Designer",
        manageCompare: "Manage & Compare",
        designMode: "Design Mode",
        designDescription:
          "Design allocation and priority using the four strategic categories for each account type.",
        reset: "Reset",
        savePortfolio: "Save Portfolio",
        simulationSettings: "Simulation Settings",
        totalCapitalUsd: "Total Capital (USD)",
        totalCapitalKrw: "Total Capital (KRW)",
        usdAmount: "USD Amount",
        krwAmount: "KRW Amount",
        dailySync: "Daily Sync",
        expectedIncome: "Expected Income (Tax-Excl.)",
        annualDividend: "Annual Dividend",
        monthlyIncome: "Monthly Income",
        perYear: "/ year",
        perMonth: "/ month",
        expectedYield: "Dividend Yield",
        expectedTr: "TR",
        pa: "Appreciation",
        addManually: "Add Manually",
        ticker: "Ticker",
        action: "Action",
        noAssets: "No assets in this category",
        totalAssetCount: "Total Asset Count",
        totalAllocation: "Total Allocation",
        weightNeed100: "Total allocation must equal 100%",
        needAdjustment: "Need Adjustment",
        readyToSave: "Ready to Save & Simulate",
        savePortfolioTitle: "Save Portfolio",
        savePortfolioSubtitle: "Review the name and save",
        portfolioName: "Portfolio Name",
        saveAsCopy: "Save as Copy",
        saveAsCopyDesc: "Save as a new item with a different name",
        confirmSave: "Save",
        corporate: "Corporate",
        pension: "Pension",
      };
  const [activeSubTab, setActiveSubTab] = useState<"design" | "manage">(
    "design",
  );
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [portfolioName, setPortfolioName] = useState(copy.defaultName);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const getCategoryPA = useCallback(
    (catId: PortfolioCategory) => {
      if (!globalSettings?.appreciation_rates) return 0;
      const rates = globalSettings.appreciation_rates;
      switch (catId) {
        case "SGOV Buffer":
          return rates.cash_sgov;
        case "High Income":
        case "Bond Buffer":
          return rates.fixed_income;
        case "Dividend Growth":
          return rates.dividend_stocks;
        case "Growth Engine":
          return rates.growth_stocks;
        default:
          return 0;
      }
    },
    [globalSettings],
  );

  const categories = useMemo(
    () =>
      accountType === "Corporate"
        ? [
            {
              id: "SGOV Buffer" as PortfolioCategory,
              name: "SGOV Buffer",
              subtitle: "1st Priority",
              description: "생존 버퍼와 생활비 대기 자산",
              color: "bg-blue-400",
            },
            {
              id: "High Income" as PortfolioCategory,
              name: "High Income",
              subtitle: "2nd Priority",
              description: "고인컴 현금흐름 보강 블록",
              color: "bg-amber-400",
            },
            {
              id: "Dividend Growth" as PortfolioCategory,
              name: "Dividend Growth",
              subtitle: "3rd Priority",
              description: "배당성장 자산으로 중간 보강",
              color: "bg-emerald-400",
            },
            {
              id: "Growth Engine" as PortfolioCategory,
              name: "Growth Engine",
              subtitle: "4th Priority",
              description: "최후의 순간까지 보호할 성장 엔진",
              color: "bg-fuchsia-400",
            },
          ]
        : [
            {
              id: "SGOV Buffer" as PortfolioCategory,
              name: "SGOV Buffer",
              subtitle: "1st Priority",
              description: "연금 인출의 단기 현금 버퍼",
              color: "bg-blue-400",
            },
            {
              id: "Bond Buffer" as PortfolioCategory,
              name: "Bond Buffer",
              subtitle: "2nd Priority",
              description: "중기 완충 채권 블록",
              color: "bg-amber-400",
            },
            {
              id: "Dividend Growth" as PortfolioCategory,
              name: "Dividend Growth",
              subtitle: "3rd Priority",
              description: "배당성장 자산으로 버퍼 보강",
              color: "bg-emerald-400",
            },
            {
              id: "Growth Engine" as PortfolioCategory,
              name: "Growth Engine",
              subtitle: "4th Priority",
              description: "Phase 3에서만 건드릴 장기 성장 엔진",
              color: "bg-fuchsia-400",
            },
          ],
    [accountType],
  );

  // 수동 추가 모달 상태
  const [manualAdd, setManualAdd] = useState<{
    category: PortfolioItem["category"] | null;
  }>({ category: null });
  const [manualForm, setManualForm] = useState({
    symbol: "",
    name: "",
    weight: 0,
  });

  // 시뮬레이션 상태 [REQ-PRT-03]
  const [capitalUsd, setCapitalUsd] = useState<number>(10000);
  const [exchangeRate, setExchangeRate] = useState<number>(1425.5);
  const [calcMode, setCalcMode] = useState<"TTM" | "Forward">("Forward");

  // 저장 모달 상태 [NEW]
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [tempPortfolioName, setTempPortfolioName] = useState(portfolioName);
  const [saveAsNew, setSaveAsNew] = useState(false);

  /** 전역 설정 동기화 [REQ-PRT-03] */
  useEffect(() => {
    if (globalSettings) {
      const currentRate = globalSettings.current_exchange_rate || 1425.5;
      setExchangeRate(currentRate);

      // 포트폴리오 탭이 활성화되고, 기존 포트폴리오 로드가 아닌 "새 설계" 상태일 때만 기본값 적용
      if (activeTab === "portfolio" && !portfolioId) {
        if (globalSettings.default_capital) {
          const capital = globalSettings.default_capital;
          if (globalSettings.default_currency === "KRW") {
            setCapitalUsd(capital / currentRate);
          } else {
            setCapitalUsd(capital);
          }
        }
      }
    }
  }, [activeTab, portfolioId, globalSettings]);

  /** 대시보드에서 포트폴리오 로드 핸들러 [REQ-PRT-04.3] */
  const handleLoadPortfolio = (p: Portfolio) => {
    setPortfolioId(p.id);
    setPortfolioName(p.name);
    setAccountType(p.account_type || "Corporate");
    setCapitalUsd(p.total_capital);
    setItems(p.items);
    setActiveSubTab("design");
    showStatus(`"${p.name}" ${copy.loaded}`, "success");
  };

  /** 수동 종목 추가 실행 */
  const handleAddManualItem = () => {
    if (!manualForm.symbol || !manualForm.name || !manualAdd.category) {
      showStatus(copy.inputTickerAndName, "error");
      return;
    }

    const newItem: PortfolioItem = {
      symbol: manualForm.symbol.toUpperCase(),
      name: manualForm.name,
      category: manualAdd.category,
      weight: manualForm.weight,
      price: 100, // 기본값
      dividend_yield: 0,
      last_div_amount: 0,
      payment_months: [],
    };

    setItems((prev) => [...prev, newItem]);
    setManualAdd({ category: null });
    setManualForm({ symbol: "", name: "", weight: 0 });
    showStatus(copy.itemAdded, "success");
  };

  /** 전체 비중 및 분석 데이터 실시간 계산 [REQ-PRT-01.3, 03.4] */
  const analysis = useMemo(() => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const catMap = items.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.weight;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 가중 평균 배당률 (DY)
    const weightedYield = items.reduce((sum, item) => {
      return sum + (item.weight / 100) * (item.dividend_yield || 0);
    }, 0);

    // [REQ-GLB-13] 자산군별 가중 평균 TR 계산
    const weightedReturn = items.reduce((sum, item) => {
      const pa = getCategoryPA(item.category);
      return sum + (item.weight / 100) * ((item.dividend_yield || 0) + pa);
    }, 0);

    const annualDividendUsd = capitalUsd * (weightedYield / 100);

    return {
      totalWeight,
      categoryWeights: catMap,
      weightedYield,
      weightedReturn,
      annualDividendUsd,
      monthlyDividendUsd: annualDividendUsd / 12,
    };
  }, [items, capitalUsd, globalSettings, getCategoryPA]);

  /** 통화별 입력 핸들러 [REQ-PRT-03.1, 03.2] */
  const handleUsdChange = (val: string) => {
    const cleanVal = val.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const num = parseFloat(cleanVal) || 0;
    setCapitalUsd(num);
  };

  const handleKrwChange = (val: string) => {
    const cleanVal = val.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const num = parseFloat(cleanVal) || 0;
    setCapitalUsd(num / exchangeRate);
  };

  /** 알림 표시 */
  const showStatus = (message: string, type: "success" | "error") => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 3000);
  };

  /** 초기화 (새로만들기) [REQ-PRT-01.5] */
  const handleReset = () => {
    if (window.confirm(copy.resetConfirm)) {
      setItems([]);
      setPortfolioId(null);
      setPortfolioName(copy.defaultName);
      setTempPortfolioName(copy.defaultName);
      setAccountType("Corporate");
      setCapitalUsd(10000);
      showStatus(copy.resetDone, "success");
    }
  };

  /** 저장 버튼 클릭 (모달 열기) */
  const handleSaveClick = () => {
    if (!items.length) {
      showStatus(copy.addItemsFirst, "error");
      return;
    }
    setTempPortfolioName(portfolioName);
    setSaveAsNew(false);
    setIsSaveModalOpen(true);
  };

  /** 저장 실행 [REQ-PRT-01.4, 04.1] */
  const handleSaveExec = async () => {
    if (!tempPortfolioName.trim()) {
      showStatus(copy.nameRequired, "error");
      return;
    }

    if (Math.abs(analysis.totalWeight - 100) > 0.01) {
      showStatus(copy.weightMustBe100, "error");
      return;
    }

    const isUpdating = portfolioId && !saveAsNew;

    try {
      const url = isUpdating
        ? `http://localhost:8000/api/portfolios/${portfolioId}`
        : "http://localhost:8000/api/portfolios";

      const method = isUpdating ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tempPortfolioName,
          account_type: accountType,
          items: items,
          total_capital: capitalUsd,
          currency: "USD",
        }),
      });
      const result = await res.json();
      if (result.success) {
        if (!isUpdating && result.data?.id) {
          setPortfolioId(result.data.id);
        }
        setPortfolioName(tempPortfolioName);
        showStatus(isUpdating ? copy.updated : copy.savedNew, "success");
        setIsSaveModalOpen(false);
        setSaveAsNew(false);
      } else {
        showStatus(result.message || copy.saveFailed, "error");
      }
    } catch {
      showStatus(copy.serverError, "error");
    }
  };

  /** 비중 수정 */
  const updateWeight = (symbol: string, newWeight: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.symbol === symbol
          ? { ...item, weight: Math.max(0, Math.min(100, newWeight)) }
          : item,
      ),
    );
  };

  /** 종목 삭제 */
  const removeItem = (symbol: string) => {
    setItems((prev) => prev.filter((item) => item.symbol !== symbol));
  };

  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        if (accountType === "Corporate" && item.category === "Bond Buffer") {
          return { ...item, category: "High Income" as PortfolioCategory };
        }
        if (accountType === "Pension" && item.category === "High Income") {
          return { ...item, category: "Bond Buffer" as PortfolioCategory };
        }
        return item;
      }),
    );
    setManualAdd({ category: null });
  }, [accountType, setItems]);

  return (
    <section className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 알림 토스트 */}
      {status && (
        <div
          className={cn(
            "fixed top-8 right-8 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-right-4 z-[200] flex items-center gap-2",
            status.type === "success"
              ? "bg-emerald-500 text-slate-950"
              : "bg-red-500 text-white",
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

      {/* 수동 추가 모달 [GS-UI-03] */}
      {manualAdd.category && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/18 p-6 backdrop-blur-sm animate-in fade-in duration-200"
          data-testid="manual-add-modal"
        >
          <div className="w-full max-w-md rounded-[2.5rem] border border-white/80 bg-white/95 p-10 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-2 text-xl font-bold text-slate-800">
              {copy.manualAddTitle}
            </h3>
            <p className="mb-8 text-xs font-semibold tracking-[0.08em] text-slate-500">
              {copy.category}: {manualAdd.category}
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="ml-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                  {copy.tickerSymbol}
                </label>
                <input
                  type="text"
                  placeholder="e.g. AAPL"
                  value={manualForm.symbol}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, symbol: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-emerald-300"
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                  {copy.stockName}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apple Inc."
                  value={manualForm.name}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, name: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-emerald-300"
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                  {copy.allocationWeight}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={manualForm.weight || ""}
                  onChange={(e) =>
                    setManualForm({
                      ...manualForm,
                      weight: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-emerald-300"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-10">
              <button
                onClick={() => setManualAdd({ category: null })}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-4 text-xs font-semibold tracking-[0.08em] text-slate-600 transition-all hover:bg-slate-100"
              >
                {copy.cancel}
              </button>
              <button
                onClick={handleAddManualItem}
                className="flex-1 rounded-2xl bg-emerald-500 py-4 text-xs font-semibold tracking-[0.08em] text-white shadow-sm transition-all hover:bg-emerald-600"
              >
                {copy.addAsset}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 서브 네비게이션 [GS-UI-03.3] */}
      <div className="mx-auto mb-10 flex w-fit self-center rounded-2xl border border-slate-200 bg-white/86 p-2 shadow-sm">
        <button
          onClick={() => setActiveSubTab("design")}
          data-testid="portfolio-subtab-design"
          className={cn(
            "flex items-center gap-3 rounded-xl px-10 py-4 text-sm font-semibold transition-all duration-300",
            activeSubTab === "design"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
          )}
        >
          <Layout size={20} /> {copy.portfolioDesigner}
        </button>
        <button
          onClick={() => setActiveSubTab("manage")}
          data-testid="portfolio-subtab-dashboard"
          className={cn(
            "flex items-center gap-3 rounded-xl px-10 py-4 text-sm font-semibold transition-all duration-300",
            activeSubTab === "manage"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
          )}
        >
          <PieChart size={20} /> {copy.manageCompare}
        </button>
      </div>

      {activeSubTab === "manage" ? (
        <PortfolioDashboard onLoad={handleLoadPortfolio} />
      ) : (
        <>
          {/* 상단 헤더 및 액션 버튼 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-2">
                <div className="relative flex-1 group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                    <Edit3 size={20} />
                  </div>
                  <input
                    type="text"
                    value={portfolioName}
                    onChange={(e) => setPortfolioName(e.target.value)}
                    data-testid="portfolio-name-input"
                    className="w-full rounded-2xl border border-white/80 bg-white/85 py-3 pl-12 pr-4 text-3xl font-bold tracking-tight text-slate-800 outline-none transition-all focus:border-emerald-300 focus:bg-white"
                    placeholder={copy.nameRequired}
                  />
                </div>

                <div className="flex w-fit rounded-2xl border border-slate-200 bg-white/88 p-1.5 shadow-sm">
                  <button
                    onClick={() => setAccountType("Corporate")}
                    data-testid="portfolio-account-corporate"
                    className={cn(
                      "rounded-xl px-6 py-2.5 text-sm font-semibold transition-all",
                      accountType === "Corporate"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                    )}
                  >
                    {copy.corporate}
                  </button>
                  <button
                    onClick={() => setAccountType("Pension")}
                    data-testid="portfolio-account-pension"
                    className={cn(
                      "rounded-xl px-6 py-2.5 text-sm font-semibold transition-all",
                      accountType === "Pension"
                        ? "border border-amber-200 bg-amber-50 text-amber-700 shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                    )}
                  >
                    {copy.pension}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                  {copy.designMode}
                </span>
                <div className="h-1 w-1 rounded-full bg-slate-700" />
                <p className="text-slate-400 text-xs">
                  {copy.designDescription}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100"
              >
                <RotateCcw size={18} /> {copy.reset}
              </button>
              <button
                onClick={handleSaveClick}
                data-testid="portfolio-save-button"
                className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-600"
              >
                <Save size={18} /> {copy.savePortfolio}
              </button>
            </div>
          </div>

          {/* 시뮬레이션 설정 및 결과 요약 [REQ-PRT-03] */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-[2.5rem] border border-white/80 bg-white/78 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <TrendingUp className="text-emerald-600" size={20} />{" "}
                  {copy.simulationSettings}
                </h3>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
                  <button
                    onClick={() => setCalcMode("TTM")}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all",
                      calcMode === "TTM"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500",
                    )}
                  >
                    TTM (Past)
                  </button>
                  <button
                    onClick={() => setCalcMode("Forward")}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all",
                      calcMode === "Forward"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500",
                    )}
                  >
                    Forward (Future)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="ml-1 text-xs font-semibold tracking-[0.08em] text-slate-500">
                    {copy.totalCapitalUsd}
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder={copy.usdAmount}
                      value={Math.round(capitalUsd).toLocaleString()}
                      onChange={(e) => handleUsdChange(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xl font-semibold text-slate-800 outline-none transition-all focus:border-emerald-300"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                      $
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="ml-1 text-xs font-semibold tracking-[0.08em] text-slate-500">
                    {copy.totalCapitalKrw}
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder={copy.krwAmount}
                      value={Math.round(
                        capitalUsd * exchangeRate,
                      ).toLocaleString()}
                      onChange={(e) => handleKrwChange(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xl font-semibold text-slate-800 outline-none transition-all focus:border-emerald-300"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                      ₩
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-600 font-medium italic uppercase tracking-tighter">
                * Rate: 1 USD = {exchangeRate.toFixed(1)} KRW ({copy.dailySync})
              </p>
            </div>

            {/* 기대 수익 보고서 [REQ-PRT-03.4] */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-emerald-100 bg-emerald-50/75 p-8 shadow-sm">
              <DollarSign className="absolute -right-4 -top-4 w-32 h-32 text-emerald-500/5 rotate-12" />
              <div className="relative z-10">
                <h3 className="mb-6 text-sm font-semibold tracking-[0.08em] text-emerald-700">
                  {copy.expectedIncome}
                </h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                      {copy.annualDividend}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black tracking-tighter text-slate-800">
                        ₩
                        {(
                          analysis.annualDividendUsd * exchangeRate
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {copy.perYear}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                      {copy.monthlyIncome}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black tracking-tighter text-emerald-700">
                        ₩
                        {(
                          analysis.monthlyDividendUsd * exchangeRate
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {copy.perMonth}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-8 space-y-3 border-t border-emerald-100 pt-6">
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-slate-500">
                    {copy.expectedYield}
                  </span>
                  <span className="text-xl font-black text-slate-800">
                    {analysis.weightedYield.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-slate-500">
                    {copy.expectedTr}
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    {analysis.weightedReturn.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 카테고리별 섹션 */}
          <div className="grid grid-cols-1 gap-8">
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat.id);
              const catWeight = analysis.categoryWeights[cat.id] || 0;

              // 카테고리별 DY (가중 평균)
              const catDY =
                catWeight > 0
                  ? catItems.reduce(
                      (sum, i) =>
                        sum + (i.weight / catWeight) * i.dividend_yield,
                      0,
                    )
                  : 0;
              const catPA = getCategoryPA(cat.id);
              const catTR = catDY + catPA;

              return (
                <div
                  key={cat.id}
                  className="rounded-[2.5rem] border border-white/80 bg-white/74 p-8 shadow-sm transition-all hover:bg-white/86"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-2.5 h-10 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]",
                          cat.color,
                        )}
                      />
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-slate-800">
                          {cat.name}
                        </h3>
                        <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">
                          {cat.subtitle}
                        </p>
                      </div>

                      <div className="ml-6 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 shadow-sm lg:flex">
                        <div className="flex flex-col items-center border-r border-slate-200 px-3">
                          <span className="mb-0.5 text-[9px] font-semibold tracking-[0.08em] text-slate-500">
                            {copy.expectedYield}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {catDY.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex flex-col items-center border-r border-slate-200 px-3">
                          <span className="mb-0.5 text-[9px] font-semibold tracking-[0.08em] text-slate-500">
                            {copy.pa}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {catPA.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex flex-col items-center px-3">
                          <span className="mb-0.5 text-[9px] font-semibold tracking-[0.08em] text-emerald-700">
                            {copy.expectedTr}
                          </span>
                          <span className="text-sm font-black text-emerald-700">
                            {catTR.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "ml-4 px-4 py-1.5 rounded-full font-black text-sm transition-all",
                          catWeight > 0
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-slate-200 bg-slate-50 text-slate-500",
                        )}
                      >
                        {catWeight.toFixed(1)}%
                      </div>
                    </div>
                    <button
                      onClick={() => setManualAdd({ category: cat.id })}
                      className="self-start rounded-2xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-semibold tracking-[0.08em] text-slate-500 transition-all hover:bg-emerald-50 hover:text-emerald-700 md:self-center"
                    >
                      <PlusCircle size={16} /> {copy.addManually}
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-xs font-semibold tracking-[0.08em] text-slate-500">
                        <tr>
                          <th className="py-5 px-8 w-24">{copy.ticker}</th>
                          <th className="py-5 px-4">{copy.stockName}</th>
                          <th className="py-5 px-4 text-right w-40">
                            Weight (%)
                          </th>
                          <th className="py-5 px-8 text-center w-20">
                            {copy.action}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80">
                        {catItems.map((item) => (
                          <tr
                            key={item.symbol}
                            className="group transition-colors hover:bg-slate-50"
                          >
                            <td className="px-8 py-6 text-base font-black tracking-tighter text-emerald-700">
                              {item.symbol}
                            </td>
                            <td className="px-4 py-6 text-sm font-medium leading-relaxed text-slate-700">
                              {item.name}
                            </td>
                            <td className="py-6 px-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <input
                                  type="number"
                                  value={item.weight}
                                  onChange={(e) =>
                                    updateWeight(
                                      item.symbol,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="w-24 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-right text-base font-semibold text-slate-800 outline-none transition-all focus:border-emerald-300"
                                />
                                <span className="text-xs font-semibold text-slate-500">
                                  %
                                </span>
                              </div>
                            </td>
                            <td className="py-6 px-8 text-center">
                              <button
                                onClick={() => removeItem(item.symbol)}
                                className="rounded-2xl p-3 text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 size={20} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {catItems.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-20 text-center">
                              <div className="flex flex-col items-center gap-3 opacity-20">
                                <PlusCircle
                                  size={40}
                                  className="text-slate-500"
                                />
                                <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">
                                  {copy.noAssets}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 최종 검증 푸터 [REQ-PRT-01.4, 01.5] */}
          <div
            className={cn(
              "mt-12 p-12 border-2 border-dashed rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-10 transition-all duration-700",
              analysis.totalWeight === 100
                ? "bg-emerald-50/80 border-emerald-200 shadow-sm"
                : "bg-white/68 border-slate-300",
            )}
          >
            <div className="flex items-center gap-16">
              <div className="text-center md:text-left">
                <span className="mb-3 block text-xs font-semibold tracking-[0.08em] text-slate-500">
                  {copy.totalAssetCount}
                </span>
                <span className="text-4xl font-black text-slate-800">
                  {items.length}
                </span>
              </div>
              <div className="hidden h-16 w-px bg-slate-200 md:block" />
              <div className="text-center md:text-left">
                <span className="mb-3 block text-xs font-semibold tracking-[0.08em] text-slate-500">
                  {copy.totalAllocation}
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-6xl font-black tracking-tighter transition-all duration-700",
                      Math.abs(analysis.totalWeight - 100) < 0.01
                        ? "text-emerald-400"
                        : "text-red-500",
                    )}
                  >
                    {analysis.totalWeight.toFixed(1)}
                  </span>
                  <span className="text-2xl font-black text-slate-500">%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-4">
              {Math.abs(analysis.totalWeight - 100) > 0.01 ? (
                <>
                  <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-3">
                    <AlertCircle className="text-red-500" size={20} />
                    <p className="text-xl font-black tracking-tight text-rose-700">
                      {copy.weightNeed100}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tracking-[0.08em] text-slate-500">
                    {copy.needAdjustment}:{" "}
                    {(100 - analysis.totalWeight).toFixed(1)}%
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-[2rem] border border-emerald-200 bg-emerald-50 px-8 py-4">
                  <CheckCircle2 className="text-emerald-700" size={24} />
                  <p className="text-2xl font-black tracking-tight text-emerald-700">
                    {copy.readyToSave}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {/* 저장 확인 모달 [REQ-PRT-04.1] */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/18 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md space-y-8 rounded-[3rem] border border-white/80 bg-white/96 p-10 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <Save className="text-emerald-700" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-800">
                  {copy.savePortfolioTitle}
                </h3>
                <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">
                  {copy.savePortfolioSubtitle}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="ml-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                {copy.portfolioName}
              </label>
              <input
                type="text"
                value={tempPortfolioName}
                onChange={(e) => setTempPortfolioName(e.target.value)}
                autoFocus
                className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 text-lg font-semibold text-slate-800 outline-none transition-all focus:border-emerald-300"
                placeholder={copy.portfolioName}
                onKeyDown={(e) => e.key === "Enter" && handleSaveExec()}
              />
            </div>

            {portfolioId && (
              <div
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                  saveAsNew
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300",
                )}
                onClick={() => setSaveAsNew(!saveAsNew)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      saveAsNew
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-slate-500 group-hover:text-slate-700",
                    )}
                  >
                    <Plus size={16} strokeWidth={4} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                      {copy.saveAsCopy}
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      {copy.saveAsCopyDesc}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    saveAsNew
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-slate-300",
                  )}
                >
                  {saveAsNew && (
                    <CheckCircle2
                      size={12}
                      className="text-slate-950"
                      strokeWidth={4}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-4 font-semibold text-slate-600 transition-all hover:bg-slate-100"
              >
                {copy.cancel}
              </button>
              <button
                onClick={handleSaveExec}
                className="flex-1 rounded-2xl bg-emerald-500 py-4 font-semibold text-white transition-all hover:bg-emerald-600 shadow-sm"
              >
                {copy.confirmSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
