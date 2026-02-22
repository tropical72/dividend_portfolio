import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  RefreshCcw, 
  CheckCircle2,
  AlertTriangle,
  History,
  Zap,
  CloudRain,
  Coins,
  TrendingDown,
  Camera
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { cn } from "../lib/utils";
import type { RetirementConfig } from "../types";

/** 은퇴 시뮬레이션 결과 및 시각화 탭 [REQ-RAMS-07] */
export function RetirementTab() {
  const [config, setConfig] = useState<RetirementConfig | null>(null);
  const [simulationData, setSimulationData] = useState<{
    summary: { 
      total_survival_years: number;
      sgov_exhaustion_date: string;
      growth_asset_sell_start_date: string;
      is_permanent: boolean;
      infinite_with_10pct_cut?: boolean;
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

  // 설정 및 시뮬레이션 로드
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
        if (simData.success) {
          setSimulationData(simData.data);
        }
      }

      // 스냅샷 로드
      const snapRes = await fetch("http://localhost:8000/api/retirement/snapshot");
      const snapData = await snapRes.json();
      if (snapData.success && snapData.data.snapshot_date) {
        setSnapshot(snapData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /** 시나리오 버전 스위칭 */
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
    } catch (err) {
      console.error(err);
    }
  };

  /** 스트레스 테스트 실행 */
  const handleStressTest = (scenarioId: string) => {
    const newScenario = activeScenario === scenarioId ? null : scenarioId;
    setActiveScenario(newScenario);
    fetchData(newScenario);
  };

  /** 스냅샷 생성 [REQ-RAMS-7.4] */
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
      alert("은퇴일 스냅샷이 성공적으로 박제되었습니다.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSnapshotting(false);
    }
  };

  if (isLoading && !simulationData) return <div className="p-20 text-center text-slate-500 font-black animate-pulse" data-testid="retirement-tab-content">Running Monte Carlo Simulation...</div>;
  if (!config || !simulationData || !simulationData.monthly_data) {
    return (
      <div className="p-20 text-center text-red-400" data-testid="retirement-tab-content">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <h3 className="text-xl font-black">Simulation Data Error</h3>
        <p className="text-sm opacity-80 mt-2">서버로부터 시뮬레이션 데이터를 가져오지 못했습니다.</p>
      </div>
    );
  }

  const summary = simulationData.summary;
  const chartData = simulationData.monthly_data.filter((_, i) => i % 12 === 0);

  const getAssuranceLevel = () => {
    if (summary.total_survival_years > 40) return { label: "Unshakable", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle2 size={24} /> };
    if (summary.total_survival_years > 25) return { label: "Solid", color: "text-blue-400", bg: "bg-blue-500/10", icon: <ShieldCheck size={24} /> };
    return { label: "Fragile", color: "text-amber-400", bg: "bg-amber-500/10", icon: <AlertTriangle size={24} /> };
  };

  const level = getAssuranceLevel();

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20" data-testid="retirement-tab-content">
      {/* 1. Psychological Header */}
      <div className={cn(
        "flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-10 rounded-[3rem] border shadow-2xl relative overflow-hidden transition-all duration-1000",
        activeScenario ? "bg-red-950/20 border-red-900/50" : "bg-slate-900/60 border-slate-800"
      )}>
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
        
        <div className="space-y-4 relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest", level.bg, level.color)}>
            {level.icon} {level.label} Status
          </div>
          <h2 className="text-4xl font-black text-slate-50 tracking-tighter leading-tight">
            {activeScenario ? (
              <>가장 혹독한 시나리오에서의 <br /><span className="text-red-400">생존 가능성입니다.</span></>
            ) : (
              <>"마스터는 원하는 모습으로 <br /><span className="text-emerald-400">은퇴할 수 있습니다.</span>"</>
            )}
          </h2>
          <p className="text-slate-400 font-medium max-w-lg">
            {summary.is_permanent 
              ? "30년 시뮬레이션 기간 동안 원금 훼손 없이 안전 버퍼(SGOV)만으로 현금흐름 유지가 가능합니다."
              : `SGOV 고갈 시점은 ${summary.sgov_exhaustion_date}이며, 이후 ${summary.growth_asset_sell_start_date}부터 성장 자산 매도가 시작될 것으로 예측됩니다.`
            }
          </p>
        </div>

        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex bg-slate-950 p-1.5 rounded-[1.5rem] border border-slate-800">
            {Object.entries(config.assumptions).map(([id, item]) => (
              <button 
                key={id}
                onClick={() => handleSwitchVersion(id)}
                className={cn(
                  "px-6 py-2.5 text-[10px] font-black rounded-2xl transition-all duration-300 flex items-center gap-2 uppercase tracking-widest",
                  activeId === id && !activeScenario
                    ? "bg-emerald-500 text-slate-950 shadow-lg" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <RefreshCcw size={12} className={cn(activeId === id && !activeScenario && "animate-spin-slow")} />
                {item.name}
              </button>
            ))}
          </div>
          <button 
            onClick={handleTakeSnapshot}
            disabled={isSnapshotting}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-black rounded-2xl border border-slate-700 transition-all uppercase tracking-widest"
          >
            {isSnapshotting ? <RefreshCcw className="animate-spin" size={16} /> : <Camera size={16} />}
            {snapshot ? `Snapshot: ${snapshot.snapshot_date}` : "Take Retirement Snapshot"}
          </button>
        </div>
      </div>

      {/* 2. Snapshot Comparison Info [New] */}
      {snapshot && !activeScenario && (
        <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <History size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Original Plan Comparison</p>
              <p className="text-slate-300 text-sm font-bold">은퇴 당시({snapshot.snapshot_date}) 계획 대비 현재 설계의 오차를 분석 중입니다.</p>
            </div>
          </div>
          <div className="flex gap-8 px-6">
            <div className="text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Original Years</p>
              <p className="text-lg font-black text-slate-300">{snapshot.summary.total_survival_years}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Current Diff</p>
              <p className={cn(
                "text-lg font-black",
                summary.total_survival_years >= snapshot.summary.total_survival_years ? "text-emerald-400" : "text-red-400"
              )}>
                {summary.total_survival_years - snapshot.summary.total_survival_years >= 0 ? "+" : ""}
                {summary.total_survival_years - snapshot.summary.total_survival_years} Yrs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Stress Test Toolbar */}
      <div className="bg-slate-900/40 p-4 rounded-3xl border border-slate-800 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 border-r border-slate-800 mr-2">
          <Zap size={16} className="text-amber-400" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stress Scenarios</span>
        </div>
        
        <button 
          onClick={() => handleStressTest("BEAR")}
          className={cn(
            "px-6 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 border uppercase tracking-widest",
            activeScenario === "BEAR" ? "bg-red-500 text-slate-950 border-red-400" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-red-400"
          )}
        >
          <TrendingDown size={14} /> Bear Market (-30%)
        </button>

        <button 
          onClick={() => handleStressTest("STAGFLATION")}
          className={cn(
            "px-6 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 border uppercase tracking-widest",
            activeScenario === "STAGFLATION" ? "bg-red-500 text-slate-950 border-red-400" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-red-400"
          )}
        >
          <CloudRain size={14} /> Stagflation
        </button>

        <button 
          onClick={() => handleStressTest("DIVIDEND_CUT")}
          className={cn(
            "px-6 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 border uppercase tracking-widest",
            activeScenario === "DIVIDEND_CUT" ? "bg-red-500 text-slate-950 border-red-400" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-red-400"
          )}
        >
          <Coins size={14} /> Dividend Cut (-25%)
        </button>

        {activeScenario && (
          <button 
            onClick={() => { setActiveScenario(null); fetchData(); }}
            className="ml-auto text-[10px] font-black text-emerald-400 flex items-center gap-1 hover:underline"
          >
            <RefreshCcw size={12} /> Reset to Normal
          </button>
        )}
      </div>

      {/* 4. Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 relative overflow-hidden group">
          {summary.infinite_with_10pct_cut && (
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-700" />
          )}
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-blue-500" /> Sustainability
          </p>
          <div className="space-y-2">
            <h3 className="text-5xl font-black text-slate-50 tracking-tighter">
              {summary.total_survival_years}<span className="text-xl text-slate-500 font-black ml-1 uppercase">Years</span>
            </h3>
            {summary.infinite_with_10pct_cut ? (
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 size={12} /> Permanent at 10% cost cut
              </p>
            ) : (
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Standard retirement profile</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-blue-500" /> Exhaustion Target
          </p>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-50 tracking-tighter">
              {summary.growth_asset_sell_start_date}
            </h3>
            <p className="text-[10px] text-blue-400/60 font-black uppercase tracking-widest">Growth Asset Sell Start</p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <PieChart size={14} className="text-amber-500" /> Buffer Status
          </p>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-50 tracking-tighter">
              {summary.sgov_exhaustion_date}
            </h3>
            <p className="text-[10px] text-amber-400/60 font-black uppercase tracking-widest">SGOV Depletion Point</p>
          </div>
        </div>
      </div>

      {/* 5. 30-Year Asset Projection Chart */}
      <div className={cn(
        "bg-slate-950/60 border rounded-[3.5rem] p-10 shadow-inner transition-all duration-1000",
        activeScenario ? "border-red-900/30" : "border-slate-800"
      )}>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <XAxis dataKey="month" tickFormatter={(v) => `Y${Math.floor(v/12)}`} stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v/100000000).toFixed(1)}억`} stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1.5rem', fontSize: '12px', fontWeight: 'bold' }}
                formatter={(v: number) => [`${(v/100000000).toFixed(2)}억 KRW`]}
              />
              <Area type="monotone" dataKey="corp_balance" stackId="1" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.1} />
              <Area type="monotone" dataKey="pension_balance" stackId="1" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
