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
  TrendingDown
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
  const [activeId, setActiveId] = useState<string>("v1");
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading && !simulationData) return <div className="p-20 text-center text-slate-500 font-black animate-pulse">Running Monte Carlo Simulation...</div>;
  if (!config || !simulationData) return <div className="p-20 text-center text-red-400">Failed to load data.</div>;

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
          <button className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-2xl border border-slate-700 transition-all uppercase tracking-widest">
            <History size={16} /> Take Retirement Snapshot
          </button>
        </div>
      </div>

      {/* 2. Stress Test Toolbar */}
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

      {/* 3. 30-Year Asset Projection Chart */}
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
