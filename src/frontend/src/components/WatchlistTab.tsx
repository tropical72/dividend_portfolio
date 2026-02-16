import React, { useState, useEffect } from "react";
import { ListTodo } from "lucide-react";
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

/**
 * 관심종목(Watchlist) 탭 컴포넌트
 * 필수 9개 컬럼을 안전하게 렌더링하며 종목 추가 기능을 제공합니다.
 */
export function WatchlistTab() {
  const [ticker, setTicker] = useState("");
  const [country, setCountry] = useState("US");
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    fetch("http://localhost:8000/api/watchlist")
      .then((res) => res.json())
      .then((res) => setWatchlist(res.data || []))
      .catch(console.error);
  }, []);

  /** 알림 메시지 표시 */
  const showStatus = (message: string, type: "success" | "error") => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 3000);
  };

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
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="relative space-y-6">
      {/* 알림 토스트 */}
      {status && (
        <div className={cn(
          "absolute -top-4 right-0 px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2",
          status.type === "success" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
        )}>
          {status.message}
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
              <th className="px-4 py-4">Ticker</th>
              <th className="px-4 py-4">Name</th>
              <th className="px-4 py-4">Price</th>
              <th className="px-4 py-4 text-right">Yield</th>
              <th className="px-4 py-4 text-right">1-Yr Rtn</th>
              <th className="px-4 py-4 text-center">Ex-Div</th>
              <th className="px-4 py-4 text-right">Last Amt</th>
              <th className="px-4 py-4 text-right">L.Yield</th>
              <th className="px-4 py-4 text-right">Monthly</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {watchlist.map((item) => (
              <tr key={item.symbol} className="hover:bg-slate-800/30 transition-colors">
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
            {watchlist.length === 0 && (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500 italic">No stocks added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
