# Architecture: Personal vs Corporate Cost Comparison Simulator

## 1. 아키텍처 목표
본 기능의 아키텍처 목표는 `개인운용 100%`와 `법인운용 100%`를 동일 투자 포트폴리오 기준으로 비교하되, 기존 은퇴 엔진 설정을 오염시키지 않고 독립적으로 저장·계산·표시할 수 있는 구조를 만드는 것이다.

핵심 설계 원칙은 다음과 같다.

- 동일한 기준 포트폴리오와 동일한 `TR`을 두 시나리오에 강제 적용한다.
- 차이는 오직 세금, 건강보험료, 급여, 운영비, 주주대여금 상환 구조에서만 발생시킨다.
- 기존 `tax_engine.py`, `api.py`, `main.py`, 프런트 공통 번역/차트 계층을 최대한 재사용한다.
- 비교 시뮬레이터 설정은 은퇴 시뮬레이터 설정과 저장 구조를 분리한다.
- 백엔드 계산은 순수 서비스 계층으로 분리해 테스트 가능성을 높인다.

---

## 2. 상위 구조

### 2.1 레이어 구성
본 기능은 아래 5개 레이어로 구성한다.

1. `Persistence Layer`
   - 비교 시뮬레이터 전용 설정 파일 로드/저장
   - 기준 연도/정책 수치 메타데이터 제공
2. `Portfolio Assumption Layer`
   - 활성 master portfolio 조회
   - `DY`, `PA`, `TR` 계산
3. `Scenario Calculation Layer`
   - 개인운용 계산기
   - 법인운용 계산기
4. `Comparison Aggregation Layer`
   - KPI 요약
   - 비용 분해
   - 차트 시계열
   - 설명 패널 생성
5. `Presentation/API Layer`
   - 설정 조회/저장 API
   - 비교 실행 API
   - 프런트 탭 UI 및 차트

### 2.2 기존 시스템과의 관계
- `Retirement` 탭:
  - 직접 의존하지 않는다.
  - 단, 활성 master portfolio와 일부 공통 수익률/세금 계산 함수를 재사용한다.
- `Settings` 탭:
  - 글로벌 `PA` 기본값, 언어 설정, 정책 수치 출처 표기 규칙을 재사용할 수 있다.
- `Portfolio Dashboard / Master Portfolio`:
  - 비교 시뮬레이터의 기준 포트폴리오 소스 역할을 한다.

---

## 3. 데이터 모델

### 3.1 저장 파일
- 제안 파일명: `cost_comparison_config.json`
- 위치:
  - Git 기본값: `defaults/cost_comparison_config.json`
  - 사용자 런타임 저장: `APP_DATA_DIR/cost_comparison_config.json`
- 목적:
  - 비교 시뮬레이터 전용 입력값 영속화
  - 기존 `retirement_config.json` 및 `settings.json`과 분리
  - 공개 저장소 기본값과 사용자 로컬 수정값을 분리

### 3.2 루트 스키마 초안
```json
{
  "household": {
    "members": []
  },
  "personal_assets": {
    "investment_assets": 0,
    "personal_pension_assets": 0
  },
  "real_estate": {
    "official_price": 0,
    "ownership_ratio": 1.0
  },
  "assumptions": {
    "price_appreciation_rate": 0.0,
    "simulation_years": 10
  },
  "corporate": {
    "salary_recipients": [],
    "monthly_fixed_cost": 0,
    "initial_shareholder_loan": 0,
    "annual_shareholder_loan_repayment": 0
  },
  "policy_meta": {
    "base_year": 2026
  }
}
```

### 3.3 세부 엔터티

#### HouseholdMember
```json
{
  "id": "self",
  "relationship": "self",
  "birth_year": 1972,
  "birth_month": 8,
  "is_financially_dependent": false,
  "has_income": false,
  "notes": ""
}
```

설명:
- `relationship`: `self`, `spouse`, `child`, `parent`, `other`
- `is_financially_dependent`와 `has_income`는 피부양자 가능성 판단의 보조 입력값으로 사용한다.
- 1차 버전에서는 정교한 자격 판정 엔진보다 계산 보조값으로 우선 사용한다.

