# Architecture: Retirement Asset Management System (RAMS)

## 1. 데이터 스키마 정의 (Data Schema)

본 시스템은 모든 수치를 변수화하여 관리하며, `retirement_config.json`은 아래와 같은 **구조(Schema)**를 유지한다. 모든 값은 사용자 입력 또는 시스템 기본값에 의해 동적으로 결정된다.

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
    "initial_investment": "number (User Input)",
    "capital_stock": "number (User Input)",
    "initial_shareholder_loan": "number (User Input)",
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
  }
}
```

---

## 2. 엔진별 핵심 로직 (Logic Specification)

### 2.1. Life-Cycle & Event Engine (ProjectionEngine)
- **Age Calculation:** 시뮬레이션 시점의 연/월과 사용자의 생년월일을 비교하여 정밀한 개월령 계산.
- **Dynamic Event Injection:** `planned_cashflows` 배열을 순회하며 해당 월에 매칭되는 이벤트를 실시간으로 자산 잔액에 가감.
- **Variable-based Withdrawal:** 하드코딩된 상수 없이 사용자가 설정한 `monthly_withdrawal_target`을 기준으로 인출 수행.

---

## 3. UI 컴포넌트 데이터 바인딩
- 모든 UI 컴포넌트는 위 스키마의 해당 필드와 1:1로 매핑되어 실시간 양방향 동기화를 보장한다.
