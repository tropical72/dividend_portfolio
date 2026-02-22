import { useState, useEffect } from "react";
import { 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Calculator,
  RefreshCcw,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { cn } from "../lib/utils";
import type { RetirementConfig, AppSettings } from "../types";

interface SettingsTabProps {
  onSettingsUpdate: () => void;
  globalSettings: AppSettings | null;
  globalRetireConfig: RetirementConfig | null;
}

/** [REQ-SYS-04] API 키 및 은퇴 전략 변수 관리 UI */
export function SettingsTab({ onSettingsUpdate, globalSettings, globalRetireConfig }: SettingsTabProps) {
  const [settings, setSettings] = useState({
    dart_api_key: "",
    gemini_api_key: "",
    default_capital: 10000,
    default_currency: "USD",
  });
  
  const [retireConfig, setRetireConfig] = useState<RetirementConfig | null>(null);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({ dart: false, gemini: false });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (globalSettings) {
      setSettings({
        dart_api_key: globalSettings.dart_api_key || "",
        gemini_api_key: globalSettings.gemini_api_key || "",
        default_capital: globalSettings.default_capital ?? 10000,
        default_currency: globalSettings.default_currency || "USD",
      });
    }
    if (globalRetireConfig) setRetireConfig(globalRetireConfig);
  }, [globalSettings, globalRetireConfig]);

  const handleSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res1 = await fetch("http://localhost:8000/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const res2 = await fetch("http://localhost:8000/api/retirement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retireConfig),
      });
      if (res1.ok && res2.ok) {
        setStatus({ type: "success", message: "모든 전략 설정이 저장되었습니다." });
        onSettingsUpdate();
      } else { throw new Error("저장 실패"); }
    } catch { setStatus({ type: "error", message: "통신 중 오류가 발생했습니다." }); }
    finally { setLoading(false); }
  };

  const toggleKeyVisibility = (key: string) => setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!retireConfig || !retireConfig.personal_params) {
    return <div className="p-20 text-center animate-pulse text-slate-500 font-black uppercase text-xs">Initializing Strategy Engine...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-16 pb-32">
      <div className="border-b border-slate-800 pb-8">
        <h2 className="text-3xl font-black text-slate-50 flex items-center gap-3 tracking-tight"><Calculator className="text-emerald-400" size={32} /> Simulation Strategy Settings</h2>
        <p className="text-slate-400 text-sm mt-2 font-medium">은퇴 자산 시뮬레이션의 마스터 변수를 제어합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-12">
          {/* 1. Tax & Insurance */}
          <section className="space-y-8">
            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} /> Tax & Insurance Parameters</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">부동산 공시가격 (지역건보료 기준)</label>
                <div className="relative">
                  <input type="text" value={(retireConfig.personal_params?.real_estate_price ?? 0).toLocaleString()} onChange={(e) => {
                    const val = parseInt(e.target.value.replace(/,/g, "")) || 0;
                    setRetireConfig({ ...retireConfig, personal_params: { ...retireConfig.personal_params, real_estate_price: val } });
                  }} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none text-slate-200 font-bold" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-black">KRW</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 ml-1">건보료 점수 단가</label>
                  <input type="number" step="0.1" value={retireConfig.tax_and_insurance?.point_unit_price ?? 208.4} onChange={(e) => setRetireConfig({ ...retireConfig, tax_and_insurance: { ...retireConfig.tax_and_insurance, point_unit_price: parseFloat(e.target.value) } })} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 outline-none text-slate-200 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 ml-1">법인세 (2억 이하 %)</label>
                  <input type="number" step="0.01" value={(retireConfig.tax_and_insurance?.corp_tax_low_rate ?? 0.09) * 100} onChange={(e) => setRetireConfig({ ...retireConfig, tax_and_insurance: { ...retireConfig.tax_and_insurance, corp_tax_low_rate: parseFloat(e.target.value) / 100 } })} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 outline-none text-slate-200 font-bold" />
                </div>
              </div>
            </div>
          </section>

          {/* 2. Assumption Defaults (겹침 방지 레이아웃 수정) */}
          <section className="space-y-8">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={14} /> Assumption Profile Defaults</h3>
            <div className="space-y-4">
              {Object.entries(retireConfig.assumptions || {}).map(([id, item]: [any, any]) => (
                <div key={id} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3">{item.name} Master Defaults</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Master Return (%)</label>
                      <EditableInput 
                        initialValue={(item.master_return || item.expected_return) * 100} 
                        systemDefault={id === 'v1' ? 4.85 : 3.5}
                        onCommit={(v) => {
                          setRetireConfig({ ...retireConfig, assumptions: { ...retireConfig.assumptions, [id]: { ...item, master_return: v / 100, expected_return: v / 100 } } });
                        }} 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Master Inflation (%)</label>
                      <EditableInput 
                        initialValue={(item.master_inflation || item.inflation_rate) * 100} 
                        systemDefault={id === 'v1' ? 2.5 : 3.5}
                        onCommit={(v) => {
                          setRetireConfig({ ...retireConfig, assumptions: { ...retireConfig.assumptions, [id]: { ...item, master_inflation: v / 100, inflation_rate: v / 100 } } });
                        }} 
                        showNote 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 3. Infrastructure */}
        <div className="space-y-12 bg-slate-900/20 p-8 rounded-3xl border border-slate-800/50 self-start">
          <section className="space-y-8">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Infrastructure Keys</h3>
            <div className="space-y-6">
              <div className="space-y-2"><label className="text-xs font-bold text-slate-400 ml-1">OpenDart API Key</label><div className="relative"><input type={showKeys.dart ? "text" : "password"} value={settings.dart_api_key} onChange={(e) => setSettings({ ...settings, dart_api_key: e.target.value })} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-500/50 outline-none text-slate-200" /><button onClick={() => toggleKeyVisibility("dart")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500">{showKeys.dart ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
              <div className="space-y-2"><label className="text-xs font-bold text-slate-400 ml-1">Gemini API Key</label><div className="relative"><input type={showKeys.gemini ? "text" : "password"} value={settings.gemini_api_key} onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-500/50 outline-none text-slate-200" /><button onClick={() => toggleKeyVisibility("gemini")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500">{showKeys.gemini ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-6">
          <div className="flex-1">{status && <div className={cn("flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-bottom-2", status.type === "success" ? "text-emerald-400" : "text-red-400")}>{status.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{status.message}</div>}{!status && <p className="text-slate-500 text-[10px] font-medium px-2 uppercase tracking-widest">Master settings define the baseline for simulations.</p>}</div>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-10 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs">{loading ? <RefreshCcw className="animate-spin" size={16} /> : <Save size={16} />}{loading ? "Syncing..." : "Save All Strategy"}</button>
        </div>
      </div>
    </div>
  );
}

function EditableInput({ initialValue, systemDefault, onCommit, showNote }: { initialValue: number, systemDefault: number, onCommit: (val: number) => void, showNote?: boolean }) {
  const [value, setValue] = useState(initialValue.toFixed(1));
  useEffect(() => { setValue(initialValue.toFixed(1)); }, [initialValue]);
  const handleBlur = () => {
    const num = parseFloat(value);
    if (!isNaN(num)) { onCommit(num); setValue(num.toFixed(1)); } 
    else { setValue(initialValue.toFixed(1)); }
  };
  const handleKeyDown = (e: any) => { if (e.key === "Enter") e.target.blur(); };
  
  const isChanged = Math.abs(initialValue - systemDefault) > 0.01;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input type="text" className="w-20 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-black text-sm outline-none focus:border-blue-500/50 transition-all" value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown} />
        {isChanged && (
          <button onClick={() => onCommit(systemDefault)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl text-blue-400 transition-all" title={`System Default(${systemDefault.toFixed(1)}%)로 복구`}>
            <RotateCcw size={14} strokeWidth={3} />
          </button>
        )}
      </div>
      {showNote && <p className="text-[9px] text-slate-600 italic leading-tight">* 한국은행 목표(2.0%) / 글로벌 기준(2.5%) 권장</p>}
    </div>
  );
}
