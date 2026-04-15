# Architecture: Retirement Asset Management System (RAMS)

## 1. 데이터 스키마 정의 (Data Schema)

본 시스템은 모든 수치를 변수화하여 관리하며, `retirement_config.json`은 아래와 같은 **구조(Schema)**를 유지한다. 모든 값은 사용자 입력 또는 시스템 기본값에 의해 동적으로 결정된다.
특히 본 버전에서는 `stock-plan.txt`의 계좌별 4단계 전략과 연 1회 운용 규칙을 직접 표현할 수 있도록 스키마를 확장한다.

### 1.1. 은퇴 설정 스키마 (`retirement_config.json`)

```json
{
  "user_profile": {
    "birth_year": "number (User Input)",
    "birth_month": "number (User Input)",
    "private_pension_start_age": "number (User Input)",
    "national_pension_start_age": "number (User Input)"
  },
  "corp_params": {
    "initial_investment": "number (User Input, 실제 법인 계좌 총 운용자산)",
    "capital_stock": "number (User Input, 자본금 원금)",
    "initial_shareholder_loan": "number (User Input, 주주대여금 원금)",
    "monthly_salary": "number (User Input)",
    "monthly_fixed_cost": "number (User Input)"
  },
  "pension_params": {
    "initial_investment": "number (User Input)",
    "severance_reserve": "number (User Input)",
    "other_reserve": "number (User Input)",
    "monthly_withdrawal_target": "number (User Input)"
  },
  "planned_cashflows": [
    {
      "id": "string (UUID)",
      "type": "string (INFLOW | OUTFLOW)",
      "entity": "string (CORP | PENSION)",
      "amount": "number (User Input)",
      "year": "number (User Input)",
      "month": "number (User Input)",
      "description": "string"
    }
  ],
  "tax_and_insurance": {
    "point_unit_price": "number (System Default / User Editable)",
    "ltc_rate": "number (System Default)"
  },
  "strategy_rules": {
    "rebalance_month": "number (Default: 1)",
    "rebalance_week": "number (Default: 2)",
    "bear_market_freeze_enabled": "boolean",
    "corporate": {
      "sgov_target_months": "number (Default: 36)",
      "sgov_warn_months": "number (Default: 30)",
      "sgov_crisis_months": "number (Default: 24)",
      "high_income_min_ratio": "number (Default: 0.20)",
      "high_income_max_ratio": "number (Default: 0.35)",
      "growth_sell_years_left_threshold": "number (Default: 10)"
    },
    "pension": {
      "sgov_min_years": "number (Default: 2)",
      "bond_min_years": "number (Default: 5)",
      "bond_min_total_ratio": "number (Default: 0.05)",
      "dividend_min_ratio": "number (Default: 0.10)"
    }
  }
}
```

### 1.2. 포트폴리오 카테고리 스키마 (`portfolios.json`)

계좌 타입에 따라 사용 가능한 카테고리가 다르며, 각 포트폴리오 항목은 아래의 전략 카테고리 중 하나에 귀속된다.

- **Corporate**
  - `SGOV Buffer`
  - `High Income`
  - `Dividend Growth`
  - `Growth Engine`
- **Pension**
  - `SGOV Buffer`
  - `Bond Buffer`
  - `Dividend Growth`
  - `Growth Engine`

기존 일반화 카테고리(`Cash`, `Fixed`, `Dividend`, `Growth`)는 내부 마이그레이션 용도로만 유지할 수 있으며, 사용자 편집 UI와 시뮬레이션 엔진은 위 전략 카테고리를 1급 개념으로 사용해야 한다.

### 1.3. 법인 원금 항목 관계 정의

- `initial_investment`
  - 실제로 법인 계좌 안에서 운용되는 총자산이다.
  - 초기 시점에는 `capital_stock + initial_shareholder_loan + 기타 유보 현금`의 합으로 구성될 수 있다.
- `capital_stock`
  - 법인 설립 시 납입한 자본금 원금이다.
  - 운용 재원의 출처를 설명하는 회계 항목이며, 비과세 반환 한도 자체를 만들지는 않는다.
- `initial_shareholder_loan`
  - 법인에 빌려준 주주대여금 원금이다.
  - 법인 계좌 안에서 다른 자금과 함께 운용될 수 있지만, 반환 시에는 비과세 회수 가능 한도의 기준이 된다.
- 엔진 원칙
  - 자산 성장, 배당, 인컴 계산은 `initial_investment` 전체를 기준으로 수행한다.
  - 주주대여금 반환 가능액 계산은 남아 있는 `initial_shareholder_loan` 잔액을 기준으로 수행한다.

---

## 2. 엔진별 핵심 로직 (Logic Specification)

### 2.1. Life-Cycle & Event Engine (ProjectionEngine)
- **Age Calculation:** 시뮬레이션 시점의 연/월과 사용자의 생년월일을 비교하여 정밀한 개월령 계산.
- **Dynamic Event Injection:** `planned_cashflows` 배열을 순회하며 해당 월에 매칭되는 이벤트를 실시간으로 자산 잔액에 가감.
- **Variable-based Withdrawal:** 하드코딩된 상수 없이 사용자가 설정한 `monthly_withdrawal_target`을 기준으로 인출 수행.
- **Annual Execution Gate:** 실제 리밸런싱/전략 매도는 연 1회 리밸런싱 시점에만 발생하며, 나머지 월에는 현금 유입·지출·이벤트·세무 반영만 수행한다.

