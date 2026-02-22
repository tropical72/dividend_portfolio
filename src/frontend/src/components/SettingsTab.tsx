import { useState, useEffect } from "react";
import { 
  Save, 
  Eye, 
  EyeOff, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Calculator,
  BellRing,
  RefreshCcw,
  ShieldCheck
} from "lucide-react";
import { cn } from "../lib/utils";
import type { RetirementConfig, AppSettings } from "../types";

interface SettingsTabProps {
  onSettingsUpdate: () => void;
  globalSettings: AppSettings | null;
  globalRetireConfig: RetirementConfig | null;
}

/**
 * [REQ-SYS-04] API 키 및 은퇴 전략 변수 관리 UI
 */
export function SettingsTab({ onSettingsUpdate, globalSettings, globalRetireConfig }: SettingsTabProps) {
  const [settings, setSettings] = useState({
    dart_api_key: "",
    gemini_api_key: "",
    default_capital: 10000,
    default_currency: "USD",
  });
  
  // 로컬 편집용 은퇴 엔진 설정 상태
  const [retireConfig, setRetireConfig] = useState<RetirementConfig | null>(null);

  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({
    dart: false,
    gemini: false,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Props 변경 시 로컬 상태 동기화
  useEffect(() => {
    if (globalSettings) {
      setSettings({
        dart_api_key: globalSettings.dart_api_key || "",
        gemini_api_key: globalSettings.gemini_api_key || "",
        default_capital: globalSettings.default_capital ?? 10000,
        default_currency: globalSettings.default_currency || "USD",
      });
    }
    if (globalRetireConfig) {
      setRetireConfig(globalRetireConfig);
    }
  }, [globalSettings, globalRetireConfig]);

  // 통합 저장 핸들러
  const handleSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
      // 앱 설정 저장
      const res1 = await fetch("http://localhost:8000/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      
      // 은퇴 전략 설정 저장
      const res2 = await fetch("http://localhost:8000/api/retirement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retireConfig),
      });

      if (res1.ok && res2.ok) {
        setStatus({ type: "success", message: "모든 전략 설정이 성공적으로 저장되었습니다." });
        onSettingsUpdate();
      } else {
        throw new Error("저장 실패");
      }
    } catch {
      setStatus({ type: "error", message: "서버와 통신 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 데이터 로딩 중이거나 데이터 구조가 불완전할 때의 방어 로직
  if (!retireConfig) {
    return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
        <RefreshCcw className="animate-spin text-slate-700" size={32} />
        <p className="text-slate-500 font-black tracking-widest uppercase text-xs">Initializing Strategy Engine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-16 pb-32">
      {/* 타이틀 영역 */}
      <div className="border-b border-slate-800 pb-8">
        <h2 className="text-3xl font-black text-slate-50 flex items-center gap-3 tracking-tight">
          <Calculator className="text-emerald-400" size={32} /> Simulation Strategy Settings
        </h2>
        <p className="text-slate-400 text-sm mt-2 font-medium">
          은퇴 자산 시뮬레이션 및 포트폴리오 분석 시 사용할 핵심 변수들을 제어합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* 좌측 컬럼: 핵심 금융 변수 */}
        <div className="space-y-12">
          <section className="space-y-8">
            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} /> Tax & Insurance Parameters
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">부동산 공시가격 (지역건보료 기준)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={(retireConfig.personal_params?.real_estate_price ?? 0).toLocaleString()}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/,/g, "")) || 0;
                      setRetireConfig({
                        ...retireConfig,
                        personal_params: { ...retireConfig.personal_params, real_estate_price: val }
                      });
                    }}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none text-slate-200 font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-black">KRW</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 ml-1">건보료 점수 단가</label>
                  <input
                    type="number"
                    step="0.1"
                    value={retireConfig.tax_and_insurance?.point_unit_price ?? 208.4}
                    onChange={(e) => setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: { ...retireConfig.tax_and_insurance, point_unit_price: parseFloat(e.target.value) }
                    })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 outline-none text-slate-200 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 ml-1">법인세 (2억 이하 %)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(retireConfig.tax_and_insurance?.corp_tax_low_rate ?? 0.09) * 100}
                    onChange={(e) => setRetireConfig({
                      ...retireConfig,
                      tax_and_insurance: { ...retireConfig.tax_and_insurance, corp_tax_low_rate: parseFloat(e.target.value) / 100 }
                    })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 outline-none text-slate-200 font-bold"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <BellRing size={14} /> Alert Thresholds
            </h3>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                  <label className="text-xs font-bold text-slate-400">안전 버퍼 목표 (SGOV)</label>
                  <span className="text-amber-400 font-black text-sm">{retireConfig.trigger_thresholds?.target_buffer_months ?? 24}개월</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="60"
                  value={retireConfig.trigger_thresholds?.target_buffer_months ?? 24}
                  onChange={(e) => setRetireConfig({
                    ...retireConfig,
                    trigger_thresholds: { ...retireConfig.trigger_thresholds, target_buffer_months: parseInt(e.target.value) }
                  })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          </section>

          {/* 시나리오 기본값 설정 섹션 추가 */}
          <section className="space-y-8">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={14} /> Assumption Profile Defaults
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {Object.entries(retireConfig.assumptions || {}).map(([id, item]: [string, any]) => (
                <div key={id} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-4">
                  <h4 className="text-sm font-black text-slate-200 uppercase tracking-tight">{item.name} Defaults</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Return Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={(item.expected_return * 100).toFixed(2)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) / 100;
                          setRetireConfig({
                            ...retireConfig,
                            assumptions: {
                              ...retireConfig.assumptions,
                              [id]: { ...item, expected_return: val }
                            }
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 font-bold text-sm outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Inflation (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={(item.inflation_rate * 100).toFixed(1)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) / 100;
                          setRetireConfig({
                            ...retireConfig,
                            assumptions: {
                              ...retireConfig.assumptions,
                              [id]: { ...item, inflation_rate: val }
                            }
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 font-bold text-sm outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 우측 컬럼: 인프라 및 API 설정 */}
        <div className="space-y-12 bg-slate-900/20 p-8 rounded-3xl border border-slate-800/50">
          <section className="space-y-8">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Key size={14} /> Infrastructure Keys
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">OpenDart API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.dart ? "text" : "password"}
                    value={settings.dart_api_key}
                    onChange={(e) => setSettings({ ...settings, dart_api_key: e.target.value })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-500/50 outline-none text-slate-200"
                  />
                  <button onClick={() => toggleKeyVisibility("dart")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500">
                    {showKeys.dart ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.gemini ? "text" : "password"}
                    value={settings.gemini_api_key}
                    onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-500/50 outline-none text-slate-200"
                  />
                  <button onClick={() => toggleKeyVisibility("gemini")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500">
                    {showKeys.gemini ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 고정 하단 저장 바 */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-50">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-6">
          <div className="flex-1">
            {status && (
              <div className={cn(
                "flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-bottom-2",
                status.type === "success" ? "text-emerald-400" : "text-red-400"
              )}>
                {status.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {status.message}
              </div>
            )}
            {!status && <p className="text-slate-500 text-xs font-medium px-2">전략 변수를 수정하신 후 저장 버튼을 눌러주세요.</p>}
          </div>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-10 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs"
          >
            {loading ? <RefreshCcw className="animate-spin" size={16} /> : <Save size={16} />}
            {loading ? "Syncing..." : "Save Strategy"}
          </button>
        </div>
      </div>
    </div>
  );
}
