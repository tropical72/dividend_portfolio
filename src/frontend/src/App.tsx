import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  Scale,
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
import { CostComparisonTab } from "./components/CostComparisonTab";
import { I18nProvider, useI18n } from "./i18n";
import type {
  AccountType,
  PortfolioItem,
  Stock,
  AppSettings,
  RetirementConfig,
  UiLanguage,
} from "./types";

/**
 * [GS-UI-03] 모던 디자인 원칙이 적용된 메인 대시보드
 */
function App() {
  const [activeTab, setActiveTab] = useState("retirement");
  const [health, setHealth] = useState<string>("checking...");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [language, setLanguage] = useState<UiLanguage>("ko");
  const [retireConfig, setRetireConfig] = useState<RetirementConfig | null>(
    null,
  );

  // [NEW] 포트폴리오 설계 중인 항목들
  const [designItems, setDesignItems] = useState<PortfolioItem[]>([]);
  const [designAccountType, setDesignAccountType] =
    useState<AccountType>("Corporate");

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

  useEffect(() => {
    if (settings?.ui_language) {
      setLanguage(settings.ui_language);
    }
  }, [settings?.ui_language]);

  // [UI 안정성] 설정이 로드되지 않았을 때의 기본값 보정
  const safeSettings: AppSettings = settings || {
    dart_api_key: "",
    gemini_api_key: "",
    default_capital: 10000,
    default_currency: "USD",
    ui_language: "ko",
  };

  /** Watchlist에서 종목들을 포트폴리오로 이관하는 핸들러 [REQ-PRT-02.1] */
  const handleAddToPortfolio = (
    newStocks: Stock[],
    category: PortfolioItem["category"],
  ) => {
    setDesignItems((prev) => {
      const existingSymbols = new Set(prev.map((i) => i.symbol));
      const itemsToAdd = newStocks
        .filter((s) => !existingSymbols.has(s.symbol))
        .map((s) => ({
          symbol: s.symbol,
          name: s.name,
          category: category,
          weight: 0, // 초기 비중 0
          price: s.price,
          dividend_yield: s.dividend_yield,
          last_div_amount: s.last_div_amount,
          payment_months: s.payment_months,
        }));
      return [...prev, ...itemsToAdd];
    });
  };

  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      <AppShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        safeSettings={safeSettings}
        retireConfig={retireConfig}
        fetchSettings={fetchSettings}
        designItems={designItems}
        setDesignItems={setDesignItems}
        designAccountType={designAccountType}
        setDesignAccountType={setDesignAccountType}
        handleAddToPortfolio={handleAddToPortfolio}
      />
    </I18nProvider>
  );
}

function AppShell({
  activeTab,
  setActiveTab,
  health,
  safeSettings,
  retireConfig,
  fetchSettings,
  designItems,
  setDesignItems,
  designAccountType,
  setDesignAccountType,
  handleAddToPortfolio,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: string;
  safeSettings: AppSettings;
  retireConfig: RetirementConfig | null;
  fetchSettings: () => void;
  designItems: PortfolioItem[];
  setDesignItems: Dispatch<SetStateAction<PortfolioItem[]>>;
  designAccountType: AccountType;
  setDesignAccountType: Dispatch<SetStateAction<AccountType>>;
  handleAddToPortfolio: (
    newStocks: Stock[],
    category: PortfolioItem["category"],
  ) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="planner-shell flex min-h-screen bg-transparent text-slate-100 font-sans">
      {/* 사이드바: RAMS 계층 구조 반영 */}
      <nav className="w-72 shrink-0 border-r border-slate-800/70 bg-white/60 p-6 backdrop-blur-xl flex flex-col gap-2">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="p-2.5 rounded-2xl bg-emerald-100 shadow-sm ring-1 ring-emerald-200/70">
            <TrendingUp className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              RAMS v1
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Retirement planning studio
            </p>
          </div>
        </div>

        <div className="mb-2 ml-3 text-[11px] font-bold text-slate-500">
          {t("app.mainDashboard")}
        </div>
        <NavButton
          active={activeTab === "retirement"}
          icon={<ShieldCheck />}
          label={t("app.retirement")}
          testId="nav-retirement"
          onClick={() => setActiveTab("retirement")}
        />
        <NavButton
          active={activeTab === "cost-comparison"}
          icon={<Scale />}
          label={t("app.costComparison")}
          testId="nav-cost-comparison"
          onClick={() => setActiveTab("cost-comparison")}
        />

        <div className="mt-6 mb-2 ml-3 text-[11px] font-bold text-slate-500">
          {t("app.assetManager")}
        </div>
        <NavButton
          active={activeTab === "assets"}
          icon={<Wallet />}
          label={t("app.portfolioManager")}
          testId="nav-asset-setup"
          onClick={() => setActiveTab("assets")}
        />
        <NavButton
          active={activeTab === "watchlist"}
          icon={<ListTodo />}
          label={t("app.watchlist")}
          testId="nav-watchlist"
          onClick={() => setActiveTab("watchlist")}
        />

        <div className="mt-6 mb-2 ml-3 text-[11px] font-bold text-slate-500">
          {t("app.system")}
        </div>
        <NavButton
          active={activeTab === "strategy"}
          icon={<Settings />}
          label={t("app.strategySettings")}
          testId="nav-strategy-settings"
          onClick={() => setActiveTab("strategy")}
        />

        <div className="mt-auto rounded-[1.5rem] border border-white/70 bg-white/72 p-4 text-xs shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500">
              {t("app.engineStatus")}
            </span>
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                health === "ok"
                  ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                  : "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]",
              )}
            />
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <main className="soft-scrollbar flex-1 overflow-y-auto bg-transparent p-8">
        <div className="mx-auto min-h-full max-w-[1600px] rounded-[2rem] border border-white/65 bg-white/42 p-8 shadow-sm backdrop-blur-md">
          {activeTab === "retirement" && <RetirementTab />}
          {activeTab === "cost-comparison" && <CostComparisonTab />}
          {activeTab === "assets" && (
            <PortfolioTab
              items={designItems}
              setItems={setDesignItems}
              activeTab={activeTab}
              globalSettings={safeSettings}
              accountType={designAccountType}
              setAccountType={setDesignAccountType}
            />
          )}
          {activeTab === "watchlist" && (
            <WatchlistTab
              onAddToPortfolio={handleAddToPortfolio}
              accountType={designAccountType}
            />
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
  testId,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${label} Tab`}
      data-testid={testId}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200",
        active
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
      )}
    >
      <span
        className={cn(
          "h-5 w-5",
          active
            ? "text-emerald-700"
            : "text-slate-400 group-hover:text-slate-700",
        )}
      >
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default App;
