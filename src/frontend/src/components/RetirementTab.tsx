import { useState, useEffect } from "react";
import { 
  ShieldCheck, RefreshCcw, CheckCircle2, AlertTriangle, Zap, CloudRain, Coins, 
  TrendingDown, Camera, Activity, AlertCircle, Info, ArrowRight, RotateCcw, TrendingUp
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Line } from "recharts";
import { cn } from "../lib/utils";
import type { RetirementConfig } from "../types";

/** 은퇴 전략 시뮬레이션 결과 및 시각화 탭 [REQ-RAMS-07] */
export function RetirementTab() {
  const [config, setConfig] = useState<RetirementConfig | null>(null);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [activeId, setActiveId] = useState<string>("v1");
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  // [SAFETY] ReferenceError 방지를 위해 미리 변수 공간 확보
  let summary: any = {};
  let monthlyData: any[] = [];
  let signals: any[] = [];
  let chartData: any[] = [];

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
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setErrorMessage(err.message || "서버와 통신할 수 없습니다.");
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

  const handleStressTest = (scenarioId: string) => {
    const newScenario = activeScenario === scenarioId ? null : scenarioId;
    setActiveScenario(newScenario);
    fetchData(newScenario);
  };

  const handleTakeSnapshot = async () => {
    if (!config || !simulationData) return;
    setIsSnapshotting(true);
    const snapshotData = { snapshot_date: new Date().toISOString().split('T')[0], config: config, summary: simulationData.summary };
    try {
      await fetch("http://localhost:8000/api/retirement/snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshotData) });
      alert("은퇴일 스냅샷이 저장되었습니다.");
    } catch (err) { console.error(err); } finally { setIsSnapshotting(false); }
  };

  if (isLoading && !simulationData) return <div className="p-20 text-center text-slate-500 font-black animate-pulse" data-testid="retirement-tab-content">Running Monte Carlo Simulation...</div>;
  if (errorMessage) return (
    <div className="p-20 text-center space-y-6" data-testid="retirement-tab-content">
      <div className="flex justify-center"><AlertCircle size={64} className="text-red-500" /></div>
      <h2 className="text-2xl font-black text-slate-50">시뮬레이션 오류</h2>
      <p className="text-slate-400 font-bold max-w-lg mx-auto leading-relaxed">{errorMessage}</p>
      <button onClick={() => fetchData()} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded-xl border border-slate-700 transition-all">다시 시도</button>
    </div>
  );

  if (simulationData) {
    summary = simulationData.summary || {};
    monthlyData = simulationData.monthly_data || [];
    signals = summary.signals || [];
    chartData = monthlyData.filter((d: any) => d.index % 12 === 0 || d.index === 1);
  }

  if (!config || monthlyData.length === 0) return <div className="p-20 text-center text-red-400 font-black text-xl tracking-tighter" data-testid="retirement-tab-content">표시할 데이터가 없습니다.</div>;

  const level = (() => {
    const years = summary.total_survival_years || 0;
    if (years > 40) return { label: "Unshakable", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle2 size={24} /> };
    if (years > 25) return { label: "Solid", color: "text-blue-400", bg: "bg-blue-500/10", icon: <ShieldCheck size={24} /> };
    return { label: "Fragile", color: "text-amber-400", bg: "bg-amber-500/10", icon: <AlertTriangle size={24} /> };
  })();

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-32 max-w-6xl mx-auto px-4" data-testid="retirement-tab-content">
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><Info size={20} className="text-slate-400" /></div>
          <div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 1. Set the Basis</h3></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(config.assumptions || {}).map(([id, item]: [string, any]) => (
            <div key={id} onClick={() => activeId !== id && handleSwitchVersion(id)} className={cn("p-8 rounded-[2rem] border transition-all duration-500 text-left group cursor-pointer", activeId === id && !activeScenario ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20" : "bg-slate-900/40 border-slate-800 hover:border-slate-700")}>
              <div className="flex justify-between items-start mb-6">
                <h4 className={cn("text-xl font-black", activeId === id ? "text-emerald-400" : "text-slate-400")}>{item.name}</h4>
                {activeId === id && <CheckCircle2 size={24} className="text-emerald-400" />}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase ml-1">Return Rate</p>
                  <EditableInput id={`return-${id}`} initialValue={item.expected_return * 100} masterValue={(item.master_return ?? 0.0485) * 100} onCommit={async (newVal) => {
                    const val = newVal / 100;
                    const newConfig = { ...config, assumptions: { ...config.assumptions, [id]: { ...item, expected_return: val } } };
                    setConfig(newConfig);
                    await fetch("http://localhost:8000/api/retirement/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newConfig) });
                    if (activeId === id) fetchData();
                  }} />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase ml-1">Inflation</p>
                  <EditableInput id={`inflation-${id}`} initialValue={item.inflation_rate * 100} masterValue={(item.master_inflation ?? 0.025) * 100} onCommit={async (newVal) => {
                    const val = newVal / 100;
                    const newConfig = { ...config, assumptions: { ...config.assumptions, [id]: { ...item, inflation_rate: val } } };
                    setConfig(newConfig);
                    await fetch("http://localhost:8000/api/retirement/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newConfig) });
                    if (activeId === id) fetchData();
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><TrendingUp size={20} className="text-slate-400" /></div>
          <div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 2. The Verdict & Proof</h3></div>
        </div>
        <div className={cn("p-12 rounded-[3.5rem] border shadow-2xl transition-all duration-1000", activeScenario ? "bg-red-950/10 border-red-900/30" : "bg-slate-900/60 border-slate-800")}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-10">
              <div className="space-y-6">
                <div className={cn("inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest", level.bg, level.color)}>{level.icon} {level.label} Status</div>
                <h2 className="text-3xl font-black text-slate-50 leading-tight">
                  {activeScenario ? <>위기 상황 분석 결과</> : <>혁님은 원하는 모습으로 <br /><span className="text-emerald-400">은퇴할 수 있습니다.</span></>}
                </h2>
                <p className="text-base text-slate-400 font-medium">자산은 향후 <span className="text-slate-100 font-black">{summary.total_survival_years || 0}년</span> 동안 지속 가능합니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <MetricCard label="성장 자산 매도 시작" value={summary.growth_asset_sell_start_date || "-"} tooltip="생활비 충당을 위해 주식을 팔기 시작하는 시점" />
                <MetricCard label="안전 자산 고갈" value={summary.sgov_exhaustion_date || "-"} tooltip="현금성 자산이 0원이 되는 시점" />
              </div>
            </div>
            
            <div className="lg:col-span-7 h-[400px] bg-slate-950/20 rounded-3xl p-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f8fafc" stopOpacity={0.1}/><stop offset="95%" stopColor="#f8fafc" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorCorp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorPen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="index" type="number" domain={[0, 360]} tickFormatter={(v) => `${Math.floor(v/12)}Y`} stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v/100000000).toFixed(0)}억`} stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', fontSize: '12px' }} 
                    labelFormatter={(l) => `${Math.floor(Number(l)/12)}년차 (${l}개월)`}
                    formatter={(v: any, name: string) => {
                      const labels: any = { total_net_worth: "합산 자산", corp_balance: "법인 자산", pension_balance: "연금 자산" };
                      return [`${(Number(v)/100000000).toFixed(1)}억`, labels[name] || name];
                    }} 
                  />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                  
                  {/* 합산 자산 (최상단 라인) */}
                  <Area name="total_net_worth" type="monotone" dataKey="total_net_worth" stroke="#f8fafc" strokeWidth={4} fill="url(#colorTotal)" isAnimationActive={true} />
                  {/* 법인 및 연금 자산 (개별 라인) */}
                  <Area name="corp_balance" type="monotone" dataKey="corp_balance" stroke="#10b981" strokeWidth={2} fill="url(#colorCorp)" isAnimationActive={true} />
                  <Area name="pension_balance" type="monotone" dataKey="pension_balance" stroke="#3b82f6" strokeWidth={2} fill="url(#colorPen)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><Zap size={20} className="text-slate-400" /></div>
          <div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 3. Stress Test</h3></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StressButton active={activeScenario === "BEAR"} onClick={() => handleStressTest("BEAR")} icon={<TrendingDown size={20} />} label="Bear Market" desc="지수 -30% 폭락 주입" />
          <StressButton active={activeScenario === "STAGFLATION"} onClick={() => handleStressTest("STAGFLATION")} icon={<CloudRain size={20} />} label="Stagflation" desc="수익 0% + 물가 4%" />
          <StressButton active={activeScenario === "DIVIDEND_CUT"} onClick={() => handleStressTest("DIVIDEND_CUT")} icon={<Coins size={20} />} label="Dividend Cut" desc="배당금 -25% 삭감" />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><Activity size={20} className="text-slate-400" /></div>
          <div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 4. Health Monitor</h3></div>
        </div>
        <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.length === 0 ? <p className="col-span-full py-10 text-center text-sm font-black uppercase text-slate-600 tracking-widest">All Systems Normal</p> : 
              signals.map((s: any, i: number) => (
                <div key={i} className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={cn(s.level === "RED" ? "text-red-400" : "text-amber-400")} size={16} />
                    <span className="text-xs font-black text-slate-400 uppercase">{Math.floor(s.month/12)}년차 경고</span>
                  </div>
                  <p className="text-sm font-bold text-slate-100 leading-relaxed">{s.message}</p>
                  <p className="text-xs text-slate-500 italic flex items-center gap-1"><ArrowRight size={12} /> {s.suggestion}</p>
                </div>
              ))
            }
          </div>
        </div>
      </section>

      <section className="space-y-6 pb-20">
        <div className="flex items-center gap-3 px-4"><div className="p-2 bg-slate-800 rounded-lg"><Coins size={20} className="text-slate-400" /></div><div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 5. Detailed Log</h3></div></div>
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 z-10 shadow-xl">
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center">Age</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Phase</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">Total NW</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">Loan Bal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-bold">
                {monthlyData.map((m: any, idx: number) => (
                  <tr key={idx} className={cn("hover:bg-slate-800/30 transition-colors group", m.event ? "bg-emerald-500/5" : "")}>
                    <td className="px-6 py-3 text-xs text-slate-400 text-center">{m.year}-{String(m.month).padStart(2, '0')}</td>
                    <td className="px-6 py-3 text-xs text-slate-300 text-center">{m.age}세</td>
                    <td className="px-6 py-3 text-left">
                      <span className={cn("px-2 py-1 rounded text-[9px] font-black uppercase", m.phase === "Phase 1" ? "bg-blue-500/10 text-blue-400" : m.phase === "Phase 2" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>{m.phase}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-200 text-right">{((m.total_net_worth || 0) / 100000000).toFixed(2)}억</td>
                    <td className="px-6 py-3 text-xs text-emerald-400/80 text-right">{((m.loan_balance || 0) / 100000000).toFixed(2)}억</td>
                    <td className="px-6 py-3 text-right">{m.event ? <span className="text-[9px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded">{m.event.name}</span> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer className="pt-10 border-t border-slate-800 flex justify-between items-center px-4">
        <div className="text-sm font-bold text-slate-500 flex items-center gap-3"><Camera size={20} /> 은퇴일 원본 계획 보존 중</div>
        <button onClick={handleTakeSnapshot} disabled={isSnapshotting} className="px-10 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-black rounded-2xl border border-slate-700 transition-all uppercase tracking-widest flex items-center gap-2">{isSnapshotting ? <RefreshCcw className="animate-spin" size={18} /> : <Camera size={18} />} Update Snapshot</button>
      </footer>
    </div>
  );
}

function MetricCard({ label, value, tooltip }: { label: string, value: string, tooltip: string }) {
  return (
    <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 group relative">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{label}</p>
        <div className="group relative">
          <Info size={12} className="text-slate-600 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[10px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal">{tooltip}</div>
        </div>
      </div>
      <span className="text-base font-black text-slate-200">{value}</span>
    </div>
  );
}

function EditableInput({ id, initialValue, masterValue, onCommit }: { id: string, initialValue: number, masterValue: number, onCommit: (val: number) => void }) {
  const [value, setValue] = useState(initialValue.toFixed(1));
  useEffect(() => { setValue(initialValue.toFixed(1)); }, [initialValue]);
  const handleBlur = () => {
    const num = parseFloat(value);
    if (!isNaN(num)) { onCommit(num); setValue(num.toFixed(1)); }
    else { setValue(initialValue.toFixed(1)); }
  };
  return (
    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <div className="relative flex items-center">
        <input id={id} data-testid={id} type="text" className="bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 w-28 text-lg font-black text-emerald-400 outline-none focus:border-emerald-500 transition-all pr-10" value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === "Enter" && (e.target as any).blur()} />
        <span className="absolute right-4 text-xs font-black text-slate-500">%</span>
      </div>
      {Math.abs(initialValue - masterValue) > 0.05 && <button onClick={(e) => { e.stopPropagation(); onCommit(masterValue); }} className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500 rounded-xl text-emerald-400 hover:text-slate-950 transition-all shadow-lg flex items-center gap-2"><RotateCcw size={16} strokeWidth={3} /><span className="text-[10px] font-black uppercase">Reset</span></button>}
    </div>
  );
}

function StressButton({ active, onClick, icon, label, desc }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, desc: string }) {
  return (
    <button onClick={onClick} className={cn("p-8 rounded-[2rem] border transition-all duration-500 text-left group", active ? "bg-red-500 text-slate-950 border-red-400 shadow-xl" : "bg-slate-900/40 border-slate-800 hover:border-red-900/50")}>
      <div className="flex items-center gap-4 mb-3">
        <div className={cn("p-3 rounded-xl", active ? "bg-slate-950/20" : "bg-slate-950 group-hover:bg-red-950/30")}>{icon}</div>
        <span className="text-base font-black uppercase tracking-tight">{label}</span>
      </div>
      <p className={cn("text-xs font-bold", active ? "text-slate-900/70" : "text-slate-500 group-hover:text-red-400/60")}>{desc}</p>
    </button>
  );
}
