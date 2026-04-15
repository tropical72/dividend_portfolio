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
  ChevronUp,
  Clock
} from "lucide-react";
import { cn } from "../lib/utils";
import type { RetirementConfig, AppSettings, PlannedCashflow } from "../types";

interface SettingsTabProps {
  onSettingsUpdate: () => void;
  globalSettings: AppSettings | null;
  globalRetireConfig: RetirementConfig | null;
}

function SectionTitle({ icon: Icon, title, color, tooltip }: { icon: React.ElementType, title: string, color: string, tooltip: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h3 className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-3", color)}>
        <Icon size={18} /> {title}
      </h3>
      <div className="group relative">
        <Info size={14} className="text-slate-600 cursor-help" />
        <div className="absolute right-0 bottom-full mb-2 w-64 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
          {tooltip}
        </div>
      </div>
    </div>
  );
}

export function SettingsTab({ onSettingsUpdate, globalSettings, globalRetireConfig }: SettingsTabProps) {
  const [settings, setSettings] = useState({
    dart_api_key: "",
    gemini_api_key: "",
    default_capital: 10000,
    default_currency: "USD",
    price_appreciation_rate: 3.0,
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
        price_appreciation_rate: globalSettings.price_appreciation_rate ?? 3.0,
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
    const newEvent: PlannedCashflow = { id: crypto.randomUUID(), type: "INFLOW", entity: "CORP", amount: 0, currency: "USD", year: 2030, month: 1, description: "자산 유입/지출 상세" };
    setRetireConfig({ ...retireConfig, planned_cashflows: [...(retireConfig.planned_cashflows || []), newEvent] });
  };

  const updateCashflow = (id: string, updates: Partial<PlannedCashflow>) => {
    if (!retireConfig || !retireConfig.planned_cashflows) return;
    if (updates.month !== undefined) {
      if (updates.month < 1) updates.month = 1;
      if (updates.month > 12) updates.month = 12;
    }
    setRetireConfig({ ...retireConfig, planned_cashflows: retireConfig.planned_cashflows.map(ev => ev.id === id ? { ...ev, ...updates } : ev) });
  };

  const removeCashflow = (id: string) => {
    if (!retireConfig || !retireConfig.planned_cashflows) return;
    setRetireConfig({ ...retireConfig, planned_cashflows: retireConfig.planned_cashflows.filter(e => e.id !== id) });
  };

  if (!retireConfig || !retireConfig.user_profile) return <div className="p-20 text-center animate-pulse text-sm font-black uppercase text-slate-500">Loading Strategy Center...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-12 pb-40 px-4">
      <div className="border-b border-slate-800 pb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-50 flex items-center gap-4 tracking-tight"><Calculator className="text-emerald-400" size={32} /> Strategy Center</h2>
          <p className="text-sm text-slate-400 mt-2 font-medium">은퇴 자산 시뮬레이션의 마스터 변수와 미래 이벤트를 제어하세요.</p>
        </div>
        <div className="group relative">
          <Info size={20} className="text-slate-600 cursor-help" />
          <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 p-4 rounded-2xl text-[11px] text-slate-200 font-bold hidden group-hover:block z-[60] border border-slate-700 shadow-2xl leading-relaxed text-left animate-in fade-in slide-in-from-top-2">
            은퇴 자산 시뮬레이션의 중앙 제어 센터입니다. 여기서 설정한 값들은 모든 탭의 계산 및 그래프에 즉시 반영됩니다.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <SectionTitle icon={User} title="User Profile" color="text-blue-400" tooltip="사용자의 연령 및 연금 수령 시작 시점을 설정하여 생애 주기를 정의합니다." />
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Birth Year" unit="Year" tooltip="출생 연도를 입력하세요. 만 나이 계산의 기준이 됩니다." value={retireConfig.user_profile.birth_year} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, birth_year: Math.floor(parseInt(v) || 0)}})} />
                <InputGroup label="Birth Month" unit="Month" tooltip="출생 월을 입력하세요. 연금 수령 개시 월을 정밀하게 산출합니다." value={retireConfig.user_profile.birth_month} onChange={(v) => { let val = Math.floor(parseInt(v) || 1); val = Math.max(1, Math.min(12, val)); setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, birth_month: val}}); }} />
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
                <InputGroup label="Private Pension" unit="Age" tooltip="개인연금(IRP, 연금저축 등) 수령을 시작할 나이를 설정합니다." value={retireConfig.user_profile.private_pension_start_age} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, private_pension_start_age: Math.floor(parseInt(v) || 0)}})} />
                <InputGroup label="National Pension" unit="Age" tooltip="국민연금 수령이 시작되는 나이입니다. (보통 65세)" value={retireConfig.user_profile.national_pension_start_age} onChange={(v) => setRetireConfig({...retireConfig, user_profile: {...retireConfig.user_profile, national_pension_start_age: Math.floor(parseInt(v) || 0)}})} />
              </div>
            </section>

            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
              <SectionTitle icon={Wallet2} title="Pension Assets" color="text-amber-400" tooltip="개인연금, 퇴직금 등 노후 자산의 현황과 인출 목표를 관리합니다." />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Initial Capital" value={retireConfig.pension_params.initial_investment} isCurrency tooltip="현재 연금 계좌에 들어있는 현금 및 주식의 총합입니다." onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, initial_investment: parseInt(v) || 0}})} />
                <InputGroup label="Withdrawal" value={retireConfig.pension_params.monthly_withdrawal_target} isCurrency tooltip="연금 수령기에 매달 연금 계좌에서 인출하여 사용할 목표 금액입니다." onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, monthly_withdrawal_target: parseInt(v) || 0}})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Severance" value={retireConfig.pension_params.severance_reserve} isCurrency tooltip="퇴직 시 연금 계좌로 유입될 예상 퇴직금 총액입니다." onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, severance_reserve: parseInt(v) || 0}})} />
                <InputGroup label="Other" value={retireConfig.pension_params.other_reserve} isCurrency tooltip="연금 외에 은퇴 자금으로 활용할 기타 예비 자산입니다." onChange={(v) => setRetireConfig({...retireConfig, pension_params: {...retireConfig.pension_params, other_reserve: parseInt(v) || 0}})} />
              </div>
            </section>
          </div>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle icon={Building2} title="Corporate Setup" color="text-emerald-400" tooltip="법인 자산의 초기 투자금과 운영 비용, 절세를 위한 주주대여금 상태를 설정합니다." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputGroup label="Total Inv." isCurrency tooltip="법인 계좌에서 운용 중인 총 투자 자산 규모입니다." value={retireConfig.corp_params.initial_investment} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, initial_investment: parseInt(v) || 0}})} />
              <InputGroup label="Capital" isCurrency tooltip="법인 설립 시 납입한 자본금입니다." value={retireConfig.corp_params.capital_stock} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, capital_stock: parseInt(v) || 0}})} />
              <InputGroup label="Loan" isCurrency tooltip="법인에 빌려준 주주대여금 잔액입니다. 비과세 인출의 핵심 재원입니다." value={retireConfig.corp_params.initial_shareholder_loan} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, initial_shareholder_loan: parseInt(v) || 0}})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-800 pt-6">
              <InputGroup label="Salary" isCurrency tooltip="본인에게 지급할 세전 월 급여입니다. 건강보험 및 국민연금 산정 기준이 됩니다." value={retireConfig.corp_params.monthly_salary} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, monthly_salary: parseInt(v) || 0}})} />
              <InputGroup label="Fixed Cost" isCurrency tooltip="임대료, 기장료 등 법인 유지를 위해 매달 지출되는 고정 비용입니다." value={retireConfig.corp_params.monthly_fixed_cost} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, monthly_fixed_cost: parseInt(v) || 0}})} />
              <InputGroup label="Employees" unit="Count" tooltip="4대보험을 납부하는 총 직원 수입니다. 법인 부담금 계산에 쓰입니다." value={retireConfig.corp_params.employee_count} onChange={(v) => setRetireConfig({...retireConfig, corp_params: {...retireConfig.corp_params, employee_count: parseInt(v) || 0}})} />
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-3"><Activity size={18} /> Cashflow Events</h3>
              <div className="flex items-center gap-4">
                <div className="group relative">
                  <Info size={14} className="text-slate-600 cursor-help" />
                  <div className="absolute right-0 bottom-full mb-2 w-64 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                    미래에 발생할 일시적인 자산 유입(부동산 매도 등)이나 큰 지출을 등록합니다.
                  </div>
                </div>
                <button onClick={addCashflow} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-xl border border-slate-700 transition-all uppercase tracking-widest"><Plus size={16} /> Add Event</button>
              </div>
            </div>
            <div className="space-y-6">{(!retireConfig.planned_cashflows || retireConfig.planned_cashflows.length === 0) ? <p className="text-center py-10 text-slate-600 text-[11px] font-black uppercase border border-dashed border-slate-800 rounded-2xl">No events planned</p> : 
                retireConfig.planned_cashflows.map((ev) => (
                  <div key={ev.id} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-6 group relative">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-3 flex flex-col gap-2"><label className="text-[11px] font-black text-slate-500 uppercase ml-1">Type & Target</label><div className="flex gap-2"><select value={ev.type} onChange={(e) => updateCashflow(ev.id, {type: e.target.value as PlannedCashflow["type"]})} className="h-11 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 text-[11px] font-black uppercase text-slate-300 outline-none"><option value="INFLOW">In (+) </option><option value="OUTFLOW">Out (-)</option></select><select value={ev.entity} onChange={(e) => updateCashflow(ev.id, {entity: e.target.value as PlannedCashflow["entity"]})} className="h-11 flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2 text-[11px] font-black uppercase text-slate-300 outline-none"><option value="CORP">Corp</option><option value="PENSION">Pen</option></select></div></div>
                      <div className="md:col-span-5 flex flex-col gap-2"><label className="text-[11px] font-black text-slate-500 uppercase ml-1">Amount</label><div className="flex items-center gap-2"><select value={ev.currency || "USD"} onChange={(e) => updateCashflow(ev.id, {currency: e.target.value as PlannedCashflow["currency"]})} className="h-11 w-20 bg-slate-800 border border-slate-700 rounded-xl px-2 text-[11px] font-black text-slate-400 outline-none"><option value="USD">$</option><option value="KRW">₩</option></select><input type="text" value={Math.floor(ev.amount || 0).toLocaleString()} onChange={(e) => { const val = parseInt(e.target.value.replace(/,/g, "")) || 0; updateCashflow(ev.id, {amount: val}); }} className="h-11 flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 text-base font-black text-emerald-400 outline-none focus:border-emerald-500/50" /></div></div>
                      <div className="md:col-span-2 flex flex-col gap-2"><label className="text-[11px] font-black text-slate-500 uppercase ml-1">Year</label><input type="number" value={Math.floor(ev.year || 2030)} onChange={(e) => updateCashflow(ev.id, {year: parseInt(e.target.value) || 2030})} className="h-11 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 text-sm font-black text-slate-200 text-center outline-none" /></div>
                      <div className="md:col-span-2 flex flex-col gap-2"><label className="text-[11px] font-black text-slate-500 uppercase ml-1">Month</label><input type="number" value={Math.floor(ev.month || 1)} onChange={(e) => updateCashflow(ev.id, {month: parseInt(e.target.value) || 1})} className="h-11 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 text-sm font-black text-slate-200 text-center outline-none" /></div>
                    </div>
                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-900"><label className="text-[11px] font-black text-slate-500 uppercase ml-1">Description</label><div className="flex items-center gap-4"><input type="text" value={ev.description || ""} onFocus={(e) => e.target.select()} onChange={(e) => updateCashflow(ev.id, {description: e.target.value})} className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 placeholder:text-slate-700 outline-none focus:border-slate-600 focus:bg-slate-900" placeholder="상세 내용을 입력하세요" /><button onClick={() => removeCashflow(ev.id)} className="p-3 text-slate-600 hover:text-rose-500 bg-slate-900 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-800"><Trash2 size={20} /></button></div></div>
                  </div>
                ))
              }</div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle icon={Clock} title="Sim Control" color="text-slate-400" tooltip="시뮬레이션을 수행할 총 기간(연 단위)을 설정합니다." />
            <InputGroup label="Duration" unit="Years" tooltip="은퇴 후 시뮬레이션을 지속할 총 연수입니다. 보통 30년을 기본으로 합니다." value={retireConfig.simulation_params.simulation_years} onChange={(v) => setRetireConfig({...retireConfig, simulation_params: {...retireConfig.simulation_params, simulation_years: parseInt(v) || 30}})} />
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle icon={Settings2} title="Basic Constants" color="text-slate-400" tooltip="건강보험료 점수 단가 및 자산 성장률 등 계산 엔진의 기초 상수를 정의합니다." />
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Price Appreciation</label>
                  <div className="group relative">
                    <Info size={12} className="text-slate-600 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-56 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                      포트폴리오 전체에 일괄 적용되는 연간 주가 상승률입니다. 은퇴 시뮬레이션 시 '배당률 + 성장률'로 총수익률이 계산됩니다.
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1" 
                    data-testid="price-appreciation-input"
                    value={settings.price_appreciation_rate} 
                    onChange={(e) => setSettings({...settings, price_appreciation_rate: parseFloat(e.target.value) || 0})} 
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-emerald-400 outline-none focus:border-emerald-500" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-600">% / Year</span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Health Unit Price</label>
                  <div className="group relative">
                    <Info size={12} className="text-slate-600 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                      지역가입자 건강보험료 산정을 위한 점수당 단가입니다. (2024년 기준 208.4원)
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <input type="number" step="0.1" value={retireConfig.tax_and_insurance?.point_unit_price || 208.4} onChange={(e) => setRetireConfig({...retireConfig, tax_and_insurance: {...retireConfig.tax_and_insurance, point_unit_price: parseFloat(e.target.value)}})} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-600">KRW</span>
                </div>
              </div>
              <InputGroup label="SGOV Buffer" unit="Mo" tooltip="법인 운영비 및 지출을 위해 안전 자산(SGOV 등)으로 확보해둘 목표 개월수입니다." value={retireConfig.trigger_thresholds?.target_buffer_months || 24} onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, target_buffer_months: parseInt(v) || 0}})} />
            </div>
          </section>

          <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <SectionTitle icon={ShieldCheck} title="Assumptions" color="text-slate-400" tooltip="시장 수익률과 인플레이션에 대한 미래 시나리오를 정의합니다." />
            <div className="space-y-4">
              {Object.entries(retireConfig.assumptions).map(([id, item]) => (
                <div key={id} className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.name || (id === 'v1' ? 'Standard' : 'Conservative')}</h4>
                    <div className="group relative">
                      <Info size={12} className="text-slate-700 cursor-help" />
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                        {id === 'v1' ? '표준적인 시장 상황을 가정한 시나리오입니다.' : '보수적이고 방어적인 시장 상황을 가정한 시나리오입니다.'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <EditableInput 
                      label="Expected Return" 
                      unit="%" 
                      initialValue={(item.master_return || item.expected_return) * 100} 
                      systemDefault={id === 'v1' ? 0.0485 : 0.035} 
                      onCommit={(v) => setRetireConfig({...retireConfig, assumptions: {...retireConfig.assumptions, [id]: {...item, master_return: v/100, expected_return: v/100}}})} 
                    />
                    <EditableInput 
                      label="Inflation Rate" 
                      unit="%" 
                      initialValue={(item.master_inflation || item.inflation_rate) * 100} 
                      systemDefault={id === 'v1' ? 0.025 : 0.035} 
                      onCommit={(v) => setRetireConfig({...retireConfig, assumptions: {...retireConfig.assumptions, [id]: {...item, master_inflation: v/100, inflation_rate: v/100}}})} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 relative">
            <button onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="w-full p-8 flex items-center justify-between hover:bg-slate-800/20 transition-all group rounded-[2.5rem]" data-testid="advanced-settings-toggle">
              <div className="flex items-center gap-3 text-xs font-black text-amber-500 uppercase tracking-widest">
                <Gauge size={18} /> Advanced Engine
                <div className="group relative ml-2">
                  <Info size={14} className="text-slate-700 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-200 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                    계산 엔진의 세부 동작 파라미터를 제어합니다. 전문가용 설정입니다.
                  </div>
                </div>
              </div>
              {isAdvancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {isAdvancedOpen && (
              <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top duration-300" data-testid="advanced-settings-content">
                <div className="space-y-6 border-t border-slate-800 pt-6">
                  <InputGroup label="High Income Cap" unit="%" tooltip="고소득(건보료 상한 등) 시 자산 인출을 제한하는 수익률 임계치입니다." value={retireConfig.trigger_thresholds.high_income_cap_rate * 100} onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, high_income_cap_rate: parseFloat(v)/100}})} />
                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Yield Multipliers</h4>
                      <div className="group relative">
                        <Info size={12} className="text-slate-700 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                          자산군별로 시장 수익률 대비 가중치를 설정합니다.
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Equity Mult" unit="x" tooltip="주식형(VOO 등) 수익률 가중치입니다. (기본 1.2배)" value={retireConfig.trigger_thresholds.equity_yield_multiplier * 100} onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, equity_yield_multiplier: parseFloat(v)/100}})} />
                      <InputGroup label="Debt Mult" unit="x" tooltip="채권형(BND 등) 수익률 가중치입니다. (기본 0.6배)" tooltipAlign="right" value={retireConfig.trigger_thresholds.debt_yield_multiplier * 100} onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, debt_yield_multiplier: parseFloat(v)/100}})} />
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Trigger Thresholds</h4>
                      <div className="group relative">
                        <Info size={12} className="text-slate-700 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                          리밸런싱이나 인출 전략이 변경되는 임계점 설정입니다.
                        </div>
                      </div>
                    </div>
                    <InputGroup label="Market Panic" unit="%" tooltip="포트폴리오 리밸런싱을 중단하는 하락장 임계치입니다." value={retireConfig.trigger_thresholds.market_panic_threshold * 100} onChange={(v) => setRetireConfig({...retireConfig, trigger_thresholds: {...retireConfig.trigger_thresholds, market_panic_threshold: parseFloat(v)/100}})} />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-10">
          <div className="flex-1">
            {status && (
              <div className={cn("flex items-center gap-3 text-sm font-bold", status.type === "success" ? "text-emerald-400" : "text-red-400")}>
                {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {status.message}
              </div>
            )}
            {!status && (
              <div className="flex items-center gap-2 px-2">
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest">Commit strategy changes to server.</p>
                <div className="group relative">
                  <Info size={12} className="text-slate-700 cursor-help" />
                  <div className="absolute bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
                    현재 수정된 모든 설정값을 서버에 영구적으로 저장합니다.
                  </div>
                </div>
              </div>
            )}
          </div>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-3 px-10 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-slate-950 font-black rounded-xl transition-all shadow-lg text-xs">
            {loading ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />}
            {loading ? "Syncing..." : "Apply All Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, isCurrency = false, unit, tooltip, tooltipAlign = "left" }: { label: string, value: number, onChange: (v: string) => void, isCurrency?: boolean, unit?: string, tooltip?: string, tooltipAlign?: "left" | "right" }) {
  const numericValue = Math.floor(value || 0);
  const displayValue = isCurrency ? numericValue.toLocaleString() : numericValue.toString();
  return (
    <div className="space-y-1.5" data-testid={`input-group-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-1.5 ml-1">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        {tooltip && (
          <div className="group relative">
            <Info size={12} className="text-slate-600 cursor-help" data-testid="tooltip-icon" />
            <div className={cn(
              "absolute bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95",
              tooltipAlign === "right" ? "right-0" : "left-0"
            )}>
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <input 
          type="text" 
          value={displayValue} 
          onChange={(e) => { const rawValue = e.target.value.replace(/,/g, ""); onChange(rawValue === "" ? "0" : rawValue); }} 
          className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-slate-200 outline-none focus:border-emerald-500 transition-all" 
        />
        {(isCurrency || unit) && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-600">{isCurrency ? "KRW" : unit}</span>}
      </div>
    </div>
  );
}

function EditableInput({ id, label, unit, initialValue, systemDefault, onCommit }: { id?: string, label: string, unit?: string, initialValue: number, systemDefault: number, onCommit: (val: number) => void }) {
  const [value, setValue] = useState(initialValue.toFixed(2));
  useEffect(() => { setValue(initialValue.toFixed(2)); }, [initialValue]);
  const handleBlur = () => { 
    const num = parseFloat(value); 
    if (!isNaN(num)) { 
      onCommit(num); 
      setValue(num.toFixed(2)); 
    } else { 
      setValue(initialValue.toFixed(2)); 
    } 
  };
  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 ml-1">
        <label className="text-[11px] font-black text-slate-500 uppercase">{label}</label>
        <div className="group relative">
          <Info size={10} className="text-slate-700 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 p-3 rounded-xl text-[11px] text-slate-300 font-bold hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed text-left normal-case tracking-normal animate-in fade-in zoom-in-95">
            {label === "Expected Return" ? "미래 예상 수익률을 % 단위로 입력하세요." : "미래 예상 인플레이션율을 % 단위로 입력하세요."}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 flex items-center">
          <input 
            id={id} 
            data-testid={id} 
            type="text" 
            className="w-full bg-slate-900 border border-slate-800 rounded-xl h-11 px-4 text-sm font-black text-emerald-400 outline-none focus:border-blue-500/50 pr-10" 
            value={value} 
            onChange={(e) => setValue(e.target.value)} 
            onBlur={handleBlur} 
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} 
          />
          {unit && <span className="absolute right-4 text-[11px] font-black text-slate-600">{unit}</span>}
        </div>
        {Math.abs(initialValue - (systemDefault * 100)) > 0.01 && (
          <button 
            onClick={(e) => { e.stopPropagation(); onCommit(systemDefault * 100); }} 
            className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl text-blue-400 transition-all flex-shrink-0"
            title="시스템 기본값으로 복구"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