#### SalaryRecipient
```json
{
  "id": "self-salary",
  "name": "본인",
  "relationship": "self",
  "monthly_salary": 3000000,
  "is_employee_insured": true
}
```

설명:
- 최대 4개까지 허용
- 수령자는 반드시 가구 구성원과 관계를 맺을 수 있어야 한다.
- `is_employee_insured=false` 상태는 추후 확장을 위해 남기되, 1차 UI에서는 기본적으로 직장가입자 급여 수령자 중심으로 설계한다.

---

## 4. 계산 모델

### 4.1 기준 포트폴리오 및 수익률
비교 시뮬레이터는 다음 규칙으로 기준 수익률을 만든다.

1. 활성 master portfolio 조회
2. 포트폴리오 종목/비중 기준 가중 평균 `DY` 계산
3. 사용자 입력 `PA` 조회
4. `TR = DY + PA` 계산
5. 동일 `TR`을 개인/법인 양쪽에 주입

### 4.2 개인운용 시나리오
입력:
- 개인 투자자산 총액
- 부동산 공시지가 및 지분
- 가구 정보
- 기준 `DY`, `PA`, `TR`

출력:
- 연간 총수익
- 개인 세금
- 지역건강보험료
- 연 총비용
- 월 실수령액
- 세후 순증가액
- 누적 순자산 시계열

핵심 규칙:
- 개인연금 자산은 비교 운용자산에 포함하지 않는다.
- 부동산은 지역건보 계산용 재산으로만 사용한다.
- 총수익과 비용은 가구 전체 관점으로 집계한다.

### 4.3 법인운용 시나리오
입력:
- 법인 투자자산 총액
- 급여 수령자 목록
- 월 고정 운영비
- 초기 주주대여금
- 연간 주주대여금 상환액
- 가구 정보
- 기준 `DY`, `PA`, `TR`

출력:
- 연간 법인 총수익
- 법인세
- 급여 총액
- 4대보험 및 직장건보료
- 고정 운영비
- 실제 상환된 주주대여금
- 연 총비용
- 월 실수령액
- 세후 순증가액
- 누적 순자산 시계열

핵심 규칙:
- 법인 유보이익과 가구 실수령 현금을 구분한다.
- 회사 부담분 건강보험료와 개인 부담분 건강보험료를 모두 총비용에 포함한다.
- 주주대여금 상환은 실현 가능한 현금 범위 내에서만 허용한다.

### 4.4 누적 계산 방식
1차 버전에서는 다음 규칙을 기본안으로 둔다.

- 매년 동일 입력을 기준으로 계산하되
- 전년도 말 세후 순증가액을 다음 해 자산 기반에 재투입하는 `compounding` 모드를 기본 적용한다.
- 단, 필요 시 디버깅/검증을 위해 단순 반복 모드로도 전환 가능하도록 내부 구조를 분리한다.

설명:
- 사용자는 기간 입력을 원했고, 누적 비교의 의미를 살리려면 자산 증가 재투입이 필요하다.
- 다만 세무 디버깅 시에는 각 연도를 독립적으로 보는 보조 계산이 필요할 수 있으므로 내부 계산 전략은 분리한다.

---

## 5. 백엔드 구성 제안

### 5.1 신규/변경 대상 모듈
- 신규 후보:
  - `src/core/cost_comparison_engine.py`
  - `src/core/cost_comparison_models.py`
- 변경 후보:
  - `src/backend/api.py`
  - `src/backend/main.py`
  - 설정 저장 helper 계층

### 5.2 모듈 책임

#### `cost_comparison_models.py`
- Pydantic 또는 dataclass 기반 입력/출력 모델 정의
- 내부 계산 결과 모델 정의
- API 응답에 필요한 DTO 정의

#### `cost_comparison_engine.py`
- `build_portfolio_assumptions()`
- `simulate_personal_scenario()`
- `simulate_corporate_scenario()`
- `compare_scenarios()`
- `build_difference_explanations()`

#### `api.py`
- 설정 파일 로드/저장
- 활성 master portfolio에서 비교용 포트폴리오 정보 추출
- 정책 수치 메타 구성

