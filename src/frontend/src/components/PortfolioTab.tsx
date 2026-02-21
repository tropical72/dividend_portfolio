import React, { useState, useMemo } from "react";
import { PlusCircle, RotateCcw, Save, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

/** 포트폴리오 항목 인터페이스 */
interface PortfolioItem {
  symbol: string;
  name: string;
  category: "Fixed" | "Cash" | "Growth";
  weight: number;
  price: number;
  dividend_yield: number;
  last_div_amount: number;
  payment_months: number[];
}

/**
 * [REQ-PRT-01] 포트폴리오 설계 및 구성 탭
 */
export function PortfolioTab() {
  const [portfolioName, setPortfolioName] = useState("My New Portfolio");
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const categories = [
    { id: "Fixed", name: "Fixed Income", color: "bg-blue-400", textColor: "text-blue-400" },
    { id: "Cash", name: "Bond/Cash Buffer", color: "bg-amber-400", textColor: "text-amber-400" },
    { id: "Growth", name: "Growth/Dividend Growth", color: "bg-emerald-400", textColor: "text-emerald-400" },
  ] as const;

  /** 전체 비중 및 카테고리별 비중 계산 [REQ-PRT-01.3] */
  const { totalWeight, categoryWeights } = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    const catMap = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.weight;
      return acc;
    }, {} as Record<string, number>);
    return { totalWeight: total, categoryWeights: catMap };
  }, [items]);

  /** 알림 표시 */
  const showStatus = (message: string, type: "success" | "error") => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 3000);
  };

  /** 초기화 (새로만들기) [REQ-PRT-01.5] */
  const handleReset = () => {
    if (confirm("현재 작성 중인 내용이 모두 사라집니다. 초기화할까요?")) {
      setItems([]);
      setPortfolioName("My New Portfolio");
      showStatus("초기화되었습니다.", "success");
    }
  };

  /** 저장 [REQ-PRT-01.4, 01.5] */
  const handleSave = async () => {
    if (totalWeight !== 100) {
      showStatus("비중 합계가 100%여야 합니다.", "error");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: portfolioName,
          items: items,
          total_capital: 0, // 초기값
          currency: "USD"
        }),
      });
      const result = await res.json();
      if (result.success) {
        showStatus("포트폴리오가 저장되었습니다.", "success");
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
    <section className="space-y-8 animate-in fade-in duration-500">
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

      {/* 상단 컨트롤 바 */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <input 
            type="text"
            value={portfolioName}
            onChange={(e) => setPortfolioName(e.target.value)}
            className="bg-transparent border-none outline-none text-2xl font-bold text-slate-50 w-full focus:ring-2 focus:ring-emerald-500/20 rounded-lg px-2 -ml-2 transition-all"
            placeholder="포트폴리오 이름을 입력하세요"
          />
          <p className="text-slate-400 text-sm mt-1">자산 배분 및 종목별 비중을 설정합니다.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-all"
          >
            <RotateCcw size={18} /> 새로만들기
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            <Save size={18} /> 저장
          </button>
        </div>
      </div>

      {/* 3단 카테고리 영역 */}
      <div className="grid grid-cols-1 gap-6">
        {categories.map((cat) => {
          const catItems = items.filter(i => i.category === cat.id);
          const catWeight = categoryWeights[cat.id] || 0;

          return (
            <div key={cat.id} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn("w-1.5 h-6 rounded-full", cat.color)} />
                  <h3 className="text-lg font-bold text-slate-100">{cat.name}</h3>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-lg uppercase tracking-widest font-bold transition-colors",
                    catWeight > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
                  )}>
                    {catWeight}%
                  </span>
                </div>
                <button className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all">
                  <PlusCircle size={20} />
                </button>
              </div>

              {/* 종목 리스트 테이블 */}
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500 font-bold border-b border-slate-800">
                  <tr>
                    <th className="pb-3 pl-2 w-24">Ticker</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3 w-32 text-right">Weight (%)</th>
                    <th className="pb-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {catItems.map((item) => (
                    <tr key={item.symbol} className="group hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 pl-2 font-bold text-emerald-400">{item.symbol}</td>
                      <td className="py-4 text-slate-300 text-xs">{item.name}</td>
                      <td className="py-4 text-right">
                        <input 
                          type="number"
                          value={item.weight}
                          onChange={(e) => updateWeight(item.symbol, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500/50 outline-none"
                        />
                      </td>
                      <td className="py-4 text-center">
                        <button 
                          onClick={() => removeItem(item.symbol)}
                          className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {catItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-600 italic text-xs uppercase tracking-widest">
                        No stocks added to this category
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* 전체 합계 및 검증 섹션 [REQ-PRT-01.4, 01.5] */}
      <div className={cn(
        "mt-10 p-6 border-2 border-dashed rounded-3xl flex items-center justify-between transition-all",
        totalWeight === 100 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-slate-900/80 border-slate-800"
      )}>
        <div className="flex items-center gap-8">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-1">Total Stocks</span>
            <span className="text-xl font-bold text-slate-100">{items.length}</span>
          </div>
          <div className="h-10 w-px bg-slate-800" />
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-1">Total Weight</span>
            <span className={cn(
              "text-2xl font-black transition-colors",
              totalWeight === 100 ? "text-emerald-400" : "text-red-500"
            )}>
              {totalWeight.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="text-right">
          {totalWeight !== 100 ? (
            <p className="text-xs text-red-400 font-medium mb-1 animate-pulse">※ 비중 합계가 100%여야 저장이 가능합니다.</p>
          ) : (
            <p className="text-xs text-emerald-400 font-medium mb-1 flex items-center gap-1 justify-end">
              <CheckCircle2 size={14} /> 저장이 가능한 상태입니다.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

