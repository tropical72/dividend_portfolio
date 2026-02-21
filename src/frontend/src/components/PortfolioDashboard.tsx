import { useState, useEffect, useMemo } from "react";
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
  RotateCcw
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from "recharts";
import { cn } from "../lib/utils";
import type { Portfolio } from "../types";

/** [REQ-PRT-06] 포트폴리오 대시보드 및 비교 탭 */
export function PortfolioDashboard({ onLoad }: { onLoad: (p: Portfolio) => void }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // 전역 시뮬레이션 상태 [REQ-PRT-06.3]
  const [globalCapitalUsd, setGlobalCapitalUsd] = useState<number | null>(null);
  const [globalCurrency, setGlobalCurrency] = useState<"USD" | "KRW">("USD");
  const [exchangeRate] = useState<number>(1425.5);

  // 데이터 로드
  useEffect(() => {
    fetch("http://localhost:8000/api/portfolios")
      .then(res => res.json())
      .then(res => {
        setPortfolios(res.data || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });

    // 기본 설정에서 초기값 가져오기
    fetch("http://localhost:8000/api/settings")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data?.default_capital) {
          const cap = res.data.default_capital;
          if (res.data.default_currency === "KRW") {
            setGlobalCapitalUsd(cap / 1425.5);
            setGlobalCurrency("KRW");
          } else {
            setGlobalCapitalUsd(cap);
            setGlobalCurrency("USD");
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

  /** 차트 데이터 계산 [REQ-PRT-06.4] */
  const chartData = useMemo(() => {
    const selectedPortfolios = portfolios.filter(p => selectedIds.has(p.id));
    if (selectedPortfolios.length === 0) return [];

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    
    return months.map(m => {
      const dataPoint: Record<string, string | number> = { name: `${m}월` };
      selectedPortfolios.forEach(p => {
        const capital = globalCapitalUsd ?? p.total_capital;
        const items = p.items || [];
        const monthlySum = items.reduce((sum, item) => {
          if (item.payment_months && item.payment_months.includes(m)) {
            const allocated = capital * (item.weight / 100);
            const shares = allocated / (item.price || 1);
            let amt = (shares * item.last_div_amount);
            if (globalCurrency === "KRW") amt *= exchangeRate;
            return sum + amt;
          }
          return sum;
        }, 0);
        dataPoint[p.name] = parseFloat(monthlySum.toFixed(globalCurrency === "KRW" ? 0 : 2));
      });
      return dataPoint;
    });
  }, [portfolios, selectedIds, globalCapitalUsd, globalCurrency, exchangeRate]);

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
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("포트폴리오를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/portfolios/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        setPortfolios(prev => prev.filter(p => p.id !== id));
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
    } catch (err) { console.error(err); }
  };

  if (isLoading) return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-[0.2em] animate-pulse">Synchronizing Data...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 1. Global Simulator [REQ-PRT-06.3] */}
      <div className="bg-slate-900/20 border border-slate-800 rounded-[2.5rem] p-8 mb-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-200 flex items-center gap-2 mb-1">
              <TrendingUp className="text-emerald-400" size={20} /> Global Simulator
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Override individual capital for all portfolios below</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative group min-w-[220px]">
              <input 
                type="text"
                placeholder="Global USD Capital"
                value={globalCapitalUsd ? Math.round(globalCapitalUsd).toLocaleString() : ""}
                onChange={(e) => handleGlobalUsdChange(e.target.value)}
                className={cn(
                  "w-full bg-slate-950/50 border border-slate-800 group-hover:border-slate-700 focus:border-emerald-500/50 rounded-2xl px-5 py-3 text-lg font-bold text-slate-100 outline-none transition-all",
                  globalCurrency === "USD" && globalCapitalUsd !== null && "ring-2 ring-emerald-500/20 border-emerald-500/40"
                )}
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">$</span>
            </div>
            <div className="relative group min-w-[220px]">
              <input 
                type="text"
                placeholder="Global KRW Capital"
                value={globalCapitalUsd ? Math.round(globalCapitalUsd * exchangeRate).toLocaleString() : ""}
                onChange={(e) => handleGlobalKrwChange(e.target.value)}
                className={cn(
                  "w-full bg-slate-950/50 border border-slate-800 group-hover:border-slate-700 focus:border-emerald-500/50 rounded-2xl px-5 py-3 text-lg font-bold text-slate-100 outline-none transition-all",
                  globalCurrency === "KRW" && globalCapitalUsd !== null && "ring-2 ring-emerald-500/20 border-emerald-500/40"
                )}
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 font-bold">₩</span>
            </div>
            {globalCapitalUsd !== null && (
              <button onClick={() => { setGlobalCapitalUsd(null); setGlobalCurrency("USD"); }} className="p-3 text-slate-500 hover:text-emerald-400 transition-colors"><RotateCcw size={20} /></button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Chart Area [REQ-PRT-06.4] */}
      {selectedIds.size > 0 && (
        <div className="comparison-chart-container bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-50 flex items-center gap-3 tracking-tight">
                <BarChart3 className="text-emerald-400" size={24} /> Monthly Dividend Comparison ({globalCurrency})
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 ml-9">Aggregated income across selected portfolios</p>
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">Clear Selection</button>
          </div>
          <div className="h-[400px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => globalCurrency === "USD" ? `$${val}` : `₩${(val/10000).toFixed(0)}만`} />
                <Tooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} formatter={(val) => [globalCurrency === "USD" ? `$${val.toLocaleString()}` : `₩${val.toLocaleString()}`, "Income"]} />
                <Legend wrapperStyle={{ paddingTop: '30px' }} iconType="circle" formatter={(value) => <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{value}</span>} />
                {portfolios.filter(p => selectedIds.has(p.id)).map((p, idx) => (
                  <Bar key={p.id} dataKey={p.name} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5]} radius={[6, 6, 0, 0]} barSize={selectedIds.size > 2 ? 15 : 30} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Portfolio List */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black text-slate-50 flex items-center gap-2"><PieChart className="text-emerald-400" /> Saved Portfolios</h2>
        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">Total {portfolios.length} Sets</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {portfolios.map((p) => {
          const isExpanded = expandedId === p.id;
          const isSelected = selectedIds.has(p.id);
          const capitalUsd = globalCapitalUsd ?? p.total_capital;
          const capitalKrw = capitalUsd * exchangeRate;
          const items = p.items || [];
          
          return (
            <div key={p.id} className={cn("portfolio-card group border transition-all duration-300 rounded-[2rem] overflow-hidden", isExpanded ? "bg-slate-900/60 border-emerald-500/30 shadow-2xl shadow-emerald-500/5" : "bg-slate-900/20 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30 cursor-pointer", isSelected && !isExpanded && "border-emerald-500/40 bg-emerald-500/[0.02]")} onClick={() => setExpandedId(isExpanded ? null : p.id)}>
              <div className="p-8 flex items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <button onClick={(e) => toggleSelect(e, p.id)} role="checkbox" aria-checked={isSelected} className={cn("p-2 rounded-xl transition-all", isSelected ? "text-emerald-400 bg-emerald-500/10" : "text-slate-700 hover:text-slate-500")}>
                    {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                  </button>
                                      <div>
                                        <div className="flex items-center gap-3 mb-1">
                                          <h3 className="text-xl font-black text-slate-50 tracking-tight">{p.name}</h3>
                                          <span className={cn(
                                            "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border transition-all duration-500",
                                            (p.account_type?.toLowerCase() === "pension") 
                                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
                                              : "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                          )}>
                                            {p.account_type || "Personal"} Account
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase tracking-widest">
                                          <span>{items.length} Assets</span>
                                          <div className="w-1 h-1 rounded-full bg-slate-700" />
                                          <span className={cn("font-black", globalCapitalUsd !== null ? "text-emerald-400" : "text-slate-400")}>
                                            USD {Math.round(capitalUsd).toLocaleString()} / KRW {Math.round(capitalKrw).toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <button onClick={(e) => handleLoad(e, p)} className="hidden md:flex items-center gap-2 px-5 py-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 text-sm font-black rounded-2xl transition-all border border-emerald-500/20"><Edit3 size={16} /> Load into Designer</button>
                                      <button onClick={(e) => handleDelete(e, p.id)} className="p-3 text-slate-700 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all"><Trash2 size={20} /></button>
                                      <div className="p-2 text-slate-600">{isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</div>
                                    </div>
                                  </div>
                  
                                  {/* 4. Detailed View [REQ-PRT-06.2] */}
                                  <div className={cn("portfolio-details overflow-hidden transition-all duration-500 ease-in-out border-t border-slate-800/50 bg-slate-950/40", isExpanded ? "max-h-[2000px] opacity-100 p-8" : "max-h-0 opacity-0")}>
                                    <div className="space-y-6">
                                      <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><PieChart size={16} /> Individual Asset Performance (Based on Simulation Capital)</h4>
                                      <div className="rounded-[2rem] border border-slate-800 overflow-hidden shadow-inner bg-slate-900/20">
                                        <table className="w-full text-left text-sm border-collapse">
                                          <thead className="bg-slate-800/40 text-slate-500 font-black uppercase tracking-widest">
                                            <tr>
                                              <th className="py-5 px-6">Ticker</th>
                                              <th className="py-5 px-4 text-right">Weight</th>
                                              <th className="py-5 px-4 text-right border-l border-slate-800/50 text-emerald-500/70">Annual (USD)</th>
                                              <th className="py-5 px-4 text-right text-emerald-500/70">Annual (KRW)</th>
                                              <th className="py-5 px-4 text-right border-l border-slate-800/50 text-blue-400/70">Monthly (USD)</th>
                                              <th className="py-5 px-6 text-right text-blue-400/70">Monthly (KRW)</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-800/30">
                                            {items.map((item, idx) => {
                                              const itemAlloc = capitalUsd * (item.weight / 100);
                                              const shares = itemAlloc / (item.price || 1);
                                              const annualUsd = shares * (item.last_div_amount * (item.payment_months?.length || 0));
                                              const annualKrw = annualUsd * exchangeRate;
                                              
                                              return (
                                                <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                                                  <td className="py-5 px-6 font-bold text-slate-200">
                                                    <div className="flex flex-col">
                                                      <span className="text-emerald-400 font-black text-base">{item.symbol}</span>
                                                      <span className="text-xs text-slate-500 truncate max-w-[150px]">{item.name}</span>
                                                    </div>
                                                  </td>
                                                  <td className="py-5 px-4 text-right font-black text-slate-400 group-hover:text-slate-200">{item.weight.toFixed(1)}%</td>
                                                  <td className="py-5 px-4 text-right border-l border-slate-800/50 font-black text-slate-100">${annualUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                  <td className="py-5 px-4 text-right font-bold text-slate-300">₩{Math.round(annualKrw).toLocaleString()}</td>
                                                  <td className="py-5 px-4 text-right border-l border-slate-800/50 font-black text-emerald-400">${(annualUsd/12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                  <td className="py-5 px-6 text-right font-bold text-emerald-500">₩{Math.round(annualKrw/12).toLocaleString()}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
