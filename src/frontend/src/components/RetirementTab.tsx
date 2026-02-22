import { useState, useEffect } from "react";
import { 
  ShieldCheck, RefreshCcw, CheckCircle2, AlertTriangle, Zap, CloudRain, Coins, 
  TrendingDown, Camera, Activity, AlertCircle, Info, ArrowRight, RotateCcw, TrendingUp
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "../lib/utils";
import type { RetirementConfig } from "../types";

export function RetirementTab() {
  const [config, setConfig] = useState<RetirementConfig | null>(null);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [activeId, setActiveId] = useState<string>("v1");
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

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

  if (isLoading && !simulationData) return <div className="p-20 text-center text-slate-500 font-black animate-pulse">Running Simulation...</div>;
  
  if (errorMessage) return (
    <div className="p-20 text-center space-y-6">
      <div className="flex justify-center"><AlertCircle size={64} className="text-red-500" /></div>
      <h2 className="text-2xl font-black text-slate-50">시뮬레이션 오류</h2>
      <p className="text-slate-400 font-bold max-w-lg mx-auto leading-relaxed">{errorMessage}</p>
      <button onClick={() => fetchData()} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded-xl border border-slate-700 transition-all">다시 시도</button>
    </div>
  );

  if (!config || !simulationData) return <div className="p-20 text-center text-red-400 font-black text-xl tracking-tighter">데이터가 비어있습니다. (설정을 확인하세요)</div>;

  const summary = simulationData.summary || {};
  const monthlyData = simulationData.monthly_data || [];
  const chartData = monthlyData.filter((_: any, i: number) => i % 12 === 0);

  const level = (() => {
    const years = summary.total_survival_years || 0;
    if (years > 40) return { label: "Unshakable", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle2 size={24} /> };
    if (years > 25) return { label: "Solid", color: "text-blue-400", bg: "bg-blue-500/10", icon: <ShieldCheck size={24} /> };
    return { label: "Fragile", color: "text-amber-400", bg: "bg-amber-500/10", icon: <AlertTriangle size={24} /> };
  })();

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-32 max-w-6xl mx-auto">
      {/* Step 1. Assumptions */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><Info size={20} className="text-slate-400" /></div>
          <div>
            <h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 1. Set the Basis</h3>
            <p className="text-sm text-slate-500 font-bold">미래 가정을 선택하거나 수치를 직접 수정하세요.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(config.assumptions || {}).map(([id, item]: [string, any]) => (
            <div key={id} onClick={() => activeId !== id && handleSwitchVersion(id)} className={cn("p-8 rounded-[2rem] border transition-all duration-500 text-left group cursor-pointer", activeId === id ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-900/40 border-slate-800")}>
              <div className="flex justify-between items-start mb-6">
                <h4 className={cn("text-xl font-black", activeId === id ? "text-emerald-400" : "text-slate-400")}>{item.name}</h4>
                {activeId === id && <CheckCircle2 size={24} className="text-emerald-400" />}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1"><p className="text-[10px] font-black text-slate-500 uppercase ml-1">Return</p><p className="text-lg font-black text-slate-200">{(item.expected_return * 100).toFixed(1)}%</p></div>
                <div className="space-y-1"><p className="text-[10px] font-black text-slate-500 uppercase ml-1">Inflation</p><p className="text-lg font-black text-slate-200">{(item.inflation_rate * 100).toFixed(1)}%</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2. Verdict */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 px-4">
          <div className="p-2 bg-slate-800 rounded-lg"><TrendingUp size={20} className="text-slate-400" /></div>
          <div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 2. The Verdict</h3></div>
        </div>
        <div className="p-12 rounded-[3.5rem] border shadow-2xl bg-slate-900/60 border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-10">
              <div className="space-y-6">
                <div className={cn("inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest", level.bg, level.color)}>{level.icon} {level.label}</div>
                <h2 className="text-3xl font-black text-slate-50 leading-tight">혁님은 원하는 모습으로 <br /><span className="text-emerald-400">은퇴할 수 있습니다.</span></h2>
                <p className="text-base text-slate-400 font-medium">자산은 향후 <span className="text-slate-100 font-black">{summary.total_survival_years || 0}년</span> 동안 지속 가능합니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800"><p className="text-[10px] text-slate-500 mb-2 uppercase">SGOV Exhaust</p><span className="text-base font-black text-slate-200">{summary.sgov_exhaustion_date || "-"}</span></div>
                <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800"><p className="text-[10px] text-slate-500 mb-2 uppercase">Growth Sell</p><span className="text-base font-black text-slate-200">{summary.growth_asset_sell_start_date || "-"}</span></div>
              </div>
            </div>
            <div className="lg:col-span-7 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <XAxis dataKey="year" tickFormatter={(v) => `${v}Y`} stroke="#334155" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v/100000000).toFixed(0)}억`} stroke="#334155" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => [`${(Number(v)/100000000).toFixed(1)}억`]} />
                  <Area type="monotone" dataKey="corp_balance" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="pension_balance" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3. Stress Test */}
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

      {/* Step 5. Detailed Log */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4"><div className="p-2 bg-slate-800 rounded-lg"><Coins size={20} className="text-slate-400" /></div><div><h3 className="text-base font-black text-slate-300 uppercase tracking-widest">Step 5. Detailed Log</h3></div></div>
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 z-10 shadow-xl">
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center"><HeaderWithTooltip label="Date" tooltip="시뮬레이션상의 연도와 월" /></th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center"><HeaderWithTooltip label="Age" tooltip="사용자의 실제 만 나이" /></th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase"><HeaderWithTooltip label="Phase" tooltip="1:법인운영, 2:개인연금개시, 3:국민연금개시 단계" /></th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase"><HeaderWithTooltip label="Total NW" tooltip="법인 및 개인 연금 자산의 총 합계 (Net Worth)" /></th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase"><HeaderWithTooltip label="Loan Bal" tooltip="비과세 인출 가능한 주주대여금(가수금) 잔액" /></th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase"><HeaderWithTooltip label="Corp Cost" tooltip="법인 운영 총 비용 (급여+보험료+고정비)" /></th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase"><HeaderWithTooltip label="Health Prem" tooltip="개인 부담 건강보험료 (직장가입자 본인부담분)" alignRight /></th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase"><HeaderWithTooltip label="Event" tooltip="해당 월에 발생한 특별한 자금 유입/지출" alignRight /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {monthlyData.map((m: any, idx: number) => (
                  <tr key={idx} className={cn("hover:bg-slate-800/30 transition-colors group text-center", m.event ? "bg-emerald-500/5" : "")}>
                    <td className="px-6 py-3 text-xs font-bold text-slate-400">{m.year}-{String(m.month).padStart(2, '0')}</td>
                    <td className="px-6 py-3 text-xs font-black text-slate-300">{m.age}세</td>
                    <td className="px-6 py-3 text-left">
                      <span className={cn(
                        "px-2 py-1 rounded text-[9px] font-black uppercase",
                        m.phase === "Phase 1" ? "bg-blue-500/10 text-blue-400" : 
                        m.phase === "Phase 2" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      )}>{m.phase}</span>
                    </td>
                    <td className="px-6 py-3 text-xs font-black text-slate-200 text-left">{((m.total_net_worth || 0) / 100000000).toFixed(2)}억</td>
                    <td className="px-6 py-3 text-xs font-bold text-emerald-400/80 text-left">{((m.loan_balance || 0) / 100000000).toFixed(2)}억</td>
                    <td className="px-6 py-3 text-xs font-bold text-rose-400/70 text-left">{((m.corp_cost || 0) / 10000).toFixed(0)}만</td>
                    <td className="px-6 py-3 text-xs font-bold text-amber-400/70 text-left">{((m.health_premium || 0) / 10000).toFixed(1)}만</td>
                    <td className="px-6 py-3 text-left">{m.event ? <span className="text-[9px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded">{m.event.name}</span> : "-"}</td>
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

function HeaderWithTooltip({ label, tooltip, alignRight }: { label: string, tooltip: string, alignRight?: boolean }) {
  return (
    <div className="flex items-center gap-1 justify-center md:justify-start group relative cursor-help">
      <span>{label}</span>
      <Info size={10} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
      <div className={cn(
        "absolute top-full mt-2 hidden group-hover:block z-50 w-48 bg-slate-800 p-3 rounded-xl text-[10px] font-bold text-slate-300 shadow-2xl border border-slate-700 leading-relaxed text-left normal-case tracking-normal",
        alignRight ? "right-0" : "left-0"
      )}>
        {tooltip}
      </div>
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
