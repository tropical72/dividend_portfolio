import { useState, useEffect } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import type { PortfolioItem } from "../types";

/** 저장된 포트폴리오 데이터 구조 */
interface Portfolio {
  id: string;
  name: string;
  total_capital: number;
  currency: string;
  items: PortfolioItem[];
  created_at: string;
}

/** [REQ-PRT-06] 포트폴리오 대시보드 및 비교 탭 */
export function PortfolioDashboard() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  }, []);

  /** 삭제 핸들러 */
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("포트폴리오를 삭제하시겠습니까?")) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/portfolios/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        setPortfolios(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="p-10 text-center text-slate-500">Loading portfolios...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black text-slate-50 flex items-center gap-2">
          <PieChart className="text-emerald-400" /> Saved Portfolios
        </h2>
        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
          Total {portfolios.length} Sets
        </span>
      </div>

      {portfolios.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/10 gap-4">
          <AlertCircle className="text-slate-700 w-12 h-12" />
          <p className="text-slate-500 font-bold">저장된 포트폴리오가 없습니다. 설계 모드에서 저장해 보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {portfolios.map((p) => {
            const isExpanded = expandedId === p.id;
            const totalWeight = p.items.reduce((sum, i) => sum + i.weight, 0);
            
            return (
              <div 
                key={p.id} 
                className={cn(
                  "portfolio-card group border transition-all duration-300 rounded-[2rem] overflow-hidden",
                  isExpanded ? "bg-slate-900/60 border-emerald-500/30 shadow-2xl shadow-emerald-500/5" : "bg-slate-900/20 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30 cursor-pointer"
                )}
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
              >
                {/* 헤더 섹션: 요약 정보 */}
                <div className="p-8 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "p-4 rounded-2xl transition-all duration-300",
                      isExpanded ? "bg-emerald-500 text-slate-950 scale-110" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                    )}>
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-50 tracking-tight mb-1">{p.name}</h3>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <span>{p.items.length} Assets</span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span>{p.currency} {p.total_capital.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Total Weight</span>
                      <span className={cn("text-lg font-black", Math.abs(totalWeight - 100) < 0.1 ? "text-emerald-400" : "text-red-400")}>
                        {totalWeight.toFixed(1)}%
                      </span>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, p.id)}
                      className="p-3 text-slate-700 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                    <div className="p-2 text-slate-600">
                      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                  </div>
                </div>

                {/* 상세 섹션: 아코디언 내용 [REQ-PRT-06.2] */}
                <div className={cn(
                  "portfolio-details overflow-hidden transition-all duration-500 ease-in-out border-t border-slate-800/50 bg-slate-950/40",
                  isExpanded ? "max-h-[1000px] opacity-100 p-8" : "max-h-0 opacity-0"
                )}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 자산 구성 목록 */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <PieChart size={14} /> Asset Allocation
                      </h4>
                      <div className="rounded-2xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-800/50 text-slate-500 font-black uppercase tracking-widest">
                            <tr>
                              <th className="py-3 px-4">Ticker</th>
                              <th className="py-3 px-4">Category</th>
                              <th className="py-3 px-4 text-right">Weight</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {p.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="py-3 px-4 font-bold text-emerald-400">{item.symbol}</td>
                                <td className="py-3 px-4 text-slate-400 text-[10px]">{item.category}</td>
                                <td className="py-3 px-4 text-right font-black text-slate-100">{item.weight.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 추가 분석 정보 공간 (Phase 4.2 예정) */}
                    <div className="space-y-4 bg-slate-900/40 rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-center items-center gap-4 text-center">
                       <Calendar className="text-slate-700 w-10 h-10 opacity-20" />
                       <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest max-w-[200px]">
                         Monthly income visualization will be available here.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
