import { useState, useEffect } from "react";
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, Coins, 
  AlertCircle, Info, RotateCcw, TrendingUp
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { cn } from "../lib/utils";
import type { RetirementConfig, SimulationResult, MonthlySimulationData } from "../types";

/** 은퇴 전략 시뮬레이션 결과 및 시각화 탭 [REQ-RAMS-07] */
export function RetirementTab() {
  const [config, setConfig] = useState<RetirementConfig | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);
  const [activeId, setActiveId] = useState<string>("v1");
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ReferenceError 방지를 위한 초기 변수
  let summary: SimulationResult["summary"] | Record<string, never> = {};
  let monthlyData: MonthlySimulationData[] = [];
  let chartData: MonthlySimulationData[] = [];

  const fetchData = async (scenarioId: string | null = null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const configRes = await fetch("http://localhost:8000/api/retirement/config");
      const configData = await configRes.json();
      if (!configData.success) throw new Error(configData.message || "설정을 불러올 수 없습니다.");
      
      setConfig(configData.data);
      setActiveId(configData.data.active_assumption_id || "v1");

      const simUrl = scenarioId ? `http://localhost:8000/api/retirement/simulate?scenario=${scenarioId}` : `http://localhost:8000/api/retirement/simulate`;
      const simRes = await fetch(simUrl);
      const simData = await simRes.json();
      
      if (simData.success) {
        setSimulationData(simData.data);
      } else {
        setErrorMessage(simData.message || "시뮬레이션 실행 실패");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message || "서버와 통신할 수 없습니다.");
      } else {
        setErrorMessage("서버와 통신할 수 없습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSwitchVersion = async (id: string) => {
    setActiveId(id);
    setActiveScenario(null);
    try {
      await fetch("http://localhost:8000/api/retirement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_assumption_id: id })
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (isLoading && !simulationData) return <div className="p-20 text-center text-slate-500 font-black animate-pulse" data-testid="retirement-tab-content">Running Monte Carlo Simulation...</div>;
  if (errorMessage) return <div className="p-20 text-center space-y-6" data-testid="retirement-tab-content"><div className="flex justify-center"><AlertCircle size={64} className="text-red-500" /></div><h2 className="text-2xl font-black text-slate-50">오류 발생</h2><p>{errorMessage}</p><button onClick={() => fetchData()} className="px-8 py-3 bg-slate-800 text-slate-200 rounded-xl">재시도</button></div>;

  if (simulationData) {
    summary = simulationData.summary || {};
    monthlyData = simulationData.monthly_data || [];
    chartData = monthlyData.filter((d) => d.index % 12 === 0 || d.index === 1);
  }

  if (!config || monthlyData.length === 0) return <div className="p-20 text-center text-red-400 font-black" data-testid="retirement-tab-content">데이터가 없습니다.</div>;

  const level = (() => {
    const years = summary.total_survival_years || 0;
    if (years > 40) return { label: "Unshakable", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle2 size={24} /> };
    if (years > 25) return { label: "Solid", color: "text-blue-400", bg: "bg-blue-500/10", icon: <ShieldCheck size={24} /> };
    return { label: "Fragile", color: "text-amber-400", bg: "bg-amber-500/10", icon: <AlertTriangle size={24} /> };
  })();

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-32 max-w-6xl mx-auto px-4" data-testid="retirement-tab-content">
      {/* Step 1. Assumptions */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><Info size={20} className="text-slate-400" /></div>
          <div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 1. Set the Basis</h3></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(config.assumptions || {}).map(([id, item]) => (
            <div key={id} onClick={() => activeId !== id && handleSwitchVersion(id)} className={cn("p-8 rounded-[2rem] border transition-all duration-500 text-left group cursor-pointer", activeId === id && !activeScenario ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-900/40 border-slate-800")}>
              <div className="flex justify-between items-start mb-6">
                <h4 className={cn("text-xl font-black", activeId === id ? "text-emerald-400" : "text-slate-400")}>{item.name}</h4>
                {activeId === id && <CheckCircle2 size={24} className="text-emerald-400 shadow-glow" />}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2"><p className="text-[10px] font-black text-slate-500 uppercase">Return</p><EditableInput id={`return-${id}`} initialValue={item.expected_return * 100} masterValue={(item.master_return ?? 0.0485) * 100} onCommit={async (v) => { const nc = {...config, assumptions: {...config.assumptions, [id]: {...item, expected_return: v/100}}}; setConfig(nc); await fetch("http://localhost:8000/api/retirement/config", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(nc)}); if(activeId===id) fetchData(); }} /></div>
                <div className="space-y-2"><p className="text-[10px] font-black text-slate-500 uppercase">Inflation</p><EditableInput id={`inflation-${id}`} initialValue={item.inflation_rate * 100} masterValue={(item.master_inflation ?? 0.025) * 100} onCommit={async (v) => { const nc = {...config, assumptions: {...config.assumptions, [id]: {...item, inflation_rate: v/100}}}; setConfig(nc); await fetch("http://localhost:8000/api/retirement/config", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(nc)}); if(activeId===id) fetchData(); }} /></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2. Verdict */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 px-4"><div className="p-2 bg-slate-800 rounded-lg"><TrendingUp size={20} className="text-slate-400" /></div><div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 2. The Verdict & Proof</h3></div></div>
        <div className={cn("p-12 rounded-[3.5rem] border shadow-2xl bg-slate-900/60 border-slate-800")}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-10">
              <div className="space-y-6">
                <div className={cn("inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest", level.bg, level.color)}>{level.icon} {level.label} Status</div>
                <h2 className="text-3xl font-black text-slate-50 leading-tight">혁님은 원하는 모습으로 <br /><span className="text-emerald-400">은퇴할 수 있습니다.</span></h2>
                <p className="text-base text-slate-400 font-medium">자산은 향후 <span className="text-slate-100 font-black">{summary.total_survival_years || 0}년</span> 동안 지속 가능합니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-6"><MetricCard label="성장 자산 매도 시작" value={summary.growth_asset_sell_start_date || "-"} tooltip="생활비 충당을 위해 주식을 팔기 시작하는 시점" /><MetricCard label="안전 자산 고갈" value={summary.sgov_exhaustion_date || "-"} tooltip="현금성 자산이 0원이 되는 시점" /></div>
            </div>
            <div className="lg:col-span-7 h-[400px] bg-slate-950/20 rounded-3xl p-6 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f8fafc" stopOpacity={0.1}/><stop offset="95%" stopColor="#f8fafc" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorCorp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorPen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="index" type="number" domain={[0, 360]} tickFormatter={(v) => `${Math.floor(v/12)}Y`} stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v/100000000).toFixed(0)}억`} stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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

      {/* Step 5. Detailed Log (무결성 증명 컬럼 확장) */}
      <section className="space-y-6 pb-20">
        <div className="flex items-center gap-3 px-4"><div className="p-2 bg-slate-800 rounded-lg"><Coins size={20} className="text-slate-400" /></div><div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 5. Detailed Math Log</h3></div></div>
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 z-10 shadow-xl text-[9px] font-black text-slate-500 uppercase">
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-4 text-center">Date (Age)</th>
                  <th className="px-6 py-4">Phase</th>
                  <th className="px-6 py-4 text-right">Target CF (Spent)</th>
                  <th className="px-6 py-4 text-right">Income (Salary/Pen)</th>
                  <th className="px-6 py-4 text-right">Total Net Worth</th>
                  <th className="px-6 py-4 text-right">Loan Bal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-bold">
                {monthlyData.map((m, idx) => (
                  <tr key={idx} className={cn("hover:bg-slate-800/30 transition-colors", m.event ? "bg-emerald-500/5" : "")}>
                    <td className="px-6 py-3 text-xs text-slate-400 text-center">{m.year}-{String(m.month).padStart(2, '0')} ({m.age}세)</td>
                    <td className="px-6 py-3 text-left"><span className={cn("px-2 py-1 rounded text-[9px] font-black uppercase", m.phase === "Phase 1" ? "bg-blue-500/10 text-blue-400" : m.phase === "Phase 2" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>{m.phase}</span></td>
                    <td className="px-6 py-3 text-xs text-rose-400/80 text-right">{(m.target_cashflow / 10000).toFixed(0)}만</td>
                    <td className="px-6 py-3 text-xs text-emerald-400/80 text-right">{((m.net_salary + (m.pension_draw || 0)) / 10000).toFixed(0)}만</td>
                    <td className="px-6 py-3 text-xs text-slate-200 text-right">{(m.total_net_worth / 100000000).toFixed(2)}억</td>
                    <td className="px-6 py-3 text-xs text-emerald-400/60 text-right">{(m.loan_balance / 100000000).toFixed(2)}억</td>
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
      <div className="flex items-center gap-2 mb-2"><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{label}</p><div className="group relative"><Info size={12} className="text-slate-600 cursor-help" /><div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[10px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal">{tooltip}</div></div></div>
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
        <input id={id} data-testid={id} type="text" className="bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 w-28 text-lg font-black text-emerald-400 outline-none focus:border-emerald-500 transition-all pr-10" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => !isNaN(parseFloat(value)) && onCommit(parseFloat(value))} onKeyDown={(e) => e.key === "Enter" && (e.target as any).blur()} />
        <span className="absolute right-4 text-xs font-black text-slate-500">%</span>
      </div>
      {Math.abs(initialValue - masterValue) > 0.05 && <button onClick={(e) => { e.stopPropagation(); onCommit(masterValue); }} className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500 rounded-xl text-emerald-400 hover:text-slate-950 transition-all shadow-lg flex items-center gap-2"><RotateCcw size={16} strokeWidth={3} /><span className="text-[10px] font-black uppercase">Reset</span></button>}
    </div>
  );
}
