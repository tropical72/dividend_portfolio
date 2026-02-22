import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  RefreshCcw, 
  CheckCircle2,
  AlertTriangle,
  Zap,
  CloudRain,
  Coins,
  TrendingDown,
  Camera,
  Activity,
  AlertCircle,
  Info,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { cn } from "../lib/utils";
import type { RetirementConfig } from "../types";

/** 은퇴 전략 시뮬레이션 결과 및 시각화 탭 [REQ-RAMS-07] */
export function RetirementTab() {
  const [config, setConfig] = useState<RetirementConfig | null>(null);
  const [simulationData, setSimulationData] = useState<{
    summary: { 
      total_survival_years: number;
      sgov_exhaustion_date: string;
      growth_asset_sell_start_date: string;
      is_permanent: boolean;
      infinite_with_10pct_cut?: boolean;
      signals?: Array<{ type: string; level: string; message: string; suggestion: string; month: number }>;
    };
    monthly_data: Array<{
      month: number;
      corp_balance: number;
      pension_balance: number;
      total_net_worth: number;
      target_cashflow: number;
      state?: string;
    }>;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<{
    snapshot_date: string;
    config: RetirementConfig;
    summary: { total_survival_years: number };
  } | null>(null);
  const [activeId, setActiveId] = useState<string>("v1");
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  // 데이터 로드
  const fetchData = async (scenarioId: string | null = null) => {
    setIsLoading(true);
    try {
      const configRes = await fetch("http://localhost:8000/api/retirement/config");
      const configData = await configRes.json();
      if (configData.success) {
        setConfig(configData.data);
        setActiveId(configData.data.active_assumption_id || "v1");
        
        const simUrl = scenarioId 
          ? `http://localhost:8000/api/retirement/simulate?scenario=${scenarioId}`
          : `http://localhost:8000/api/retirement/simulate`;
          
        const simRes = await fetch(simUrl);
        const simData = await simRes.json();
        if (simData.success) setSimulationData(simData.data);
      }

      const snapRes = await fetch("http://localhost:8000/api/retirement/snapshot");
      const snapData = await snapRes.json();
      if (snapData.success && snapData.data.snapshot_date) setSnapshot(snapData.data);
    } catch (err) {
      console.error("Simulation load error:", err);
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
    const snapshotData = {
      snapshot_date: new Date().toISOString().split('T')[0],
      config: config,
      summary: simulationData.summary
    };
    try {
      await fetch("http://localhost:8000/api/retirement/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshotData)
      });
      setSnapshot(snapshotData);
      alert("은퇴일 스냅샷이 저장되었습니다.");
    } catch (err) { console.error(err); } finally { setIsSnapshotting(false); }
  };

  if (isLoading && !simulationData) return <div className="p-20 text-center text-slate-500 font-black animate-pulse" data-testid="retirement-tab-content">Running Monte Carlo Simulation...</div>;
  if (!config || !simulationData || !simulationData.monthly_data) {
    return (
      <div className="p-20 text-center text-red-400" data-testid="retirement-tab-content">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <h3 className="text-xl font-black">Simulation Data Error</h3>
        <p className="text-sm opacity-80 mt-2">서버로부터 데이터를 가져오지 못했습니다.</p>
      </div>
    );
  }

  const summary = simulationData.summary;
  const chartData = simulationData.monthly_data.filter((_, i) => i % 12 === 0);
  const signals = summary.signals || [];

  const getAssuranceLevel = () => {
    if (summary.total_survival_years > 40) return { label: "Unshakable", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle2 size={24} /> };
    if (summary.total_survival_years > 25) return { label: "Solid", color: "text-blue-400", bg: "bg-blue-500/10", icon: <ShieldCheck size={24} /> };
    return { label: "Fragile", color: "text-amber-400", bg: "bg-amber-500/10", icon: <AlertTriangle size={24} /> };
  };

  const level = getAssuranceLevel();

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-32 max-w-6xl mx-auto" data-testid="retirement-tab-content">
      
      {/* Step 1. Set the Basis */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><Info size={18} className="text-slate-400" /></div>
          <div>
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Step 1. Set the Basis</h3>
            <p className="text-[11px] text-slate-500 font-bold">미래 가정을 선택하거나 수치를 직접 수정하세요. (Enter로 확정)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(config.assumptions).map(([id, item]) => (
            <div 
              key={id} 
              onClick={() => activeId !== id && handleSwitchVersion(id)} 
              className={cn(
                "p-6 rounded-[2rem] border transition-all duration-500 text-left group relative", 
                activeId === id && !activeScenario ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20" : "bg-slate-900/40 border-slate-800 hover:border-slate-700 cursor-pointer"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className={cn("text-lg font-black tracking-tight", activeId === id ? "text-emerald-400" : "text-slate-400")}>{item.name}</h4>
                {activeId === id && <CheckCircle2 size={20} className="text-emerald-400" />}
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Return Rate</p>
                  <EditableInput 
                    initialValue={item.expected_return * 100}
                    masterValue={(item.master_return ?? item.expected_return) * 100}
                    onCommit={async (newVal) => {
                      const val = newVal / 100;
                      const newConfig = {
                        ...config,
                        assumptions: { ...config.assumptions, [id]: { ...item, expected_return: val } }
                      };
                      setConfig(newConfig);
                      await fetch("http://localhost:8000/api/retirement/config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newConfig)
                      });
                      if (activeId === id) fetchData();
                    }}
                  />
                </div>
                
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inflation</p>
                  <EditableInput 
                    initialValue={item.inflation_rate * 100}
                    masterValue={(item.master_inflation ?? item.inflation_rate) * 100}
                    onCommit={async (newVal) => {
                      const val = newVal / 100;
                      const newConfig = {
                        ...config,
                        assumptions: { ...config.assumptions, [id]: { ...item, inflation_rate: val } }
                      };
                      setConfig(newConfig);
                      await fetch("http://localhost:8000/api/retirement/config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newConfig)
                      });
                      if (activeId === id) fetchData();
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2. Verdict & Proof */}
      <section className="space-y-8">
        <div className={cn("p-10 rounded-[3.5rem] border shadow-2xl transition-all duration-1000", activeScenario ? "bg-red-950/10 border-red-900/30" : "bg-slate-900/60 border-slate-800")}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-4">
                <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]", level.bg, level.color)}>
                  {level.icon} {level.label} Status
                </div>
                <h2 className="text-4xl font-black text-slate-50 tracking-tighter leading-tight">
                  {activeScenario ? <>위기 상황 분석 결과</> : <>혁님은 원하는 모습으로 <br /><span className="text-emerald-400">은퇴할 수 있습니다.</span></>}
                </h2>
                <p className="text-slate-400 text-sm font-medium">자산은 향후 {summary.total_survival_years}년 동안 지속 가능합니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-black">
                <div className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800"><p className="text-slate-500 mb-1">Growth Sell</p>{summary.growth_asset_sell_start_date}</div>
                <div className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800"><p className="text-slate-500 mb-1">SGOV Zero</p>{summary.sgov_exhaustion_date}</div>
              </div>
            </div>

            <div className="lg:col-span-7 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tickFormatter={(v) => `${Math.floor(v/12)}Y`} stroke="#334155" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v/100000000).toFixed(0)}억`} stroke="#334155" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1rem' }} formatter={(v: any) => [`${(Number(v)/100000000).toFixed(1)}억`]} />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" formatter={(val) => <span className="text-[10px] font-black text-slate-500 uppercase ml-1">{val === 'corp_balance' ? 'Corp' : 'Pension'}</span>} />
                  <Area name="corp_balance" type="monotone" dataKey="corp_balance" stackId="1" stroke="#10b981" fill="url(#colorC)" />
                  <Area name="pension_balance" type="monotone" dataKey="pension_balance" stackId="1" stroke="#3b82f6" fill="url(#colorP)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3. Stress Test */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><Zap size={18} className="text-slate-400" /></div>
          <div>
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Step 3. Stress Test</h3>
            <p className="text-[11px] text-slate-500 font-bold">최악의 상황을 검증하세요.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StressButton active={activeScenario === "BEAR"} onClick={() => handleStressTest("BEAR")} icon={<TrendingDown size={18} />} label="Bear Market" desc="지수 -30% 폭락 주입" />
          <StressButton active={activeScenario === "STAGFLATION"} onClick={() => handleStressTest("STAGFLATION")} icon={<CloudRain size={18} />} label="Stagflation" desc="수익 0% + 물가 4%" />
          <StressButton active={activeScenario === "DIVIDEND_CUT"} onClick={() => handleStressTest("DIVIDEND_CUT")} icon={<Coins size={18} />} label="Dividend Cut" desc="배당금 -25% 삭감" />
        </div>
      </section>

      {/* Step 4. Health Monitor */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><Activity size={18} className="text-slate-400" /></div>
          <div>
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Step 4. Health Monitor</h3>
            <p className="text-[11px] text-slate-500 font-bold">운영 조언 및 경고입니다.</p>
          </div>
        </div>
        <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signals.length === 0 ? <p className="col-span-full py-10 text-center text-xs font-black uppercase text-slate-600">All Systems Normal</p> : 
              signals.map((s, i) => (
                <div key={i} className="bg-slate-950/50 border border-slate-800 p-5 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={cn(s.level === "RED" ? "text-red-400" : "text-amber-400")} size={14} />
                    <span className="text-[10px] font-black text-slate-400 uppercase">{Math.floor(s.month/12)}년차 경고</span>
                  </div>
                  <p className="text-xs font-bold text-slate-100 leading-relaxed">{s.message}</p>
                  <p className="text-[10px] text-slate-500 italic flex items-center gap-1"><ArrowRight size={10} /> {s.suggestion}</p>
                </div>
              ))
            }
          </div>
        </div>
      </section>

      {/* Snapshot */}
      <footer className="pt-10 border-t border-slate-800 flex justify-between items-center px-4">
        <div className="text-xs font-bold text-slate-500 flex items-center gap-3">
          <Camera size={18} /> {snapshot ? `은퇴일 원본 계획(${snapshot.snapshot_date}) 보존 중` : "원본 계획을 박제하세요."}
        </div>
        <button onClick={handleTakeSnapshot} disabled={isSnapshotting} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-2xl border border-slate-700 transition-all uppercase tracking-widest flex items-center gap-2">
          {isSnapshotting ? <RefreshCcw className="animate-spin" size={16} /> : <Camera size={16} />}
          {snapshot ? "Update Snapshot" : "Set Retirement Date"}
        </button>
      </footer>
    </div>
  );
}

/** [REQ-UI-03] 엔터 키 지원, 자동 포맷팅, 기본값 되돌리기 버튼 포함 입력 컴포넌트 */
function EditableInput({ initialValue, masterValue, onCommit }: { initialValue: number, masterValue: number, onCommit: (val: number) => void }) {
  const [value, setValue] = useState(initialValue.toFixed(1));

  useEffect(() => {
    setValue(initialValue.toFixed(1));
  }, [initialValue]);

  const handleBlur = () => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onCommit(num);
      setValue(num.toFixed(1));
    } else {
      setValue(initialValue.toFixed(1));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
  };

  const isChanged = Math.abs(initialValue - masterValue) > 0.01;

  return (
    <div className="flex items-center gap-2">
      <div className="relative group/input flex items-center">
        <input 
          type="text"
          className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-1.5 w-20 text-sm font-black text-slate-200 outline-none focus:border-emerald-500/50 transition-all pr-8"
          value={value}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <span className="absolute right-3 text-[10px] font-bold text-slate-600">%</span>
      </div>
      {isChanged && (
        <button 
          onClick={(e) => { e.stopPropagation(); onCommit(masterValue); }}
          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-xl text-emerald-400 transition-all shadow-lg animate-in zoom-in duration-300 flex items-center justify-center shrink-0"
          title={`마스터 설정값(${masterValue.toFixed(1)}%)으로 되돌리기`}
        >
          <RotateCcw size={14} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

function StressButton({ active, onClick, icon, label, desc }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, desc: string }) {
  return (
    <button onClick={onClick} className={cn("p-6 rounded-[2rem] border transition-all duration-500 text-left group", active ? "bg-red-500 text-slate-950 border-red-400" : "bg-slate-950 text-slate-400 border-slate-800 hover:border-red-900/50")}>
      <div className="flex items-center gap-3 mb-2"><div className={cn("p-2 rounded-lg", active ? "bg-slate-950/20" : "bg-slate-900 group-hover:bg-red-950/30")}>{icon}</div><span className="text-sm font-black uppercase tracking-tight">{label}</span></div>
      <p className={cn("text-[10px] font-bold", active ? "text-slate-900/70" : "text-slate-600 group-hover:text-red-400/60")}>{desc}</p>
    </button>
  );
}
