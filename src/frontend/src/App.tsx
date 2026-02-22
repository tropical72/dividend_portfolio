import { useState, useEffect } from "react";
import {
  ListTodo,
  Wallet,
  Settings,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { cn } from "./lib/utils";
import { WatchlistTab } from "./components/WatchlistTab";
import { SettingsTab } from "./components/SettingsTab";
import { PortfolioTab } from "./components/PortfolioTab";
import { RetirementTab } from "./components/RetirementTab";
import type { PortfolioItem, Stock, AppSettings, RetirementConfig } from "./types";

/**
 * [GS-UI-03] 모던 디자인 원칙이 적용된 메인 대시보드
 */
function App() {
  const [activeTab, setActiveTab] = useState("retirement");
  const [health, setHealth] = useState<string>("checking...");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [retireConfig, setRetireConfig] = useState<RetirementConfig | null>(null);
  
  // [NEW] 포트폴리오 설계 중인 항목들
  const [designItems, setDesignItems] = useState<PortfolioItem[]>([]);

  const fetchSettings = () => {
    fetch("http://localhost:8000/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.data) {
          setSettings(data.data);
        }
      });
      
    fetch("http://localhost:8000/api/retirement/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.data) {
          setRetireConfig(data.data);
        }
      });
  };

  useEffect(() => {
    // 백엔드 연결 상태 확인
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth("offline"));

    fetchSettings();
  }, []);

  // [UI 안정성] 설정이 로드되지 않았을 때의 기본값 보정
  const safeSettings: AppSettings = settings || {
    dart_api_key: "",
    gemini_api_key: "",
    default_capital: 10000,
    default_currency: "USD"
  };

  /** Watchlist에서 종목들을 포트폴리오로 이관하는 핸들러 [REQ-PRT-02.1] */
  const handleAddToPortfolio = (newStocks: Stock[], category: PortfolioItem["category"]) => {
    setDesignItems(prev => {
      const existingSymbols = new Set(prev.map(i => i.symbol));
      const itemsToAdd = newStocks
        .filter(s => !existingSymbols.has(s.symbol))
        .map(s => ({
          symbol: s.symbol,
          name: s.name,
          category: category,
          weight: 0, // 초기 비중 0
          price: s.price,
          dividend_yield: s.dividend_yield,
          last_div_amount: s.last_div_amount,
          payment_months: s.payment_months
        }));
      return [...prev, ...itemsToAdd];
    });
    setActiveTab("assets"); // 자산 관리 탭으로 전환
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 사이드바: RAMS 계층 구조 반영 */}
      <nav className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 p-6 flex flex-col gap-2">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="p-2 bg-emerald-500 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <TrendingUp className="text-slate-950 w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tighter">RAMS v1</h1>
        </div>

        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-3">Main Dashboard</div>
        <NavButton
          active={activeTab === "retirement"}
          icon={<ShieldCheck />}
          label="Retirement"
          onClick={() => setActiveTab("retirement")}
        />

        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-6 mb-2 ml-3">Asset Manager</div>
        <NavButton
          active={activeTab === "assets"}
          icon={<Wallet />}
          label="Asset Setup"
          onClick={() => setActiveTab("assets")}
        />
        <NavButton
          active={activeTab === "watchlist"}
          icon={<ListTodo />}
          label="Watchlist"
          onClick={() => setActiveTab("watchlist")}
        />

        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-6 mb-2 ml-3">System</div>
        <NavButton
          active={activeTab === "strategy"}
          icon={<Settings />}
          label="Strategy Settings"
          onClick={() => setActiveTab("strategy")}
        />

        <div className="mt-auto p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Engine Status</span>
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                health === "ok"
                  ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                  : "bg-red-500 shadow-[0_0_8px_#ef4444]",
              )}
            />
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800 p-10 shadow-sm min-h-full">
          {activeTab === "retirement" && (
            <RetirementTab />
          )}
          {activeTab === "assets" && (
            <PortfolioTab 
              items={designItems} 
              setItems={setDesignItems} 
              activeTab={activeTab} 
              globalSettings={safeSettings}
            />
          )}
          {activeTab === "watchlist" && (
            <WatchlistTab onAddToPortfolio={handleAddToPortfolio} />
          )}
          {activeTab === "strategy" && (
            <SettingsTab 
              onSettingsUpdate={fetchSettings} 
              globalSettings={safeSettings}
              globalRetireConfig={retireConfig}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/** 사이드바 버튼 컴포넌트 */
function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${label} Tab`}
      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group",
        active
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
      )}
    >
      <span
        className={cn(
          "w-5 h-5",
          active
            ? "text-emerald-400"
            : "text-slate-500 group-hover:text-slate-100",
        )}
      >
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default App;
