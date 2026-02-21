import { useState, useEffect, useMemo } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Calendar,
  AlertCircle,
  Edit3,
  CheckSquare,
  Square,
  BarChart3
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
import type { PortfolioItem, Portfolio } from "../types";

/** [REQ-PRT-06] 포트폴리오 대시보드 및 비교 탭 */
export function PortfolioDashboard({ onLoad }: { onLoad: (p: Portfolio) => void }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  /** 선택 핸들러 */
  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  /** 차트 데이터 계산 [REQ-PRT-06.4] */
  const chartData = useMemo(() => {
    const selectedPortfolios = portfolios.filter(p => selectedIds.has(p.id));
    if (selectedPortfolios.length === 0) return [];

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    
    return months.map(m => {
      const dataPoint: any = { name: `${m}월` };
      selectedPortfolios.forEach(p => {
        const monthlySum = p.items.reduce((sum, item) => {
          if (item.payment_months.includes(m)) {
            const allocated = p.total_capital * (item.weight / 100);
            const shares = allocated / item.price;
            return sum + (shares * item.last_div_amount);
          }
          return sum;
        }, 0);
        dataPoint[p.name] = parseFloat(monthlySum.toFixed(2));
      });
      return dataPoint;
    });
  }, [portfolios, selectedIds]);

  /** 로드 핸들러 [REQ-PRT-04.3] */
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
        const nextSelected = new Set(selectedIds);
        nextSelected.delete(id);
        setSelectedIds(nextSelected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="p-10 text-center text-slate-500">Loading portfolios...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 차트 영역 [REQ-PRT-06.4] */}
      {selectedIds.size > 0 && (
        <div className="comparison-chart-container bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-50 flex items-center gap-3 tracking-tight">
                <BarChart3 className="text-emerald-400" size={24} /> Monthly Dividend Comparison
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 ml-9">Aggregated income across selected portfolios (USD)</p>
            </div>
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700 transition-all"
            >Clear Selection</button>
          </div>
          
          <div className="h-[400px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #334155', 
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '30px' }}
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{value}</span>}
                />
                {portfolios.filter(p => selectedIds.has(p.id)).map((p, idx) => (
                  <Bar 
                    key={p.id} 
                    dataKey={p.name} 
                    fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5]} 
                    radius={[6, 6, 0, 0]} 
                    barSize={selectedIds.size > 2 ? 15 : 30}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
            const isSelected = selectedIds.has(p.id);
            const totalWeight = p.items.reduce((sum, i) => sum + i.weight, 0);
            
            return (
              <div 
                key={p.id} 
                className={cn(
                  "portfolio-card group border transition-all duration-300 rounded-[2rem] overflow-hidden",
                  isExpanded ? "bg-slate-900/60 border-emerald-500/30 shadow-2xl shadow-emerald-500/5" : "bg-slate-900/20 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30 cursor-pointer",
                  isSelected && !isExpanded && "border-emerald-500/40 bg-emerald-500/[0.02]"
                )}
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
              >
                <div className="p-8 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={(e) => toggleSelect(e, p.id)}
                      role="checkbox"
                      aria-checked={isSelected}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        isSelected ? "text-emerald-400 bg-emerald-500/10" : "text-slate-700 hover:text-slate-500"
                      )}
                    >
                      {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>

                    <div className={cn(
                      "p-4 rounded-2xl transition-all duration-300 hidden sm:block",
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

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => handleLoad(e, p)}
                      className="hidden md:flex items-center gap-2 px-5 py-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 text-xs font-black rounded-2xl transition-all border border-emerald-500/20"
                    >
                      <Edit3 size={16} /> Load into Designer
                    </button>
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

                <div className={cn(
                  "portfolio-details overflow-hidden transition-all duration-500 ease-in-out border-t border-slate-800/50 bg-slate-950/40",
                  isExpanded ? "max-h-[1000px] opacity-100 p-8" : "max-h-0 opacity-0"
                )}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                    <div className="space-y-4 bg-slate-900/40 rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-center items-center gap-4 text-center">
                       <Calendar className="text-slate-700 w-10 h-10 opacity-20" />
                       <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest max-w-[200px]">
                         Select other portfolios to see aggregated comparison above.
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
