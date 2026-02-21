import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Key, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * [REQ-SYS-04] API 키 및 사용자 설정 관리 UI
 */
export function SettingsTab({ onSettingsUpdate }: { onSettingsUpdate?: () => void }) {
  const [settings, setSettings] = useState({
    dart_api_key: "",
    gemini_api_key: "",
    default_capital: 10000,
    default_currency: "USD",
  });
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({
    dart: false,
    gemini: false,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 설정 로드
  useEffect(() => {
    fetch("http://localhost:8000/api/settings")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setSettings({
            dart_api_key: res.data.dart_api_key || "",
            gemini_api_key: res.data.gemini_api_key || "",
            default_capital: res.data.default_capital ?? 10000,
            default_currency: res.data.default_currency || "USD",
          });
        }
      })
      .catch(() => setStatus({ type: "error", message: "설정을 불러오지 못했습니다." }));
  }, []);

  // 설정 저장
  const handleSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("http://localhost:8000/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (data.success) {
        setStatus({ type: "success", message: "설정이 성공적으로 저장되었습니다." });
        if (onSettingsUpdate) onSettingsUpdate(); // 전역 상태 갱신 트리거
      } else {
        setStatus({ type: "error", message: data.message || "저장에 실패했습니다." });
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

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-12">
      {/* 1. API Key 섹션 */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-slate-800 rounded-xl">
            <Key className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-50">API Key Settings</h2>
            <p className="text-slate-400 text-sm mt-1">
              데이터 수집 및 AI 분석을 위한 외부 API 키를 관리합니다.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* OpenDart API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">OpenDart API Key</label>
            <div className="relative">
              <input
                type={showKeys.dart ? "text" : "password"}
                value={settings.dart_api_key}
                onChange={(e) => setSettings({ ...settings, dart_api_key: e.target.value })}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-slate-200"
                placeholder="OpenDart API 키를 입력하세요"
              />
              <button
                onClick={() => toggleKeyVisibility("dart")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showKeys.dart ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Gemini API Key</label>
            <div className="relative">
              <input
                type={showKeys.gemini ? "text" : "password"}
                value={settings.gemini_api_key}
                onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-slate-200"
                placeholder="Gemini API 키를 입력하세요"
              />
              <button
                onClick={() => toggleKeyVisibility("gemini")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showKeys.gemini ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Simulation Defaults 섹션 */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-slate-800 rounded-xl">
            <TrendingUp className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-50">Simulation Defaults</h2>
            <p className="text-slate-400 text-sm mt-1">
              포트폴리오 분석 시 사용할 기본 투자 설정입니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Default Currency</label>
            <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setSettings({ ...settings, default_currency: "USD" })}
                className={cn(
                  "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                  settings.default_currency === "USD" ? "bg-slate-800 text-emerald-400" : "text-slate-500 hover:text-slate-400"
                )}
              >USD ($)</button>
              <button 
                onClick={() => setSettings({ ...settings, default_currency: "KRW" })}
                className={cn(
                  "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                  settings.default_currency === "KRW" ? "bg-slate-800 text-emerald-400" : "text-slate-500 hover:text-slate-400"
                )}
              >KRW (₩)</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Default Capital</label>
            <div className="relative">
              <input
                type="text"
                value={settings.default_capital.toLocaleString()}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setSettings({ ...settings, default_capital: parseFloat(val) || 0 });
                }}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-slate-200 font-bold"
                placeholder="10000"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                {settings.default_currency === "USD" ? "$" : "₩"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 상태 메시지 및 저장 버튼 */}
      <div className="space-y-6">
        {status && (
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300",
              status.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            )}
          >
            {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className={cn(
            "flex items-center justify-center gap-2 w-full sm:w-auto px-12 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-slate-950 font-black rounded-2xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.2)] uppercase tracking-widest",
            loading && "cursor-wait opacity-80"
          )}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {loading ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}

