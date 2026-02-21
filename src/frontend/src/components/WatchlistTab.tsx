import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  ListTodo, 
  ChevronUp, 
  ChevronDown, 
  PlusCircle, 
  Trash2,
  Calendar,
  AlertTriangle,
  X,
  CheckSquare,
  Square
} from "lucide-react";
import { cn } from "../lib/utils";
import type { Stock } from "../types";

type SortConfig = {
  key: keyof Stock | null;
  direction: "asc" | "desc";
};

/**
 * 관심종목(Watchlist) 탭 컴포넌트
 * [REQ-WCH-01.6] 다중 선택 및 일괄 삭제 기능 포함
 */
export function WatchlistTab({ onAddToPortfolio }: { onAddToPortfolio: (stocks: Stock[], category: "Fixed" | "Cash" | "Growth") => void }) {
  const [ticker, setTicker] = useState("");
  const [country, setCountry] = useState("US");
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // UI 및 선택 상태 관리
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: "asc" });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, symbol: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ symbol: string, x: number, y: number } | null>(null);
  const [addConfirm, setAddConfirm] = useState<{ symbols: string[], x: number, y: number } | null>(null);
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());
  
  // 자동 스크롤용 Ref
  const tableEndRef = useRef<HTMLTableRowElement>(null);

  // 초기 데이터 로드
  useEffect(() => {
    fetch("http://localhost:8000/api/watchlist")
      .then((res) => res.json())
      .then((res) => setWatchlist(res.data || []))
      .catch(console.error);
  }, []);

  // 우클릭 메뉴 닫기용 전역 클릭 핸들러
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  /** 알림 메시지 표시 */
  const showStatus = (message: string, type: "success" | "error") => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 3000);
  };

  /** 정렬 핸들러 */
  const handleSort = (key: keyof Stock) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  /** 정렬된 데이터 계산 */
  const sortedWatchlist = useMemo(() => {
    if (!sortConfig.key) return watchlist;
    
    return [...watchlist].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [watchlist, sortConfig]);

  /** 종목 추가 핸들러 */
  const addStock = async () => {
    if (!ticker) return;
    setIsAdding(true);
    try {
      const res = await fetch("http://localhost:8000/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, country }),
      });
      const result = await res.json();
      if (result.success) {
        setWatchlist((prev) => [...prev, result.data]);
        setTicker("");
        showStatus(result.message || "추가 완료", "success");
        setTimeout(() => {
          tableEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        showStatus(result.message || "추가 실패", "error");
      }
    } catch {
      showStatus("서버 통신 오류", "error");
    } finally {
      setIsAdding(false);
    }
  };

  /** 종목 삭제 핸들러 (일괄 삭제 지원) */
  const removeStock = async () => {
    if (!deleteConfirm) return;
    const { symbol } = deleteConfirm;
    const targets = symbol === "BULK" ? Array.from(selectedSymbols) : [symbol];
    
    try {
      await Promise.all(targets.map(t => 
        fetch(`http://localhost:8000/api/watchlist/${t}`, { method: "DELETE" })
      ));
      
      setWatchlist((prev) => prev.filter(item => !targets.includes(item.symbol)));
      setSelectedSymbols(new Set());
      showStatus(`${targets.length}개 종목 삭제 완료`, "success");
    } catch {
      showStatus("삭제 중 오류가 발생했습니다.", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  /** 다중 선택 핸들러 */
  const toggleSelect = (symbol: string) => {
    const next = new Set(selectedSymbols);
    if (next.has(symbol)) next.delete(symbol);
    else next.add(symbol);
    setSelectedSymbols(next);
  };

  const toggleSelectAll = () => {
    if (selectedSymbols.size === watchlist.length && watchlist.length > 0) {
      setSelectedSymbols(new Set());
    } else {
      setSelectedSymbols(new Set(watchlist.map(s => s.symbol)));
    }
  };

  /** 컨텍스트 메뉴 이벤트 핸들러 */
  const onContextMenu = (e: React.MouseEvent, symbol: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, symbol });
  };

  /** 정렬 아이콘 렌더러 */
  const SortIcon = ({ columnKey }: { columnKey: keyof Stock }) => {
    if (sortConfig.key !== columnKey) return <div className="w-4" />;
    return sortConfig.direction === "asc" ? <ChevronUp size={14} className="text-emerald-400" /> : <ChevronDown size={14} className="text-emerald-400" />;
  };

  return (
    <section className="relative space-y-6">
      {/* 알림 토스트 */}
      {status && (
        <div className={cn(
          "fixed top-8 right-8 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-right-4 z-[200]",
          status.type === "success" ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white"
        )}>
          {status.message}
        </div>
      )}

      {/* 커스텀 삭제 확인 모달 [D-02] - 마우스 옆에 즉시 노출 */}
      {deleteConfirm && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/10 backdrop-blur-[1px] animate-in fade-in duration-200"
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="fixed bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-[260px] w-full shadow-[0_25px_50px_rgba(0,0,0,0.6)] animate-in zoom-in-95 slide-in-from-top-1 duration-150"
            style={{ 
              top: Math.min(window.innerHeight - 240, deleteConfirm.y + 10), 
              left: Math.min(window.innerWidth - 270, deleteConfirm.x + 10),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <AlertTriangle className="text-red-500 w-4 h-4" />
              </div>
              <button onClick={() => setDeleteConfirm(null)} className="p-1 text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            <h3 className="text-base font-bold text-slate-50 mb-1">
              {deleteConfirm.symbol === "BULK" ? `${selectedSymbols.size}개 삭제` : "삭제하시겠습니까?"}
            </h3>
            <p className="text-slate-400 text-[11px] mb-5 leading-relaxed">
              {deleteConfirm.symbol === "BULK" 
                ? "선택한 항목을 모두 제거합니다." 
                : <><span className="text-red-400 font-bold">{deleteConfirm.symbol}</span> 종목을 제거합니다.</>}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-bold rounded-xl transition-colors">취소</button>
              <button onClick={removeStock} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold rounded-xl transition-colors">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 선택 모달 [REQ-PRT-02.1] */}
      {addConfirm && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/10 backdrop-blur-[1px] animate-in fade-in duration-200"
          onClick={() => setAddConfirm(null)}
        >
          <div 
            className="fixed bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-[260px] w-full shadow-[0_25px_50px_rgba(0,0,0,0.6)] animate-in zoom-in-95 slide-in-from-top-1 duration-150"
            style={{ 
              top: Math.min(window.innerHeight - 280, addConfirm.y), 
              left: Math.min(window.innerWidth - 270, addConfirm.x - 130),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <PlusCircle className="text-emerald-500 w-4 h-4" />
              </div>
              <button onClick={() => setAddConfirm(null)} className="p-1 text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            <h3 className="text-base font-bold text-slate-50 mb-1">Select Category</h3>
            <p className="text-slate-400 text-[10px] mb-4">어느 카테고리에 추가하시겠습니까?</p>
            
            <div className="space-y-2">
              <button 
                onClick={() => {
                  const targetStocks = watchlist.filter(s => addConfirm.symbols.includes(s.symbol));
                  onAddToPortfolio(targetStocks, "Fixed");
                  setAddConfirm(null);
                  setSelectedSymbols(new Set());
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-blue-500/20 hover:text-blue-400 text-slate-300 text-xs font-bold rounded-xl transition-all text-left flex items-center gap-2"
              >
                <div className="w-1.5 h-3 bg-blue-400 rounded-full" /> Fixed Income
              </button>
              <button 
                onClick={() => {
                  const targetStocks = watchlist.filter(s => addConfirm.symbols.includes(s.symbol));
                  onAddToPortfolio(targetStocks, "Cash");
                  setAddConfirm(null);
                  setSelectedSymbols(new Set());
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-400 text-slate-300 text-xs font-bold rounded-xl transition-all text-left flex items-center gap-2"
              >
                <div className="w-1.5 h-3 bg-amber-400 rounded-full" /> Bond/Cash Buffer
              </button>
              <button 
                onClick={() => {
                  const targetStocks = watchlist.filter(s => addConfirm.symbols.includes(s.symbol));
                  onAddToPortfolio(targetStocks, "Growth");
                  setAddConfirm(null);
                  setSelectedSymbols(new Set());
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 text-xs font-bold rounded-xl transition-all text-left flex items-center gap-2"
              >
                <div className="w-1.5 h-3 bg-emerald-400 rounded-full" /> Growth/Dividend Growth
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div 
          className="fixed bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-[100] min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors" onClick={() => showStatus("포트폴리오 기능은 다음 Phase에서 제공됩니다.", "error")}>
            <PlusCircle size={18} /> Add to Portfolio
          </button>
          <div className="h-px bg-slate-800 mx-2 my-1" />
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors" 
            onClick={(e) => setDeleteConfirm({ symbol: contextMenu.symbol, x: e.clientX, y: e.clientY })}
          >
            <Trash2 size={18} /> Delete Stock
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <ListTodo className="text-emerald-400" /> Watchlist
          </h2>
          {selectedSymbols.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
              <button 
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAddConfirm({ 
                    symbols: Array.from(selectedSymbols), 
                    x: rect.left + rect.width / 2, 
                    y: rect.bottom + 10 
                  });
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all"
              >
                <PlusCircle size={14} /> Add to Portfolio ({selectedSymbols.size})
              </button>
              <button 
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDeleteConfirm({ symbol: "BULK", x: rect.left + rect.width / 2, y: rect.bottom + 10 });
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-2 bg-slate-800/50 border border-slate-700 rounded-xl">
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="px-2 text-sm bg-transparent border-none outline-none cursor-pointer text-slate-300">
            <option value="US" className="bg-slate-900">US</option>
            <option value="KR" className="bg-slate-900">KR</option>
          </select>
          <input type="text" placeholder="Enter Ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addStock()} className="w-32 text-sm bg-transparent border-none outline-none placeholder:text-slate-500 text-slate-200" />
          <button onClick={addStock} disabled={isAdding} className="px-4 py-1.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-slate-950 rounded-lg transition-all">
            {isAdding ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 shadow-inner">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-800/50 text-slate-400 font-bold whitespace-nowrap sticky top-0 z-10">
            <tr>
              <th className="px-4 py-5 w-10 text-center">
                <button 
                  onClick={toggleSelectAll} 
                  className="text-slate-500 hover:text-emerald-400 transition-colors"
                  role="checkbox"
                  aria-checked={selectedSymbols.size === watchlist.length && watchlist.length > 0}
                  aria-label="Select all stocks"
                >
                  {selectedSymbols.size === watchlist.length && watchlist.length > 0 ? <CheckSquare size={18} className="text-emerald-400" /> : <Square size={18} />}
                </button>
              </th>
              <th className="px-4 py-5 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("symbol")}>
                <div className="flex items-center gap-1 uppercase tracking-wider text-[10px]">Ticker <SortIcon columnKey="symbol" /></div>
              </th>
              <th className="px-4 py-5 cursor-pointer hover:bg-slate-700/50 transition-colors min-w-[180px]" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1 uppercase tracking-wider text-[10px]">Name <SortIcon columnKey="name" /></div>
              </th>
              <th className="px-4 py-5 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("price")}>
                <div className="flex items-center gap-1 uppercase tracking-wider text-[10px]">Price <SortIcon columnKey="price" /></div>
              </th>
              <th className="px-4 py-5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("dividend_yield")}>
                <div className="flex flex-col items-end leading-tight">
                  <div className="flex items-center justify-end gap-1 uppercase tracking-wider text-[10px]">Yield <SortIcon columnKey="dividend_yield" /></div>
                  <span className="text-[8px] opacity-60 font-normal mr-4">TTM</span>
                </div>
              </th>
              <th className="px-4 py-5 text-center cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("dividend_frequency")}>
                <div className="flex items-center justify-center gap-1 uppercase tracking-wider text-[10px]">Cycle <SortIcon columnKey="dividend_frequency" /></div>
              </th>
              <th className="px-4 py-5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("one_yr_return")}>
                <div className="flex items-center justify-end gap-1 uppercase tracking-wider text-[10px]">1-Yr Rtn <SortIcon columnKey="one_yr_return" /></div>
              </th>
              <th className="px-4 py-5 text-center cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("ex_div_date")}>
                <div className="flex items-center justify-center gap-1 uppercase tracking-wider text-[10px]">Ex-Div <SortIcon columnKey="ex_div_date" /></div>
              </th>
              <th className="px-4 py-5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("last_div_amount")}>
                <div className="flex items-center justify-end gap-1 uppercase tracking-wider text-[10px]">Last Amt <SortIcon columnKey="last_div_amount" /></div>
              </th>
              <th className="px-4 py-5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors font-bold" onClick={() => handleSort("past_avg_monthly_div")}>
                <div className="flex items-center justify-end gap-1 uppercase tracking-wider text-[10px] text-emerald-400">Monthly <SortIcon columnKey="past_avg_monthly_div" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedWatchlist.map((item, idx) => (
              <tr 
                key={item.symbol} 
                ref={idx === sortedWatchlist.length - 1 ? tableEndRef : null}
                className={cn(
                  "hover:bg-slate-800/30 transition-colors group cursor-default",
                  selectedSymbols.has(item.symbol) && "bg-emerald-500/5"
                )}
                onContextMenu={(e) => onContextMenu(e, item.symbol)}
                onClick={() => toggleSelect(item.symbol)}
              >
                <td className="px-4 py-4 text-center">
                  <div 
                    className={cn(
                      "transition-colors",
                      selectedSymbols.has(item.symbol) ? "text-emerald-400" : "text-slate-700 group-hover:text-slate-500"
                    )}
                    role="checkbox"
                    aria-checked={selectedSymbols.has(item.symbol)}
                  >
                    {selectedSymbols.has(item.symbol) ? <CheckSquare size={16} /> : <Square size={16} />}
                  </div>
                </td>
                <td className="px-4 py-4 font-bold text-emerald-400 tracking-tight">{item.symbol}</td>
                <td className="px-4 py-4 text-slate-300 whitespace-normal break-words line-clamp-2 min-w-[180px] text-xs leading-relaxed" title={item.name}>
                  {item.name}
                </td>
                <td className="px-4 py-4 text-slate-100 whitespace-nowrap font-medium">
                  {(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-[10px] text-slate-500 ml-1">{item.currency || "USD"}</span>
                </td>
                <td className="px-4 py-4 text-right text-emerald-400 font-bold">{(item.dividend_yield || 0).toFixed(2)}%</td>
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      !item.dividend_frequency.includes("(New)") && item.dividend_frequency !== "None" 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-slate-800 text-slate-400"
                    )}>
                      {item.dividend_frequency.replace(" (New)", "")}
                    </span>
                    {item.dividend_frequency.includes("(New)") && (
                      <span className="text-[9px] text-slate-500 font-medium leading-none">
                        (NEW)
                      </span>
                    )}
                  </div>
                </td>
                <td className={cn("px-4 py-4 text-right font-medium", (item.one_yr_return || 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {(item.one_yr_return || 0) >= 0 ? "+" : ""}{(item.one_yr_return || 0).toFixed(2)}%
                </td>
                <td className="px-4 py-4 text-center text-slate-400 text-xs">
                  <div className="flex items-center justify-center gap-1.5"><Calendar size={12} className="text-slate-600" />{item.ex_div_date || "-"}</div>
                </td>
                <td className="px-4 py-4 text-right text-slate-100 font-medium">
                  {(item.last_div_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-[9px] text-slate-500 ml-1">{item.currency || "USD"}</span>
                </td>
                <td className="px-4 py-4 text-right text-emerald-400 font-bold text-base bg-emerald-500/5">
                  {(item.past_avg_monthly_div || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-[10px] text-slate-500/70 ml-1 font-normal">{item.currency || "USD"}</span>
                </td>
              </tr>
            ))}
            {watchlist.length === 0 && (
              <tr><td colSpan={10} className="px-6 py-20 text-center text-slate-600 italic font-sans uppercase text-[10px] tracking-widest">No stocks added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
