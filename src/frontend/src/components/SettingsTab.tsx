import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Key, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * [REQ-SYS-04] API 키 및 사용자 설정 관리 UI
 */
export function SettingsTab() {
  const [settings, setSettings] = useState({
    dart_api_key: "",
    gemini_api_key: "",
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
    <div className="max-w-2xl mx-auto py-4">
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
          <p className="text-[11px] text-slate-500 ml-1">
            한국 종목의 정확한 배당 데이터를 위해 필요합니다.
          </p>
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
          <p className="text-[11px] text-slate-500 ml-1">
            AI 어드바이저 기능을 사용하기 위해 필요합니다.
          </p>
        </div>

        {/* 상태 메시지 */}
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

        {/* 저장 버튼 */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className={cn(
              "flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]",
              loading && "cursor-wait opacity-80"
            )}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
