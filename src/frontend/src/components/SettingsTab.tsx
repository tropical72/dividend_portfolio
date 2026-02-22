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
    console.log("Saving retireConfig:", retireConfig);
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
      currency: "KRW",
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
                <InputGroup label="Birth Year" value={retireConfig.user_profile.birth_year} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, birth_year: parseInt(v)}})} />
                <InputGroup label="Birth Month" value={retireConfig.user_profile.birth_month} onChange={(v) => {
                  let val = parseInt(v);
                  if (val < 1) val = 1;
                  if (val > 12) val = 12;
                  setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, birth_month: val}});
                }} />
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
                <InputGroup label="Private Pension" unit="Age" value={retireConfig.user_profile.private_pension_start_age} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, private_pension_start_age: parseInt(v)}})} />
                <InputGroup label="National Pension" unit="Age" value={retireConfig.user_profile.national_pension_start_age} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, national_pension_start_age: parseInt(v)}})} />
              </div>
            </section>

            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-3"><TrendingUp size={18} /> Simulation Cashflow</h3>
              <InputGroup 
                label="Monthly Living Expense" 
                unit="KRW" 
                value={retireConfig.simulation_params.target_monthly_cashflow} 
                isCurrency 
                tooltip="은퇴 후 매월 가계에서 필요로 하는 목표 생활비 (물가상승률 반영 전)"
                onChange={(v) => setRetireConfig({...retireConfig, simulation_params: {...retireConfig.simulation_params, target_monthly_cashflow: parseInt(v)}})} 
              />
              <InputGroup 
                label="Private Pension Withdrawal" 
                unit="KRW" 
                value={retireConfig.pension_params.monthly_withdrawal_target} 
                isCurrency 
                tooltip="개인연금 개시 시 매월 인출할 목표 금액"
                onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, monthly_withdrawal_target: parseInt(v)}})} 
              />
              <InputGroup 
                label="National Pension Amount" 
                unit="KRW" 
                value={retireConfig.simulation_params.national_pension_amount} 
                isCurrency 
                tooltip="국민연금 수령 시 예상되는 월 수령액"
                onChange={(v) => setRetireConfig({...retireConfig, simulation_params: {...retireConfig.simulation_params, national_pension_amount: parseInt(v)}})} 
              />
            </section>
          </div>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3"><Building2 size={18} /> Corporate Setup & Operation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <InputGroup label="Total Inv." unit="KRW" value={retireConfig.corp_params.initial_investment} isCurrency onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, initial_investment: parseInt(v)}})} />
                <InputGroup label="Capital" unit="KRW" value={retireConfig.corp_params.capital_stock} isCurrency onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, capital_stock: parseInt(v)}})} />
                <InputGroup label="Loan" unit="KRW" value={retireConfig.corp_params.initial_shareholder_loan} isCurrency onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, initial_shareholder_loan: parseInt(v)}})} />
              </div>
              <div className="space-y-6 border-l border-slate-800 pl-6">
                <InputGroup 
                  label="Employee Count" 
                  unit="Person" 
                  value={retireConfig.corp_params.employee_count} 
                  tooltip="법인에서 급여를 수령하는 직원 수 (건보료 산출 기준)"
                  onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, employee_count: parseInt(v)}})} 
                />
                <InputGroup 
                  label="Monthly Salary" 
                  unit="KRW" 
                  value={retireConfig.corp_params.monthly_salary} 
                  isCurrency 
                  tooltip="직원 1인당 지급하는 월 급여"
                  onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, monthly_salary: parseInt(v)}})} 
                />
                <InputGroup 
                  label="Fixed Cost" 
                  unit="KRW" 
                  value={retireConfig.corp_params.monthly_fixed_cost} 
                  isCurrency 
                  tooltip="임대료, 통신비 등 법인 운영에 드는 기타 고정 비용"
                  onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, monthly_fixed_cost: parseInt(v)}})} 
                />
              </div>
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-3">
                <Activity size={18} /> Cashflow Events
                <div className="group relative">
                  <Info size={14} className="text-slate-600 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-800 p-4 rounded-xl text-[10px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed">
                    은퇴 중 발생할 큰 규모의 자금 유입/지출 계획입니다. (KRW 기준)
                  </div>
                </div>
              </h3>
              <button onClick={addCashflow} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-xl border border-slate-700 transition-all uppercase tracking-widest"><Plus size={16} /> Add Event</button>
            </div>
            
            <div className="space-y-6">
              {(!retireConfig.planned_cashflows || retireConfig.planned_cashflows.length === 0) ? 
                <p className="text-center py-10 text-slate-600 text-xs font-black uppercase tracking-widest border border-dashed border-slate-800 rounded-2xl">No events planned</p> : 
                retireConfig.planned_cashflows.map((ev) => (
                  <div key={ev.id} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-5 group relative">
                    {/* 1행: 유형, 대상, 금액, 연도, 월 - 통화 선택기 제거 및 KRW 고정 */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-3 flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Type & Target</label>
                        <div className="flex gap-2">
                          <select value={ev.type} onChange={(e) => updateCashflow(ev.id, {type: e.target.value as any})} className="h-11 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 text-[10px] font-black uppercase text-slate-300 outline-none transition-all focus:border-rose-500/50">
                            <option value="INFLOW">In (+)</option>
                            <option value="OUTFLOW">Out (-)</option>
                          </select>
                          <select value={ev.entity} onChange={(e) => updateCashflow(ev.id, {entity: e.target.value as any})} className="h-11 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 text-[10px] font-black uppercase text-slate-300 outline-none transition-all focus:border-emerald-500/50">
                            <option value="CORP">Corp</option>
                            <option value="PENSION">Pen</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="md:col-span-5 flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Amount</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={(ev.amount || 0).toLocaleString()} 
                            onChange={(e) => { const val = parseInt(e.target.value.replace(/,/g, "")) || 0; updateCashflow(ev.id, {amount: val}); }} 
                            className="h-11 w-full bg-slate-900 border border-slate-800 rounded-xl px-4 pr-14 text-base font-black text-emerald-400 outline-none focus:border-emerald-500/50 transition-all" 
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase">KRW</span>
                        </div>
                      </div>

                      <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Year</label>
                        <input type="number" value={ev.year} onChange={(e) => updateCashflow(ev.id, {year: parseInt(e.target.value)})} className="h-11 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 text-sm font-black text-slate-200 text-center outline-none focus:border-blue-500/50 transition-all" />
                      </div>

                      <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Month</label>
                        <input type="number" value={ev.month} onChange={(e) => updateCashflow(ev.id, {month: parseInt(e.target.value)})} className="h-11 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 text-sm font-black text-slate-200 text-center outline-none focus:border-blue-500/50 transition-all" />
                      </div>
                    </div>

                    {/* 2행: 상세 설명 및 삭제 버튼 */}
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-900">
                      <div className="flex-1 relative flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Description</label>
                        <input 
                          type="text" 
                          value={ev.description || ""} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateCashflow(ev.id, {description: e.target.value})} 
                          className="h-11 w-full bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 text-sm font-medium text-slate-400 placeholder:text-slate-700 outline-none focus:border-slate-600 focus:bg-slate-900 transition-all" 
                          placeholder="상세 내용을 입력하세요 (예: 부동산 매각 대금 유입)" 
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-transparent select-none ml-1">Action</label>
                        <button onClick={() => removeCashflow(ev.id)} className="h-11 px-4 text-slate-600 hover:text-rose-500 bg-slate-900 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-800 hover:border-rose-500/30 flex-shrink-0">
                          <Trash2 size={18} />
                        </button>
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
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><Settings2 size={18} /> Tax & Trigger</h3>
            <div className="space-y-6">
              <InputGroup label="Health Unit Price" unit="KRW" value={retireConfig.tax_and_insurance?.point_unit_price || 208.4} tooltip="지역건보료 점수당 단가 (2024년 기준 208.4원)" onChange={(v) => setRetireConfig({...retireConfig, tax_and_insurance: {...retireConfig.tax_and_insurance, point_unit_price: parseFloat(v)}})} />
              <InputGroup label="SGOV Buffer" unit="Months" value={retireConfig.trigger_thresholds?.target_buffer_months || 24} tooltip="하락장을 대비한 현금성 자산(SGOV) 목표 보유 생활비 월수" onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, target_buffer_months: parseInt(v)}})} />
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><ShieldCheck size={18} /> Assumptions</h3>
            <div className="space-y-4">
              {Object.entries(retireConfig.assumptions).map(([id, item]) => (
                <div key={id} className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}</h4>
                  <div className="grid grid-cols-1 gap-4">
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
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-10">
          <div className="flex-1">{status && <div className={cn("flex items-center gap-3 text-sm font-bold", status.type === "success" ? "text-emerald-400" : "text-red-400")}>{status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{status.message}</div>}{!status && <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest px-2">Commit strategy changes to server.</p>}</div>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-3 px-10 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs">{loading ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />}{loading ? "Syncing..." : "Apply All Changes"}</button>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, isCurrency = false, unit, tooltip }: { label: string, value: number, onChange: (v: string) => void, isCurrency?: boolean, unit?: string, tooltip?: string }) {
  const displayValue = isCurrency ? (value || 0).toLocaleString() : Math.floor(value || 0).toString();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 ml-1">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        {tooltip && (
          <div className="group relative">
            <Info size={12} className="text-slate-600 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[10px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed">{tooltip}</div>
          </div>
        )}
      </div>
      <div className="relative">
        <input type="text" value={displayValue} onChange={(e) => { const rawValue = e.target.value.replace(/,/g, ""); onChange(rawValue === "" ? "0" : rawValue); }} className={cn("w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-black text-slate-200 outline-none focus:border-emerald-500 transition-all", unit && "pr-16")} />
        {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase">{unit}</span>}
      </div>
    </div>
  );
}

function EditableInput({ label, initialValue, systemDefault, onCommit }: { label: string, initialValue: number, systemDefault: number, onCommit: (val: number) => void }) {
  const [value, setValue] = useState(initialValue.toFixed(1));
  useEffect(() => { setValue(initialValue.toFixed(1)); }, [initialValue]);
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input type="text" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 pr-8 py-2 text-sm font-black text-slate-200 outline-none focus:border-blue-500/50" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => !isNaN(parseFloat(value)) && onCommit(parseFloat(value))} onKeyDown={(e) => e.key === "Enter" && (e.target as any).blur()} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">%</span>
        </div>
        {Math.abs(initialValue - systemDefault) > 0.01 && <button onClick={() => onCommit(systemDefault)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl text-blue-400 transition-all"><RotateCcw size={14} /></button>}
      </div>
    </div>
  );
}
