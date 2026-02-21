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