#### `main.py`
- 비교 시뮬레이터 설정 GET/POST 엔드포인트
- 비교 실행 엔드포인트
- 응답 직렬화 및 오류 처리

### 5.3 기존 엔진 재사용 포인트
- `tax_engine.py`
  - 지역건보 계산
  - 개인/법인 수익성 계산의 일부 수식
- master portfolio helper
  - 활성 포트폴리오 조회
  - `DY` 계산
- settings loader
  - 기본 `PA`, 언어, 정책값 메타

주의:
- 기존 `calculate_personal_profitability`, `calculate_corp_profitability`가 단년·단순 모델이라면, 비교 시뮬레이터는 이들을 직접 API 응답으로 노출하지 말고 내부 building block으로만 재사용해야 한다.
- 결과 스키마는 비교 전용 payload로 재정의해야 한다.

---

## 6. API 설계 초안

### 6.1 설정 조회
- `GET /api/cost-comparison/config`

응답 예시:
```json
{
  "config": {
    "...": "..."
  },
  "meta": {
    "base_year": 2026
  }
}
```

### 6.2 설정 저장
- `POST /api/cost-comparison/config`

역할:
- 비교 시뮬레이터 전용 설정 저장
- 저장 직후 유효성 검증 결과 반환 가능

### 6.3 비교 실행
- `POST /api/cost-comparison/run`

응답 구조:
```json
{
  "assumptions": {
    "portfolio_name": "Active Master",
    "dy": 0.038,
    "pa": 0.03,
    "tr": 0.068,
    "simulation_years": 10,
    "base_year": 2026
  },
  "personal": {
    "kpis": {},
    "breakdown": {},
    "series": []
  },
  "corporate": {
    "kpis": {},
    "breakdown": {},
    "series": []
  },
  "comparison": {
    "winner": "corporate",
    "annual_advantage": 0,
    "cumulative_advantage": 0,
    "top_drivers": []
  },
  "warnings": []
}
```

### 6.4 에러 처리
- 기준 포트폴리오 없음
- 급여 수령자 수 초과
- 음수 자산/급여/운영비 입력
- 기간 범위 초과
- 주주대여금 상환액이 초기 대여금보다 큰 구조

각 에러는 사용자에게 직접 노출 가능한 메시지 키와 디버깅용 상세 필드를 분리한다.

---

## 7. 프런트엔드 구조 제안

### 7.1 신규 컴포넌트 후보
- `src/frontend/src/components/CostComparisonTab.tsx`
- `src/frontend/src/components/cost-comparison/HouseholdSection.tsx`
- `src/frontend/src/components/cost-comparison/AssetSection.tsx`
- `src/frontend/src/components/cost-comparison/CorporateSection.tsx`
- `src/frontend/src/components/cost-comparison/KpiComparisonCards.tsx`
- `src/frontend/src/components/cost-comparison/CostBreakdownChart.tsx`
- `src/frontend/src/components/cost-comparison/ComparisonSummary.tsx`

### 7.2 화면 구성
1. 상단 소개/주의 문구
2. 입력 패널
3. 실행 버튼
4. assumptions 배지
5. KPI 비교 카드
6. 차이 요약 패널
7. 비용 분해 차트
8. 워터폴
9. 누적 비교 그래프
10. 경고 및 정책 출처

### 7.3 상태 관리
- 서버 저장 상태와 로컬 편집 상태를 분리한다.
- `dirty` 상태를 명시해 저장되지 않은 변경을 추적한다.
- 실행은 저장값 기준 또는 현재 편집값 기준 중 하나로 정책을 고정해야 한다.

권장:
- `실행`은 현재 편집값 기준으로 동작
- `저장`은 영속성 반영용으로 분리

이유:
- 시뮬레이션 도구는 빠른 가정 변경과 즉시 재계산이 중요하다.
- 저장을 강제하면 사용 흐름이 느려진다.

### 7.4 번역/i18n
- 새 탭과 모든 라벨은 기존 `i18n.tsx` 번역 키 계층에 추가한다.
- 건강보험/세금 용어는 한국어와 영어 모두 일관된 키 체계를 사용한다.

---

## 8. 차트 및 결과 모델

### 8.1 KPI 카드 데이터
- `monthly_disposable_cashflow`
- `annual_total_cost`
- `annual_health_insurance`
- `after_tax_net_growth`

