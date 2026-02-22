import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  TrendingUp, 
  RefreshCcw, 
  PieChart,
  CheckCircle2,
  AlertTriangle,
  History
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { cn } from "../lib/utils";
import type { RetirementConfig } from "../types";

/** 은퇴 시뮬레이션 결과 및 시각화 탭 [REQ-RAMS-07] */
export function RetirementTab() {
  const [config, setConfig] = useState<RetirementConfig | null>(null);
  const [simulationData, setSimulationData] = useState<{
    summary: { total_survival_years: number };
    monthly_data: Array<{
      month: number;
      corp_balance: number;
      pension_balance: number;
      total_net_worth: number;
      target_cashflow: number;
    }>;
  } | null>(null);
  const [activeId, setActiveId] = useState<string>("v1");
  const [isLoading, setIsLoading] = useState(true);

  // 설정 및 시뮬레이션 로드
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const configRes = await fetch("http://localhost:8000/api/retirement/config");
      const configData = await configRes.json();
      
      if (configData.success) {
        setConfig(configData.data);
        setActiveId(configData.data.active_assumption_id || "v1");
        
        // 시뮬레이션 즉시 실행
        const simRes = await fetch("http://localhost:8000/api/retirement/simulate");
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

  /** 시나리오 변경 시 재시뮬레이션 */
  const handleSwitchVersion = async (id: string) => {
    setActiveId(id);
    try {
      await fetch("http://localhost:8000/api/retirement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_assumption_id: id })
      });
      // 버전 변경 후 다시 데이터 로드 (재시뮬레이션 포함)
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading && !simulationData) return <div className="p-20 text-center text-slate-500 font-black animate-pulse">Running Monte Carlo Simulation...</div>;
  if (!config || !simulationData) return <div className="p-20 text-center text-red-400">Failed to load data.</div>;

  const currentAssumption = config.assumptions[activeId] || config.assumptions["v1"];
  const summary = simulationData.summary;
  const chartData = simulationData.monthly_data.filter((_, i) => i % 12 === 0); // 연단위로 축소해서 표시

  // 심리적 안도감 등급 판정
  const getAssuranceLevel = () => {
    if (summary.total_survival_years > 40) return { label: "Unshakable", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle2 size={24} /> };
    if (summary.total_survival_years > 25) return { label: "Solid", color: "text-blue-400", bg: "bg-blue-500/10", icon: <ShieldCheck size={24} /> };
    return { label: "Fragile", color: "text-amber-400", bg: "bg-amber-500/10", icon: <AlertTriangle size={24} /> };
  };

  const level = getAssuranceLevel();

  // 상세 분석 텍스트 생성
  const getDetailedInsight = () => {
    if (summary.is_permanent) {
      return "30년 시뮬레이션 기간 동안 원금 훼손 없이 안전 버퍼(SGOV)만으로 현금흐름 유지가 가능합니다.";
    }
    return `SGOV 고갈 시점은 ${summary.sgov_exhaustion_date}이며, 이후 ${summary.growth_asset_sell_start_date}부터 성장 자산 매도가 시작될 것으로 예측됩니다.`;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20" data-testid="retirement-tab-content">
      {/* 1. Psychological Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-900/60 p-10 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
        
        <div className="space-y-4 relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest", level.bg, level.color)}>
            {level.icon} {level.label} Status
          </div>
          <h2 className="text-4xl font-black text-slate-50 tracking-tighter leading-tight">
            "마스터는 원하는 모습으로 <br />
            <span className="text-emerald-400 font-black">은퇴할 수 있습니다.</span>"
          </h2>
          <p className="text-slate-400 font-medium max-w-lg">
            {getDetailedInsight()}
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
                  activeId === id 
                    ? "bg-emerald-500 text-slate-950 shadow-lg" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <RefreshCcw size={12} className={cn(activeId === id && "animate-spin-slow")} />
                {item.name}
              </button>
            ))}
          </div>
          <button className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-2xl border border-slate-700 transition-all uppercase tracking-widest">
            <History size={16} /> Take Retirement Snapshot
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-500" /> Return & Inflation
          </p>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-sm text-slate-400 font-bold uppercase tracking-tighter text-[11px]">Return Rate</span>
              <span className="text-2xl font-black text-slate-50">{(currentAssumption.expected_return * 100).toFixed(2)}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]" style={{ width: `${currentAssumption.expected_return * 100 * 5}%` }} />
            </div>
          </div>
        </div>

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

      {/* 3. 30-Year Asset Projection Chart */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-[3.5rem] p-10 shadow-inner">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h4 className="text-xl font-black text-slate-50 tracking-tight flex items-center gap-3">
              Long-term Asset Trajectory <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-400 uppercase tracking-widest">30 Year Scale</span>
            </h4>
            <p className="text-slate-500 text-xs mt-1 font-bold">인플레이션과 복리 수익률을 반영한 자산 잔액 추이 (단위: KRW)</p>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corp Asset</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pension Asset</span>
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCorp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPension" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="month" 
                tickFormatter={(val) => `Y${Math.floor(val/12)}`}
                stroke="#475569" 
                fontSize={10} 
                fontWeight="bold"
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={10} 
                fontWeight="bold"
                tickFormatter={(val) => `${(val / 100000000).toFixed(1)}억`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1.5rem', fontSize: '12px', fontWeight: 'bold' }}
                itemStyle={{ fontWeight: 'black' }}
                formatter={(val: number) => [`${(val / 100000000).toFixed(2)}억 KRW`]}
                labelFormatter={(val) => `은퇴 후 ${Math.floor(Number(val)/12)}년차`}
              />
              <Area 
                type="monotone" 
                dataKey="corp_balance" 
                stackId="1"
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCorp)" 
              />
              <Area 
                type="monotone" 
                dataKey="pension_balance" 
                stackId="1"
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPension)" 
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
