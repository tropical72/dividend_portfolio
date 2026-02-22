/**
 * 공통 데이터 모델 및 인터페이스 정의 [GS-STD-02]
 */

export const TYPES_VERSION = "1.0.0";

/** 앱 설정 인터페이스 */
export interface AppSettings {
  dart_api_key: string;
  gemini_api_key: string;
  default_capital: number;
  default_currency: "USD" | "KRW";
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
}

/** 포트폴리오 항목 인터페이스 (Portfolio 용) [REQ-PRT-01] */
export interface PortfolioItem {
  symbol: string;
  name: string;
  category: "Fixed" | "Cash" | "Growth";
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
  account_type: "Personal" | "Pension";
  total_capital: number;
  currency: string;
  items: PortfolioItem[];
  created_at: string;
}

/** 은퇴 시뮬레이션 전역 설정 인터페이스 [REQ-RAMS-01] */
export interface PlannedCashflow {
  id: string;
  type: "INFLOW" | "OUTFLOW";
  entity: "CORP" | "PENSION";
  amount: number;
  year: number;
  month: number;
  description: string;
}

export interface RetirementConfig {
  active_assumption_id: string;
  user_profile: {
    birth_year: number;
    birth_month: number;
    private_pension_start_age: number;
    national_pension_start_age: number;
  };
  corp_params: {
    initial_investment: number;
    capital_stock: number;
    initial_shareholder_loan: number;
    monthly_salary: number;
    monthly_fixed_cost: number;
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
    corp_tax_low_rate: number;
    corp_tax_high_rate: number;
    pension_rate: number;
    health_rate: number;
  };
  trigger_thresholds: {
    tax_threshold: number;
    target_buffer_months: number;
    high_income_cap_rate: number;
    market_panic_threshold: number;
  };
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
