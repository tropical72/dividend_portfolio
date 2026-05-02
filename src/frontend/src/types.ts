/**
 * 공통 데이터 모델 및 인터페이스 정의 [GS-STD-02]
 */

export const TYPES_VERSION = "1.0.0";

export type AccountType = "Corporate" | "Pension";
export type UiLanguage = "ko" | "en";
export type CorporateStrategyCategory =
  | "SGOV Buffer"
  | "High Income"
  | "Dividend Growth"
  | "Growth Engine";
export type PensionStrategyCategory =
  | "SGOV Buffer"
  | "Bond Buffer"
  | "Dividend Growth"
  | "Growth Engine";
export type PortfolioCategory =
  | CorporateStrategyCategory
  | PensionStrategyCategory;

/** 앱 설정 인터페이스 */
export interface AppSettings {
  dart_api_key: string;
  gemini_api_key: string;
  default_capital: number;
  default_currency: "USD" | "KRW";
  ui_language: UiLanguage;
  current_exchange_rate?: number;
  exchange_rate_last_updated?: string | null;
  price_appreciation_rate?: number;
  appreciation_rates?: {
    cash_sgov: number;
    fixed_income: number;
    dividend_stocks: number;
    growth_stocks: number;
  };
}

/** 주식 종목 정보 인터페이스 (Watchlist 용) [REQ-WCH-03] */
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  dividend_yield: number;
  one_yr_return: number;
  ex_div_date: string;
  last_div_amount: number;
  last_div_yield: number;
  past_avg_monthly_div: number;
  dividend_frequency: string;
  payment_months: number[];
  country?: string;
  is_system_default?: boolean;
}

/** 포트폴리오 항목 인터페이스 (Portfolio 용) [REQ-PRT-01] */
export interface PortfolioItem {
  symbol: string;
  name: string;
  category: PortfolioCategory;
  weight: number;
  price: number;
  dividend_yield: number;
  last_div_amount: number;
  payment_months: number[];
}

/** 저장된 포트폴리오 전체 데이터 구조 [REQ-PRT-04, 06] */
export interface Portfolio {
  id: string;
  name: string;
  account_type: AccountType;
  total_capital: number;
  currency: string;
  items: PortfolioItem[];
  created_at: string;
  is_system_default?: boolean;
}

/** 마스터 포트폴리오(전략 세트) 인터페이스 [REQ-PRT-08.1] */
export interface MasterPortfolio {
  id: string;
  name: string;
  corp_id: string | null;
  pension_id: string | null;
  is_active: boolean;
  corp_name?: string;
  pension_name?: string;
  combined_yield?: number;
  combined_tr?: number;
  broken_reference?: boolean;
  broken_reason?: string | null;
  is_system_default?: boolean;
}

/** 은퇴 시뮬레이션 전역 설정 인터페이스 [REQ-RAMS-01] */
export interface PlannedCashflow {
  id: string;
  type: "INFLOW" | "OUTFLOW";
  entity: "CORP" | "PENSION";
  amount: number;
  currency?: "USD" | "KRW";
  year: number;
  month: number;
  description: string;
}

export interface StrategyRules {
  rebalance_month: number;
  rebalance_week: number;
  bear_market_freeze_enabled: boolean;
  corporate: {
    sgov_target_months: number;
    sgov_warn_months: number;
    sgov_crisis_months: number;
    high_income_min_ratio: number;
    high_income_max_ratio: number;
    growth_sell_years_left_threshold: number;
  };
  pension: {
    sgov_min_years: number;
    bond_min_years: number;
    bond_min_total_ratio: number;
    dividend_min_ratio: number;
  };
}

export interface RetirementConfig {
  active_assumption_id: string;
  user_profile: {
    birth_year: number;
    birth_month: number;
    private_pension_start_age: number;
    national_pension_start_age: number;
  };
  simulation_params: {
    target_monthly_cashflow: number;
    inflation_rate: number;
    expected_market_growth: number;
    simulation_start_year: number;
    simulation_start_month: number;
    national_pension_amount: number;
    simulation_years: number;
  };
  corp_params: {
    initial_investment: number;
    capital_stock: number;
    initial_shareholder_loan: number;
    monthly_salary: number;
    monthly_bookkeeping_fee?: number;
    annual_corp_tax_adjustment_fee?: number;
    monthly_fixed_cost?: number;
    employee_count: number;
  };
  pension_params: {
    initial_investment: number;
    severance_reserve: number;
    other_reserve: number;
    monthly_withdrawal_target: number;
  };
  planned_cashflows: PlannedCashflow[];
  tax_and_insurance: {
    point_unit_price: number;
    ltc_rate: number;
    corp_tax_threshold: number;
    corp_tax_nominal_rate: number;
    corp_tax_low_rate: number;
    corp_tax_high_rate: number;
    pension_rate: number;
    health_rate: number;
    employment_rate: number;
    income_tax_estimate_rate: number;
  };
  trigger_thresholds: {
    tax_threshold: number;
    target_buffer_months: number;
    high_income_cap_rate: number;
    market_panic_threshold: number;
    equity_yield_multiplier: number;
    debt_yield_multiplier: number;
  };
  strategy_rules: StrategyRules;
  assumptions: {
    [key: string]: {
      name: string;
      expected_return: number;
      expected_growth: number;
      inflation_rate: number;
      master_return?: number;
      master_inflation?: number;
    };
  };
}

/** 월별 시뮬레이션 데이터 인터페이스 */
export interface MonthlySimulationData {
  index: number;
  year: number;
  month: number;
  age: number;
  phase: string;
  total_net_worth: number;
  corp_balance: number;
  pension_balance: number;
  loan_balance: number;
  target_cashflow: number;
  net_salary: number;
  pension_draw?: number;
  event?: boolean;
}

