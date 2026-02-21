import { PlusCircle, RotateCcw, Save } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * [REQ-PRT-01] 포트폴리오 설계 및 구성 탭
 */
export function PortfolioTab() {
  const categories = [
    { id: "Fixed", name: "Fixed Income", color: "text-blue-400" },
    { id: "Cash", name: "Bond/Cash Buffer", color: "text-amber-400" },
    { id: "Growth", name: "Growth/Dividend Growth", color: "text-emerald-400" },
  ];

  return (
    <section className="space-y-8 animate-in fade-in duration-500">
      {/* 상단 컨트롤 바 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-50">Portfolio Designer</h2>
          <p className="text-slate-400 text-sm mt-1">자산 배분 및 종목별 비중을 설정합니다.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-all">
            <RotateCcw size={18} /> 새로만들기
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
            <Save size={18} /> 저장
          </button>
        </div>
      </div>

      {/* 3단 카테고리 영역 */}
      <div className="grid grid-cols-1 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn("w-1.5 h-6 rounded-full bg-current", cat.color)} />
                <h3 className="text-lg font-bold text-slate-100">{cat.name}</h3>
                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg uppercase tracking-widest font-bold">
                  0%
                </span>
              </div>
              <button className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all">
                <PlusCircle size={20} />
              </button>
            </div>

            {/* 종목 리스트 테이블 */}
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500 font-bold border-b border-slate-800">
                <tr>
                  <th className="pb-3 pl-2 w-24">Ticker</th>
                  <th className="pb-3">Name</th>
                  <th className="pb-3 w-32 text-right">Weight (%)</th>
                  <th className="pb-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-600 italic text-xs uppercase tracking-widest">
                    No stocks added to this category
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* 전체 합계 및 검증 섹션 */}
      <div className="mt-10 p-6 bg-slate-900/80 border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-1">Total Stocks</span>
            <span className="text-xl font-bold text-slate-100">0</span>
          </div>
          <div className="h-10 w-px bg-slate-800" />
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-1">Total Weight</span>
            <span className="text-2xl font-black text-red-500">0.0%</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-red-400 font-medium mb-1 animate-pulse">※ 비중 합계가 100%여야 저장이 가능합니다.</p>
        </div>
      </div>
    </section>
  );
}
