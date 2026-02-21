import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  TrendingUp, 
  Settings2, 
  RefreshCcw, 
  AlertCircle,
  BarChart3,
  Calendar,
  PieChart
} from "lucide-react";
import { cn } from "../lib/utils";

/** 은퇴 시뮬레이션 탭 컴포넌트 [REQ-RAMS-07] */
export function RetirementTab() {
  const [config, setConfig] = useState<any>(null);
  const [activeId, setActiveId] = useState<string>("v1");
  const [isLoading, setIsLoading] = useState(true);

  // 설정 로드
  useEffect(() => {
    fetch("http://localhost:8000/api/retirement/config")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setConfig(res.data);
          setActiveId(res.data.active_assumption_id || "v1");
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  /** 시나리오 버전 스위칭 */
  const handleSwitchVersion = async (id: string) => {
    setActiveId(id);
    // 백엔드에 현재 활성 버전 업데이트 (옵션)
    try {
      await fetch("http://localhost:8000/api/retirement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_assumption_id: id })
      });
    } catch (err) {
      console.error("Failed to update active version:", err);
    }
  };

  if (isLoading) return <div className="p-20 text-center text-slate-500 font-black animate-pulse">Loading Simulation Engine...</div>;
  if (!config) return <div className="p-20 text-center text-red-400">Failed to load retirement configuration.</div>;

  const currentAssumption = config.assumptions[activeId] || config.assumptions["v1"];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* 상단 헤더 및 시나리오 선택 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h2 className="text-3xl font-black text-slate-50 flex items-center gap-3 tracking-tight">
            <ShieldCheck className="text-emerald-400" size={32} /> Retirement Strategic Planner
          </h2>
          <p className="text-slate-400 text-sm mt-2 font-medium">마스터의 30년 은퇴 자산 운용 및 인출 전략 시뮬레이션</p>
        </div>

        <div className="flex bg-slate-900/50 p-1.5 rounded-[1.5rem] border border-slate-800 shadow-inner">
          {Object.entries(config.assumptions).map(([id, item]: [string, any]) => (
            <button 
              key={id}
              onClick={() => handleSwitchVersion(id)}
              className={cn(
                "px-6 py-2.5 text-xs font-black rounded-2xl transition-all duration-300 flex items-center gap-2",
                activeId === id 
                  ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <RefreshCcw size={14} className={cn(activeId === id && "animate-spin-slow")} />
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 섹션 (Psychological Dashboard 기초) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Current Assumption</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400 font-bold">Return Rate</span>
              <span className="text-lg font-black text-emerald-400">{(currentAssumption.expected_return * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400 font-bold">Inflation</span>
              <span className="text-lg font-black text-amber-400">{(currentAssumption.inflation_rate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8 relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -top-4 w-32 h-32 text-emerald-500/5 rotate-12" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-4">Sustainability</p>
            <h3 className="text-4xl font-black text-slate-50 tracking-tighter">45+ <span className="text-xl text-slate-500 font-bold">Years</span></h3>
            <p className="text-xs text-emerald-400/60 font-bold mt-2 uppercase tracking-tighter">Safe to retire as planned</p>
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] p-8 relative overflow-hidden">
          <PieChart className="absolute -right-4 -top-4 w-32 h-32 text-blue-500/5 -rotate-12" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest mb-4">Safe Buffer (SGOV)</p>
            <h3 className="text-4xl font-black text-slate-50 tracking-tighter">32 <span className="text-xl text-slate-500 font-bold">Months</span></h3>
            <p className="text-xs text-blue-400/60 font-bold mt-2 uppercase tracking-tighter">Target: 30 Months</p>
          </div>
        </div>
      </div>

      {/* 시뮬레이션 메인 영역 (차트 등) */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-[3rem] p-10 h-[500px] flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent opacity-50" />
        <BarChart3 size={64} className="text-slate-800 group-hover:text-emerald-500/20 transition-all duration-700" />
        <div className="space-y-2 relative z-10">
          <h4 className="text-xl font-black text-slate-200 tracking-tight">Long-term Asset Projection</h4>
          <p className="text-sm text-slate-500 font-medium max-w-md">30년 시계열 자산 추이 및 인출 시뮬레이션 결과가 여기에 렌더링됩니다. (Phase 2.1 구현 예정)</p>
        </div>
        
        <div className="mt-8 flex gap-4 relative z-10">
          <div className="px-6 py-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Detailed Life-Cycle Analysis incoming
          </div>
        </div>
      </div>
    </div>
  );
}
