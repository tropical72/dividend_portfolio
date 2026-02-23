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
  Gauge,
  ChevronDown,
  ChevronUp
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

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
    const newEvent: PlannedCashflow = { 
      id: crypto.randomUUID(), 
      type: "INFLOW", 
      entity: "CORP", 
      amount: 0, 
      currency: "USD",
      year: 2030, 
      month: 1, 
      description: "자산 유입/지출 상세" 
    };
    const currentList = retireConfig.planned_cashflows || [];
    setRetireConfig({ ...retireConfig, planned_cashflows: [...currentList, newEvent] });
  };

  const updateCashflow = (id: string, updates: Partial<PlannedCashflow>) => {
    if (!retireConfig || !retireConfig.planned_cashflows) return;
    if (updates.month !== undefined) {
      if (updates.month < 1) updates.month = 1;
      if (updates.month > 12) updates.month = 12;
    }
    setRetireConfig({
      ...retireConfig,
      planned_cashflows: retireConfig.planned_cashflows.map(ev => 
        ev.id === id ? { ...ev, ...updates } : ev
      )
    });
  };

  const removeCashflow = (id: string) => {
    if (!retireConfig || !retireConfig.planned_cashflows) return;
    setRetireConfig({ ...retireConfig, planned_cashflows: retireConfig.planned_cashflows.filter(e => e.id !== id) });
  };

  if (!retireConfig || !retireConfig.user_profile) return <div className="p-20 text-center animate-pulse text-sm font-black uppercase text-slate-500">Loading Strategy Center...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-12 pb-40 px-4">
      <div className="border-b border-slate-800 pb-8">
        <h2 className="text-3xl font-black text-slate-50 flex items-center gap-4 tracking-tight"><Calculator className="text-emerald-400" size={32} /> Strategy Center</h2>
        <p className="text-sm text-slate-400 mt-2 font-medium">은퇴 자산 시뮬레이션의 마스터 변수와 미래 이벤트를 제어하세요.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-3"><User size={18} /> User Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Birth Year" unit="Year" tooltip="시뮬레이션 시작 나이를 계산하기 위한 출생 연도" value={retireConfig.user_profile.birth_year} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, birth_year: Math.floor(parseInt(v) || 0)}})} />
                <InputGroup label="Birth Month" unit="Month" tooltip="연금 개시 및 국민연금 수령 시점을 정밀하게 계산하기 위한 출생 월" value={retireConfig.user_profile.birth_month} onChange={(v) => {
                  let val = Math.floor(parseInt(v) || 1);
                  if (val < 1) val = 1;
                  if (val > 12) val = 12;
                  setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, birth_month: val}});
                }} />
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
                <InputGroup label="Private Pension" unit="Age" tooltip="개인연금(IRP, 연금저축) 수령을 시작할 만 나이" value={retireConfig.user_profile.private_pension_start_age} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, private_pension_start_age: Math.floor(parseInt(v) || 0)}})} />
                <InputGroup label="National Pension" unit="Age" tooltip="국민연금 수령이 시작되는 만 나이 (보통 63~65세)" value={retireConfig.user_profile.national_pension_start_age} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, national_pension_start_age: Math.floor(parseInt(v) || 0)}})} />
              </div>
            </section>

            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-3"><Wallet2 size={18} /> Pension Assets</h3>
              <InputGroup label="Initial Capital" value={retireConfig.pension_params.initial_investment} isCurrency tooltip="현재 연금 계좌(IRP, 연금저축 등)에 예치된 기초 자산 총액" onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, initial_investment: parseInt(v) || 0}})} />
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Severance" value={retireConfig.pension_params.severance_reserve} isCurrency tooltip="은퇴 시점에 수령하여 연금 계좌로 이체할 예상 퇴직금 총액" onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, severance_reserve: parseInt(v) || 0}})} />
                <InputGroup label="Other" value={retireConfig.pension_params.other_reserve} isCurrency tooltip="연금으로 운용할 기타 여유 자산 (ISA 만기 전환금 등)" onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, other_reserve: parseInt(v) || 0}})} />
              </div>
            </section>
          </div>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3"><Building2 size={18} /> Corporate Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputGroup label="Total Inv." isCurrency tooltip="법인 설립 시 총 투자한 자본금 및 대여금의 합계" value={retireConfig.corp_params.initial_investment} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, initial_investment: parseInt(v) || 0}})} />
              <InputGroup label="Capital" isCurrency tooltip="법인의 법정 자본금 (배당 가능 이익 산출의 기준)" value={retireConfig.corp_params.capital_stock} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, capital_stock: parseInt(v) || 0}})} />
              <InputGroup label="Loan" isCurrency tooltip="법인에 빌려준 돈 (비과세 인출 가능한 가수금 잔액)" value={retireConfig.corp_params.initial_shareholder_loan} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, initial_shareholder_loan: parseInt(v) || 0}})} />
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-3">
                <Activity size={18} /> Cashflow Events
                <div className="group relative">
                  <Info size={14} className="text-slate-600 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-800 p-4 rounded-xl text-[10px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed">
                    은퇴 중 발생할 큰 규모의 자금 유입(예: 집 매각) 또는 지출(예: 자녀 결혼) 계획입니다.
                  </div>
                </div>
              </h3>
              <button onClick={addCashflow} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-xl border border-slate-700 transition-all uppercase tracking-widest"><Plus size={16} /> Add Event</button>
            </div>
            <div className="space-y-6">
              {(!retireConfig.planned_cashflows || retireConfig.planned_cashflows.length === 0) ? 
                <p className="text-center py-10 text-slate-600 text-xs font-black uppercase tracking-widest border border-dashed border-slate-800 rounded-2xl">No events planned</p> : 
                retireConfig.planned_cashflows.map((ev) => (
                  <div key={ev.id} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-6 group relative">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-3 flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Type & Target</label>
                        <div className="flex gap-2">
                          <select value={ev.type} onChange={(e) => updateCashflow(ev.id, {type: e.target.value as any})} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl h-11 px-2 text-[10px] font-black uppercase text-slate-300 outline-none"><option value="INFLOW">In (+) </option><option value="OUTFLOW">Out (-)</option></select>
                          <select value={ev.entity} onChange={(e) => updateCashflow(ev.id, {entity: e.target.value as any})} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl h-11 px-2 text-[10px] font-black uppercase text-slate-300 outline-none"><option value="CORP">Corp</option><option value="PENSION">Pen</option></select>
                        </div>
                      </div>
                      <div className="md:col-span-5 flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Amount</label>
                        <div className="flex items-center gap-2">
                          <select value={ev.currency || "USD"} onChange={(e) => updateCashflow(ev.id, {currency: e.target.value as any})} className="w-28 bg-slate-800 border border-slate-700 rounded-xl h-11 px-2 text-[10px] font-black text-slate-400 outline-none"><option value="USD">USD ($)</option><option value="KRW">KRW (₩)</option></select>
                          <input type="text" value={Math.floor(ev.amount || 0).toLocaleString()} onChange={(e) => { const val = parseInt(e.target.value.replace(/,/g, "")) || 0; updateCashflow(ev.id, {amount: val}); }} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl h-11 px-4 text-base font-black text-emerald-400 outline-none focus:border-emerald-500/50" />
                        </div>
                      </div>
                      <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Year</label>
                        <input type="number" value={Math.floor(ev.year || 2030)} onChange={(e) => updateCashflow(ev.id, {year: parseInt(e.target.value) || 2030})} className="w-full bg-slate-900 border border-slate-800 rounded-xl h-11 px-3 text-sm font-black text-slate-200 text-center outline-none" />
                      </div>
                      <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Month</label>
                        <input type="number" value={Math.floor(ev.month || 1)} onChange={(e) => updateCashflow(ev.id, {month: parseInt(e.target.value) || 1})} className="w-full bg-slate-900 border border-slate-800 rounded-xl h-11 px-3 text-sm font-black text-slate-200 text-center outline-none" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-900">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Description</label>
                      <div className="flex items-center gap-4">
                        <input type="text" value={ev.description || ""} onFocus={(e) => e.target.select()} onChange={(e) => updateCashflow(ev.id, {description: e.target.value})} className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 placeholder:text-slate-700 outline-none focus:border-slate-600 focus:bg-slate-900" placeholder="상세 내용을 입력하세요" />
                        <button onClick={() => removeCashflow(ev.id)} className="p-3 text-slate-600 hover:text-rose-500 bg-slate-900 hover:bg-rose-500/10 rounded-xl transition-all flex-shrink-0 border border-slate-800"><Trash2 size={20} /></button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><Settings2 size={18} /> Basic Constants</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Health Unit Price</label>
                <div className="relative">
                  <input type="number" step="0.1" value={retireConfig.tax_and_insurance?.point_unit_price || 208.4} onChange={(e) => setRetireConfig({...retireConfig, tax_and_insurance: {...retireConfig.tax_and_insurance, point_unit_price: parseFloat(e.target.value)}})} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">KRW</span>
                </div>
              </div>
              <InputGroup label="SGOV Buffer" unit="Mo" tooltip="안전 자산(SGOV)으로 확보해둘 목표 생활비 개월 수" value={retireConfig.trigger_thresholds?.target_buffer_months || 24} onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, target_buffer_months: parseInt(v) || 0}})} />
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><ShieldCheck size={18} /> Assumptions</h3>
            <div className="space-y-4">
              {Object.entries(retireConfig.assumptions).map(([id, item]) => (
                <div key={id} className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <EditableInput label="Return" unit="%" initialValue={(item.master_return || item.expected_return) * 100} systemDefault={id === 'v1' ? 4.85 : 3.5} onCommit={(v) => setRetireConfig({...retireConfig, assumptions: {...retireConfig.assumptions, [id]: {...item, master_return: v/100, expected_return: v/100}}})} />
                    <EditableInput label="Inflation" unit="%" initialValue={(item.master_inflation || item.inflation_rate) * 100} systemDefault={id === 'v1' ? 2.5 : 3.5} onCommit={(v) => setRetireConfig({...retireConfig, assumptions: {...retireConfig.assumptions, [id]: {...item, master_inflation: v/100, inflation_rate: v/100}}})} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden">
            <button 
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full p-8 flex items-center justify-between hover:bg-slate-800/20 transition-all group"
              data-testid="advanced-settings-toggle"
            >
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-3"><Gauge size={18} /> Advanced Engine</h3>
              {isAdvancedOpen ? <ChevronUp size={18} className="text-slate-500 group-hover:text-amber-500" /> : <ChevronDown size={18} className="text-slate-500 group-hover:text-amber-500" />}
            </button>
            
            {isAdvancedOpen && (
              <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top duration-300" data-testid="advanced-settings-content">
                <div className="space-y-6 border-t border-slate-800 pt-6">
                  <InputGroup label="Employee Count" unit="Person" tooltip="법인에서 급여를 받는 직원 수 (본인 포함)" value={retireConfig.corp_params.employee_count} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, employee_count: parseInt(v) || 1}})} />
                  
                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase">Tax Sensitivities</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Pension Rate" unit="%" tooltip="법인 및 개인이 부담하는 국민연금 요율 (각 4.5%)" value={retireConfig.tax_and_insurance.pension_rate * 100} onChange={(v) => setRetireConfig({...retireConfig, tax_and_insurance: {...retireConfig.tax_and_insurance, pension_rate: parseFloat(v)/100}})} />
                      <InputGroup label="Health Rate" unit="%" tooltip="법인 및 개인이 부담하는 건강보험 요율 (각 3.545%)" value={retireConfig.tax_and_insurance.health_rate * 100} onChange={(v) => setRetireConfig({...retireConfig, tax_and_insurance: {...retireConfig.tax_and_insurance, health_rate: parseFloat(v)/100}})} />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase">Trigger Thresholds</h4>
                    <InputGroup label="Market Panic" unit="%" tooltip="리밸런싱을 트리거하는 시장 폭락 임계치" value={retireConfig.trigger_thresholds.market_panic_threshold * 100} onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, market_panic_threshold: parseFloat(v)/100}})} />
                    <InputGroup label="High Income Cap" unit="%" tooltip="고소득 시 인출을 제한하는 임계 요율" value={retireConfig.trigger_thresholds.high_income_cap_rate * 100} onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, high_income_cap_rate: parseFloat(v)/100}})} />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-10">
          <div className="flex-1">{status && <div className={cn("flex items-center gap-3 text-sm font-bold", status.type === "success" ? "text-emerald-400" : "text-red-400")}>{status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{status.message}</div>}{!status && <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest px-2">Commit strategy changes to server.</p>}</div>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-3 px-10 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs">{loading ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />}{loading ? "Syncing..." : "Apply All Changes"}</button>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, isCurrency = false, unit, tooltip }: { label: string, value: number, onChange: (v: string) => void, isCurrency?: boolean, unit?: string, tooltip?: string }) {
  const numericValue = Math.floor(value || 0);
  const displayValue = isCurrency ? numericValue.toLocaleString() : numericValue.toString();
  return (
    <div className="space-y-1.5" data-testid={`input-group-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-1.5 ml-1">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        {tooltip && (
          <div className="group relative">
            <Info size={12} className="text-slate-600 cursor-help" data-testid="tooltip-icon" />
            <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[10px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal">{tooltip}</div>
          </div>
        )}
      </div>
      <div className="relative">
        <input type="text" value={displayValue} onChange={(e) => { const rawValue = e.target.value.replace(/,/g, ""); onChange(rawValue === "" ? "0" : rawValue); }} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500 transition-all" />
        {(isCurrency || unit) && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">{isCurrency ? "KRW" : unit}</span>}
      </div>
    </div>
  );
}

function EditableInput({ id, unit, initialValue, masterValue, onCommit }: { id: string, unit?: string, initialValue: number, masterValue: number, onCommit: (val: number) => void }) {
  const [value, setValue] = useState(initialValue.toFixed(1));
  useEffect(() => { setValue(initialValue.toFixed(1)); }, [initialValue]);
  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Value</label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 flex items-center">
          <input id={id} data-testid={id} type="text" className="w-full bg-slate-900 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-emerald-400 outline-none focus:border-blue-500/50 pr-10" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => !isNaN(parseFloat(value)) && onCommit(parseFloat(value))} onKeyDown={(e) => e.key === "Enter" && (e.target as any).blur()} />
          {unit && <span className="absolute right-4 text-[10px] font-black text-slate-600">{unit}</span>}
        </div>
        {Math.abs(initialValue - masterValue) > 0.01 && <button onClick={(e) => { e.stopPropagation(); onCommit(masterValue); }} className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl text-blue-400 transition-all flex-shrink-0"><RotateCcw size={14} /></button>}
      </div>
    </div>
  );
}