### 8.2 Breakdown 모델
```json
{
  "tax": 0,
  "health_insurance": 0,
  "salary": 0,
  "social_insurance": 0,
  "fixed_cost": 0,
  "shareholder_loan_repayment": 0,
  "retained_earnings": 0
}
```

주의:
- `shareholder_loan_repayment`은 비용이 아니라 가구 유입 항목이므로 워터폴에서는 별도 방향으로 표현해야 한다.
- `retained_earnings`도 비용이 아니라 내부 축적 항목이므로 총비용 차트와는 분리 표시가 필요하다.

### 8.3 시계열 모델
```json
[
  {
    "year": 1,
    "personal_net_worth": 0,
    "corporate_net_worth": 0,
    "personal_disposable_cash": 0,
    "corporate_disposable_cash": 0
  }
]
```

---

## 9. 검증 전략

### 9.1 단위 테스트
- 포트폴리오가 동일하면 `DY`, `TR`이 두 시나리오에 동일 주입되는지 검증
- 급여 수령자 수가 늘면 법인 비용 구조가 변하는지 검증
- 부동산 지분율 변화가 개인 건보료에 반영되는지 검증
- 주주대여금 상환 가능 한도 제한이 적용되는지 검증

### 9.2 API 테스트
- 설정 저장/재조회 정합성
- 기준 포트폴리오 누락 시 에러 응답
- 결과 payload 필드 완전성 검증

### 9.3 E2E 테스트
- 새 탭 진입
- 입력값 저장/재로드
- 개인 vs 법인 KPI 차이 렌더링
- 기간 변경 시 누적 그래프 갱신
- 사용자 실데이터 오염 방지

---

## 10. 주요 리스크 및 대응

### R-1. 건강보험 제도 반영의 불완전성
- 리스크:
  - 피부양자 자격, 보수 외 소득월액보험료, 재산/소득 점수 계산의 실제 제도 반영이 단순화될 수 있다.
- 대응:
  - 기준 연도 표시
  - 정책 출처 표시
  - 확정치가 아닌 추정치 경고 노출

### R-2. 기존 세무 함수의 단순 모델 한계
- 리스크:
  - 현행 함수가 단년 단순 계산에 머물러 다년 누적 비교에 바로 맞지 않을 수 있다.
- 대응:
  - 비교 전용 엔진을 별도 계층으로 두고, 기존 함수는 하위 building block으로만 사용한다.

### R-3. 저장 설정의 오염
- 리스크:
  - 비교 시뮬레이터 값이 은퇴 시뮬레이터 값과 혼재될 수 있다.
- 대응:
  - 파일 및 API 스키마를 명확히 분리한다.

### R-4. 차트 오해 유발
- 리스크:
  - 비용, 유입, 유보이익을 한 차트에 섞으면 사용자가 잘못 해석할 수 있다.
- 대응:
  - 총비용 차트와 순현금 워터폴을 분리한다.
  - `비용`, `유입`, `내부축적` 범주를 시각적으로 명확히 구분한다.

---

## 11. 구현 우선순위 권장안
1. 저장 스키마 및 모델 확정
2. 비교 전용 백엔드 엔진 구현
3. 실행 API 설계 및 테스트
4. 새 탭 입력 UI
5. KPI 카드 및 비교 요약
6. 차트 계층
7. E2E 및 회귀 고정

---

## 12. 남아 있는 결정 사항
- `금융소득`을 기준 포트폴리오 `DY` 기반 자동 추정으로 할지, 사용자가 별도 입력하도록 할지
- 다년 누적 계산에서 `compounding`을 기본값으로 확정할지
- 보수 외 소득월액보험료를 1차부터 정식 산식 반영할지
- 급여 수령자 미입력 상태를 허용할지, 최소 1명 직장가입자를 강제할지

현재 권장안:
- 금융소득은 `DY 자동 추정 + 사용자 override`
- 누적 계산은 `compounding 기본`
- 보수 외 소득월액보험료는 `1차 경고 + 2차 정식 산식`
- 급여 수령자 0명 허용, 단 법인운용 비교 실행 시 경고 표시
