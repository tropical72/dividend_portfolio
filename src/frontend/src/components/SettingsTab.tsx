import { useState, useEffect } from "react";
import { 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Calculator,
  RefreshCcw,
  RotateCcw,
  User,
  Building2,
  Wallet2,
  Settings2,
  Plus,
  Trash2,
  Info,
  Activity,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { cn } from "../lib/utils";
import type { RetirementConfig, AppSettings, PlannedCashflow } from "../types";

interface SettingsTabProps {
  onSettingsUpdate: () => void;
  globalSettings: AppSettings | null;
  globalRetireConfig: RetirementConfig | null;
}

/** [REQ-SYS-04] 은퇴 전략 마스터 변수 및 자금 이벤트 관리 UI */
export function SettingsTab({ onSettingsUpdate, globalSettings, globalRetireConfig }: SettingsTabProps) {
  const [settings, setSettings] = useState({
    dart_api_key: "",
    gemini_api_key: "",
    default_capital: 10000,
    default_currency: "USD",
  });
  
  const [retireConfig, setRetireConfig] = useState<RetirementConfig | null>(null);
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
    if (globalRetireConfig) setRetireConfig(JSON.parse(JSON.stringify(globalRetireConfig)));
  }, [globalSettings, globalRetireConfig]);

  const handleSave = async () => {
    if (!retireConfig) return;
    setLoading(true);
    setStatus(null);
    try {
      await fetch("http://localhost:8000/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      await fetch("http://localhost:8000/api/retirement/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(retireConfig) });
      setStatus({ type: "success", message: "모든 전략 설정이 저장되었습니다." });
      onSettingsUpdate();
    } catch { setStatus({ type: "error", message: "통신 중 오류가 발생했습니다." }); }
    finally { setLoading(false); }
  };

  const addCashflow = () => {
    if (!retireConfig) return;
    const newEvent: PlannedCashflow = { id: crypto.randomUUID(), type: "INFLOW", entity: "CORP", amount: 0, year: 2030, month: 1, description: "새 자금 이벤트" };
    const currentList = retireConfig.planned_cashflows || [];
    setRetireConfig({ ...retireConfig, planned_cashflows: [...currentList, newEvent] });
  };

  const removeCashflow = (id: string) => {
    if (!retireConfig || !retireConfig.planned_cashflows) return;
    setRetireConfig({ ...retireConfig, planned_cashflows: retireConfig.planned_cashflows.filter(e => e.id !== id) });
  };

  if (!retireConfig || !retireConfig.user_profile) return <div className="p-20 text-center animate-pulse text-sm font-black uppercase text-slate-500">Loading Strategy Center...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-16 pb-40">
      <div className="border-b border-slate-800 pb-10">
        <h2 className="text-4xl font-black text-slate-50 flex items-center gap-4 tracking-tight"><Calculator className="text-emerald-400" size={40} /> Strategy Control Center</h2>
        <p className="text-base text-slate-400 mt-3 font-medium">은퇴 자산 시뮬레이션의 모든 마스터 변수와 미래 이벤트를 제어하세요.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 space-y-8">
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-3"><User size={20} /> User Profile</h3>
              <div className="grid grid-cols-2 gap-6">
                <InputGroup label="Birth Year" value={retireConfig.user_profile.birth_year} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, birth_year: parseInt(v)}})} />
                <InputGroup label="Birth Month" value={retireConfig.user_profile.birth_month} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, birth_month: parseInt(v)}})} />
              </div>
              <div className="grid grid-cols-2 gap-6 border-t border-slate-800 pt-8">
                <InputGroup label="Private Pension Age" value={retireConfig.user_profile.private_pension_start_age} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, private_pension_start_age: parseInt(v)}})} />
                <InputGroup label="National Pension Age" value={retireConfig.user_profile.national_pension_start_age} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, national_pension_start_age: parseInt(v)}})} />
              </div>
            </section>

            <section className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 space-y-8">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-3"><Wallet2 size={20} /> Pension Assets</h3>
              <InputGroup label="Initial Pension Capital" value={retireConfig.pension_params.initial_investment} isCurrency onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, initial_investment: parseInt(v)}})} />
              <div className="grid grid-cols-2 gap-6">
                <InputGroup label="Severance Reserve" value={retireConfig.pension_params.severance_reserve} isCurrency onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, severance_reserve: parseInt(v)}})} />
                <InputGroup label="Other Reserve" value={retireConfig.pension_params.other_reserve} isCurrency onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, other_reserve: parseInt(v)}})} />
              </div>
            </section>
          </div>

          <section className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 space-y-8">
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3"><Building2 size={20} /> Corporate Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <InputGroup label="Total Investment" value={retireConfig.corp_params.initial_investment} isCurrency onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, initial_investment: parseInt(v)}})} />
              <InputGroup label="Capital Stock" value={retireConfig.corp_params.capital_stock} isCurrency onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, capital_stock: parseInt(v)}})} />
              <InputGroup label="Shareholder Loan" value={retireConfig.corp_params.initial_shareholder_loan} isCurrency onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, initial_shareholder_loan: parseInt(v)}})} />
            </div>
          </section>

          <section className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest flex items-center gap-3"><Activity size={20} /> Planned Cashflow Events</h3>
              <button onClick={addCashflow} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-2xl border border-slate-700 transition-all uppercase tracking-widest"><Plus size={16} /> Add Event</button>
            </div>
            <div className="space-y-4">
              {(!retireConfig.planned_cashflows || retireConfig.planned_cashflows.length === 0) ? <p className="text-center py-16 text-slate-600 text-sm font-bold uppercase tracking-widest border-2 border-dashed border-slate-800 rounded-[2.5rem]">No events planned</p> : 
                retireConfig.planned_cashflows.map((ev) => (
                  <div key={ev.id} className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-6 items-center group">
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <select value={ev.type} onChange={(e) => setRetireConfig({...retireConfig, planned_cashflows: (retireConfig.planned_cashflows || []).map(item => item.id === ev.id ? {...item, type: e.target.value as any} : item)})} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-300"><option value="INFLOW">Inflow</option><option value="OUTFLOW">Outflow</option></select>
                      <select value={ev.entity} onChange={(e) => setRetireConfig({...retireConfig, planned_cashflows: (retireConfig.planned_cashflows || []).map(item => item.id === ev.id ? {...item, entity: e.target.value as any} : item)})} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-300"><option value="CORP">Corp</option><option value="PENSION">Pension</option></select>
                    </div>
                    <div className="md:col-span-3 text-sm font-black"><input type="text" value={(ev.amount || 0).toLocaleString()} onChange={(e) => setRetireConfig({...retireConfig, planned_cashflows: (retireConfig.planned_cashflows || []).map(item => item.id === ev.id ? {...item, amount: parseInt(e.target.value.replace(/,/g, "")) || 0} : item)})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" /></div>
                    <div className="md:col-span-3 flex gap-2"><input type="number" value={ev.year} onChange={(e) => setRetireConfig({...retireConfig, planned_cashflows: (retireConfig.planned_cashflows || []).map(item => item.id === ev.id ? {...item, year: parseInt(e.target.value)} : item)})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs font-black text-slate-200" /><input type="number" value={ev.month} onChange={(e) => setRetireConfig({...retireConfig, planned_cashflows: (retireConfig.planned_cashflows || []).map(item => item.id === ev.id ? {...item, month: parseInt(e.target.value)} : item)})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs font-black text-slate-200" /></div>
                    <div className="md:col-span-3"><input type="text" value={ev.description || ""} onChange={(e) => setRetireConfig({...retireConfig, planned_cashflows: (retireConfig.planned_cashflows || []).map(item => item.id === ev.id ? {...item, description: e.target.value} : item)})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-400" /></div>
                    <div className="md:col-span-1 flex justify-end"><button onClick={() => removeCashflow(ev.id)} className="p-3 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20} /></button></div>
                  </div>
                ))
              }
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <section className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 space-y-8">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><Settings2 size={20} /> Tax & Trigger Constants</h3>
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Health Unit Price</label><div className="group relative"><Info size={14} className="text-slate-600 cursor-help" /><div className="absolute left-0 bottom-full mb-3 w-64 bg-slate-800 p-4 rounded-2xl text-xs text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl">국민건강보험공단 고시 기준</div></div></div>
                <input type="number" step="0.1" value={retireConfig.tax_and_insurance?.point_unit_price || 208.4} onChange={(e) => setRetireConfig({...retireConfig, tax_and_insurance: {...retireConfig.tax_and_insurance, point_unit_price: parseFloat(e.target.value)}})} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-base font-black text-slate-200 outline-none focus:border-emerald-500" />
              </div>
              <InputGroup label="SGOV Buffer Months" value={retireConfig.trigger_thresholds?.target_buffer_months || 24} onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, target_buffer_months: parseInt(v)}})} />
            </div>
          </section>

          <section className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 space-y-8">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><ShieldCheck size={20} /> Assumption Profiles</h3>
            <div className="space-y-6">
              {Object.entries(retireConfig.assumptions).map(([id, item]) => (
                <div key={id} className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 space-y-6">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{item.name}</h4>
                  <div className="grid grid-cols-1 gap-6">
                    <EditableInput label="Return" initialValue={(item.master_return || item.expected_return) * 100} systemDefault={id === 'v1' ? 4.85 : 3.5} onCommit={(v) => setRetireConfig({...retireConfig, assumptions: {...retireConfig.assumptions, [id]: {...item, master_return: v/100, expected_return: v/100}}})} />
                    <EditableInput label="Inflation" initialValue={(item.master_inflation || item.inflation_rate) * 100} systemDefault={id === 'v1' ? 2.5 : 3.5} onCommit={(v) => setRetireConfig({...retireConfig, assumptions: {...retireConfig.assumptions, [id]: {...item, master_inflation: v/100, inflation_rate: v/100}}})} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 rounded-[2rem] shadow-2xl flex items-center justify-between gap-10">
          <div className="flex-1">{status && <div className={cn("flex items-center gap-3 text-base font-bold", status.type === "success" ? "text-emerald-400" : "text-red-400")}>{status.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}{status.message}</div>}{!status && <p className="text-slate-500 text-xs font-black uppercase tracking-widest px-2">Commit all strategy changes to server.</p>}</div>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-3 px-12 py-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-sm">{loading ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}{loading ? "Syncing..." : "Apply All Changes"}</button>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, isCurrency = false }: { label: string, value: number, onChange: (v: string) => void, isCurrency?: boolean }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <input type="text" value={isCurrency ? (value || 0).toLocaleString() : (value || 0)} onChange={(e) => onChange(e.target.value.replace(/,/g, ""))} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-base font-black text-slate-200 outline-none focus:border-emerald-500 transition-all" />
        {isCurrency && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600">KRW</span>}
      </div>
    </div>
  );
}

function EditableInput({ label, initialValue, systemDefault, onCommit }: { label: string, initialValue: number, systemDefault: number, onCommit: (val: number) => void }) {
  const [value, setValue] = useState(initialValue.toFixed(1));
  useEffect(() => { setValue(initialValue.toFixed(1)); }, [initialValue]);
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{label}</label>
      <div className="flex items-center gap-4">
        <input type="text" className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-base font-black text-slate-200 outline-none focus:border-blue-500/50" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => !isNaN(parseFloat(value)) && onCommit(parseFloat(value))} onKeyDown={(e) => e.key === "Enter" && (e.target as any).blur()} />
        {Math.abs(initialValue - systemDefault) > 0.01 && <button onClick={() => onCommit(systemDefault)} className="p-3 bg-blue-500/10 hover:bg-blue-500/20 rounded-2xl text-blue-400 transition-all"><RotateCcw size={18} /></button>}
      </div>
    </div>
  );
}
