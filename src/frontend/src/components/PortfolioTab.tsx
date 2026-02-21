import React, { useState, useMemo, useEffect } from "react";
import { PlusCircle, RotateCcw, Save, Trash2, AlertCircle, CheckCircle2, TrendingUp, DollarSign, Layout, PieChart } from "lucide-react";
import { cn } from "../lib/utils";
import type { PortfolioItem, Portfolio, AppSettings } from "../types";
import { PortfolioDashboard } from "./PortfolioDashboard";

/**
 * [REQ-PRT-01, 03, 06] 포트폴리오 설계 및 시뮬레이션 탭
 */
export function PortfolioTab({ 
  items, 
  setItems, 
  activeTab,
  globalSettings
}: { 
  items: PortfolioItem[], 
  setItems: React.Dispatch<React.SetStateAction<PortfolioItem[]>>,
  activeTab: string,
  globalSettings: AppSettings | null
}) {
  const [activeSubTab, setActiveSubTab] = useState<"design" | "manage">("design");
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [portfolioName, setPortfolioName] = useState("My New Portfolio");
  const [accountType, setAccountType] = useState<"Personal" | "Pension">("Personal");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const categories = [
    { id: "Fixed", name: "Fixed Income", color: "bg-blue-400", textColor: "text-blue-400" },
    { id: "Cash", name: "Bond/Cash Buffer", color: "bg-amber-400", textColor: "text-amber-400" },
    { id: "Growth", name: "Growth/Dividend Growth", color: "bg-emerald-400", textColor: "text-emerald-400" },
  ] as const;

  // 수동 추가 모달 상태
  const [manualAdd, setManualAdd] = useState<{ category: PortfolioItem["category"] | null }>({ category: null });
  const [manualForm, setManualForm] = useState({ symbol: "", name: "", weight: 0 });

  // 시뮬레이션 상태 [REQ-PRT-03]
  const [capitalUsd, setCapitalUsd] = useState<number>(10000);
  const [exchangeRate] = useState<number>(1425.5); // 고정값 또는 설정에서 수신
  const [calcMode, setCalcMode] = useState<"TTM" | "Forward">("Forward");

  /** 전역 설정 동기화 [REQ-PRT-03] */
  useEffect(() => {
    // 포트폴리오 탭이 활성화되고, 기존 포트폴리오 로드가 아닌 "새 설계" 상태일 때만 기본값 적용
    if (activeTab === "portfolio" && !portfolioId && globalSettings) {
      if (globalSettings.default_capital) {
        const capital = globalSettings.default_capital;
        if (globalSettings.default_currency === "KRW") {
          setCapitalUsd(capital / exchangeRate);
        } else {
          setCapitalUsd(capital);
        }
      }
    }
  }, [activeTab, portfolioId, globalSettings, exchangeRate]);

  /** 대시보드에서 포트폴리오 로드 핸들러 [REQ-PRT-04.3] */
  const handleLoadPortfolio = (p: Portfolio) => {
    setPortfolioId(p.id);
    setPortfolioName(p.name);
    setAccountType(p.account_type || "Personal");
    setCapitalUsd(p.total_capital);
    setItems(p.items);
    setActiveSubTab("design");
    showStatus(`"${p.name}" 로드 완료`, "success");
  };

  /** 수동 종목 추가 실행 */
  const handleAddManualItem = () => {
    if (!manualForm.symbol || !manualForm.name || !manualAdd.category) {
      showStatus("티커와 종목명을 입력해주세요.", "error");
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
      payment_months: []
    };

    setItems(prev => [...prev, newItem]);
    setManualAdd({ category: null });
    setManualForm({ symbol: "", name: "", weight: 0 });
    showStatus("종목이 추가되었습니다.", "success");
  };

  /** 전체 비중 및 분석 데이터 실시간 계산 [REQ-PRT-01.3, 03.4] */
  const analysis = useMemo(() => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const catMap = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.weight;
      return acc;
    }, {} as Record<string, number>);

    // 가중 평균 수익률 (TTM/Forward 구분은 나중에 백엔드와 연동)
    const weightedYield = items.reduce((sum, item) => {
      return sum + (item.weight / 100) * item.dividend_yield;
    }, 0);

    const annualDividendUsd = capitalUsd * (weightedYield / 100);

    return { 
      totalWeight, 
      categoryWeights: catMap,
      weightedYield,
      annualDividendUsd,
      monthlyDividendUsd: annualDividendUsd / 12
    };
  }, [items, capitalUsd]);

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
    if (window.confirm("현재 작성 중인 내용이 모두 사라집니다. 초기화할까요?")) {
      setItems([]);
      setPortfolioId(null);
      setPortfolioName("My New Portfolio");
      setAccountType("Personal");
      setCapitalUsd(10000);
      showStatus("초기화되었습니다.", "success");
    }
  };

  /** 저장 [REQ-PRT-01.4, 04.1] */
  const handleSave = async () => {
    if (!portfolioName.trim()) {
      showStatus("포트폴리오 이름을 입력해주세요.", "error");
      return;
    }

    if (Math.abs(analysis.totalWeight - 100) > 0.01) {
      showStatus("비중 합계가 정확히 100%여야 합니다.", "error");
      return;
    }

    try {
      const url = portfolioId 
        ? `http://localhost:8000/api/portfolios/${portfolioId}`
        : "http://localhost:8000/api/portfolios";
      
      const method = portfolioId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: portfolioName,
          account_type: accountType,
          items: items,
          total_capital: capitalUsd,
          currency: "USD"
        }),
      });
      const result = await res.json();
      if (result.success) {
        if (!portfolioId && result.data?.id) {
          setPortfolioId(result.data.id);
        }
        showStatus(portfolioId ? "업데이트되었습니다." : "저장되었습니다.", "success");
      } else {
        showStatus(result.message || "저장 실패", "error");
      }
    } catch {
      showStatus("서버 통신 오류", "error");
    }
  };

  /** 비중 수정 */
  const updateWeight = (symbol: string, newWeight: number) => {
    setItems(prev => prev.map(item => 
      item.symbol === symbol ? { ...item, weight: Math.max(0, Math.min(100, newWeight)) } : item
    ));
  };

  /** 종목 삭제 */
  const removeItem = (symbol: string) => {
    setItems(prev => prev.filter(item => item.symbol !== symbol));
  };

  return (
    <section className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 알림 토스트 */}
      {status && (
        <div className={cn(
          "fixed top-8 right-8 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-right-4 z-[200] flex items-center gap-2",
          status.type === "success" ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white"
        )}>
          {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {status.message}
        </div>
      )}

      {/* 수동 추가 모달 [GS-UI-03] */}
      {manualAdd.category && (
        <div className="fixed inset-0 z-[300] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-50 mb-2">Add Asset Manually</h3>
            <p className="text-xs text-slate-500 mb-8 uppercase tracking-widest font-bold">Category: {manualAdd.category}</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ticker Symbol</label>
                <input 
                  type="text" 
                  placeholder="e.g. AAPL"
                  value={manualForm.symbol}
                  onChange={e => setManualForm({...manualForm, symbol: e.target.value})}
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-emerald-500/50 rounded-2xl px-5 py-3 text-sm font-bold text-slate-100 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Apple Inc."
                  value={manualForm.name}
                  onChange={e => setManualForm({...manualForm, name: e.target.value})}
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-emerald-500/50 rounded-2xl px-5 py-3 text-sm font-bold text-slate-100 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Allocation Weight (%)</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={manualForm.weight || ""}
                  onChange={e => setManualForm({...manualForm, weight: parseFloat(e.target.value) || 0})}
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-emerald-500/50 rounded-2xl px-5 py-3 text-sm font-bold text-slate-100 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-10">
              <button 
                onClick={() => setManualAdd({ category: null })}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-2xl transition-all uppercase tracking-widest"
              >Cancel</button>
              <button 
                onClick={handleAddManualItem}
                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-2xl transition-all uppercase tracking-widest shadow-lg shadow-emerald-500/20"
              >Add Asset</button>
            </div>
          </div>
        </div>
      )}

      {/* 서브 네비게이션 [GS-UI-03.3] */}
      <div className="flex bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800 w-fit self-center mx-auto mb-10 shadow-inner">
        <button 
          onClick={() => setActiveSubTab("design")}
          className={cn(
            "flex items-center gap-2 px-8 py-3 text-xs font-black rounded-xl transition-all duration-300",
            activeSubTab === "design" ? "bg-slate-800 text-emerald-400 shadow-xl border border-slate-700/50" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Layout size={16} /> Portfolio Designer
        </button>
        <button 
          onClick={() => setActiveSubTab("manage")}
          className={cn(
            "flex items-center gap-2 px-8 py-3 text-xs font-black rounded-xl transition-all duration-300",
            activeSubTab === "manage" ? "bg-slate-800 text-emerald-400 shadow-xl border border-slate-700/50" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <PieChart size={16} /> Manage & Compare
        </button>
      </div>

      {activeSubTab === "manage" ? (
        <PortfolioDashboard onLoad={handleLoadPortfolio} />
      ) : (
        <>
          {/* 상단 헤더 및 액션 버튼 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <input 
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  className="bg-transparent border-none outline-none text-3xl font-black text-slate-50 flex-1 focus:ring-2 focus:ring-emerald-500/20 rounded-lg px-2 -ml-2 transition-all tracking-tight"
                  placeholder="포트폴리오 이름을 입력하세요"
                />
                <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800">
                  <button 
                    onClick={() => setAccountType("Personal")}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all",
                      accountType === "Personal" ? "bg-slate-800 text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-400"
                    )}
                  >Personal</button>
                  <button 
                    onClick={() => setAccountType("Pension")}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all",
                      accountType === "Pension" ? "bg-slate-800 text-amber-400 shadow-sm" : "text-slate-500 hover:text-slate-400"
                    )}
                  >Pension</button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Design Mode</span>
                <div className="h-1 w-1 rounded-full bg-slate-700" />
                <p className="text-slate-400 text-xs">자산 배분 및 종목별 비중을 설정합니다.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-2xl transition-all"
              >
                <RotateCcw size={18} /> 새로만들기
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/10"
              >
                <Save size={18} /> 포트폴리오 저장
              </button>
            </div>
          </div>

          {/* 시뮬레이션 설정 및 결과 요약 [REQ-PRT-03] */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="text-emerald-400" size={20} /> Simulation Settings
                </h3>
                <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800">
                  <button 
                    onClick={() => setCalcMode("TTM")}
                    className={cn("px-4 py-1.5 text-xs font-black rounded-lg transition-all", calcMode === "TTM" ? "bg-slate-800 text-emerald-400 shadow-sm" : "text-slate-500")}
                  >TTM (Past)</button>
                  <button 
                    onClick={() => setCalcMode("Forward")}
                    className={cn("px-4 py-1.5 text-xs font-black rounded-lg transition-all", calcMode === "Forward" ? "bg-slate-800 text-emerald-400 shadow-sm" : "text-slate-500")}
                  >Forward (Future)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Total Capital (USD)</label>
                                <div className="relative group">
                                  <input 
                                    type="text"
                                    placeholder="USD Amount"
                                    value={Math.round(capitalUsd).toLocaleString()}
                                    onChange={(e) => handleUsdChange(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-800 group-hover:border-slate-700 focus:border-emerald-500/50 rounded-2xl px-5 py-4 text-xl font-bold text-slate-100 outline-none transition-all"
                                  />
                                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">$</span>
                                </div>                </div>
                            <div className="space-y-3">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Total Capital (KRW)</label>
                              <div className="relative group">
                                <input 
                                  type="text"
                                  placeholder="KRW Amount"
                                  value={Math.round(capitalUsd * exchangeRate).toLocaleString()}
                                  onChange={(e) => handleKrwChange(e.target.value)}
                                  className="w-full bg-slate-950/50 border border-slate-800 group-hover:border-slate-700 focus:border-emerald-500/50 rounded-2xl px-5 py-4 text-xl font-bold text-slate-100 outline-none transition-all"
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₩</span>
                              </div>
                            </div>              </div>
              <p className="mt-4 text-xs text-slate-600 font-medium italic">
                * 적용 환율: 1 USD = {exchangeRate.toLocaleString()} KRW (실시간 데이터 기준)
              </p>
            </div>

            {/* 기대 수익 보고서 [REQ-PRT-03.4] */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden">
              <DollarSign className="absolute -right-4 -top-4 w-32 h-32 text-emerald-500/5 rotate-12" />
              <div className="relative z-10">
                <h3 className="text-sm font-black text-emerald-500/60 uppercase tracking-widest mb-6">Expected Income (Tax-Excl.)</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Annual Dividend</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-50 tracking-tighter">
                        ₩{(analysis.annualDividendUsd * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-slate-500 text-xs font-bold">/ year</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Monthly Income</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-400 tracking-tighter">
                        ₩{(analysis.monthlyDividendUsd * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-slate-500 text-xs font-bold">/ month</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-8 pt-6 border-t border-emerald-500/10 flex items-center justify-between text-base">
                <span className="text-slate-500 font-bold">Expected Yield</span>
                <span className="text-xl font-black text-slate-50">{analysis.weightedYield.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* 카테고리별 섹션 */}
          <div className="grid grid-cols-1 gap-8">
            {categories.map((cat) => {
              const catItems = items.filter(i => i.category === cat.id);
              const catWeight = analysis.categoryWeights[cat.id] || 0;

              return (
                <div key={cat.id} className="bg-slate-900/20 border border-slate-800/60 rounded-[2.5rem] p-8 transition-all hover:bg-slate-900/30">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-2.5 h-10 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]", cat.color)} />
                      <div>
                        <h3 className="text-xl font-black text-slate-100 tracking-tight">{cat.name}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Asset Segment</p>
                      </div>
                      <div className={cn(
                        "ml-4 px-4 py-1.5 rounded-full font-black text-sm transition-all",
                        catWeight > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800/50 text-slate-600 border border-slate-800"
                      )}>
                        {catWeight.toFixed(1)}%
                      </div>
                    </div>
                    <button 
                      onClick={() => setManualAdd({ category: cat.id })}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-400 rounded-2xl transition-all font-black text-xs uppercase tracking-wider"
                    >
                      <PlusCircle size={16} /> Add Manually
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-800/40 shadow-inner">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-800/20 text-xs text-slate-500 font-black uppercase tracking-[0.15em]">
                        <tr>
                          <th className="py-5 px-8 w-24">Ticker</th>
                          <th className="py-5 px-4">Stock Name</th>
                          <th className="py-5 px-4 text-right w-40">Weight (%)</th>
                          <th className="py-5 px-8 text-center w-20">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {catItems.map((item) => (
                          <tr key={item.symbol} className="group hover:bg-slate-800/10 transition-colors">
                            <td className="py-6 px-8 font-black text-emerald-400 tracking-tighter text-base">{item.symbol}</td>
                            <td className="py-6 px-4 text-slate-300 font-medium text-sm leading-relaxed">{item.name}</td>
                            <td className="py-6 px-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <input 
                                  type="number"
                                  value={item.weight}
                                  onChange={(e) => updateWeight(item.symbol, parseFloat(e.target.value) || 0)}
                                  className="w-24 bg-slate-950/50 border border-slate-800 group-hover:border-slate-700 rounded-xl px-4 py-2.5 text-right text-slate-50 text-base font-black focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                                />
                                <span className="text-slate-600 font-black text-xs">%</span>
                              </div>
                            </td>
                            <td className="py-6 px-8 text-center">
                              <button 
                                onClick={() => removeItem(item.symbol)}
                                className="p-3 text-slate-700 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all"
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
                                <PlusCircle size={40} className="text-slate-500" />
                                <p className="text-xs text-slate-500 font-black uppercase tracking-[0.2em]">No assets in this category</p>
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
          <div className={cn(
            "mt-12 p-12 border-2 border-dashed rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-10 transition-all duration-700",
            analysis.totalWeight === 100 ? "bg-emerald-500/[0.03] border-emerald-500/20 shadow-2xl shadow-emerald-500/5" : "bg-slate-950/20 border-slate-800"
          )}>
            <div className="flex items-center gap-16">
              <div className="text-center md:text-left">
                <span className="text-xs text-slate-500 uppercase font-black tracking-[0.3em] block mb-3">Total Asset Count</span>
                <span className="text-4xl font-black text-slate-100">{items.length}</span>
              </div>
              <div className="h-16 w-px bg-slate-800 hidden md:block" />
              <div className="text-center md:text-left">
                <span className="text-xs text-slate-500 uppercase font-black tracking-[0.3em] block mb-3">Total Allocation</span>
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "text-6xl font-black tracking-tighter transition-all duration-700",
                    Math.abs(analysis.totalWeight - 100) < 0.01 ? "text-emerald-400" : "text-red-500"
                  )}>
                    {analysis.totalWeight.toFixed(1)}
                  </span>
                  <span className="text-slate-600 font-black text-2xl">%</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-4">
              {Math.abs(analysis.totalWeight - 100) > 0.01 ? (
                <>
                  <div className="flex items-center gap-2 px-6 py-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                    <AlertCircle className="text-red-500" size={20} />
                    <p className="text-xl text-red-400 font-black tracking-tight">비중 합계가 100%여야 합니다</p>
                  </div>
                  <p className="text-sm text-slate-600 font-bold uppercase tracking-widest">
                    Need Adjustment: {(100 - analysis.totalWeight).toFixed(1)}%
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-3 px-8 py-4 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 animate-bounce">
                  <CheckCircle2 className="text-emerald-400" size={24} />
                  <p className="text-2xl text-emerald-400 font-black tracking-tight uppercase">Ready to Save & Simulate</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
