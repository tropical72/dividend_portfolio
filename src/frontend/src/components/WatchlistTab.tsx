import React, { useState, useEffect } from "react";
import { ListTodo } from "lucide-react";
import { cn } from "../lib/utils";

/** 관심종목 데이터 구조 정의 */
interface Stock {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  dividend_yield: number;
}

/**
 * 관심종목(Watchlist) 탭 컴포넌트
 * 종목 추가 및 목록 표시 기능을 담당합니다.
 */
export function WatchlistTab() {
  const [ticker, setTicker] = useState("");
  const [country, setCountry] = useState("US");
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    fetch("http://localhost:8000/api/watchlist")
      .then((res) => res.json())
      .then((res) => setWatchlist(res.data || []))
      .catch(console.error);
  }, []);

  /** 알림 메시지를 표시하고 3초 후 삭제합니다. */
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
        showStatus(result.message || "종목이 추가되었습니다.", "success");
      } else {
        showStatus(result.message || "추가에 실패했습니다.", "error");
      }
    } catch (err) {
      showStatus("서버 통신 중 오류가 발생했습니다.", "error");
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="space-y-6 relative">
      {/* 상태 알림 메시지 (애니메이션 적용) */}
      {status && (
        <div
          className={cn(
            "absolute -top-4 right-0 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-top-2",
            status.type === "success"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30",
          )}
        >
          {status.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ListTodo className="text-emerald-400" /> Watchlist
        </h2>

        {/* 입력 필드 영역 */}
        <div className="flex gap-3 bg-slate-800/50 p-2 rounded-xl border border-slate-700">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm px-2 cursor-pointer outline-none"
          >
            <option value="US">US</option>
            <option value="KR">KR</option>
          </select>
          <input
            type="text"
            placeholder="Enter Ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStock()}
            className="bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-500 w-32 outline-none"
          />
          <button
            onClick={addStock}
            disabled={isAdding}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-slate-950 font-bold px-4 py-1.5 rounded-lg transition-all text-sm cursor-pointer"
          >
            {isAdding ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4">Ticker</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4 text-right">Yield</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {watchlist.map((item) => (
              <tr
                key={item.symbol}
                className="hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-6 py-4 font-bold text-emerald-400">
                  {item.symbol}
                </td>
                <td className="px-6 py-4 text-slate-300">{item.name}</td>
                <td className="px-6 py-4 text-slate-100">
                  {item.currency}{" "}
                  {item.price?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                  {item.dividend_yield?.toFixed(2)}%
                </td>
              </tr>
            ))}
            {watchlist.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-slate-500 italic"
                >
                  No stocks added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