### 2.2. 계좌별 자산 버킷 엔진
- **Corporate Buckets:** `corp_sgov`, `corp_high_income`, `corp_dividend_growth`, `corp_growth_engine`
- **Pension Buckets:** `pen_sgov`, `pen_bond_buffer`, `pen_dividend_growth`, `pen_growth_engine`
- **Cashflow Layer:** 각 계좌는 자산 가치와 별도로 `available_cash`를 관리하며, 배당/인컴은 먼저 현금 계층으로 유입된 뒤 지출과 버퍼 보강에 사용된다.
- **Loan Repayment Layer:** 주주대여금 반환은 `loan_balance` 감소 이벤트이지만, 반드시 법인 현금 계층에서 집행된 결과여야 한다.

### 2.3. 리밸런싱 및 인출 상태 머신
- **Pension Rule Chain:** `SGOV Buffer` 하한 -> `Bond Buffer` 하한 -> `Dividend Growth` 하한 -> `Growth Engine` 예외 허용 순으로 상태를 판정한다.
- **Corporate Rule Chain:** `SGOV Buffer` 목표/경고/위기 임계치와 `High Income` 최소 비중을 기준으로 현금 보강 우선순위를 결정한다.
- **Bear Market Freeze:** 하락장 플래그가 활성화되면 `Growth Engine`과 `Dividend Growth` 매도는 잠금 처리한다.
- **Transparency Logs:** 매년 어떤 자산을 왜 매도했는지, 어떤 규칙에 의해 다음 단계로 넘어갔는지 로그를 남긴다.

### 2.4. 레거시 데이터 마이그레이션 규칙
- **Corporate 포트폴리오**
  - 기존 `Cash` 카테고리는 기본적으로 `SGOV Buffer`로 매핑한다.
  - 기존 `HighIncome` 카테고리가 있으면 `High Income`으로 직접 승격한다.
  - 기존 `Dividend`와 `Growth` 혼합 카테고리는 종목의 배당 성격과 기존 분류를 기준으로 `Dividend Growth` 또는 `Growth Engine`으로 분리한다.
  - 기존 `Fixed` 카테고리는 Corporate에서는 기본적으로 `High Income`으로 매핑하되, 사용자 검토가 필요한 항목으로 표시할 수 있다.
- **Pension 포트폴리오**
  - 기존 `Cash` 카테고리는 기본적으로 `SGOV Buffer`로 매핑한다.
  - 기존 `Fixed` 카테고리는 `Bond Buffer`로 매핑한다.
  - 기존 `Dividend` 카테고리는 `Dividend Growth`로 매핑한다.
  - 기존 `Growth` 카테고리는 `Growth Engine`으로 매핑한다.
- **Migration Safety**
  - 자동 변환 후에도 전체 비중 합계는 보존되어야 한다.
  - 변환 결과가 모호한 항목은 UI에서 `review_required` 상태로 표시하여 사용자가 저장 전에 최종 확정할 수 있게 한다.

### 2.5. 구현 순서와 경계
- **Step 1. 타입 및 저장소 확장**
  - 프론트 `PortfolioItem`, `RetirementConfig`, 백엔드 저장 스키마에 새 카테고리와 `strategy_rules`를 추가한다.
  - 이 단계에서는 기존 계산 엔진은 유지하고, 데이터만 새 구조를 수용할 수 있게 만든다.
- **Step 2. Portfolio Designer 전환**
  - 계좌 타입별 4카테고리 UI와 Watchlist 이관 다이얼로그를 갱신한다.
  - 레거시 포트폴리오 로드 시 마이그레이션을 적용한다.
- **Step 3. Settings 구조 개편**
  - `Corporate Rules`, `Pension Rules`, `Execution Policy` 섹션을 추가한다.
  - 기본값 복원과 실시간 저장 구조를 연결한다.
- **Step 4. 엔진 현금흐름 레이어 분리**
  - 배당/인컴을 현금 버퍼로 분리하고, 운영비/생활비/주주대여금 반환을 현금 우선 구조로 재구현한다.
  - 이 단계에서 `ProjectionEngine`의 월별 수익 적용 로직을 재설계한다.
- **Step 5. 연 1회 리밸런싱 상태 머신 구현**
  - 연간 실행 게이트, 버퍼 하한선, 성장 자산 보호, 하락장 잠금 로직을 연결한다.
  - 로그와 Step 2 결과 메타데이터를 보강한다.

---

## 3. UI 컴포넌트 데이터 바인딩
- 모든 UI 컴포넌트는 위 스키마의 해당 필드와 1:1로 매핑되어 실시간 양방향 동기화를 보장한다.
- Portfolio Designer는 계좌 타입에 따라 4개 전략 카테고리 섹션을 동적으로 바꿔 렌더링해야 한다.
- Settings는 `Corporate Rules`, `Pension Rules`, `Execution Policy`, `Assumptions`를 분리하여 표시하고, 각 값에 대해 기본값 복원 기능을 제공해야 한다.

## 4. 구현 리스크 및 주의점
- **동일 ID 유지:** 기존 저장 포트폴리오의 `id`는 마이그레이션 후에도 유지해야 마스터 전략 참조가 깨지지 않는다.
- **가정값과 포트폴리오 TR 분리:** Step 1 Assumption의 총수익률과 포트폴리오 기반 DY/카테고리 로직이 서로 덮어쓰지 않도록, 엔진 입력 필드를 `market_total_return`, `portfolio_income_yield`, `category_weights` 등으로 명확히 분리해야 한다.
- **점진적 전환:** UI와 타입만 먼저 바꾸고 엔진을 나중에 바꾸는 동안에도, 백엔드는 새 카테고리를 받아 기존 계산으로 안전하게 폴백할 수 있어야 한다.
- **테스트 데이터 고립:** 기존 테스트 픽스처는 레거시 카테고리를 쓰고 있을 가능성이 높으므로, 새 스키마용 픽스처를 별도로 만들고 단계적으로 교체해야 한다.
