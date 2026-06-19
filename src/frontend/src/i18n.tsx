import { createContext, useContext } from "react";

import type { ReactNode } from "react";

import type { UiLanguage } from "./types";

export type TranslationKey = keyof typeof translations.en;

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
    "app.costComparison": "Cost Comparison",
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
    "retirement.exchangeRateUpdatedAt": "Last updated",
    "retirement.exchangeRateUpdatedUnknown": "Unknown",
    "retirement.exchangeRateRefresh": "Refresh now",
    "retirement.exchangeRateRefreshing": "Refreshing...",
    "retirement.exchangeRateRefreshFailed":
      "Unable to refresh the exchange rate.",
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
    "retirement.cashExhaust": "Corporate Cash Buffer Exhaust",
    "retirement.cashExhaustTooltip":
      "Expected date when the corporate SGOV/cash buffer reaches zero. This is not the date when total net worth is exhausted.",
    "retirement.yearsSustainableMetric": "Survival Horizon",
    "retirement.yearsSustainableTooltip":
      "How many full years the current strategy can sustain the retirement cashflow target.",
    "retirement.snapshotAssumption": "Active Assumption",
    "retirement.snapshotAssumptionTooltip":
      "Market return and inflation profile currently used for the simulation.",
    "retirement.snapshotDuration": "Simulation Duration",
    "retirement.snapshotDurationTooltip":
      "Number of years projected from the configured simulation start date.",
    "retirement.snapshotMonthlyTarget": "Monthly Cash Target",
    "retirement.snapshotMonthlyTargetTooltip":
      "Target household monthly cashflow before pension and salary offsets are applied.",
    "retirement.snapshotMaster": "Active Master",
    "retirement.snapshotMasterTooltip":
      "Master portfolio bundle used for the corporate and pension account strategy.",
    "retirement.statusSection": "Outcome",
    "retirement.shockFlag": "Crash Freeze",
    "retirement.shockFlagTooltip":
      "Final-month state of the Crash20 freeze. ON means a 20% equity drawdown freeze is still active and inflation raises are blocked until the next main review.",
    "retirement.stressMode": "Review Stress",
    "retirement.stressModeTooltip":
      "Final-month result of the annual review stress gate. Stress means the strategy could not safely approve all buffer and inflation checks.",
    "retirement.inflationDecision": "Cashflow Raise Decision",
    "retirement.inflationDecisionTooltip":
      "Decision made at the most recent main review: approve inflation-adjusted spending, freeze it, or no review in that month.",
    "retirement.shockOn": "ON",
    "retirement.shockOff": "OFF",
    "retirement.stressOn": "Stress",
    "retirement.stressOff": "Normal",
    "retirement.inflationApproved": "Approved",
    "retirement.inflationFrozen": "Frozen",
    "retirement.inflationNone": "No review",
    "retirement.metricsSection": "Key Metrics",
    "retirement.ruleSection": "Applied Rules",
    "retirement.inputGuideLabel": "Input Guide",
    "retirement.inputGuideBody":
      "Pick the scenario first, then adjust only the assumptions that need manual override.",
    "retirement.inputGuideLocked": "Master-linked",
    "retirement.inputGuideLockedBody":
      "The standard scenario follows the active master return and cannot be edited directly.",
    "retirement.inputGuideEditable": "Manual override",
    "retirement.inputGuideEditableBody":
      "The conservative scenario can be edited and reset back to the master baseline at any time.",
    "retirement.assumptionMasterLocked": "Linked to active master baseline",
    "retirement.assumptionEditable": "Editable override scenario",
    "retirement.assumptionMasterHint":
      "Use this scenario to see the current master portfolio assumptions without manual overrides.",
    "retirement.assumptionEditableHint":
      "Adjust this scenario when you want to test a stricter return or inflation assumption.",
    "retirement.chartStartAssets": "Starting Net Worth",
    "retirement.chartStartAssetsTooltip":
      "Total corporate and pension assets at the simulation start.",
    "retirement.chartLatestAssets": "Final Net Worth",
    "retirement.chartLatestAssetsTooltip":
      "Projected net worth at the last simulated month.",
    "retirement.chartMinimumAssets": "Minimum Net Worth",
    "retirement.chartMinimumAssetsTooltip":
      "Lowest projected net worth reached during the simulation.",
    "retirement.chartFocusLabel": "Chart Focus",
    "retirement.chartFocusBody":
      "Read the white line first for total net worth, then compare the corporate and pension balances below it.",
    "retirement.detailLogHelper":
      "Open the monthly ledger only when you need an audit-level trace.",
    "retirement.showDetailLog": "Show Detailed Log",
    "retirement.hideDetailLog": "Hide Detailed Log",
    "retirement.detailLogCollapsed":
      "The monthly ledger is folded by default. Open it only when you need a month-by-month audit trail.",
    "retirement.appliedRules": "Applied Rules",
    "retirement.rebalance": "Rebalance",
    "retirement.rebalanceTooltip":
      "Main annual review month used by the simulation calendar.",
    "retirement.corpSgov": "Corp SGOV",
    "retirement.corpSgovTooltip":
      "Corporate SGOV/cash buffer target measured in months of household cash need.",
    "retirement.pensionSgov": "Pension SGOV",
    "retirement.pensionSgovTooltip":
      "Pension SGOV/cash buffer target measured in months of pension withdrawals.",
    "retirement.monthlyCost": "Monthly Cost",
    "retirement.monthlyCostTooltip":
      "Configured household monthly cash need used as the main spending target.",
    "retirement.enabled": "Enabled",
    "retirement.disabled": "Disabled",
    "retirement.chart.yearTick": "Y",
    "retirement.chart.yearLabel": "Year",
    "retirement.chart.monthLabel": "Month",
    "retirement.chart.totalAssets": "Total Assets",
    "retirement.chart.corpAssets": "Corporate Assets",
    "retirement.chart.pensionAssets": "Pension Assets",
    "retirement.chart.personalAssets": "Personal Taxable Assets",
    "retirement.step5Title": "Step 5. Detailed Math Log",
    "retirement.table.dateAge": "Date (Age)",
    "retirement.table.phase": "Phase",
    "retirement.table.ops": "Ops",
    "retirement.table.reviewSnapshot": "Review",
    "retirement.table.targetCf": "Target CF",
    "retirement.table.totalDraw": "Household Receipt",
    "retirement.table.dateAgeTooltip":
      "Simulation month and the calculated age for that month.",
    "retirement.table.phaseTooltip":
      "Lifecycle phase. Phase 1 uses corporate cash only, Phase 2 adds private pension, and Phase 3 adds national pension.",
    "retirement.table.opsTooltip":
      "Monthly operating state such as Crash20, Shock Flag, Stress, BOOST, and inflation review result.",
    "retirement.table.reviewSnapshotTooltip":
      "Months of cover before and after review for both SGOV and Bond buffers. Corporate and pension accounts are shown separately.",
    "retirement.table.targetCfTooltip":
      "Monthly total cashflow target from Settings. This stays fixed unless a May inflation review approves a new value.",
    "retirement.table.totalDrawTooltip":
      "Actual cash received by the household in that month: pension draw, national pension, net salary, and shareholder-loan repayment.",
    "retirement.table.corpBalTooltip":
      "End-of-month total balance of the corporate account after draws and any review/rebalancing.",
    "retirement.table.penBalTooltip":
      "End-of-month total balance of the pension account after draws and any review/rebalancing.",
    "retirement.table.netWorthTooltip":
      "Combined end-of-month total assets of corporate and pension accounts.",
    "retirement.table.loanBalTooltip":
      "Remaining shareholder-loan balance available for tax-free repayment from corporate cash.",
    "retirement.table.noReviewChange": "No change",
    "retirement.table.reviewCorp": "Corp SGOV",
    "retirement.table.reviewPension": "Pension SGOV",
    "retirement.table.initialStateLabel": "Initial State",
    "retirement.table.initialStateOps": "Before simulation",
    "retirement.table.initialStateReview": "Configured starting values",
    "retirement.table.monthsSuffix": "mo",
    "retirement.table.corpBal": "Corp Bal",
    "retirement.table.personalBal": "Personal Bal",
    "retirement.table.personalBalTooltip":
      "Personal taxable account balance after monthly events and rebalancing.",
    "retirement.table.penBal": "Pen Bal",
    "retirement.table.netWorth": "Total Assets",
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
    "settings.personalTaxableAccount": "Personal Taxable Account",
    "settings.personalTaxableAccountTooltip":
      "Manage taxable investment assets with the same rebalancing rules.",
    "settings.personalTaxableWithdrawalTooltip":
      "Independent monthly withdrawal target from the taxable account SGOV buffer.",
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
    "settings.monthlyBookkeepingFee": "Monthly Bookkeeping Fee",
    "settings.monthlyBookkeepingFeeTooltip":
      "Recurring monthly corporate admin costs such as bookkeeping and basic filing support.",
    "settings.annualTaxAdjustmentFee": "Annual Tax Adjustment Fee",
    "settings.annualTaxAdjustmentFeeTooltip":
      "Annual year-end tax adjustment and corporate filing fee applied once per year.",
    "settings.corpTaxRate": "Corporate Tax Rate",
    "settings.corpTaxRateTooltip":
      "Nominal corporate tax rate shown in tax tables. Calculations apply local income tax, so 10% is calculated as 11%.",
    "settings.employees": "Employees",
    "settings.employeesTooltip":
      "Total employee count used for social insurance burden calculations.",
    "settings.strategyRules": "Strategy Rules",
    "settings.strategyRulesTooltip":
      "Expose the stock-plan defaults as user settings and tune buffers, floors, and annual execution policy.",
    "settings.osV11Title": "What this simulator models",
    "settings.osV11Body":
      "OS v11.1 is the operating policy behind this app. It separates corporate and pension assets, withdraws monthly spending only from SGOV cash buffers, and uses scheduled reviews to refill buffers or rebalance risk assets.",
    "settings.osV11PointAssets":
      "Asset roles: SGOV cash buffer, Bond buffer, High Income, Dividend Growth, and Growth Engine.",
    "settings.osV11PointAccounts":
      "Account split: corporate assets cover salary, household cashflow, tax, and buffer reviews; pension assets follow pension withdrawal and floor-refill rules.",
    "settings.osV11PointCalendar":
      "Calendar: main annual review in May by default, corporate follow-up in November, with stress and inflation decisions reflected in the simulation.",
    "settings.resetAll": "Reset All",
    "settings.executionPolicy": "Execution Policy",
    "settings.reset": "Reset",
    "settings.rebalanceMonth": "Rebalance Month",
    "settings.rebalanceMonthTooltip":
      "Month when mechanical rebalancing and planned strategy sales execute.",
    "settings.enabled": "Enabled",
    "settings.disabled": "Disabled",
    "settings.corporateRules": "Corporate Rules",
    "settings.corpTargetBuffer": "Corp SGOV Main Target",
    "settings.corpTargetBufferTooltip":
      "Engine-active. At the main annual review month, refill corporate SGOV Buffer up to this many months of corporate monthly cash need. Default: 30 months.",
    "settings.corpNovemberSgovTarget": "Corp November SGOV",
    "settings.corpNovemberSgovTargetTooltip":
      "Engine-active. At the corporate semiannual review, six months after the main review month, refill corporate SGOV Buffer up to this many months. Default: 27 months.",
    "settings.corpBondFloor": "Corp Bond Floor",
    "settings.corpBondFloorTooltip":
      "Engine-active. Rebalancing may use Bond Buffer as a donor only above this floor. Default: 12 months.",
    "settings.corpBondTarget": "Corp Bond Target",
    "settings.corpBondTargetTooltip":
      "Engine-active. At corporate reviews, refill Bond Buffer toward this target after SGOV is handled. Default: 18 months.",
    "settings.corpBondUpper": "Corp Bond Upper",
    "settings.corpBondUpperTooltip":
      "Engine-active. Bond above this upper band can be redeployed as surplus before other donor rules. Default: 24 months.",
    "settings.pensionRules": "Pension Rules",
    "settings.pensionSgovTarget": "Pension SGOV Target",
    "settings.pensionSgovTargetTooltip":
      "Engine-active. At the main annual review, refill pension SGOV Buffer up to this many months of pension withdrawal target. Default: 24 months.",
    "settings.pensionSgovFloor": "Pension SGOV Floor",
    "settings.pensionSgovFloorTooltip":
      "Engine-active. If pension SGOV falls below this floor, the engine refills it from Bond Buffer outside the annual review. Default: 12 months.",
    "settings.pensionBondFloor": "Pension Bond Floor",
    "settings.pensionBondFloorTooltip":
      "Engine-active. Rebalancing may use pension Bond Buffer as a donor only above this floor. Default: 12 months.",
    "settings.pensionBondTarget": "Pension Bond Target",
    "settings.pensionBondTargetTooltip":
      "Engine-active. At the main annual review, refill pension Bond Buffer toward this target after SGOV is handled. Default: 18 months.",
    "settings.pensionBondUpper": "Pension Bond Upper",
    "settings.pensionBondUpperTooltip":
      "Engine-active. Bond above this upper band can be redeployed as surplus. Default: 24 months.",
    "settings.distributionRules": "Distribution Rules",
    "settings.distributionRulesTooltip":
      "Optional run-rate overrides for non-cash sleeves. Enter 0 to leave the engine default behavior unchanged.",
    "settings.distributionGrowthRate": "Run-rate Growth",
    "settings.distributionGrowthRateTooltip":
      "Optional annual growth rate applied to the category's distribution run-rate. Enter percent per year. 0 means no override.",
    "settings.distributionStressCutRate": "Stress Cut",
    "settings.distributionStressCutRateTooltip":
      "Optional cut rate applied when Crash20 or review Stress triggers a distribution cut for this category. Enter percent. 0 means no override.",
    "settings.distributionNewBuyYield": "New Buy DY",
    "settings.distributionNewBuyYieldTooltip":
      "Optional structural dividend yield used only when new money is deployed into this category. It does not override the current holding's initial run-rate.",
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
    "settings.programSettings": "Program Settings",
    "settings.programSettingsTooltip":
      "Configure app-wide preferences that affect the entire interface rather than the calculation engine.",
    "settings.monthlyLivingCost": "Household Need",
    "settings.monthlyLivingCostTooltip":
      "Net household cash need per month. Pension income, national pension, net salary, and shareholder-loan repayment are measured against this value.",
    "settings.netSalaryEstimate": "Estimated Net Salary",
    "settings.netSalaryEstimateTooltip":
      "Estimated after-tax monthly salary based on the configured salary, pension, health insurance, employment insurance, and income tax rates.",
    "settings.corporateNeedEstimate": "Derived Corp Cost",
    "settings.corporateNeedEstimateTooltip":
      "Estimated monthly corporate operating cost from bookkeeping and annual tax adjustment fees.",
    "settings.krwPerMonth": "KRW / mo",
    "settings.simulationStartYear": "Start Year",
    "settings.simulationStartYearTooltip":
      "The first simulation year. The detailed log begins with an Initial State row at this year and month.",
    "settings.simulationStartMonth": "Start Month",
    "settings.simulationStartMonthTooltip":
      "The first simulation month. After the Initial State row, the log shows end-of-month balances from this month onward.",
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
      "Define different annual price appreciation rates for each asset category. Benchmarks: SGOV Buffer uses SGOV, Bond Buffer uses VGIT, High Income uses JEPI/JEPQ-style option income ETFs, Dividend Growth uses SCHD, and Growth Engine uses the S&P 500.",
    "settings.defaultPaScenario": "Default PA Scenario",
    "settings.defaultPaScenarioTooltip":
      "This scenario is used as the initial selection when Portfolio, Retirement, and Comparison views are opened.",
    "settings.editingPaScenario": "Editing scenario:",
    "settings.catCash": "SGOV Buffer",
    "settings.catCashTooltip":
      "Price-appreciation baseline derived from SGOV-style ultra-short Treasury exposure.",
    "settings.catBond": "Bond Buffer",
    "settings.catBondTooltip":
      "Price-appreciation baseline derived from VGIT-style intermediate treasury exposure.",
    "settings.catHighIncome": "High Income",
    "settings.catHighIncomeTooltip":
      "Price-appreciation baseline for JEPI/JEPQ/DIVO-style option income and covered-call income assets.",
    "settings.catDividend": "Dividend Stocks",
    "settings.catDividendTooltip":
      "Price-appreciation baseline derived from SCHD-style dividend-growth equity exposure.",
    "settings.catGrowth": "Growth Stocks",
    "settings.catGrowthTooltip":
      "Price-appreciation baseline derived from long-run S&P 500 price growth.",
    "scenario.conservative": "Conservative",
    "scenario.base": "Base",
    "scenario.optimistic": "Optimistic",
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
    "settings.debtMultTooltip":
      "Yield multiplier for debt assets such as VGIT.",
    "settings.triggerThresholds": "Trigger Thresholds",
    "settings.triggerThresholdsTooltip":
      "Thresholds where rebalancing or withdrawal strategy changes.",
    "settings.marketPanic": "Market Panic",
    "settings.marketPanicTooltip":
      "Bear-market threshold that halts portfolio rebalancing.",
    "settings.unusedTriggerSettingsTitle": "Unused trigger settings hidden",
    "settings.unusedTriggerSettingsBody":
      "High Income Cap, Yield Multipliers, and Market Panic are not connected to the retirement simulation engine yet. They are hidden until the engine contract is implemented.",
    "costComparison.loading": "Loading cost comparison...",
    "costComparison.loadError": "Failed to load cost comparison settings.",
    "costComparison.title": "Personal vs Corporate Comparison",
    "costComparison.subtitle":
      "Compare household cashflow and total costs under the selected master portfolio and the same TR.",
    "costComparison.inputSectionEyebrow": "Inputs",
    "costComparison.inputSection": "Comparison Inputs",
    "costComparison.inputSectionDescription":
      "Choose the comparison mode and enter the values used before running the simulation.",
    "costComparison.resultSectionEyebrow": "Results",
    "costComparison.resultSection": "Comparison Results",
    "costComparison.resultSectionDescription":
      "Review the winner, net cash composition, and scenario differences after running the comparison.",
    "costComparison.resultSectionEmpty":
      "Run the comparison to populate the result cards and charts below.",
    "costComparison.assumptionSection": "Baseline Assumptions",
    "costComparison.assumptionMode": "Comparison Mode",
    "costComparison.summarySection": "Key Takeaway",
    "costComparison.scenarioSection": "Scenario Cards",
    "costComparison.chartSection": "Visual Breakdown",
    "costComparison.save": "Save",
    "costComparison.saveSuccess": "Cost comparison settings were saved.",
    "costComparison.saveError": "Failed to save cost comparison settings.",
    "costComparison.run": "Run Comparison",
    "costComparison.running": "Running...",
    "costComparison.runError": "Failed to run the cost comparison.",
    "costComparison.investmentAssets": "Investment Assets",
    "costComparison.pensionAssets": "Personal Pension Assets",
    "costComparison.realEstateValue": "Real Estate Official Price",
    "costComparison.realEstateRatio": "Ownership Ratio",
    "costComparison.paRate": "Price Appreciation",
    "costComparison.simulationYears": "Simulation Years",
    "costComparison.targetMonthlyCash": "Target After-tax Monthly Cash",
    "costComparison.rebalanceSaleRatio": "Annual Rebalance Sale Ratio",
    "costComparison.capitalGainsTaxRate": "Personal Capital Gains Tax Rate",
    "costComparison.capitalGainsDeduction": "Capital Gains Deduction",
    "costComparison.dividendIncome": "Dividend Income",
    "costComparison.unrealizedAppreciation": "Unrealized Appreciation",
    "costComparison.realizedCapitalGain": "Realized Capital Gain",
    "costComparison.healthInsuranceIncome": "Health Insurance Income",
    "costComparison.monthlyBookkeepingFee": "Monthly Bookkeeping Fee",
    "costComparison.annualTaxAdjustmentFee": "Annual Tax Adjustment Fee",
    "costComparison.corpTaxRate": "Corporate Tax Rate",
    "costComparison.masterPortfolio": "Master Portfolio",
    "costComparison.initialLoan": "Initial Shareholder Loan",
    "costComparison.annualLoanRepayment": "Annual Loan Repayment",
    "costComparison.salary": "Monthly Salary",
    "costComparison.ratioUnit": "ratio",
    "costComparison.yearUnit": "years",
    "costComparison.assumptionPortfolio": "Strategy Name",
    "costComparison.assumptionCorporatePortfolio": "Corporate Portfolio",
    "costComparison.assumptionPensionPortfolio": "Pension Portfolio",
    "costComparison.personal": "Personal",
    "costComparison.corporate": "Corporate",
    "costComparison.monthlyCash": "Target Monthly Cash",
    "costComparison.annualTotalCost": "Annual Total Cost",
    "costComparison.healthInsurance": "Health Insurance",
    "costComparison.netGrowth": "Required Assets",
    "costComparison.requiredRevenue": "Required Annual Revenue",
    "costComparison.assetMargin": "Current Asset Margin",
    "costComparison.tax": "Tax",
    "costComparison.socialInsurance": "Social Insurance",
    "costComparison.fixedCost": "Fixed Cost",
    "costComparison.grossSalary": "Gross Salary",
    "costComparison.companyInsurance": "Company Insurance",
    "costComparison.netSalary": "Net Salary",
    "costComparison.netCorporateCash": "Net Corporate Cash",
    "costComparison.payrollWithholding": "Payroll Withholding",
    "costComparison.retainedEarnings": "Retained Earnings",
    "costComparison.breakdownTitle": "Cost Breakdown",
    "costComparison.cumulativeTitle": "Required Assets Comparison",
    "costComparison.householdCashTitle": "Current Asset Margin Comparison",
    "costComparison.totalValueTitle": "Net Cash Composition",
    "costComparison.sustainabilityTitle": "Current Asset Sustainability",
    "costComparison.loanGapTitle": "Corporate Loan Gap",
    "costComparison.loanGapRequired": "Required Loan Repayment",
    "costComparison.loanGapConfigured": "Configured Loan Limit",
    "costComparison.loanGap": "Gap",
    "costComparison.assetFeasibility": "Asset Feasibility",
    "costComparison.loanFeasibility": "Loan Capacity",
    "costComparison.setupFeasibility": "Overall Setup",
    "costComparison.feasible": "Feasible",
    "costComparison.notFeasible": "Not Feasible",
    "costComparison.waterfallTitle": "Revenue to Net Cash",
    "costComparison.waterfallBasis":
      "Revenue is annual projected investment return, calculated as investment assets multiplied by TR. Personal net cash equals revenue minus tax and health insurance. Corporate net cash equals net corporate cash plus net salary after corporate costs are deducted.",
    "costComparison.cumulativeNote":
      "Lower is better. This chart compares how much investment asset base each structure needs to fund the same target after-tax monthly household cash.",
    "costComparison.householdCashNote":
      "Positive is better. This chart compares how much current investment asset cushion remains after meeting the required asset threshold.",
    "costComparison.totalValueNote":
      "This chart shows how annual net cash is composed in each structure. Personal uses after-tax investment cash, while corporate combines net corporate cash and net salary.",
    "costComparison.sustainabilityNote":
      "Shows how many years the current asset base can keep funding the target monthly household cash under the current settings.",
    "costComparison.waterfallNote":
      "Read left to right. The chart starts with annual revenue, subtracts each cost bucket, then adds back net salary only for the corporate structure to arrive at annual net cash.",
    "costComparison.warningTitle": "Warnings",
    "costComparison.revenue": "Revenue",
    "costComparison.disposableCash": "Final Net Cash",
    "costComparison.annualNetCashflow": "Annual Net Cashflow",
    "costComparison.cumulativeNetCashflow": "Cumulative Net Cashflow",
    "costComparison.winnerBasis": "Winner Basis",
    "costComparison.winnerBasisFormulaNetCashflow":
      "difference = corporate annual net cashflow - personal annual net cashflow",
    "costComparison.winnerAnnualLabel": "Annual Net Cashflow Result",
    "costComparison.winnerAnnualPrefix": "On annual net cashflow,",
    "costComparison.winnerAnnualMiddle": " generates more pure cash than ",
    "costComparison.winnerAnnualSuffix": ".",
    "costComparison.winnerCumulativeLabel": "Cumulative Net Cashflow Result",
    "costComparison.winnerCumulativePrefix": "On cumulative net cashflow,",
    "costComparison.winnerCumulativeMiddle": " leaves more pure cash than ",
    "costComparison.winnerCumulativeSuffix": ".",
    "costComparison.tie": "Tie",
    "costComparison.tieWins":
      "Both structures are tied under the current inputs.",
    "costComparison.tieAnnualSummary":
      "On annual net cashflow, both structures generate the same amount.",
    "costComparison.tieCumulativeSummary":
      "On cumulative net cashflow, both structures leave the same amount.",
    "costComparison.tooltip.investmentAssets":
      "Personal taxable investment assets used in the personal scenario and mirrored as the corporate asset base for fair comparison.",
    "costComparison.tooltip.inputSection":
      "This section controls the comparison mode and all input values used before running the simulation.",
    "costComparison.tooltip.resultSection":
      "This section summarizes the comparison output after execution, including winner, drivers, and charts.",
    "costComparison.tooltip.assumptionSection":
      "These badges show the core baseline assumptions that were applied to both personal and corporate calculations.",
    "costComparison.tooltip.scenarioSection":
      "These cards show the detailed KPI values for personal and corporate operation side by side.",
    "costComparison.tooltip.summarySection":
      "This block highlights the current winner, annual and cumulative advantage, and the main difference drivers.",
    "costComparison.tooltip.chartSection":
      "These charts break down how net cash, costs, and sustainability differ between the two structures.",
    "costComparison.tooltip.pensionAssets":
      "Personal pension assets are stored separately and excluded from the direct personal vs corporate operating asset comparison in v1.",
    "costComparison.tooltip.realEstateValue":
      "Officially assessed real estate value used only for health insurance property scoring in v1.",
    "costComparison.tooltip.realEstateRatio":
      "Your ownership share of the real estate value used in the local health insurance property base.",
    "costComparison.tooltip.paRate":
      "Expected annual price appreciation added to portfolio dividend yield to derive TR.",
    "costComparison.tooltip.simulationYears":
      "Number of years used for cumulative comparison and net worth projection.",
    "costComparison.tooltip.assumptionMode":
      "Shows whether the current result was calculated in target-driven mode or asset-driven mode.",
    "costComparison.tooltip.targetMonthlyCash":
      "Target after-tax monthly household cash that both scenarios must deliver.",
    "costComparison.tooltip.rebalanceSaleRatio":
      "Estimated share of portfolio market value sold and immediately reinvested during annual rebalancing. Enter as a ratio between 0 and 1.",
    "costComparison.tooltip.capitalGainsTaxRate":
      "Estimated personal tax rate applied only to realized rebalancing gains after the deduction.",
    "costComparison.tooltip.capitalGainsDeduction":
      "Annual deduction applied before estimating personal capital gains tax.",
    "costComparison.tooltip.monthlyBookkeepingFee":
      "Recurring monthly corporate admin costs such as bookkeeping and basic filing support.",
    "costComparison.tooltip.annualTaxAdjustmentFee":
      "Annual tax adjustment and filing fee applied once per year as part of corporate operating costs.",
    "costComparison.tooltip.corpTaxRate":
      "Select the nominal corporate tax rate. The simulation applies local income tax, so 10% is calculated as 11%.",
    "costComparison.tooltip.masterPortfolio":
      "Choose which saved master portfolio the cost comparison should use. If no dedicated selection is saved, the currently active master portfolio is used.",
    "costComparison.tooltip.initialLoan":
      "Initial shareholder loan principal that can be repaid to the household without dividend taxation, subject to cash availability.",
    "costComparison.tooltip.annualLoanRepayment":
      "Planned annual shareholder loan repayment target. Actual repayment is capped by remaining loan balance and corporate cash generation.",
    "costComparison.tooltip.salary":
      "Gross monthly salary paid by the corporation to the selected household member.",
    "costComparison.tooltip.assumptionPortfolio":
      "Name of the master strategy actually used for this comparison run.",
    "costComparison.tooltip.assumptionCorporatePortfolio":
      "Corporate portfolio connected to the selected master strategy.",
    "costComparison.tooltip.assumptionPensionPortfolio":
      "Pension portfolio connected to the selected master strategy.",
    "costComparison.tooltip.dy":
      "Weighted dividend yield from the selected master portfolio.",
    "costComparison.tooltip.pa":
      "Price appreciation assumption entered in the comparison simulator.",
    "costComparison.tooltip.tr":
      "Total return applied equally to both scenarios. Calculated as DY + PA.",
    "costComparison.tooltip.monthlyCash":
      "Monthly disposable cash available to the household after taxes, insurance, and other modeled costs.",
    "costComparison.tooltip.annualTotalCost":
      "Annual total modeled cost burden including taxes, health insurance, social insurance, and fixed operating cost where applicable.",
    "costComparison.tooltip.healthInsurance":
      "Annual health insurance burden. Personal scenario uses local insurance, corporate scenario uses workplace insurance equivalents.",
    "costComparison.tooltip.netGrowth":
      "Required investment assets needed to deliver the target after-tax monthly household cash.",
    "costComparison.tooltip.requiredRevenue":
      "Required annual investment revenue needed to fund the target household cash and all modeled costs.",
    "costComparison.tooltip.disposableCash":
      "Monthly equivalent of final net cash available to the household under the current asset base after modeled taxes and insurance.",
    "costComparison.tooltip.assetMargin":
      "Current investment assets minus required assets. Positive means the current asset base can support the target more comfortably.",
    "costComparison.tooltip.winner":
      "The current winner is chosen by comparing pure net cashflow after all structure-specific costs are deducted. The displayed difference is calculated as corporate minus personal.",
    "costComparison.tooltip.driver.tax":
      "Difference created by tax burden between personal and corporate scenarios.",
    "costComparison.tooltip.driver.health":
      "Difference created by health insurance burden between local and workplace insurance structures.",
    "costComparison.tooltip.driver.salary":
      "Difference created by gross salary cost borne only in the corporate structure.",
    "costComparison.tooltip.driver.fixed":
      "Difference created by fixed corporate operating expenses.",
    "costComparison.tooltip.driver.social":
      "Difference created by payroll-related social insurance costs.",
    "costComparison.tooltip.driver.loan":
      "Difference created by shareholder loan repayment flowing back to the household.",
    "costComparison.tooltip.breakdown":
      "Stacked comparison of annual cost components across the two scenarios. The summary chips above the chart show annual total cost for each side.",
    "costComparison.tooltip.cumulative":
      "Compares how much investment asset base each scenario needs to produce the same target after-tax monthly household cash.",
    "costComparison.tooltip.householdCash":
      "Compares the gap between current investment assets and required assets for each scenario.",
    "costComparison.tooltip.totalValue":
      "Shows how annual net cash is composed in each scenario. Personal is after-tax investment cash, while corporate is net corporate cash plus net salary.",
    "costComparison.tooltip.sustainability":
      "Shows how many full years the current asset base can keep funding the target after-tax monthly household cash.",
    "costComparison.tooltip.loanGap":
      "Checks whether the current corporate setup can keep filling the household cash target with shareholder-loan repayment.",
    "costComparison.tooltip.loanGapRequired":
      "Annual shareholder-loan repayment required, after net salary, to reach the target after-tax household cash.",
    "costComparison.tooltip.loanGapConfigured":
      "Annual shareholder-loan repayment limit currently configured by the user.",
    "costComparison.tooltip.loanGapGap":
      "Shortfall between the repayment required and the repayment limit currently configured.",
    "costComparison.tooltip.assetFeasibility":
      "Checks whether current investment assets alone are large enough to support the target household cash.",
    "costComparison.tooltip.loanFeasibility":
      "Checks whether the initial shareholder-loan principal is large enough for the full simulation period.",
    "costComparison.tooltip.setupFeasibility":
      "Checks whether the full corporate setup can meet the target after combining current assets and loan capacity.",
    "costComparison.tooltip.waterfall":
      "Step-by-step bridge from annual revenue to annual net cash. The corporate view subtracts gross salary, company insurance, fixed costs, and corporate tax, then adds back net salary.",
    "costComparison.waterfallTooltipChange": "Change",
    "costComparison.waterfallTooltipRevenue": "Starting revenue",
    "costComparison.waterfallTooltipDeduction": "Deduction",
    "costComparison.waterfallTooltipAddition": "Addition",
    "costComparison.waterfallTooltipFinal": "Final net cash",
    "costComparison.waterfallTooltipBase": "Previous running amount",
    "costComparison.waterfallTooltipAfter": "After this step",
    "costComparison.tooltip.warning":
      "Important model caveats or threshold alerts that can materially affect the interpretation of results.",
    "costComparison.mode.target": "Target-driven",
    "costComparison.mode.asset": "Asset-driven",
    "costComparison.assetNetYield": "Asset Net Yield",
    "costComparison.detailedAudit": "Detailed Audit",
    "costComparison.viewDetailedCosts": "View Detailed Cost Calculation",
    "costComparison.detailedCostTitle": "Detailed Cost Calculation",
    "costComparison.close": "Close",
    "costComparison.costLineItems": "Cost Line Items",
    "costComparison.calculationSteps": "Calculation Steps",
    "costComparison.operatingCostFormula": "Operating Cost Formula",
    "costComparison.taxBaseFormula": "Tax Base Formula",
    "costComparison.finalCashFormula": "Final Net Cash Formula",
    "costComparison.personalTaxFormula": "Personal Tax Formula",
    "costComparison.personalHealthFormula": "Health Insurance Formula",
    "costComparison.healthPremiumBase": "Base Health Premium",
    "costComparison.taxBase": "Tax Base",
    "costComparison.taxThreshold": "Tax Threshold",
    "costComparison.operatingCostAnnual": "Annual Operating Cost",
    "costComparison.propertyPoints": "Property Points",
    "costComparison.incomePoints": "Income Points",
    "costComparison.totalPoints": "Total Points",
    "costComparison.unitPriceLtc": "Unit Price x LTC Rate",
    "costComparison.appliedTaxRate": "Applied Tax Rate",
    "costComparison.appliedCorpTaxRate": "Applied Corp Tax Rate",
    "costComparison.personalWins": "Personal operation is currently ahead.",
    "costComparison.corporateWins": "Corporate operation is currently ahead.",
  },
  ko: {
    "app.mainDashboard": "메인 대시보드",
    "app.assetManager": "자산 관리",
    "app.system": "시스템",
    "app.retirement": "은퇴",
    "app.costComparison": "개인 vs 법인 비교",
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
    "retirement.exchangeRateUpdatedAt": "마지막 갱신",
    "retirement.exchangeRateUpdatedUnknown": "확인 불가",
    "retirement.exchangeRateRefresh": "지금 갱신",
    "retirement.exchangeRateRefreshing": "갱신 중...",
    "retirement.exchangeRateRefreshFailed": "환율을 갱신할 수 없습니다.",
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
    "retirement.cashExhaust": "법인 현금 버퍼 고갈 시점",
    "retirement.cashExhaustTooltip":
      "법인 SGOV/현금 버퍼 잔고가 0이 되는 예상 시점입니다. 총 순자산이 0이 되는 시점은 아닙니다.",
    "retirement.yearsSustainableMetric": "유지 가능 기간",
    "retirement.yearsSustainableTooltip":
      "현재 전략이 목표 생활비를 몇 년 동안 감당할 수 있는지 보여줍니다.",
    "retirement.snapshotAssumption": "적용 시나리오",
    "retirement.snapshotAssumptionTooltip":
      "현재 시뮬레이션에 적용된 시장 수익률과 인플레이션 가정입니다.",
    "retirement.snapshotDuration": "시뮬레이션 기간",
    "retirement.snapshotDurationTooltip":
      "설정된 시뮬레이션 시작 월부터 몇 년을 예측하는지 보여줍니다.",
    "retirement.snapshotMonthlyTarget": "월 목표 생활비",
    "retirement.snapshotMonthlyTargetTooltip":
      "연금 인출, 급여, 국민연금 차감 전 기준이 되는 가구 월 필요 현금흐름입니다.",
    "retirement.snapshotMaster": "활성 마스터",
    "retirement.snapshotMasterTooltip":
      "법인/연금 계좌에 적용된 마스터 포트폴리오 묶음입니다.",
    "retirement.statusSection": "결과 판단",
    "retirement.shockFlag": "하락장 동결",
    "retirement.shockFlagTooltip":
      "마지막 시뮬레이션 월 기준 Crash20 동결 상태입니다. ON이면 주식성 자산 20% 하락으로 생활비 인상 승인이 다음 정기점검까지 막힌 상태입니다.",
    "retirement.stressMode": "정기점검 스트레스",
    "retirement.stressModeTooltip":
      "마지막 시뮬레이션 월 기준 정기점검 안전성 판정입니다. Stress이면 버퍼 보충, 채권 하한, 실질자산 방어 조건 중 하나 이상이 부족했다는 뜻입니다.",
    "retirement.inflationDecision": "생활비 인상 결정",
    "retirement.inflationDecisionTooltip":
      "가장 최근 정기점검에서 물가상승률만큼 생활비 목표를 올렸는지, 동결했는지, 해당 월에 점검이 없었는지를 표시합니다.",
    "retirement.shockOn": "ON",
    "retirement.shockOff": "OFF",
    "retirement.stressOn": "Stress",
    "retirement.stressOff": "Normal",
    "retirement.inflationApproved": "승인",
    "retirement.inflationFrozen": "동결",
    "retirement.inflationNone": "리뷰 없음",
    "retirement.metricsSection": "핵심 지표",
    "retirement.ruleSection": "적용 규칙",
    "retirement.inputGuideLabel": "입력 가이드",
    "retirement.inputGuideBody":
      "먼저 시나리오를 고른 뒤, 직접 조정이 필요한 가정만 수정하면 됩니다.",
    "retirement.inputGuideLocked": "마스터 연동",
    "retirement.inputGuideLockedBody":
      "기본 시나리오는 활성 마스터 수익률을 그대로 따르며 직접 수정하지 않습니다.",
    "retirement.inputGuideEditable": "수동 조정",
    "retirement.inputGuideEditableBody":
      "보수 시나리오는 직접 수정할 수 있고, 언제든 마스터 기준값으로 되돌릴 수 있습니다.",
    "retirement.assumptionMasterLocked": "활성 마스터 기준과 연동",
    "retirement.assumptionEditable": "직접 조정 가능한 시나리오",
    "retirement.assumptionMasterHint":
      "현재 마스터 포트폴리오 기준 가정을 그대로 확인할 때 사용합니다.",
    "retirement.assumptionEditableHint":
      "더 보수적인 수익률이나 물가 가정을 시험할 때 이 시나리오를 조정하세요.",
    "retirement.chartStartAssets": "시작 순자산",
    "retirement.chartStartAssetsTooltip":
      "시뮬레이션 시작 시점의 법인과 연금 자산 합계입니다.",
    "retirement.chartLatestAssets": "최종 순자산",
    "retirement.chartLatestAssetsTooltip":
      "시뮬레이션 마지막 월의 예상 순자산입니다.",
    "retirement.chartMinimumAssets": "최저 순자산",
    "retirement.chartMinimumAssetsTooltip":
      "전체 시뮬레이션 기간 중 가장 낮아진 순자산입니다.",
    "retirement.chartFocusLabel": "차트 읽는 법",
    "retirement.chartFocusBody":
      "흰색 총 순자산 흐름을 먼저 보고, 그 아래 법인과 연금 잔고가 어떻게 나뉘는지 비교하면 됩니다.",
    "retirement.detailLogHelper":
      "월별 원장을 열면 결과를 감사 수준으로 추적할 수 있습니다.",
    "retirement.showDetailLog": "상세 로그 보기",
    "retirement.hideDetailLog": "상세 로그 숨기기",
    "retirement.detailLogCollapsed":
      "월별 원장은 기본으로 접혀 있습니다. 월 단위 근거가 필요할 때만 펼치면 됩니다.",
    "retirement.appliedRules": "적용 규칙",
    "retirement.rebalance": "리밸런싱",
    "retirement.rebalanceTooltip":
      "시뮬레이션이 사용하는 연간 메인 정기점검 월입니다.",
    "retirement.corpSgov": "법인 SGOV",
    "retirement.corpSgovTooltip":
      "법인 SGOV/현금 버퍼 목표입니다. 월 생활비 기준 몇 개월치인지 표시합니다.",
    "retirement.pensionSgov": "연금 SGOV",
    "retirement.pensionSgovTooltip":
      "연금 SGOV/현금 버퍼 목표입니다. 연금 월 인출액 기준 몇 개월치인지 표시합니다.",
    "retirement.monthlyCost": "월 생활비",
    "retirement.monthlyCostTooltip":
      "시뮬레이션의 기본 지출 목표로 쓰는 가구 월 필요 현금흐름입니다.",
    "retirement.enabled": "활성",
    "retirement.disabled": "비활성",
    "retirement.chart.yearTick": "년",
    "retirement.chart.yearLabel": "년차",
    "retirement.chart.monthLabel": "개월",
    "retirement.chart.totalAssets": "합산 자산",
    "retirement.chart.corpAssets": "법인 자산",
    "retirement.chart.pensionAssets": "연금 자산",
    "retirement.chart.personalAssets": "개인 일반계좌 자산",
    "retirement.step5Title": "5단계. 상세 계산 로그",
    "retirement.table.dateAge": "일자 (나이)",
    "retirement.table.phase": "단계",
    "retirement.table.ops": "운용 상태",
    "retirement.table.reviewSnapshot": "점검 기준",
    "retirement.table.targetCf": "목표 현금흐름",
    "retirement.table.totalDraw": "가계 수령액",
    "retirement.table.dateAgeTooltip":
      "해당 시뮬레이션 월과 그 달 기준 계산 나이입니다.",
    "retirement.table.phaseTooltip":
      "생애주기 단계입니다. Phase 1은 법인만, Phase 2는 개인연금 추가, Phase 3는 국민연금까지 반영합니다.",
    "retirement.table.opsTooltip":
      "Crash20, Shock Flag, Stress, BOOST, 인플레이션 리뷰 결과 같은 월간 운용 상태입니다.",
    "retirement.table.reviewSnapshotTooltip":
      "법인과 연금 계좌를 나눠서, SGOV/Bond 버퍼의 점검 전 개월수와 점검 후 개월수를 표시합니다. 점검 이벤트가 없는 달은 변동 없음으로 표시합니다.",
    "retirement.table.targetCfTooltip":
      "Settings의 월 총 필요 생활비입니다. 5월 인플레이션 리뷰가 승인되기 전까지는 Phase가 바뀌어도 이 값 자체는 유지됩니다.",
    "retirement.table.totalDrawTooltip":
      "그 달 가계가 실제로 받은 현금입니다. 개인연금 인출, 국민연금, 급여 실수령액, 주주대여금 상환액을 합산합니다.",
    "retirement.table.corpBalTooltip":
      "법인 계좌의 월말 총잔고입니다. 월 인출과 점검/리밸런싱 반영 후 기준입니다.",
    "retirement.table.penBalTooltip":
      "개인연금 계좌의 월말 총잔고입니다. 월 인출과 점검/리밸런싱 반영 후 기준입니다.",
    "retirement.table.netWorthTooltip":
      "법인과 개인연금 계좌를 합산한 월말 총자산입니다.",
    "retirement.table.loanBalTooltip":
      "법인 현금으로 비과세 상환 가능한 주주대여금 원금의 남은 잔액입니다.",
    "retirement.table.noReviewChange": "변동 없음",
    "retirement.table.reviewCorp": "법인 SGOV",
    "retirement.table.reviewPension": "연금 SGOV",
    "retirement.table.initialStateLabel": "초기상태",
    "retirement.table.initialStateOps": "시뮬레이션 시작 전",
    "retirement.table.initialStateReview": "설정에 입력한 시작값",
    "retirement.table.monthsSuffix": "개월",
    "retirement.table.corpBal": "법인 잔고",
    "retirement.table.personalBal": "개인 잔고",
    "retirement.table.personalBalTooltip":
      "월별 이벤트와 리밸런싱 이후 개인 일반계좌 잔고입니다.",
    "retirement.table.penBal": "연금 잔고",
    "retirement.table.netWorth": "총자산",
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
    "settings.personalTaxableAccount": "개인 일반계좌",
    "settings.personalTaxableAccountTooltip":
      "동일한 리밸런싱 규칙으로 운용하는 과세계좌 자산을 관리합니다.",
    "settings.personalTaxableWithdrawalTooltip":
      "개인 일반계좌 SGOV 버퍼에서 인출할 독립 월 목표액입니다.",
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
    "settings.monthlyBookkeepingFee": "월 기장비",
    "settings.monthlyBookkeepingFeeTooltip":
      "매월 반복되는 기장료와 기본 신고 대행비 등 법인 유지비입니다.",
    "settings.annualTaxAdjustmentFee": "연 법인세 조정료",
    "settings.annualTaxAdjustmentFeeTooltip":
      "결산/세무조정 시 연 1회 발생하는 법인세 조정료입니다.",
    "settings.corpTaxRate": "법인세율",
    "settings.corpTaxRateTooltip":
      "세율표에서 말하는 명목 법인세율입니다. 실제 계산은 지방소득세를 포함해 10% 선택 시 11%로 반영합니다.",
    "settings.employees": "직원 수",
    "settings.employeesTooltip": "4대보험 산정에 사용하는 총 직원 수입니다.",
    "settings.strategyRules": "전략 규칙",
    "settings.strategyRulesTooltip":
      "stock-plan 기본 전략을 사용자 설정으로 노출하고 계좌별 규칙을 조정합니다.",
    "settings.osV11Title": "이 시뮬레이터가 구현한 운용 정책",
    "settings.osV11Body":
      "OS v11.1은 이 앱의 기본 운용 정책입니다. 법인 자산과 연금 자산을 분리하고, 월 생활비 인출은 SGOV 현금 버퍼에서만 수행하며, 정기점검 때 버퍼 보충과 위험자산 리밸런싱을 판단합니다.",
    "settings.osV11PointAssets":
      "자산 역할: SGOV 현금 버퍼, Bond 버퍼, High Income, Dividend Growth, Growth Engine.",
    "settings.osV11PointAccounts":
      "계좌 구분: 법인은 급여·가계현금흐름·세금·버퍼 점검을 담당하고, 연금은 연금 인출과 floor 보충 규칙을 따릅니다.",
    "settings.osV11PointCalendar":
      "운용 달력: 기본 5월 메인 정기점검, 11월 법인 후속점검, Stress 및 인플레이션 결정을 시뮬레이션에 반영합니다.",
    "settings.resetAll": "전체 복구",
    "settings.executionPolicy": "실행 정책",
    "settings.reset": "복구",
    "settings.rebalanceMonth": "리밸런싱 월",
    "settings.rebalanceMonthTooltip":
      "기계적 리밸런싱과 계획된 매도를 실행할 기준 월입니다.",
    "settings.enabled": "활성",
    "settings.disabled": "비활성",
    "settings.corporateRules": "법인 규칙",
    "settings.corpTargetBuffer": "법인 SGOV 메인 목표",
    "settings.corpTargetBufferTooltip":
      "엔진 반영 항목입니다. 메인 정기점검 월에 법인 SGOV Buffer를 법인 월 필요현금의 이 개월수까지 채웁니다. 기본값은 30개월입니다.",
    "settings.corpNovemberSgovTarget": "법인 11월 SGOV",
    "settings.corpNovemberSgovTargetTooltip":
      "엔진 반영 항목입니다. 메인 정기점검 6개월 뒤 법인 반기점검에서 SGOV Buffer를 이 개월수까지 채웁니다. 기본값은 27개월입니다.",
    "settings.corpBondFloor": "법인 채권 Floor",
    "settings.corpBondFloorTooltip":
      "엔진 반영 항목입니다. 리밸런싱에서 법인 Bond Buffer는 이 개월수 아래로 자동 매도하지 않습니다. 기본값은 12개월입니다.",
    "settings.corpBondTarget": "법인 채권 Target",
    "settings.corpBondTargetTooltip":
      "엔진 반영 항목입니다. 법인 점검에서 SGOV를 처리한 뒤 Bond Buffer를 이 목표까지 채웁니다. 기본값은 18개월입니다.",
    "settings.corpBondUpper": "법인 채권 Upper",
    "settings.corpBondUpperTooltip":
      "엔진 반영 항목입니다. 이 상단을 넘는 법인 Bond Buffer는 초과분으로 보고 위험자산 쪽으로 재배치될 수 있습니다. 기본값은 24개월입니다.",
    "settings.pensionRules": "연금 규칙",
    "settings.pensionSgovTarget": "연금 SGOV Target",
    "settings.pensionSgovTargetTooltip":
      "엔진 반영 항목입니다. 메인 정기점검에서 연금 SGOV Buffer를 월 연금 인출 목표의 이 개월수까지 채웁니다. 기본값은 24개월입니다.",
    "settings.pensionSgovFloor": "연금 SGOV Floor",
    "settings.pensionSgovFloorTooltip":
      "엔진 반영 항목입니다. 연금 SGOV가 이 하한 아래로 내려가면 정기점검 외에도 Bond Buffer에서 우선 보충합니다. 기본값은 12개월입니다.",
    "settings.pensionBondFloor": "연금 채권 Floor",
    "settings.pensionBondFloorTooltip":
      "엔진 반영 항목입니다. 리밸런싱에서 연금 Bond Buffer는 이 개월수 아래로 자동 매도하지 않습니다. 기본값은 12개월입니다.",
    "settings.pensionBondTarget": "연금 채권 Target",
    "settings.pensionBondTargetTooltip":
      "엔진 반영 항목입니다. 메인 정기점검에서 SGOV를 처리한 뒤 연금 Bond Buffer를 이 목표까지 채웁니다. 기본값은 18개월입니다.",
    "settings.pensionBondUpper": "연금 채권 Upper",
    "settings.pensionBondUpperTooltip":
      "엔진 반영 항목입니다. 이 상단을 넘는 연금 Bond Buffer는 초과분으로 보고 위험자산 쪽으로 재배치될 수 있습니다. 기본값은 24개월입니다.",
    "settings.distributionRules": "분배금 규칙",
    "settings.distributionRulesTooltip":
      "비현금 슬리브의 run-rate 성장률과 Stress 삭감률을 덮어쓰는 선택 설정입니다. 0이면 엔진 기본 동작을 그대로 사용합니다.",
    "settings.distributionGrowthRate": "run-rate 성장",
    "settings.distributionGrowthRateTooltip":
      "해당 카테고리 분배금 run-rate에 적용할 선택적 연 성장률입니다. 연 %로 입력하며 0이면 override를 쓰지 않습니다.",
    "settings.distributionStressCutRate": "Stress 삭감",
    "settings.distributionStressCutRateTooltip":
      "Crash20 또는 정기점검 Stress가 분배금 삭감을 유발할 때 적용할 선택적 삭감률입니다. %로 입력하며 0이면 override를 쓰지 않습니다.",
    "settings.distributionNewBuyYield": "신규매수 DY",
    "settings.distributionNewBuyYieldTooltip":
      "이 카테고리로 새 자금이 배치될 때만 적용할 구조적 배당률입니다. 기존 보유분의 초기 run-rate 장부값은 덮어쓰지 않습니다.",
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
    "settings.programSettings": "프로그램 설정",
    "settings.programSettingsTooltip":
      "계산 엔진이 아니라 프로그램 전체 인터페이스에 적용되는 공통 설정입니다.",
    "settings.monthlyLivingCost": "월 가계필요비용",
    "settings.monthlyLivingCostTooltip":
      "가계 기준 월 세후 필요금액입니다. 개인연금, 국민연금, 급여 실수령액, 주주대여금 상환이 이 값을 기준으로 계산됩니다.",
    "settings.netSalaryEstimate": "세후 실수령 추정액",
    "settings.netSalaryEstimateTooltip":
      "월 급여와 국민연금, 건강보험, 고용보험, 소득세율 설정을 기준으로 계산한 월 세후 실수령 추정액입니다.",
    "settings.corporateNeedEstimate": "법인필요비용 추정액",
    "settings.corporateNeedEstimateTooltip":
      "월 기장료와 연간 법인세 조정료를 월 단위로 환산한 법인 운영비 추정액입니다.",
    "settings.krwPerMonth": "원 / 월",
    "settings.simulationStartYear": "시작 연도",
    "settings.simulationStartYearTooltip":
      "시뮬레이션을 시작할 첫 연도입니다. 상세 로그는 이 연월의 초기상태 행부터 시작합니다.",
    "settings.simulationStartMonth": "시작 월",
    "settings.simulationStartMonthTooltip":
      "시뮬레이션을 시작할 첫 월입니다. 초기상태 다음 행부터는 해당 월의 월말 결과가 순서대로 표시됩니다.",
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
      "각 자산 카테고리별로 서로 다른 연간 기대주가상승률을 정의합니다. 기준 종목은 SGOV 버퍼=SGOV, 채권 버퍼=VGIT, 고인컴=JEPI/JEPQ 계열, 배당성장=SCHD, 성장엔진=S&P500 입니다.",
    "settings.defaultPaScenario": "기본 PA 시나리오",
    "settings.defaultPaScenarioTooltip":
      "포트폴리오, 은퇴, 비교 화면을 처음 열 때 기본으로 선택할 시나리오입니다.",
    "settings.editingPaScenario": "현재 편집 중:",
    "settings.catCash": "SGOV 버퍼",
    "settings.catCashTooltip":
      "SGOV 같은 초단기 국채 ETF를 기준으로 계산한 가격상승률입니다.",
    "settings.catBond": "채권 버퍼",
    "settings.catBondTooltip":
      "VGIT 같은 중기 국채 ETF를 기준으로 계산한 가격상승률입니다.",
    "settings.catHighIncome": "고인컴",
    "settings.catHighIncomeTooltip":
      "JEPI/JEPQ/DIVO 같은 옵션 인컴·커버드콜 계열 자산을 기준으로 계산한 가격상승률입니다.",
    "settings.catDividend": "배당성장",
    "settings.catDividendTooltip":
      "SCHD 같은 배당성장 주식 ETF를 기준으로 계산한 가격상승률입니다.",
    "settings.catGrowth": "성장엔진",
    "settings.catGrowthTooltip":
      "S&P500의 장기 가격 상승을 기준으로 계산한 가격상승률입니다.",
    "scenario.conservative": "보수적",
    "scenario.base": "기본",
    "scenario.optimistic": "낙관적",
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
    "settings.unusedTriggerSettingsTitle": "미적용 trigger 설정 숨김",
    "settings.unusedTriggerSettingsBody":
      "고소득 상한, 수익률 배수, 시장 패닉 설정은 아직 은퇴 시뮬레이션 엔진과 연결되지 않았습니다. 엔진 계약이 구현되기 전까지는 입력을 숨깁니다.",
    "costComparison.loading": "비교 시뮬레이터 불러오는 중...",
    "costComparison.loadError": "비교 시뮬레이터 설정을 불러오지 못했습니다.",
    "costComparison.title": "개인 vs 법인 비교",
    "costComparison.subtitle":
      "선택한 master portfolio와 동일한 TR 기준에서 가구 총현금흐름과 총비용을 비교합니다.",
    "costComparison.inputSectionEyebrow": "입력",
    "costComparison.inputSection": "비교 입력",
    "costComparison.inputSectionDescription":
      "비교 방식과 계산에 사용할 값을 먼저 설정한 뒤 비교를 실행합니다.",
    "costComparison.resultSectionEyebrow": "결과",
    "costComparison.resultSection": "비교 결과",
    "costComparison.resultSectionDescription":
      "비교 실행 후 우세 구조, 순현금 구성, 세부 차이를 아래에서 확인합니다.",
    "costComparison.resultSectionEmpty":
      "비교 실행을 누르면 이 아래에 비교 결과 카드와 그래프가 표시됩니다.",
    "costComparison.assumptionSection": "기준 전제",
    "costComparison.assumptionMode": "비교 방식",
    "costComparison.summarySection": "핵심 결론",
    "costComparison.scenarioSection": "구조별 세부값",
    "costComparison.chartSection": "비교 차트",
    "costComparison.save": "저장",
    "costComparison.saveSuccess": "비교 시뮬레이터 설정이 저장되었습니다.",
    "costComparison.saveError": "비교 시뮬레이터 설정 저장에 실패했습니다.",
    "costComparison.run": "비교 실행",
    "costComparison.running": "계산 중...",
    "costComparison.runError": "비교 시뮬레이션 실행에 실패했습니다.",
    "costComparison.investmentAssets": "개인 투자자산",
    "costComparison.pensionAssets": "개인연금 자산",
    "costComparison.realEstateValue": "부동산 공시지가",
    "costComparison.realEstateRatio": "본인 지분율",
    "costComparison.paRate": "기대주가상승률",
    "costComparison.simulationYears": "시뮬레이션 기간",
    "costComparison.targetMonthlyCash": "목표 세후 월현금",
    "costComparison.rebalanceSaleRatio": "연간 리밸런싱 매도비율",
    "costComparison.capitalGainsTaxRate": "개인 양도차익 세율",
    "costComparison.capitalGainsDeduction": "양도차익 기본공제",
    "costComparison.dividendIncome": "배당소득",
    "costComparison.unrealizedAppreciation": "미실현 평가이익",
    "costComparison.realizedCapitalGain": "실현 양도차익",
    "costComparison.healthInsuranceIncome": "건보 반영 금융소득",
    "costComparison.monthlyBookkeepingFee": "월 기장비",
    "costComparison.annualTaxAdjustmentFee": "연 법인세 조정료",
    "costComparison.corpTaxRate": "법인세율",
    "costComparison.masterPortfolio": "마스터 전략",
    "costComparison.initialLoan": "초기 주주대여금",
    "costComparison.annualLoanRepayment": "연간 주주대여금 상환",
    "costComparison.salary": "월 급여",
    "costComparison.ratioUnit": "비율",
    "costComparison.yearUnit": "년",
    "costComparison.assumptionPortfolio": "전략 이름",
    "costComparison.assumptionCorporatePortfolio": "법인 포트폴리오",
    "costComparison.assumptionPensionPortfolio": "연금 포트폴리오",
    "costComparison.personal": "개인운용",
    "costComparison.corporate": "법인운용",
    "costComparison.monthlyCash": "목표 월현금",
    "costComparison.annualTotalCost": "연 총비용",
    "costComparison.healthInsurance": "건보료",
    "costComparison.netGrowth": "필요 자산",
    "costComparison.requiredRevenue": "필요 연간 총수익",
    "costComparison.assetMargin": "현재 자산 대비 여유",
    "costComparison.tax": "세금",
    "costComparison.socialInsurance": "사회보험",
    "costComparison.fixedCost": "고정비",
    "costComparison.grossSalary": "총급여",
    "costComparison.companyInsurance": "회사부담보험",
    "costComparison.netSalary": "순급여",
    "costComparison.netCorporateCash": "법인 순현금",
    "costComparison.payrollWithholding": "원천징수세",
    "costComparison.retainedEarnings": "유보이익",
    "costComparison.breakdownTitle": "비용 분해 비교",
    "costComparison.cumulativeTitle": "필요 자산 비교",
    "costComparison.householdCashTitle": "현재 자산 대비 여유 비교",
    "costComparison.totalValueTitle": "순현금 구성 비교",
    "costComparison.sustainabilityTitle": "현재 자산 기준 지속가능성",
    "costComparison.loanGapTitle": "법인 대여금 반환 갭",
    "costComparison.loanGapRequired": "필요 대여금 반환액",
    "costComparison.loanGapConfigured": "설정된 반환 한도",
    "costComparison.loanGap": "부족분",
    "costComparison.assetFeasibility": "현재 투자자산 기준",
    "costComparison.loanFeasibility": "현재 주주대여금 기준",
    "costComparison.setupFeasibility": "현재 전체 셋업 기준",
    "costComparison.feasible": "충족",
    "costComparison.notFeasible": "부족",
    "costComparison.waterfallTitle": "총수익 대비 순현금 비교",
    "costComparison.waterfallBasis":
      "여기서 총수익은 연간 예상 투자수익이며, `투자자산 x TR`로 계산합니다. 개인은 총수익에서 세금과 건강보험료를 뺀 값이 순현금이고, 법인은 법인 순현금에 순급여를 더한 값이 순현금입니다.",
    "costComparison.cumulativeNote":
      "낮을수록 유리합니다. 같은 목표 세후 월현금을 만들기 위해 각 구조에서 필요한 투자자산 규모를 비교합니다.",
    "costComparison.householdCashNote":
      "높을수록 유리합니다. 현재 투자자산에서 필요 자산을 뺀 여유분을 비교합니다.",
    "costComparison.totalValueNote":
      "각 구조의 연 순현금이 어떤 항목으로 구성되는지 보여줍니다. 개인은 세후 투자현금, 법인은 법인 순현금과 순급여로 분해합니다.",
    "costComparison.sustainabilityNote":
      "현재 자산 기준으로 지금 설정을 유지했을 때 목표 월현금을 몇 년 동안 충족할 수 있는지 보여줍니다.",
    "costComparison.waterfallNote":
      "왼쪽에서 오른쪽으로 읽으면 됩니다. 연간 총수익에서 비용 항목을 차감하고, 법인만 순급여를 다시 더해 최종 연 순현금으로 이어집니다.",
    "costComparison.warningTitle": "주의 사항",
    "costComparison.revenue": "총수익",
    "costComparison.disposableCash": "최종 순현금",
    "costComparison.annualNetCashflow": "연 순현금흐름",
    "costComparison.cumulativeNetCashflow": "누적 순현금흐름",
    "costComparison.winnerBasis": "우세 판정 기준",
    "costComparison.winnerBasisFormulaNetCashflow":
      "차이 계산식 = 법인 연 순현금흐름 - 개인 연 순현금흐름",
    "costComparison.winnerAnnualLabel": "연 순현금흐름 기준 결론",
    "costComparison.winnerAnnualPrefix": "연 순현금흐름 기준으로",
    "costComparison.winnerAnnualMiddle": "이 ",
    "costComparison.winnerAnnualSuffix": "보다 더 많은 순현금을 남깁니다.",
    "costComparison.winnerCumulativeLabel": "누적 순현금흐름 기준 결론",
    "costComparison.winnerCumulativePrefix": "누적 순현금흐름 기준으로",
    "costComparison.winnerCumulativeMiddle": "이 ",
    "costComparison.winnerCumulativeSuffix": "보다 더 많은 순현금을 남깁니다.",
    "costComparison.tie": "동률",
    "costComparison.tieWins": "현재 입력 기준으로 두 구조의 우열이 같습니다.",
    "costComparison.tieAnnualSummary":
      "연 순현금흐름 기준으로 두 구조가 남기는 순현금이 같습니다.",
    "costComparison.tieCumulativeSummary":
      "누적 순현금흐름 기준으로 두 구조가 남기는 순현금이 같습니다.",
    "costComparison.tooltip.investmentAssets":
      "개인 시나리오의 과세 투자자산이며, 공정 비교를 위해 법인 시나리오에도 같은 자산 규모를 기준으로 적용합니다.",
    "costComparison.tooltip.inputSection":
      "비교 실행 전에 사용할 비교 방식과 입력값을 설정하는 영역입니다.",
    "costComparison.tooltip.resultSection":
      "비교 실행 후 우열, 차이 원인, 차트 결과를 요약해서 보여주는 영역입니다.",
    "costComparison.tooltip.assumptionSection":
      "개인과 법인 계산에 공통으로 적용된 핵심 전제값을 보여줍니다.",
    "costComparison.tooltip.scenarioSection":
      "개인운용과 법인운용의 핵심 KPI를 나란히 비교하는 카드 영역입니다.",
    "costComparison.tooltip.summarySection":
      "현재 우세 구조, 연간/누적 차이, 주요 차이 유발 요인을 한 번에 보여줍니다.",
    "costComparison.tooltip.chartSection":
      "순현금 구성, 비용 구조, 지속가능성 등 비교 결과를 차트로 분해해서 보여줍니다.",
    "costComparison.tooltip.pensionAssets":
      "개인연금 자산은 별도 고정자산으로 저장되며, v1에서는 개인 vs 법인 직접 운용자산 비교에서 제외합니다.",
    "costComparison.tooltip.realEstateValue":
      "v1에서는 건강보험 재산 점수 계산에만 사용하는 부동산 공시지가입니다.",
    "costComparison.tooltip.realEstateRatio":
      "지역건보 재산 기준에 반영할 본인 지분율입니다.",
    "costComparison.tooltip.paRate":
      "활성 포트폴리오 DY에 더해 TR을 만드는 연간 기대주가상승률입니다.",
    "costComparison.tooltip.simulationYears":
      "누적 비교와 순자산 시계열을 계산할 총 기간입니다.",
    "costComparison.tooltip.assumptionMode":
      "현재 결과가 목표 수익 기반인지, 보유 자산 기반인지 보여줍니다.",
    "costComparison.tooltip.targetMonthlyCash":
      "두 시나리오가 동일하게 만들어야 하는 가계 세후 월현금 목표입니다.",
    "costComparison.tooltip.rebalanceSaleRatio":
      "연간 리밸런싱 때 매도 후 즉시 재투자하는 포트폴리오 평가액 비율의 추정치입니다. 0과 1 사이 비율로 입력합니다.",
    "costComparison.tooltip.capitalGainsTaxRate":
      "기본공제 후 리밸런싱 실현차익에만 적용하는 개인 양도세 추정 세율입니다.",
    "costComparison.tooltip.capitalGainsDeduction":
      "개인 양도차익 과세 전 차감하는 연간 기본공제 추정액입니다.",
    "costComparison.tooltip.monthlyBookkeepingFee":
      "기장료와 기본 신고 대행비처럼 매월 반복되는 법인 운영비입니다.",
    "costComparison.tooltip.annualTaxAdjustmentFee":
      "결산/세무조정 시 연 1회 발생하는 법인세 조정료입니다.",
    "costComparison.tooltip.corpTaxRate":
      "세율표에서 말하는 명목 법인세율을 선택합니다. 시뮬레이션 계산은 지방소득세를 포함해 10% 선택 시 11%로 반영합니다.",
    "costComparison.tooltip.masterPortfolio":
      "비용 비교에 사용할 저장된 master portfolio를 선택합니다. 별도 선택을 저장하지 않으면 현재 활성 master portfolio를 사용합니다.",
    "costComparison.tooltip.initialLoan":
      "법인에 투입된 초기 주주대여금 원금입니다. 현금 여력이 있으면 비과세 상환 재원이 됩니다.",
    "costComparison.tooltip.annualLoanRepayment":
      "연간 목표 주주대여금 상환액입니다. 실제 상환은 남은 대여금과 법인 현금흐름 범위 내에서만 반영됩니다.",
    "costComparison.tooltip.salary":
      "법인이 가구 구성원에게 지급하는 세전 월 급여입니다.",
    "costComparison.tooltip.assumptionPortfolio":
      "이번 비교 실행에 실제로 사용된 master 전략 이름입니다.",
    "costComparison.tooltip.assumptionCorporatePortfolio":
      "선택한 master 전략에 연결된 법인 포트폴리오입니다.",
    "costComparison.tooltip.assumptionPensionPortfolio":
      "선택한 master 전략에 연결된 연금 포트폴리오입니다.",
    "costComparison.tooltip.dy":
      "선택한 master portfolio에서 계산된 가중 평균 배당수익률입니다.",
    "costComparison.tooltip.pa":
      "비교 시뮬레이터에서 입력한 기대주가상승률입니다.",
    "costComparison.tooltip.tr":
      "두 시나리오에 동일하게 적용되는 총수익률입니다. DY + PA로 계산합니다.",
    "costComparison.tooltip.monthlyCash":
      "세금, 건강보험료, 기타 비용을 반영한 뒤 가구가 실제로 사용할 수 있는 월 기준 현금입니다.",
    "costComparison.tooltip.annualTotalCost":
      "세금, 건강보험료, 사회보험, 고정 운영비 등 연간 총비용 부담입니다.",
    "costComparison.tooltip.healthInsurance":
      "연간 건강보험료 부담입니다. 개인은 지역건보, 법인은 직장건보 기준 비용을 반영합니다.",
    "costComparison.tooltip.netGrowth":
      "입력한 목표 세후 월현금을 만들기 위해 필요한 투자자산 규모입니다.",
    "costComparison.tooltip.requiredRevenue":
      "목표 가계현금과 모든 비용을 충당하기 위해 필요한 연간 투자 총수익입니다.",
    "costComparison.tooltip.disposableCash":
      "현재 투자자산 기준으로 세금과 보험료를 반영한 뒤 남는 최종 순현금의 월 환산값입니다.",
    "costComparison.tooltip.assetMargin":
      "현재 투자자산에서 필요한 자산을 뺀 값입니다. 양수면 현재 자산으로 목표를 더 여유 있게 감당할 수 있다는 뜻입니다.",
    "costComparison.tooltip.winner":
      "현재 우세 판정은 각 구조에서 발생한 수익에서 구조별 모든 비용을 뺀 뒤 남는 순현금흐름을 기준으로 표시합니다. 화면의 차액은 `법인 - 개인`으로 계산합니다.",
    "costComparison.tooltip.driver.tax": "개인과 법인 간 세금 부담 차이입니다.",
    "costComparison.tooltip.driver.health":
      "지역건보와 직장건보 구조 차이에서 생기는 건강보험료 차이입니다.",
    "costComparison.tooltip.driver.salary":
      "법인 구조에서만 발생하는 총급여 비용 차이입니다.",
    "costComparison.tooltip.driver.fixed":
      "법인 운영을 위해 발생하는 고정 운영비 차이입니다.",
    "costComparison.tooltip.driver.social":
      "급여 지급에 따른 사회보험 비용 차이입니다.",
    "costComparison.tooltip.driver.loan":
      "주주대여금 상환으로 가구 현금흐름에 반영되는 차이입니다.",
    "costComparison.tooltip.breakdown":
      "개인/법인 두 시나리오의 연간 비용 구성을 누적 막대로 비교합니다. 위 요약칩에는 각 시나리오의 연 총비용을 같이 표시합니다.",
    "costComparison.tooltip.cumulative":
      "같은 목표 세후 월현금을 만들기 위해 각 구조에서 필요한 투자자산 규모를 비교합니다.",
    "costComparison.tooltip.householdCash":
      "현재 투자자산과 필요 자산의 차이를 비교합니다.",
    "costComparison.tooltip.totalValue":
      "연 순현금이 어떤 항목으로 구성되는지 보여줍니다. 개인은 세후 투자현금이고, 법인은 법인 순현금과 순급여의 합입니다.",
    "costComparison.tooltip.sustainability":
      "현재 자산으로 목표 세후 월현금을 몇 년 동안 온전히 충족할 수 있는지 보여줍니다.",
    "costComparison.tooltip.loanGap":
      "현재 법인 셋업에서 주주대여금 반환으로 가계 목표현금을 계속 채울 수 있는지 점검합니다.",
    "costComparison.tooltip.loanGapRequired":
      "순급여 외에 목표 가계현금을 맞추기 위해 연간 필요한 주주대여금 반환액입니다.",
    "costComparison.tooltip.loanGapConfigured":
      "사용자가 현재 설정한 연간 주주대여금 반환 한도입니다.",
    "costComparison.tooltip.loanGapGap":
      "필요 반환액과 현재 설정된 반환 한도 사이의 부족분입니다.",
    "costComparison.tooltip.assetFeasibility":
      "현재 투자자산만 놓고 봤을 때 목표 가계현금을 감당할 수 있는지 확인합니다.",
    "costComparison.tooltip.loanFeasibility":
      "초기 주주대여금 원금이 시뮬레이션 기간 전체에 충분한지 확인합니다.",
    "costComparison.tooltip.setupFeasibility":
      "현재 투자자산과 주주대여금 재원을 함께 봤을 때 전체 법인 셋업이 목표를 충족하는지 확인합니다.",
    "costComparison.tooltip.waterfall":
      "연간 총수익에서 비용을 차감해 연 순현금으로 이어지는 흐름을 단계별로 보여줍니다. 법인은 총급여와 회사부담보험을 먼저 차감한 뒤 순급여를 다시 더합니다.",
    "costComparison.waterfallTooltipChange": "증감",
    "costComparison.waterfallTooltipRevenue": "시작 총수익",
    "costComparison.waterfallTooltipDeduction": "차감액",
    "costComparison.waterfallTooltipAddition": "가산액",
    "costComparison.waterfallTooltipFinal": "최종 순현금",
    "costComparison.waterfallTooltipBase": "이전 누적값",
    "costComparison.waterfallTooltipAfter": "단계 반영 후",
    "costComparison.tooltip.warning":
      "결과 해석에 영향을 줄 수 있는 모델 경고나 제도상 유의사항입니다.",
    "costComparison.mode.target": "목표 수익 기반",
    "costComparison.mode.asset": "보유 자산 기반",
    "costComparison.assetNetYield": "자산 대비 세후 수익률",
    "costComparison.detailedAudit": "상세 비용 감사",
    "costComparison.viewDetailedCosts": "상세 계산 보기",
    "costComparison.detailedCostTitle": "비용 상세 계산",
    "costComparison.close": "닫기",
    "costComparison.costLineItems": "비용 항목",
    "costComparison.calculationSteps": "계산 과정",
    "costComparison.operatingCostFormula": "운영비 계산식",
    "costComparison.taxBaseFormula": "과세표준 계산식",
    "costComparison.finalCashFormula": "최종 순현금 계산식",
    "costComparison.personalTaxFormula": "개인 세금 계산식",
    "costComparison.personalHealthFormula": "건보료 계산식",
    "costComparison.healthPremiumBase": "건보료 본체",
    "costComparison.taxBase": "과세표준",
    "costComparison.taxThreshold": "과세 기준선",
    "costComparison.operatingCostAnnual": "연 운영비 합계",
    "costComparison.propertyPoints": "재산 점수 (부동산 등)",
    "costComparison.incomePoints": "소득 점수 (배당 등)",
    "costComparison.totalPoints": "합계 점수",
    "costComparison.unitPriceLtc": "점수당 단가 x 요양보험 요율",
    "costComparison.appliedTaxRate": "적용 소득세율",
    "costComparison.appliedCorpTaxRate": "적용 법인세율",
    "costComparison.personalWins": "현재 입력 기준으로 개인운용이 우세합니다.",
    "costComparison.corporateWins": "현재 입력 기준으로 법인운용이 우세합니다.",
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
