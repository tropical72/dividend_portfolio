import { createContext, useContext } from "react";

import type { ReactNode } from "react";

import type { UiLanguage } from "./types";

type TranslationKey = keyof typeof translations.en;

type I18nContextValue = {
  language: UiLanguage;
  isKorean: boolean;
  setLanguage: (language: UiLanguage) => void;
  t: (key: TranslationKey) => string;
};

const translations = {
  en: {
    "app.mainDashboard": "Main Dashboard",
    "app.assetManager": "Asset Manager",
    "app.system": "System",
    "app.retirement": "Retirement",
    "app.portfolioManager": "Portfolio Manager",
    "app.watchlist": "Watchlist",
    "app.strategySettings": "Strategy Settings",
    "app.engineStatus": "Engine Status",
    "retirement.loading": "Calculating Simulation...",
    "retirement.errorTitle": "Error",
    "retirement.retry": "Retry",
    "retirement.activeStrategy": "Active Strategy",
    "retirement.customStrategyBuilder": "Custom Strategy Builder",
    "retirement.masterYield": "Master DY",
    "retirement.tr": "TR",
    "retirement.changePlan": "Change Plan",
    "retirement.broken": "Broken",
    "retirement.corporate": "Corporate",
    "retirement.pension": "Pension",
    "retirement.none": "None",
    "retirement.exchangeRate": "Exchange Rate",
    "retirement.step1Title": "Step 1. Set the Basis",
    "retirement.step1Subtitle":
      "Choose the market assumptions you want to apply",
    "retirement.assumption.standard": "Standard Profile",
    "retirement.assumption.conservative": "Conservative Profile",
    "retirement.return": "Return",
    "retirement.inflation": "Inflation",
    "retirement.reset": "Reset",
    "retirement.step2Title": "Step 2. Projection Result",
    "retirement.unshakable": "Unshakable",
    "retirement.solid": "Solid",
    "retirement.fragile": "Fragile",
    "retirement.status": "Status",
    "retirement.canRetire":
      "Your current setup can support the retirement you want.",
    "retirement.needMoreAssets":
      "Your current strategy still needs more asset support.",
    "retirement.yearsSustainable": "The assets can last for",
    "retirement.yearsSuffix": "years.",
    "retirement.finalNw": "Final NW",
    "retirement.finalNwTooltip":
      "Estimated net worth at the end of the simulation period.",
    "retirement.cashExhaust": "Cash Exhaust",
    "retirement.cashExhaustTooltip":
      "Expected date when liquid safety assets reach zero.",
    "retirement.appliedRules": "Applied Rules",
    "retirement.rebalance": "Rebalance",
    "retirement.corpSgov": "Corp SGOV",
    "retirement.pensionSgov": "Pension SGOV",
    "retirement.bearFreeze": "Bear Freeze",
    "retirement.monthlyCost": "Monthly Cost",
    "retirement.enabled": "Enabled",
    "retirement.disabled": "Disabled",
    "retirement.chart.yearTick": "Y",
    "retirement.chart.yearLabel": "Year",
    "retirement.chart.monthLabel": "Month",
    "retirement.chart.totalAssets": "Total Assets",
    "retirement.chart.corpAssets": "Corporate Assets",
    "retirement.chart.pensionAssets": "Pension Assets",
    "retirement.step5Title": "Step 5. Detailed Math Log",
    "retirement.table.dateAge": "Date (Age)",
    "retirement.table.phase": "Phase",
    "retirement.table.targetCf": "Target CF",
    "retirement.table.totalDraw": "Total Draw",
    "retirement.table.corpBal": "Corp Bal",
    "retirement.table.penBal": "Pen Bal",
    "retirement.table.netWorth": "Net Worth",
    "retirement.table.loanBal": "Loan Bal",
    "retirement.table.ageSuffix": "y",
    "retirement.table.tenThousand": "K",
    "retirement.table.hundredMillion": "100M",
    "settings.loading": "Loading Strategy Center...",
    "settings.title": "Strategy Center",
    "settings.subtitle":
      "Control the master variables and future events of the retirement simulation.",
    "settings.tooltip":
      "This is the central control center for the retirement simulation. Values set here immediately affect calculations and charts.",
    "settings.saveSuccess": "All strategy settings were saved.",
    "settings.saveError": "A network error occurred while saving.",
    "settings.commitHint": "Commit strategy changes to server.",
    "settings.commitTooltip":
      "Persist all currently edited settings to the server.",
    "settings.syncing": "Syncing...",
    "settings.applyAllChanges": "Apply All Changes",
    "settings.userProfile": "User Profile",
    "settings.userProfileTooltip":
      "Define the life cycle by setting the user's age and pension start timing.",
    "settings.birthYear": "Birth Year",
    "settings.birthYearTooltip":
      "Enter the birth year. It is used as the base for age calculations.",
    "settings.age": "Age",
    "settings.birthMonth": "Birth Month",
    "settings.birthMonthTooltip":
      "Enter the birth month. It is used to calculate pension start timing precisely.",
    "settings.privatePension": "Private Pension",
    "settings.privatePensionTooltip":
      "Age when private pension accounts begin withdrawals.",
    "settings.nationalPension": "National Pension",
    "settings.nationalPensionTooltip":
      "Age when the national pension begins. Usually age 65.",
    "settings.retirementIncome": "Retirement Income",
    "settings.retirementIncomeTooltip":
      "Configure when national pension starts and how much monthly income it adds to Phase 3.",
    "settings.nationalPensionAmount": "National Pension Income",
    "settings.nationalPensionAmountTooltip":
      "Expected monthly amount received from the national pension after the start age.",
    "settings.pensionAssets": "Pension Assets",
    "settings.pensionAssetsTooltip":
      "Manage the current state of pension assets and withdrawal targets.",
    "settings.initialCapital": "Initial Capital",
    "settings.initialCapitalTooltip":
      "Current total of cash and securities inside the pension account.",
    "settings.withdrawal": "Withdrawal",
    "settings.withdrawalTooltip":
      "Monthly target amount to withdraw from pension accounts during retirement.",
    "settings.severance": "Severance",
    "settings.severanceTooltip":
      "Expected severance amount that will flow into pension accounts.",
    "settings.other": "Other",
    "settings.otherTooltip":
      "Other reserve assets that can be used for retirement funding.",
    "settings.corporateSetup": "Corporate Setup",
    "settings.corporateSetupTooltip":
      "Configure corporate assets, operating costs, and shareholder loan status.",
    "settings.totalInv": "Total Inv.",
    "settings.totalInvTooltip":
      "Total investment assets currently managed in the corporate account.",
    "settings.capital": "Capital",
    "settings.capitalTooltip": "Paid-in capital at incorporation.",
    "settings.loan": "Loan",
    "settings.loanTooltip":
      "Outstanding shareholder loan balance. Core source for tax-free draws.",
    "settings.salary": "Salary",
    "settings.salaryTooltip":
      "Monthly gross salary paid to yourself. Used for insurance calculations.",
    "settings.fixedCost": "Fixed Cost",
    "settings.fixedCostTooltip":
      "Monthly fixed corporate expenses such as rent and bookkeeping.",
    "settings.employees": "Employees",
    "settings.employeesTooltip":
      "Total employee count used for social insurance burden calculations.",
    "settings.strategyRules": "Strategy Rules",
    "settings.strategyRulesTooltip":
      "Expose the stock-plan defaults as user settings and tune buffers, floors, and annual execution policy.",
    "settings.resetAll": "Reset All",
    "settings.executionPolicy": "Execution Policy",
    "settings.reset": "Reset",
    "settings.rebalanceMonth": "Rebalance Month",
    "settings.rebalanceMonthTooltip":
      "Month when mechanical rebalancing and planned strategy sales execute.",
    "settings.rebalanceWeek": "Rebalance Week",
    "settings.rebalanceWeekTooltip": "Week of the month when rebalancing runs.",
    "settings.bearFreeze": "Bear Freeze",
    "settings.bearFreezeTooltip":
      "Freeze Dividend Growth and Growth Engine selling during bear markets.",
    "settings.enabled": "Enabled",
    "settings.disabled": "Disabled",
    "settings.corporateRules": "Corporate Rules",
    "settings.corpTargetBuffer": "Corp Target Buffer",
    "settings.corpTargetBufferTooltip":
      "Target months for the corporate SGOV buffer.",
    "settings.corpWarnBuffer": "Corp Warn Buffer",
    "settings.corpWarnBufferTooltip":
      "Warning months for the corporate SGOV buffer.",
    "settings.corpCrisisBuffer": "Corp Crisis Buffer",
    "settings.corpCrisisBufferTooltip":
      "Crisis threshold in months that blocks Growth Engine sales.",
    "settings.growthSellYears": "Growth Sell Years",
    "settings.growthSellYearsTooltip":
      "Remaining life threshold that allows Growth Engine selling.",
    "settings.highIncomeMin": "High Income Min",
    "settings.highIncomeMinTooltip":
      "Minimum allocation for High Income assets.",
    "settings.highIncomeMax": "High Income Max",
    "settings.highIncomeMaxTooltip":
      "Maximum guide allocation for High Income assets.",
    "settings.pensionRules": "Pension Rules",
    "settings.pensionSgovMin": "Pension SGOV Min",
    "settings.pensionSgovMinTooltip":
      "Minimum years to maintain the pension SGOV buffer.",
    "settings.bondMinYears": "Bond Min Years",
    "settings.bondMinYearsTooltip":
      "Minimum years to maintain the pension bond buffer.",
    "settings.bondMinRatio": "Bond Min Ratio",
    "settings.bondMinRatioTooltip":
      "Minimum total asset ratio for the pension bond buffer.",
    "settings.dividendMinRatio": "Dividend Min Ratio",
    "settings.dividendMinRatioTooltip":
      "Minimum total asset ratio for pension dividend growth assets.",
    "settings.cashflowEvents": "Cashflow Events",
    "settings.cashflowEventsTooltip":
      "Register future one-time inflows or large expenses.",
    "settings.addEvent": "Add Event",
    "settings.deleteEvent": "Delete",
    "settings.noEvents": "No events planned",
    "settings.typeTarget": "Type & Target",
    "settings.amount": "Amount",
    "settings.year": "Year",
    "settings.month": "Month",
    "settings.description": "Description",
    "settings.descriptionPlaceholder": "Enter details",
    "settings.inflow": "In (+)",
    "settings.outflow": "Out (-)",
    "settings.corpShort": "Corp",
    "settings.penShort": "Pen",
    "settings.simControl": "Sim Control",
    "settings.simControlTooltip":
      "Set the monthly living cost target and total simulation duration.",
    "settings.monthlyLivingCost": "Monthly Living Cost",
    "settings.monthlyLivingCostTooltip":
      "Total monthly living cost target that corporate and pension assets must fund.",
    "settings.duration": "Duration",
    "settings.durationTooltip": "Total number of retirement years to simulate.",
    "settings.basicConstants": "Basic Constants",
    "settings.basicConstantsTooltip":
      "Define core constants such as language, insurance unit price, and appreciation rate.",
    "settings.uiLanguage": "UI Language",
    "settings.uiLanguageTooltip":
      "Choose the default language for the entire app UI.",
    "settings.korean": "Korean",
    "settings.english": "English",
    "settings.pa": "Price Appreciation",
    "settings.paTooltip":
      "Annual price appreciation rate applied across the portfolio.",
    "settings.perYear": "% / Year",
    "settings.healthUnitPrice": "Health Unit Price",
    "settings.healthUnitPriceTooltip":
      "Unit price per score used to estimate national health insurance premiums.",
    "settings.sgovBuffer": "SGOV Buffer",
    "settings.sgovBufferTooltip":
      "Target months of safe assets reserved for corporate operations and spending.",
    "settings.assumptions": "Assumptions",
    "settings.assumptionsTooltip":
      "Define future scenarios for market return and inflation.",
    "settings.assumptionStandardTooltip":
      "Standard Profile TR is derived from the currently active master portfolio.",
    "settings.assumptionConservativeTooltip":
      "Scenario assuming conservative and defensive market conditions.",
    "settings.tr": "TR",
    "settings.trTooltip":
      "For Standard Profile, TR is derived from the active master portfolio. Other scenarios can be edited directly.",
    "settings.dy": "Dividend Yield",
    "settings.dyTooltip": "Dividend yield from historical data.",
    "settings.inflationRate": "Inflation Rate",
    "settings.inflationRateTooltip":
      "Enter the expected inflation rate in percentage terms.",
    "settings.restoreSystemDefault": "Restore system default",
    "settings.advancedEngine": "Advanced Engine",
    "settings.advancedEngineTooltip":
      "Control detailed engine parameters intended for expert use.",
    "settings.appreciationRates": "Categorized Price Appreciation",
    "settings.appreciationRatesTooltip":
      "Define different annual price appreciation rates for each asset category.",
    "settings.catCash": "SGOV Buffer",
    "settings.catFixed": "Fixed Income",
    "settings.catDividend": "Dividend Stocks",
    "settings.catGrowth": "Growth Stocks",
    "settings.highIncomeCap": "High Income Cap",
    "settings.highIncomeCapTooltip":
      "Yield threshold that limits withdrawals in high-income cases.",
    "settings.yieldMultipliers": "Yield Multipliers",
    "settings.yieldMultipliersTooltip":
      "Set weighting relative to the market return by asset class.",
    "settings.equityMult": "Equity Mult",
    "settings.equityMultTooltip":
      "Yield multiplier for equity assets such as VOO.",
    "settings.debtMult": "Debt Mult",
    "settings.debtMultTooltip": "Yield multiplier for debt assets such as BND.",
    "settings.triggerThresholds": "Trigger Thresholds",
    "settings.triggerThresholdsTooltip":
      "Thresholds where rebalancing or withdrawal strategy changes.",
    "settings.marketPanic": "Market Panic",
    "settings.marketPanicTooltip":
      "Bear-market threshold that halts portfolio rebalancing.",
  },
  ko: {
    "app.mainDashboard": "메인 대시보드",
    "app.assetManager": "자산 관리",
    "app.system": "시스템",
    "app.retirement": "은퇴",
    "app.portfolioManager": "포트폴리오 관리",
    "app.watchlist": "관심종목",
    "app.strategySettings": "전략 설정",
    "app.engineStatus": "엔진 상태",
    "retirement.loading": "시뮬레이션 계산 중...",
    "retirement.errorTitle": "오류 발생",
    "retirement.retry": "재시도",
    "retirement.activeStrategy": "활성 전략",
    "retirement.customStrategyBuilder": "사용자 전략 빌더",
    "retirement.masterYield": "마스터 배당수익률",
    "retirement.tr": "TR",
    "retirement.changePlan": "전략 변경",
    "retirement.broken": "참조 오류",
    "retirement.corporate": "법인",
    "retirement.pension": "연금",
    "retirement.none": "없음",
    "retirement.exchangeRate": "현재 환율",
    "retirement.step1Title": "1단계. 기준 시나리오 설정",
    "retirement.step1Subtitle": "적용할 시장 가정을 선택하세요",
    "retirement.assumption.standard": "표준 프로필",
    "retirement.assumption.conservative": "보수 프로필",
    "retirement.return": "수익률",
    "retirement.inflation": "인플레이션",
    "retirement.reset": "복구",
    "retirement.step2Title": "2단계. 시뮬레이션 결과",
    "retirement.unshakable": "매우 안정적",
    "retirement.solid": "안정적",
    "retirement.fragile": "보강 필요",
    "retirement.status": "상태",
    "retirement.canRetire": "현재 설정이면 원하는 모습으로 은퇴할 수 있습니다.",
    "retirement.needMoreAssets": "현재 전략으로는 자산 보강이 더 필요합니다.",
    "retirement.yearsSustainable": "자산은 앞으로",
    "retirement.yearsSuffix": "년 동안 유지 가능합니다.",
    "retirement.finalNw": "최종 순자산",
    "retirement.finalNwTooltip": "시뮬레이션 종료 시점의 예상 순자산입니다.",
    "retirement.cashExhaust": "현금 고갈 시점",
    "retirement.cashExhaustTooltip":
      "안전자산 잔고가 0이 되는 예상 시점입니다.",
    "retirement.appliedRules": "적용 규칙",
    "retirement.rebalance": "리밸런싱",
    "retirement.corpSgov": "법인 SGOV",
    "retirement.pensionSgov": "연금 SGOV",
    "retirement.bearFreeze": "하락장 동결",
    "retirement.monthlyCost": "월 생활비",
    "retirement.enabled": "활성",
    "retirement.disabled": "비활성",
    "retirement.chart.yearTick": "년",
    "retirement.chart.yearLabel": "년차",
    "retirement.chart.monthLabel": "개월",
    "retirement.chart.totalAssets": "합산 자산",
    "retirement.chart.corpAssets": "법인 자산",
    "retirement.chart.pensionAssets": "연금 자산",
    "retirement.step5Title": "5단계. 상세 계산 로그",
    "retirement.table.dateAge": "일자 (나이)",
    "retirement.table.phase": "단계",
    "retirement.table.targetCf": "목표 현금흐름",
    "retirement.table.totalDraw": "총 인출",
    "retirement.table.corpBal": "법인 잔고",
    "retirement.table.penBal": "연금 잔고",
    "retirement.table.netWorth": "순자산",
    "retirement.table.loanBal": "대여금 잔고",
    "retirement.table.ageSuffix": "세",
    "retirement.table.tenThousand": "만",
    "retirement.table.hundredMillion": "억",
    "settings.loading": "전략 센터 로딩 중...",
    "settings.title": "전략 센터",
    "settings.subtitle":
      "은퇴 시뮬레이션의 핵심 변수와 미래 이벤트를 제어합니다.",
    "settings.tooltip":
      "은퇴 시뮬레이션의 중앙 제어 센터입니다. 여기서 설정한 값은 계산과 그래프에 바로 반영됩니다.",
    "settings.saveSuccess": "모든 전략 설정이 저장되었습니다.",
    "settings.saveError": "저장 중 통신 오류가 발생했습니다.",
    "settings.commitHint": "현재 변경 사항을 서버에 저장합니다.",
    "settings.commitTooltip":
      "지금 수정한 모든 설정값을 서버에 영구 저장합니다.",
    "settings.syncing": "동기화 중...",
    "settings.applyAllChanges": "모든 변경 적용",
    "settings.userProfile": "사용자 프로필",
    "settings.userProfileTooltip":
      "출생 연월과 연금 시작 시점을 기준으로 생애 주기를 정의합니다.",
    "settings.birthYear": "출생 연도",
    "settings.birthYearTooltip":
      "만 나이 계산의 기준이 되는 출생 연도를 입력합니다.",
    "settings.age": "세",
    "settings.birthMonth": "출생 월",
    "settings.birthMonthTooltip":
      "연금 시작 시점을 정밀하게 계산하기 위한 출생 월입니다.",
    "settings.privatePension": "개인연금",
    "settings.privatePensionTooltip":
      "IRP, 연금저축 등 개인연금 인출을 시작할 나이입니다.",
    "settings.nationalPension": "국민연금",
    "settings.nationalPensionTooltip":
      "국민연금 수령이 시작되는 나이입니다. 보통 65세입니다.",
    "settings.retirementIncome": "은퇴 수입(국민연금)",
    "settings.retirementIncomeTooltip":
      "국민연금 개시 시점과 월 예상 수령액을 설정해 Phase 3 시뮬레이션에 반영합니다.",
    "settings.nationalPensionAmount": "월 예상 수령액",
    "settings.nationalPensionAmountTooltip":
      "국민연금 개시 연령 이후 매달 유입되는 예상 국민연금 수령액입니다.",
    "settings.pensionAssets": "연금 자산",
    "settings.pensionAssetsTooltip":
      "연금 자산 현황과 월 인출 목표를 관리합니다.",
    "settings.initialCapital": "초기 자산",
    "settings.initialCapitalTooltip":
      "현재 연금 계좌에 있는 현금과 주식 총합입니다.",
    "settings.withdrawal": "월 인출 목표",
    "settings.withdrawalTooltip":
      "은퇴 후 연금 계좌에서 매달 사용할 목표 인출 금액입니다.",
    "settings.severance": "퇴직금",
    "settings.severanceTooltip":
      "퇴직 시 연금 계좌로 유입될 예상 퇴직금 총액입니다.",
    "settings.other": "기타 예비자산",
    "settings.otherTooltip":
      "은퇴 자금으로 활용할 수 있는 기타 예비 자산입니다.",
    "settings.corporateSetup": "법인 설정",
    "settings.corporateSetupTooltip":
      "법인 자산, 운영비, 주주대여금 상태를 설정합니다.",
    "settings.totalInv": "총 투자자산",
    "settings.totalInvTooltip": "법인 계좌에서 운용 중인 총 투자 자산입니다.",
    "settings.capital": "자본금",
    "settings.capitalTooltip": "법인 설립 시 납입한 자본금입니다.",
    "settings.loan": "주주대여금",
    "settings.loanTooltip":
      "법인에 빌려준 주주대여금 잔액입니다. 비과세 인출의 핵심 재원입니다.",
    "settings.salary": "월 급여",
    "settings.salaryTooltip":
      "본인에게 지급할 세전 월 급여입니다. 보험료 계산 기준이 됩니다.",
    "settings.fixedCost": "고정비",
    "settings.fixedCostTooltip":
      "임대료, 기장료 등 법인 유지에 필요한 월 고정 비용입니다.",
    "settings.employees": "직원 수",
    "settings.employeesTooltip": "4대보험 산정에 사용하는 총 직원 수입니다.",
    "settings.strategyRules": "전략 규칙",
    "settings.strategyRulesTooltip":
      "stock-plan 기본 전략을 사용자 설정으로 노출하고 계좌별 규칙을 조정합니다.",
    "settings.resetAll": "전체 복구",
    "settings.executionPolicy": "실행 정책",
    "settings.reset": "복구",
    "settings.rebalanceMonth": "리밸런싱 월",
    "settings.rebalanceMonthTooltip":
      "기계적 리밸런싱과 계획된 매도를 실행할 기준 월입니다.",
    "settings.rebalanceWeek": "리밸런싱 주차",
    "settings.rebalanceWeekTooltip": "리밸런싱을 실행할 주차입니다.",
    "settings.bearFreeze": "하락장 동결",
    "settings.bearFreezeTooltip":
      "하락장에서는 Dividend Growth와 Growth Engine 매도를 잠급니다.",
    "settings.enabled": "활성",
    "settings.disabled": "비활성",
    "settings.corporateRules": "법인 규칙",
    "settings.corpTargetBuffer": "법인 목표 버퍼",
    "settings.corpTargetBufferTooltip": "법인 SGOV 버퍼 목표 개월수입니다.",
    "settings.corpWarnBuffer": "법인 경고 버퍼",
    "settings.corpWarnBufferTooltip": "법인 SGOV 버퍼 경고 개월수입니다.",
    "settings.corpCrisisBuffer": "법인 위기 버퍼",
    "settings.corpCrisisBufferTooltip":
      "Growth Engine 매도 예외를 판단하는 위기 개월수입니다.",
    "settings.growthSellYears": "성장자산 매도 연수",
    "settings.growthSellYearsTooltip":
      "Growth Engine 매도를 허용할 남은 기대수명 임계값입니다.",
    "settings.highIncomeMin": "고소득 최소 비중",
    "settings.highIncomeMinTooltip": "High Income 최소 비중입니다.",
    "settings.highIncomeMax": "고소득 최대 비중",
    "settings.highIncomeMaxTooltip": "High Income 최대 비중 가이드입니다.",
    "settings.pensionRules": "연금 규칙",
    "settings.pensionSgovMin": "연금 SGOV 최소",
    "settings.pensionSgovMinTooltip": "연금 SGOV 버퍼 최소 유지 연수입니다.",
    "settings.bondMinYears": "채권 최소 연수",
    "settings.bondMinYearsTooltip": "연금 채권 버퍼 최소 유지 연수입니다.",
    "settings.bondMinRatio": "채권 최소 비중",
    "settings.bondMinRatioTooltip": "연금 채권 버퍼 최소 총자산 비중입니다.",
    "settings.dividendMinRatio": "배당 최소 비중",
    "settings.dividendMinRatioTooltip":
      "연금 Dividend Growth 최소 총자산 비중입니다.",
    "settings.cashflowEvents": "현금흐름 이벤트",
    "settings.cashflowEventsTooltip":
      "미래의 일회성 자산 유입이나 큰 지출을 등록합니다.",
    "settings.addEvent": "이벤트 추가",
    "settings.deleteEvent": "삭제",
    "settings.noEvents": "등록된 이벤트가 없습니다",
    "settings.typeTarget": "유형 및 대상",
    "settings.amount": "금액",
    "settings.year": "연도",
    "settings.month": "월",
    "settings.description": "설명",
    "settings.descriptionPlaceholder": "상세 내용을 입력하세요",
    "settings.inflow": "유입 (+)",
    "settings.outflow": "유출 (-)",
    "settings.corpShort": "법인",
    "settings.penShort": "연금",
    "settings.simControl": "시뮬레이션 제어",
    "settings.simControlTooltip":
      "월 생활비 목표와 총 시뮬레이션 기간을 설정합니다.",
    "settings.monthlyLivingCost": "월 생활비",
    "settings.monthlyLivingCostTooltip":
      "법인과 연금 자산이 매달 충당해야 할 총 생활비 목표입니다.",
    "settings.duration": "기간",
    "settings.durationTooltip": "은퇴 후 시뮬레이션할 총 연수입니다.",
    "settings.basicConstants": "기본 상수",
    "settings.basicConstantsTooltip":
      "언어, 건강보험 점수 단가, 자산 성장률 등 핵심 상수를 정의합니다.",
    "settings.uiLanguage": "UI 언어",
    "settings.uiLanguageTooltip": "앱 전체 UI에 적용할 기본 언어를 선택합니다.",
    "settings.korean": "한국어",
    "settings.english": "영어",
    "settings.pa": "기대주가상승률",
    "settings.paTooltip":
      "포트폴리오 전체에 공통 적용되는 연간 기대주가상승률입니다.",
    "settings.perYear": "% / 연",
    "settings.healthUnitPrice": "건보 점수 단가",
    "settings.healthUnitPriceTooltip":
      "건강보험료 계산에 사용하는 점수당 단가입니다.",
    "settings.sgovBuffer": "SGOV 버퍼",
    "settings.sgovBufferTooltip":
      "법인 운영비와 지출을 위해 확보할 안전자산 목표 개월수입니다.",
    "settings.assumptions": "가정 시나리오",
    "settings.assumptionsTooltip":
      "시장 수익률과 인플레이션에 대한 미래 시나리오를 정의합니다.",
    "settings.assumptionStandardTooltip":
      "표준 프로필 TR은 현재 활성 마스터 포트폴리오의 계산 TR을 사용합니다.",
    "settings.assumptionConservativeTooltip":
      "보수적이고 방어적인 시장 상황을 가정한 시나리오입니다.",
    "settings.tr": "TR",
    "settings.trTooltip":
      "표준 프로필 TR은 활성 마스터 포트폴리오 기준으로 계산되며, 다른 시나리오는 직접 수정할 수 있습니다.",
    "settings.dy": "배당수익률",
    "settings.dyTooltip": "과거 데이터 기반 배당수익률입니다.",
    "settings.inflationRate": "인플레이션율",
    "settings.inflationRateTooltip":
      "미래 예상 인플레이션율을 % 단위로 입력합니다.",
    "settings.restoreSystemDefault": "시스템 기본값으로 복구",
    "settings.advancedEngine": "고급 엔진 설정",
    "settings.advancedEngineTooltip":
      "계산 엔진의 세부 동작 파라미터를 제어하는 전문가용 설정입니다.",
    "settings.appreciationRates": "자산군별 기대주가상승률",
    "settings.appreciationRatesTooltip":
      "각 자산 카테고리별로 서로 다른 연간 기대주가상승률을 정의합니다.",
    "settings.catCash": "SGOV 버퍼",
    "settings.catFixed": "채권/인컴",
    "settings.catDividend": "배당성장",
    "settings.catGrowth": "성장엔진",
    "settings.highIncomeCap": "고소득 상한",
    "settings.highIncomeCapTooltip":
      "고소득 상황에서 인출을 제한하는 수익률 임계치입니다.",
    "settings.yieldMultipliers": "수익률 배수",
    "settings.yieldMultipliersTooltip":
      "자산군별 시장 수익률 대비 가중치를 설정합니다.",
    "settings.equityMult": "주식 배수",
    "settings.equityMultTooltip": "주식형 자산의 수익률 가중치입니다.",
    "settings.debtMult": "채권 배수",
    "settings.debtMultTooltip": "채권형 자산의 수익률 가중치입니다.",
    "settings.triggerThresholds": "트리거 임계치",
    "settings.triggerThresholdsTooltip":
      "리밸런싱이나 인출 전략이 바뀌는 기준점입니다.",
    "settings.marketPanic": "시장 패닉",
    "settings.marketPanicTooltip":
      "포트폴리오 리밸런싱을 중단하는 하락장 임계치입니다.",
  },
} as const;

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  language,
  setLanguage,
  children,
}: {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  children: ReactNode;
}) {
  const t = (key: TranslationKey) => translations[language][key] ?? key;
  const isKorean = language === "ko";

  return (
    <I18nContext.Provider value={{ language, isKorean, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