/** 시뮬레이션 결과 전체 구조 인터페이스 */
export interface SimulationResult {
  summary: {
    total_survival_years: number;
    is_permanent: boolean;
    sgov_exhaustion_date: string;
    growth_asset_sell_start_date: string;
    signals?: unknown[];
  };
  survival_months: number;
  monthly_data: MonthlySimulationData[];
  meta?: {
    master_name?: string;
    master_yield?: number;
    master_tr?: number;
    combined_dy?: number;
    combined_tr?: number;
    pa_rate?: number;
    strategy_rules_summary?: {
      rebalance_month: number;
      rebalance_week: number;
      corporate_sgov_target_months: number;
      pension_sgov_min_years: number;
      bear_market_freeze_enabled: boolean;
    };
    used_portfolios?: {
      corp?: { name: string; yield: string; expected_return?: number };
      pension?: { name: string; yield: string; expected_return?: number };
    };
  };
}

export interface CostComparisonHouseholdMember {
  id: string;
  relationship: string;
  birth_year: number;
  birth_month: number;
  is_financially_dependent: boolean;
  has_income: boolean;
  notes: string;
}

export interface CostComparisonSalaryRecipient {
  id: string;
  name: string;
  relationship: string;
  monthly_salary: number;
  is_employee_insured: boolean;
}

export interface CostComparisonConfig {
  master_portfolio_id?: string | null;
  simulation_mode?: "target" | "asset";
  household: {
    members: CostComparisonHouseholdMember[];
  };
  personal_assets: {
    investment_assets: number;
    personal_pension_assets: number;
  };
  real_estate: {
    official_price: number;
    ownership_ratio: number;
  };
  assumptions: {
    price_appreciation_rate: number;
    simulation_years: number;
    target_monthly_household_cash_after_tax: number;
  };
  corporate: {
    salary_recipients: CostComparisonSalaryRecipient[];
    monthly_bookkeeping_fee?: number;
    annual_corp_tax_adjustment_fee?: number;
    monthly_fixed_cost?: number;
    corp_tax_nominal_rate: number;
    initial_shareholder_loan: number;
    annual_shareholder_loan_repayment: number;
  };
  policy_meta: {
    base_year: number;
  };
}

export interface CostComparisonScenarioResult {
  kpis: {
    monthly_disposable_cashflow: number;
    annual_net_cashflow: number;
    cumulative_net_cashflow: number;
    annual_total_cost: number;
    annual_health_insurance: number;
    after_tax_net_growth: number;
    required_annual_revenue: number;
    required_assets: number;
    asset_margin_vs_current?: number;
    achieves_target_with_current_assets?: boolean;
    loan_capacity_sufficient?: boolean;
    achieves_target_with_current_setup?: boolean;
    net_yield?: number;
  };
  breakdown: {
    annual_revenue: number;
    tax: number;
    health_insurance: number;
    social_insurance: number;
    fixed_cost: number;
    monthly_bookkeeping_fee?: number;
    annual_corp_tax_adjustment_fee?: number;
    gross_salary?: number;
    company_insurance_cost?: number;
    payroll_tax_withholding: number;
    shareholder_loan_repayment: number;
    retained_earnings: number;
    net_corporate_cash?: number;
    net_salary: number;
    target_household_cash: number;
    configured_annual_loan_target?: number;
    required_shareholder_loan_repayment?: number;
    loan_repayment_gap?: number;
    audit_details?: {
      health?: {
        property_points?: number;
        income_points?: number;
        total_points?: number;
        point_unit_price?: number;
        ltc_rate?: number;
        base_premium?: number;
        total_premium?: number;
        is_employee?: boolean;
        recipients?: number;
      };
      tax?: {
        tax_rate?: number;
        is_comprehensive?: boolean;
        threshold?: number;
      };
      corp_tax?: {
        tax_base?: number;
        nominal_rate?: number;
        effective_rate?: number;
        tax_rate_low?: number;
      };
      operating_costs?: {
        monthly_bookkeeping_fee?: number;
        annual_corp_tax_adjustment_fee?: number;
        annual_total?: number;
      };
    };
  };
  series: Array<{
    year: number;
    net_worth: number;
    disposable_cash: number;
    cumulative_household_cash: number;
    total_economic_value: number;
    cumulative_loan_repayment?: number;
  }>;
  sustainability_series: Array<{
    year: number;
    asset_balance: number;
    household_cash: number;
    cumulative_household_cash: number;
    target_met: boolean;
    loan_remaining?: number;
  }>;
  sustainability: {
    years_fully_funded: number;
    final_asset_balance: number;
  };
}

export interface CostComparisonResult {
  assumptions: {
    master_portfolio_id?: string | null;
    master_portfolio_name?: string;
    portfolio_name: string;
    corporate_portfolio_name?: string;
    pension_portfolio_name?: string;
    dy: number;
    pa: number;
    tr: number;
    simulation_years: number;
    target_monthly_household_cash_after_tax: number;
    base_year: number;
    simulation_mode: "target" | "asset";
  };
  personal: CostComparisonScenarioResult;
  corporate: CostComparisonScenarioResult;
  comparison: {
    winner: "personal" | "corporate" | "tie";
    winner_basis: string;
    winner_reason: string;
    annual_advantage: number;
    cumulative_advantage: number;
    top_drivers: Array<{
      label: string;
      amount: number;
    }>;
  };
  warnings: string[];
}
