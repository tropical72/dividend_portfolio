import React, { useState, useEffect, useMemo } from "react";
import { 
  ListTodo, 
  ChevronUp, 
  ChevronDown, 
  MoreVertical, 
  PlusCircle, 
  Trash2 
} from "lucide-react";
import { cn } from "../lib/utils";

/** 관심종목 데이터 구조 정의 [REQ-WCH-03.1] */
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
}

type SortConfig = {
  key: keyof Stock | null;
  direction: "asc" | "desc";
};

/**
 * 관심종목(Watchlist) 탭 컴포넌트
 * [REQ-WCH-01.2] 컨텍스트 메뉴, [REQ-WCH-03.3] 정렬 기능 포함
 */
export function WatchlistTab() {
  const [ticker, setTicker] = useState("");
  const [country, setCountry] = useState("US");
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // [NEW] 정렬 상태 관리
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: "asc" });
  
  // [NEW] 컨텍스트 메뉴 상태 관리
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, symbol: string } | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    fetch("http://localhost:8000/api/watchlist")
      .then((res) => res.json())
      .then((res) => setWatchlist(res.data || []))
      .catch(console.error);
  }, []);

  // [NEW] 우클릭 메뉴 닫기용 전역 클릭 핸들러
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

  /** 정렬 핸들러 [REQ-WCH-03.3] */
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
      } else {
        showStatus(result.message || "추가 실패", "error");
      }
    } catch (err) {
      showStatus("서버 통신 오류", "error");
    } finally {
      setIsAdding(false);
    }
  };

  /** 종목 삭제 핸들러 (UI 연동) */
  const removeStock = async (symbol: string) => {
    if (!confirm(`${symbol} 종목을 삭제하시겠습니까?`)) return;
    
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
    }
  };

  /** 컨텍스트 메뉴 이벤트 핸들러 [REQ-WCH-01.2] */
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
          "absolute -top-4 right-0 px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 z-50",
          status.type === "success" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
        )}>
          {status.message}
        </div>
      )}

      {/* [NEW] 컨텍스트 메뉴 레이어 */}
      {contextMenu && (
        <div 
          className="fixed bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 z-[100] min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
            onClick={() => showStatus("포트폴리오 기능은 다음 Phase에서 제공됩니다.", "error")}
          >
            <PlusCircle size={16} /> Add to Portfolio
          </button>
          <div className="h-px bg-slate-800 my-1" />
          <button 
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            onClick={() => removeStock(contextMenu.symbol)}
          >
            <Trash2 size={16} /> Delete Stock
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

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400 font-medium whitespace-nowrap">
            <tr>
              <th className="px-4 py-4 cursor-pointer hover:bg-slate-700/50 transition-colors group" onClick={() => handleSort("symbol")}>
                <div className="flex items-center gap-1">Ticker <SortIcon columnKey="symbol" /></div>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">Name <SortIcon columnKey="name" /></div>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("price")}>
                <div className="flex items-center gap-1">Price <SortIcon columnKey="price" /></div>
              </th>
              <th className="px-4 py-4 text-right cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("dividend_yield")}>
                <div className="flex items-center justify-end gap-1">Yield <SortIcon columnKey="dividend_yield" /></div>
              </th>
              <th className="px-4 py-4 text-right cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("one_yr_return")}>
                <div className="flex items-center justify-end gap-1">1-Yr Rtn <SortIcon columnKey="one_yr_return" /></div>
              </th>
              <th className="px-4 py-4 text-center cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("ex_div_date")}>
                <div className="flex items-center justify-center gap-1">Ex-Div <SortIcon columnKey="ex_div_date" /></div>
              </th>
              <th className="px-4 py-4 text-right cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("last_div_amount")}>
                <div className="flex items-center justify-end gap-1">Last Amt <SortIcon columnKey="last_div_amount" /></div>
              </th>
              <th className="px-4 py-4 text-right cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort("last_div_yield")}>
                <div className="flex items-center justify-end gap-1">L.Yield <SortIcon columnKey="last_div_yield" /></div>
              </th>
              <th className="px-4 py-4 text-right cursor-pointer hover:bg-slate-700/50 transition-colors font-bold" onClick={() => handleSort("past_avg_monthly_div")}>
                <div className="flex items-center justify-end gap-1">Monthly <SortIcon columnKey="past_avg_monthly_div" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedWatchlist.map((item) => (
              <tr 
                key={item.symbol} 
                className="hover:bg-slate-800/30 transition-colors group cursor-default"
                onContextMenu={(e) => onContextMenu(e, item.symbol)}
              >
                <td className="px-4 py-4 font-bold text-emerald-400">{item.symbol}</td>
                <td className="px-4 py-4 text-slate-300 truncate max-w-[100px]" title={item.name}>{item.name}</td>
                <td className="px-4 py-4 text-slate-100 whitespace-nowrap">{item.currency || "USD"} {(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-4 text-right text-emerald-400">{(item.dividend_yield || 0).toFixed(2)}%</td>
                <td className={cn("px-4 py-4 text-right", (item.one_yr_return || 0) >= 0 ? "text-emerald-400" : "text-red-400")}>{(item.one_yr_return || 0).toFixed(2)}%</td>
                <td className="px-4 py-4 text-center text-slate-400 text-xs">{item.ex_div_date || "-"}</td>
                <td className="px-4 py-4 text-right text-slate-100">{(item.last_div_amount || 0).toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-slate-300">{(item.last_div_yield || 0).toFixed(2)}%</td>
                <td className="px-4 py-4 text-right text-emerald-400 font-bold">{(item.past_avg_monthly_div || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {sortedWatchlist.length === 0 && (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500 italic">No stocks added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
