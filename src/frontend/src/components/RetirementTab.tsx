import { useState, useEffect } from "react";
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, Coins, 
  AlertCircle, Info, RotateCcw, TrendingUp,
  Building2, Wallet2, Settings2, ChevronDown, Activity
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import type { RetirementConfig, SimulationResult, MasterPortfolio } from "../types";

/** 은퇴 전략 시뮬레이션 결과 및 시각화 탭 [REQ-RAMS-07] */
export function RetirementTab() {
  const [config, setConfig] = useState<RetirementConfig | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);
  const [masterPortfolios, setMasterPortfolios] = useState<MasterPortfolio[]>([]);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("v1");
  const [exchangeRate, setExchangeRate] = useState<number>(1425.5);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async (scenarioId: string | null = null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [configRes, masterRes] = await Promise.all([
        fetch("http://localhost:8000/api/retirement/config"),
        fetch("http://localhost:8000/api/master-portfolios")
      ]);
      
      const configData = await configRes.json();
      const masterData = await masterRes.json();
      
      if (!configData.success) throw new Error(configData.message || "설정을 불러올 수 없습니다.");
      
      setConfig(configData.data);
      setMasterPortfolios(masterData.data || []);
      setActiveId(scenarioId || configData.data.active_assumption_id || "v1");

      // 실시간 환율 정보 가져오기
      const settingsRes = await fetch("http://localhost:8000/api/settings");
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.data?.current_exchange_rate) {
        setExchangeRate(settingsData.data.current_exchange_rate);
      }

      const currentScenario = scenarioId || configData.data.active_assumption_id || "v1";
      const simUrl = `http://localhost:8000/api/retirement/simulate?scenario=${currentScenario}`;
      const simRes = await fetch(simUrl);
      const simData = await simRes.json();
      
      if (simData.success) {
        setSimulationData(simData.data);
      } else {
        throw new Error(simData.message || "시뮬레이션 실패");
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSwitchVersion = async (id: string) => {
    if (!config) return;
    setActiveId(id);
    try {
      await fetch("http://localhost:8000/api/retirement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, active_assumption_id: id })
      });
      await fetchData(id);
    } catch (err) {
      console.error(err);
    }
  };

  /** 마스터 전략 교체 핸들러 */
  const handleSwitchMaster = async (m_id: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/master-portfolios/${m_id}/activate`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIsSwitcherOpen(false);
        await fetchData(activeId); 
      }
    } catch (err) { console.error(err); }
  };

  if (isLoading && !simulationData) return <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-[0.2em] animate-pulse">Calculating Simulation...</div>;
  if (errorMessage) return <div className="p-20 text-center space-y-6"><div className="flex justify-center"><AlertTriangle size={64} className="text-red-500" /></div><h2 className="text-2xl font-black text-slate-50">오류 발생</h2><p>{errorMessage}</p><button onClick={() => fetchData()} className="px-8 py-3 bg-slate-800 text-slate-200 rounded-xl">재시도</button></div>;
  if (!simulationData || !config) return null;

  const summary = simulationData.summary || {};
  const monthlyData = simulationData.monthly_data || [];
  const chartData = monthlyData.filter((d) => d.index % 12 === 0 || d.index === 1);

  const level = (() => {
    const years = summary.total_survival_years || 0;
    if (years > 40) return { label: "Unshakable", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle2 size={24} /> };
    if (years > 25) return { label: "Solid", color: "text-blue-400", bg: "bg-blue-500/10", icon: <ShieldCheck size={24} /> };
    return { label: "Fragile", color: "text-amber-400", bg: "bg-amber-500/10", icon: <AlertTriangle size={24} /> };
  })();

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32 max-w-6xl mx-auto px-4" data-testid="retirement-tab-content" onClick={() => isSwitcherOpen && setIsSwitcherOpen(false)}>
      {/* [MOD] Strategy Bar: z-50 추가하여 하단 레이어 침범 방지 */}
      <section className="animate-in fade-in slide-in-from-top-4 duration-700 relative z-50">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 shadow-xl backdrop-blur-md relative">
          {/* 배경 장식 요소: 투명도를 낮추어 overflow 없이도 자연스럽게 처리 */}
          <div className="absolute left-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-1 relative">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">Active Strategy</p>
              </div>
              
              <div 
                className="flex items-center gap-3 cursor-pointer group/title w-fit"
                onClick={(e) => { e.stopPropagation(); setIsSwitcherOpen(!isSwitcherOpen); }}
              >
                <h1 className="text-2xl font-black text-slate-100 tracking-tight group-hover/title:text-emerald-400 transition-all flex items-center gap-3">
                  {simulationData.meta?.master_name || "Custom Strategy Builder"}
                  {simulationData.meta?.master_yield !== undefined && (
                    <span className="text-sm font-black bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                      TR {(simulationData.meta.master_yield * 100).toFixed(2)}%
                    </span>
                  )}
                </h1>
                <ChevronDown className={cn("text-slate-600 group-hover/title:text-emerald-400 transition-all", isSwitcherOpen && "rotate-180")} size={20} />
              </div>


              {isSwitcherOpen && (
                <div className="absolute top-full left-0 mt-3 w-[380px] bg-slate-900 border border-slate-800 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.7)] py-3 z-[100] animate-in slide-in-from-top-1 duration-200 ring-1 ring-emerald-500/10">
                  <p className="px-6 py-1.5 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50 mb-2">Change Plan</p>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {masterPortfolios.map(m => (
                      <div 
                        key={m.id}
                        onClick={() => handleSwitchMaster(m.id)}
                        className={cn(
                          "mx-2 px-6 py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group/item mb-0.5",
                          m.is_active ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black tracking-tight truncate">{m.name}</p>
                            {m.combined_yield !== undefined && (
                              <span className="text-[11px] font-black text-emerald-500/80 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                {(m.combined_yield * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold opacity-60 uppercase tracking-tight truncate mt-0.5 text-slate-400">
                            Corp: {m.corp_name || "-"} / Pen: {m.pension_name || "-"}
                          </p>
                        </div>

                        {m.is_active && <CheckCircle2 size={16} className="text-emerald-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-3 flex items-center gap-3">
                <Building2 className="text-emerald-500/50" size={18} />
                <div>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Corporate</p>
                  <p className="text-xs font-black text-slate-300 tracking-tight">{simulationData.meta?.used_portfolios?.corp?.name || "None"}</p>
                </div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-3 flex items-center gap-3">
                <Wallet2 className="text-blue-500/50" size={18} />
                <div>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Pension</p>
                  <p className="text-xs font-black text-slate-300 tracking-tight">{simulationData.meta?.used_portfolios?.pension?.name || "None"}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-2xl px-6 py-3">
              <div className="text-right">
                <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Exchange Rate</p>
                <p className="text-lg font-black text-emerald-500/90 tabular-nums leading-none">
                  {exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  <span className="text-[11px] text-slate-600 ml-1 font-bold">KRW</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 1. Assumptions */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg"><Settings2 size={20} className="text-slate-400" /></div>
            <div>
              <h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 1. Set the Basis</h3>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">미래 시장에 대한 본인만의 가정을 선택하세요</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config && Object.entries(config.assumptions || {}).map(([id, item]) => (
            <div key={id} onClick={() => activeId !== id && handleSwitchVersion(id)} className={cn("p-8 rounded-[2rem] border transition-all duration-500 text-left group cursor-pointer", activeId === id ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-900/40 border-slate-800")}>
              <div className="flex justify-between items-start mb-6">
                <h4 className={cn("text-xl font-black", activeId === id ? "text-emerald-400" : "text-slate-400")}>{item.name}</h4>
                {activeId === id && <CheckCircle2 size={24} className="text-emerald-400 shadow-glow" />}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-500 uppercase">Return</p>
                  <EditableInput 
                    id={`return-${id}`} 
                    initialValue={item.expected_return * 100} 
                    masterValue={(item.master_return ?? 0.0485) * 100} 
                    onCommit={async (v) => { 
                      const nc = {...config, active_assumption_id: id, assumptions: {...config.assumptions, [id]: {...item, expected_return: v/100}}}; 
                      setConfig(nc); 
                      setActiveId(id);
                      await fetch("http://localhost:8000/api/retirement/config", {
                        method: "POST", 
                        headers: {"Content-Type": "application/json"}, 
                        body: JSON.stringify(nc)
                      }); 
                      await fetchData(id); 
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-500 uppercase">Inflation</p>
                  <EditableInput 
                    id={`inflation-${id}`} 
                    initialValue={item.inflation_rate * 100} 
                    masterValue={(item.master_inflation ?? 0.025) * 100} 
                    onCommit={async (v) => { 
                      const nc = {...config, active_assumption_id: id, assumptions: {...config.assumptions, [id]: {...item, inflation_rate: v/100}}}; 
                      setConfig(nc); 
                      setActiveId(id);
                      await fetch("http://localhost:8000/api/retirement/config", {
                        method: "POST", 
                        headers: {"Content-Type": "application/json"}, 
                        body: JSON.stringify(nc)
                      }); 
                      await fetchData(id); 
                    }} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2. Projection Result */}
      <section className="space-y-10 animate-in slide-in-from-bottom-4 duration-1000 delay-200">
        <div className="flex items-center gap-3 px-4"><div className="p-2 bg-slate-800 rounded-lg"><Activity size={20} className="text-slate-400" /></div><div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 2. Projection Result</h3></div></div>
        <div className={cn("p-12 rounded-[3.5rem] border shadow-2xl backdrop-blur-md relative overflow-hidden transition-all duration-1000", level.bg, "border-white/5")}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
            <div className="lg:col-span-5 flex flex-col justify-center space-y-10">
              <div className="space-y-6">
                <div className={cn("inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest", level.bg, level.color)}>{level.icon} {level.label} Status</div>
                {summary.total_survival_years >= (config.simulation_params.simulation_years || 30) ? (
                  <h2 className="text-3xl font-black text-slate-50 leading-tight">혁님은 원하는 모습으로 <br /><span className="text-emerald-400">은퇴할 수 있습니다.</span></h2>
                ) : (
                  <h2 className="text-3xl font-black text-slate-50 leading-tight">혁님의 현재 전략으로는 <br /><span className="text-amber-400">자산 보강이 필요합니다.</span></h2>
                )}
                <p className="text-base text-slate-400 font-medium">자산은 향후 <span className={cn("font-black", (summary.total_survival_years || 0) >= 25 ? "text-slate-100" : "text-red-400")}>{summary.total_survival_years || 0}년</span> 동안 지속 가능합니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard label="Final NW" value={`₩${(summary.is_permanent ? monthlyData[monthlyData.length-1].total_net_worth / 100000000 : 0).toFixed(1)}억`} tooltip="시뮬레이션 종료 시점의 예상 순자산" />
                <MetricCard label="Cash Exhaust" value={summary.sgov_exhaustion_date || "-"} tooltip="현금성 자산이 0원이 되는 시점" />
              </div>
            </div>
            <div className="lg:col-span-7 h-[400px] bg-slate-950/20 rounded-3xl p-6 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f8fafc" stopOpacity={0.1}/><stop offset="95%" stopColor="#f8fafc" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorCorp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorPen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="index" type="number" domain={[0, 360]} tickFormatter={(v) => `${Math.floor(v/12)}Y`} stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v/100000000).toFixed(0)}억`} stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', fontSize: '12px' }} labelFormatter={(l) => `${Math.floor(Number(l)/12)}년차 (${l}개월)`} formatter={(v: number, name: string) => [`${(Number(v)/100000000).toFixed(1)}억`, name === "total_net_worth" ? "합산 자산" : name === "corp_balance" ? "법인 자산" : "연금 자산"]} />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                  <Area name="total_net_worth" type="monotone" dataKey="total_net_worth" stroke="#f8fafc" strokeWidth={4} fill="url(#colorTotal)" isAnimationActive={true} />
                  <Area name="corp_balance" type="monotone" dataKey="corp_balance" stroke="#10b981" strokeWidth={2} fill="url(#colorCorp)" isAnimationActive={true} />
                  <Area name="pension_balance" type="monotone" dataKey="pension_balance" stroke="#3b82f6" strokeWidth={2} fill="url(#colorPen)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Step 5. Detailed Log */}
      <section className="space-y-6 pb-20">
        <div className="flex items-center gap-3 px-4"><div className="p-2 bg-slate-800 rounded-lg"><Coins size={20} className="text-slate-400" /></div><div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 5. Detailed Math Log</h3></div></div>
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
          <div className="max-h-[650px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-5 text-center">Date (Age)</th>
                  <th className="px-6 py-5">Phase</th>
                  <th className="px-6 py-5 text-right text-rose-500/70">Target CF</th>
                  <th className="px-6 py-5 text-right text-emerald-500/70">Total Draw</th>
                  <th className="px-6 py-5 text-right text-blue-400/70 border-l border-slate-800/50">Corp Bal</th>
                  <th className="px-6 py-5 text-right text-blue-400/70">Pen Bal</th>
                  <th className="px-6 py-5 text-right text-slate-200 border-l border-slate-800/50">Net Worth</th>
                  <th className="px-6 py-5 text-right text-emerald-400/50">Loan Bal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {monthlyData.map((m, idx) => (
                  <tr key={idx} className={cn("hover:bg-slate-800/40 transition-colors group", m.event ? "bg-emerald-500/5" : "")}>
                    <td className="px-6 py-4 text-xs font-bold text-slate-400 text-center">{m.year}-{String(m.month).padStart(2, '0')} ({m.age}세)</td>
                    <td className="px-6 py-4 text-left"><span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-tighter shadow-sm", m.phase === "Phase 1" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : m.phase === "Phase 2" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20")}>{m.phase}</span></td>
                    <td className="px-6 py-4 text-xs font-black text-rose-400/80 text-right">{(m.target_cashflow / 10000).toFixed(0)}<span className="text-[11px] ml-0.5 opacity-50 text-slate-500">만</span></td>
                    <td className="px-6 py-4 text-xs font-black text-emerald-400/80 text-right">{((m.net_salary + (m.pension_draw || 0)) / 10000).toFixed(0)}<span className="text-[11px] ml-0.5 opacity-50 text-slate-500">만</span></td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-300 text-right border-l border-slate-800/50">{(m.corp_balance / 100000000).toFixed(2)}<span className="text-[11px] ml-0.5 opacity-50 text-slate-500">억</span></td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-300 text-right">{(m.pension_balance / 100000000).toFixed(2)}<span className="text-[11px] ml-0.5 opacity-50 text-slate-500">억</span></td>
                    <td className="px-6 py-4 text-sm font-black text-slate-50 text-right border-l border-slate-800/50 group-hover:text-emerald-400 transition-colors">{(m.total_net_worth / 100000000).toFixed(2)}<span className="text-[11px] ml-0.5 opacity-50 text-slate-500">억</span></td>
                    <td className="px-6 py-4 text-xs font-bold text-emerald-400/60 text-right">{(m.loan_balance / 100000000).toFixed(2)}<span className="text-[11px] ml-0.5 opacity-50 text-slate-500">억</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tooltip }: { label: string, value: string, tooltip: string }) {
  return (
    <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 group relative">
      <div className="flex items-center gap-2 mb-2"><p className="text-[11px] text-slate-500 uppercase font-black tracking-widest">{label}</p><div className="group relative"><Info size={12} className="text-slate-600 cursor-help" /><div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal">{tooltip}</div></div></div>
      <span className="text-base font-black text-slate-200">{value}</span>
    </div>
  );
}

function EditableInput({ id, initialValue, masterValue, onCommit }: { id: string, initialValue: number, masterValue: number, onCommit: (val: number) => void }) {
  const [value, setValue] = useState(initialValue.toFixed(1));
  useEffect(() => { setValue(initialValue.toFixed(1)); }, [initialValue]);
  
  return (
    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <div className="relative flex items-center">
        <input id={id} data-testid={id} type="text" className="bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 w-28 text-lg font-black text-emerald-400 outline-none focus:border-emerald-500 transition-all pr-10" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => !isNaN(parseFloat(value)) && onCommit(parseFloat(value))} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} />
        <span className="absolute right-4 text-xs font-black text-slate-500">%</span>
      </div>
      {Math.abs(initialValue - masterValue) > 0.05 && <button onClick={(e) => { e.stopPropagation(); onCommit(masterValue); }} className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500 rounded-xl text-emerald-400 hover:text-slate-950 transition-all shadow-lg flex items-center gap-2"><RotateCcw size={16} strokeWidth={3} /><span className="text-[11px] font-black uppercase">Reset</span></button>}
    </div>
  );
}
