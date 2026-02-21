import { useState, useEffect } from "react";
import {
  ListTodo,
  Wallet,
  Settings,
  ShieldCheck,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { cn } from "./lib/utils";
import { WatchlistTab } from "./components/WatchlistTab";
import { SettingsTab } from "./components/SettingsTab";
import { PortfolioTab } from "./components/PortfolioTab";

/**
 * [GS-UI-03] 모던 디자인 원칙이 적용된 메인 대시보드
 */
function App() {
  const [activeTab, setActiveTab] = useState("watchlist");
  const [health, setHealth] = useState<string>("checking...");

  useEffect(() => {
    // 백엔드 연결 상태 확인
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth("offline"));
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 사이드바: Glassmorphism 스타일 적용 */}
      <nav className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 p-6 flex flex-col gap-2">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="p-2 bg-emerald-500 rounded-lg">
            <TrendingUp className="text-slate-950 w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">DiviFlow</h1>
        </div>

        <NavButton
          active={activeTab === "watchlist"}
          icon={<ListTodo />}
          label="Watchlist"
          onClick={() => setActiveTab("watchlist")}
        />
        <NavButton
          active={activeTab === "portfolio"}
          icon={<Wallet />}
          label="Portfolio"
          onClick={() => setActiveTab("portfolio")}
        />
        <NavButton
          active={activeTab === "advisor"}
          icon={<ShieldCheck />}
          label="AI Advisor"
          onClick={() => setActiveTab("advisor")}
        />
        <NavButton
          active={activeTab === "settings"}
          icon={<Settings />}
          label="Settings"
          onClick={() => setActiveTab("settings")}
        />

        <div className="mt-auto p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Server Status</span>
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                health === "ok"
                  ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                  : "bg-red-500",
              )}
            />
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        {/* 상단 Stat Cards: 요약 정보 표시 */}
        <header className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            label="Total Assets"
            value="$124,500.00"
            subValue="+2.4% vs last month"
            icon={<DollarSign className="text-emerald-400" />}
          />
          <StatCard
            label="Annual Dividend"
            value="$5,240.00"
            subValue="Yield: 4.21%"
            icon={<TrendingUp className="text-emerald-400" />}
          />
          <StatCard
            label="Monthly Income"
            value="$436.67"
            subValue="Next pay: Oct 15"
            icon={<Wallet className="text-emerald-400" />}
          />
        </header>

        {/* 메인 섹션 */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-8 shadow-sm">
          <div className={cn(activeTab === "watchlist" ? "block" : "hidden")}>
            <WatchlistTab />
          </div>
          <div className={cn(activeTab === "portfolio" ? "block" : "hidden")}>
            <PortfolioTab />
          </div>
          <div className={cn(activeTab === "settings" ? "block" : "hidden")}>
            <SettingsTab />
          </div>
          <div className={cn(!["watchlist", "settings"].includes(activeTab) ? "block" : "hidden")}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            <div className="h-96 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
              {activeTab} 컨텐츠가 여기에 구현될 예정입니다.
            </div>
          </div>
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

/** 통계 카드 컴포넌트 */
function StatCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: string;
  subValue: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-sm hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <span className="text-slate-400 font-medium">{label}</span>
        <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-slate-50 mb-1">{value}</div>
      <div className="text-xs text-emerald-400 font-medium">{subValue}</div>
    </div>
  );
}

export default App;
