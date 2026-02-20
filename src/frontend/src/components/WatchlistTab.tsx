import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  ListTodo, 
  ChevronUp, 
  ChevronDown, 
  PlusCircle, 
  Trash2,
  Calendar,
  AlertTriangle,
  X
} from "lucide-react";
import { cn } from "../lib/utils";

/** 관심종목 데이터 구조 정의 [REQ-WCH-03.1, 03.2] */
interface Stock {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  dividend_yield: number;
  one_yr_return: number;
  ex_div_date: string;
  last_div_amount: number;
  last_div_yield: number;
  past_avg_monthly_div: number;
  dividend_frequency: string;
  payment_months: number[];
}

type SortConfig = {
  key: keyof Stock | null;
  direction: "asc" | "desc";
};

/**
 * 관심종목(Watchlist) 탭 컴포넌트
 * [REQ-WCH-02.5] 폴리싱: 모달, 자동 스크롤, 배당 주기 UI 포함
 */
export function WatchlistTab() {
  const [ticker, setTicker] = useState("");
  const [country, setCountry] = useState("US");
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // UI 상태 관리
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: "asc" });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, symbol: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ symbol: string, x: number, y: number } | null>(null);
  
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

  /** 종목 추가 핸들러 [REQ-WCH-02.2] 자동 스크롤 포함 */
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
        
        // 추가 후 자동 스크롤
        setTimeout(() => {
          tableEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        showStatus(result.message || "추가 실패", "error");
      }
    } catch (err) {
      showStatus("서버 통신 오류", "error");
    } finally {
      setIsAdding(false);
    }
  };

  /** 종목 삭제 핸들러 (커스텀 모달 연동) [REQ-WCH-02.4] */
  const removeStock = async () => {
    if (!deleteConfirm) return;
    const { symbol } = deleteConfirm;
    
    try {
      const res = await fetch(`http://localhost:8000/api/watchlist/${symbol}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        setWatchlist((prev) => prev.filter(item => item.symbol !== symbol));
        showStatus(result.message || "삭제 완료", "success");
      } else {
        showStatus(result.message || "삭제 실패", "error");
      }
    } catch (err) {
      showStatus("삭제 실패: 서버 오류", "error");
    } finally {
      setDeleteConfirm(null);
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
          status.type === "success" 
            ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20" 
            : "bg-red-500 text-white shadow-red-500/20"
        )}>
          {status.message}
        </div>
      )}

      {/* [MODIFIED] 커스텀 삭제 확인 모달 (마우스 좌표 기반 위치 조정) [REQ-WCH-02.4] */}
      {deleteConfirm && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/20 backdrop-blur-[1px] animate-in fade-in duration-200"
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="absolute bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-[280px] w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 slide-in-from-top-2 duration-200"
            style={{ 
              top: Math.min(window.innerHeight - 250, Math.max(50, deleteConfirm.y)), 
              left: Math.min(window.innerWidth - 300, Math.max(150, deleteConfirm.x)),
              transform: 'translate(-50%, -10%)' 
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
            <h3 className="text-base font-bold text-slate-50 mb-1">삭제하시겠습니까?</h3>
            <p className="text-slate-400 text-[11px] mb-5 leading-relaxed">
              <span className="text-red-400 font-bold">{deleteConfirm.symbol}</span> 종목을 제거합니다.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-bold rounded-xl transition-colors"
              >
                취소
              </button>
              <button 
                onClick={removeStock}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold rounded-xl transition-colors"
              >
                삭제
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
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
            onClick={() => showStatus("포트폴리오 기능은 다음 Phase에서 제공됩니다.", "error")}
          >
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
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <ListTodo className="text-emerald-400" /> Watchlist
        </h2>
        <div className="flex gap-3 p-2 bg-slate-800/50 border border-slate-700 rounded-xl">
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="px-2 text-sm bg-transparent border-none outline-none cursor-pointer">
            <option value="US">US</option>
            <option value="KR">KR</option>
          </select>
          <input type="text" placeholder="Enter Ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addStock()} className="w-32 text-sm bg-transparent border-none outline-none placeholder:text-slate-500" />
          <button onClick={addStock} disabled={isAdding} className="px-4 py-1.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-slate-950 rounded-lg transition-all cursor-pointer">
            {isAdding ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 shadow-inner">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-800/50 text-slate-400 font-bold whitespace-nowrap sticky top-0 z-10">
            <tr>
              <th className="px-4 py-5 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("symbol")}>
                <div className="flex items-center gap-1 uppercase tracking-wider text-[10px]">Ticker <SortIcon columnKey="symbol" /></div>
              </th>
              <th className="px-4 py-5 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1 uppercase tracking-wider text-[10px]">Name <SortIcon columnKey="name" /></div>
              </th>
              <th className="px-4 py-5 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("price")}>
                <div className="flex items-center gap-1 uppercase tracking-wider text-[10px]">Price <SortIcon columnKey="price" /></div>
              </th>
              <th className="px-4 py-5 text-right cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("dividend_yield")}>
                <div className="flex items-center justify-end gap-1 uppercase tracking-wider text-[10px]">Yield <SortIcon columnKey="dividend_yield" /></div>
              </th>
              {/* [NEW] 배당 주기 컬럼 [REQ-WCH-03.2] */}
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
                className="hover:bg-slate-800/30 transition-colors group cursor-default"
                onContextMenu={(e) => onContextMenu(e, item.symbol)}
              >
                <td className="px-4 py-4 font-bold text-emerald-400 tracking-tight">{item.symbol}</td>
                <td className="px-4 py-4 text-slate-300 truncate max-w-[120px]" title={item.name}>{item.name}</td>
                <td className="px-4 py-4 text-slate-100 whitespace-nowrap font-medium">
                  <span className="text-[10px] text-slate-500 mr-1">{item.currency || "USD"}</span>
                  {(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-4 text-right text-emerald-400 font-bold">{(item.dividend_yield || 0).toFixed(2)}%</td>
                
                {/* [NEW] 배당 주기/월 데이터 바인딩 */}
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      item.dividend_frequency === "Monthly" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                    )}>
                      {item.dividend_frequency || "-"}
                    </span>
                    {item.payment_months && item.payment_months.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {item.payment_months.map(m => (
                          <span key={m} className="w-3 h-3 flex items-center justify-center bg-slate-800 text-[8px] rounded-sm text-slate-500">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                <td className={cn("px-4 py-4 text-right font-medium", (item.one_yr_return || 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {(item.one_yr_return || 0) >= 0 ? "+" : ""}{(item.one_yr_return || 0).toFixed(2)}%
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs">
                    <Calendar size={12} className="text-slate-600" />
                    {item.ex_div_date || "-"}
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-slate-100 font-medium">{(item.last_div_amount || 0).toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-emerald-400 font-bold text-base bg-emerald-500/5">
                  {(item.past_avg_monthly_div || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {sortedWatchlist.length === 0 && (
              <tr><td colSpan={10} className="px-6 py-20 text-center text-slate-600">
                <div className="flex flex-col items-center gap-3">
                  <ListTodo size={40} className="text-slate-800" />
                  <p className="italic">관심종목이 비어 있습니다. 새로운 티커를 추가해 보세요.</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
