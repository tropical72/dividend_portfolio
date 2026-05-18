# PDS (Portfolio Design Studio) 아키텍처 전환 및 구현 가이드 (SDD/TDD)

이 문서는 기존 강결합된 `ProjectionEngine`을 해체하여, 다중 전략 플러그인 아키텍처(PDS)로 전환하기 위한 **다른 AI Agent 전용 상세 구현 지침서**다.
이후 투입되는 모든 Agent는 아래의 절대 원칙(Universal Operational Mandates)을 준수하며 단계별로 작업을 진행해야 한다.

## 1. 개발 원칙 (절대 준수)
1. **[TDD] Test-First Approach:** 기존 코드를 해체/이동하기 전, 반드시 기존 Playwright/Pytest가 100% 통과(Green)하는지 확인하라. 분리된 새 모듈을 작성할 때도 새 유닛 테스트를 먼저 작성하라.
2. **[Small Code] 점진적 해체:** 한 번에 전체 엔진을 통째로 바꾸지 마라. Phase 1(수학/세무 분리) -> Phase 2(인터페이스 정의) -> Phase 3(v11.1 전략 이관) 순서로, **매 커밋(Micro-Task)마다 시스템이 정상 구동하는 상태를 유지**해야 한다.
3. **[ZERO] Zero-Regression:** 각 Phase 완료 시 반드시 UI 서버를 구동하여 화면 렌더링을 확인하고, 백엔드 테스트(`pytest tests/`)가 0 Error로 통과해야 한다.
4. **[API-First] 백엔드/프론트엔드 완전 분리:** 프론트엔드는 언제든 다른 플랫폼(예: Android 앱, 데스크톱 앱)으로 교체되거나 확장될 수 있다. 백엔드는 프론트엔드의 화면 렌더링 로직이나 특정 UI에 종속되어서는 안 되며, 반드시 **독립적이고 범용적인 REST API 스펙(JSON)**만을 제공하여 완벽한 모듈 분리를 유지해야 한다.

---

## Phase 1: 핵심 로직 독립 라이브러리화 (Extraction of Commons)

**목표:** 전략에 종속되지 않는 순수 계산 로직을 `src/core/libs/` 하위로 분리한다. 이는 엔진의 의존성 방향을 단방향으로 정리하기 위함이다. **이 단계에서 새로 생성되는 모든 라이브러리 모듈(순수 함수, 클래스 등)은 예외 없이 해당 라이브러리만을 타겟으로 하는 전용 단위 테스트 코드(Unit Test)를 신규 작성해야 하며, 이 신규 테스트들이 100% 통과(Pass)함을 명시적으로 보장해야 한다. (기존 통합 테스트 통과에만 의존하는 것을 엄격히 금지한다.)**

### Task 1.1: `TaxLib-KR` 분리
*   **작업 내용:** `src/core/tax_engine.py` 로직을 `src/core/libs/tax_kr/` 패키지로 이동 및 리팩토링.
*   **세부 지침:**
    1.  `src/core/libs/tax_kr/calculator.py`를 생성한다.
    2.  기존 `TaxEngine` 클래스의 상태(상수들)를 설정 객체(Config)로 받도록 유지하되, 계산 로직(`calculate_income_tax`, `calculate_corp_tax`, `calculate_health_insurance`)을 전략의 상태에 의존하지 않는 독립된 순수 함수(또는 더 명확한 클래스)로 정제한다.
    3.  **TDD 검증 (신규 작성 필수):** 기존 `tests/test_tax_engine.py`를 수정하여 연동시키는 것에 만족하지 마라. 반드시 `tests/libs/test_tax_kr.py`를 새로 생성하여, 분리된 개별 순수 함수들의 모든 엣지 케이스를 커버하는 전용 테스트 코드를 작성하고 100% 통과시켜라.

### Task 1.2: `Finance-Math` 분리
*   **작업 내용:** `ProjectionEngine` 내부에 흩어져 있는 복리 계산, 배당 성장에 관련된 수학 함수들을 분리한다.
*   **세부 지침:**
    1.  `src/core/libs/finance_math/returns.py`를 생성한다.
    2.  `_monthly_return_components`(Compound PA 변환 수식), 배당 Run-rate 성장 로직 등을 순수 함수형으로 추출한다. (예: `def calculate_compound_monthly_pa(annual_pa: float) -> float:`)
    3.  **TDD 검증 (신규 작성 필수):** 기존 통합 테스트의 통과를 넘어, `tests/libs/test_finance_math.py`를 신규 생성하여 독립된 수학 라이브러리 각각에 대한 입력/출력 무결성 전용 테스트를 작성하고 100% 통과시켜라.

---

## Phase 2: 코어 시뮬레이션 루프 및 Base Strategy 인터페이스 정의

**목표:** '시간을 흐르게 하는 엔진(Physics)'과 '전략의 의사결정(Strategy)'을 완벽히 분리한다.

### Task 2.1: `BaseStrategy` 추상 클래스 작성
*   **파일 경로:** `src/strategies/base_strategy.py`
*   **세부 지침:**
    *   모든 자산 운용 전략(플러그인)이 반드시 구현해야 할 인터페이스를 파이썬 `abc.ABC`를 사용하여 정의한다.
    *   **필수 인터페이스 초안:**
        *   `initialize_assets(initial_assets, params) -> Dict`: 초기 자본 배치
        *   `calculate_monthly_cashflow_needs(...) -> float`: 당월 필요 현금흐름 산출
        *   `execute_monthly_rebalance(assets, month, year, ...) -> tuple`: 정기 리밸런싱, 인출, 세금 납부 실행
        *   `assess_stress_status(...) -> tuple`: 시장 스트레스/크래시 상태 평가 및 부스트 로직 결정

### Task 2.2: `SimulationRunner` 코어 루프 작성
*   **파일 경로:** `src/core/projection_core.py`
*   **세부 지침:**
    *   기존 `ProjectionEngine`의 `_execute_loop`를 기반으로 하되, 5월/8월/11월 같은 'v11.1에 하드코딩된 특정 달(Month) 종속 로직'을 완전히 제거한다.
    *   대신, 매월 루프 안에서 주입받은 `BaseStrategy` 인스턴스의 메서드(예: `strategy.execute_monthly_rebalance(...)`)만 호출하여 상태를 업데이트하도록 뼈대를 재구축한다.

---

## Phase 3: OS v11.1 전략의 Sandboxing (가장 중요)

**목표:** 구버전 `ProjectionEngine`에 얽혀있던 로직 전체를 `os_v11_1` 전략 플러그인 폴더로 안전하게 이관한다.

### Task 3.1: `OS_v11_1_Strategy` 구현
*   **파일 경로:** `src/strategies/os_v11_1/engine.py`
*   **세부 지침:**
    *   `BaseStrategy`를 상속받아 구현한다.
    *   기존 `_run_may_review`, `_run_november_rebalance`, `_transfer_from_sequence` 등 v11.1 고유의 복잡한 5개 카테고리 자산 이동 알고리즘과 SGOV 타겟 개월 수 로직을 모두 이 클래스 내부로 옮긴다.
    *   `CATEGORY_ORDER` (5종) 상수 역시 글로벌 코어가 아닌 이 전략 클래스 내부의 스펙으로 한정(Encapsulation)시킨다.

### Task 3.2: 기존 ProjectionEngine 대체 및 회귀 방지
*   **세부 지침:**
    *   `src/backend/main.py`의 `/api/retirement/simulate` 엔드포인트 로직을 수정한다. 
    *   요청받은 `strategy_id`에 따라 전략 객체를 인스턴스화하고, 이를 `SimulationRunner`에 주입하여 실행하도록 연결한다. (초기 단계에서는 무조건 `os_v11_1`을 주입)
    *   **TDD 검증 (CRITICAL):** 기존 `tests/test_retirement_os_v11_1_engine.py`의 모든 테스트가 새로운 'Runner + Strategy' 구조 위에서도 단 1개의 실패 없이 동일한 결과값으로 통과해야 한다. 이 단계의 테스트 통과가 리팩토링 성공의 절대적 증거다.

---

## Phase 4: 전략별 포트폴리오 및 카테고리 분리 (Backend Data Layer)

**목표:** 글로벌하게 하나로 묶여 관리되던 포트폴리오/마스터 데이터를 '전략(Strategy)' 단위로 격리(Scope)한다.

### Task 4.1: 데이터 스키마 및 API 재설계
*   **파일 경로:** `src/backend/api.py` (`DividendBackend`)
*   **세부 지침:**
    *   `master_portfolios.json`과 `portfolios.json` 내부 레코드 구조를 변경하여, 각 포트폴리오가 자신이 속한 `strategy_id` (예: `os_v11_1`) 필드를 갖도록 설계한다.
    *   기존 API (`/api/portfolios` 등)는 `strategy_id`를 쿼리 파라미터로 받아 해당 전략에 속한 포트폴리오만 CRUD 하도록 필터링 로직을 추가한다.

### Task 4.2: 백엔드 자동 마이그레이션 로직
*   **세부 지침:**
    *   서버 시작 시 기존 데이터(strategy_id 필드가 없는 레거시 데이터)를 로드할 때, 백엔드가 자동으로 `strategy_id = 'os_v11_1'`을 부여하여 저장하도록 마이그레이션 코드를 작성한다. 데이터 유실을 완벽히 방지하라.

---

## Phase 5: 전략별 동적 UI 구성 (Dynamic Frontend)

**목표:** 프론트엔드가 하드코딩된 입력 폼을 버리고, 선택된 전략의 스키마에 맞춰 화면을 동적으로 렌더링하도록 변경한다.

### Task 5.1: 전략 Schema 명세 정의
*   **파일 경로:** `src/strategies/os_v11_1/schema.json`
*   **세부 지침:**
    *   v11.1 전략이 요구하는 고유 UI 파라미터 명세(예: SGOV Target Months = 타입: Number, 기본값: 30)를 JSON 구조로 명확히 정의한다.
    *   백엔드에 `/api/strategies/{id}/schema` 엔드포인트를 추가하여 프론트엔드가 이 JSON을 요청할 수 있게 한다.

### Task 5.2: UI 컴포넌트 리팩토링
*   **파일 경로:** `src/frontend/src/components/SettingsTab.tsx`, `RetirementTab.tsx`
*   **세부 지침:**
    *   기존에 React 컴포넌트에 하드코딩되어 있던 Strategy Rules 입력 폼(SGOV Target, Bond Floor 등)을 제거한다.
    *   대신, API로 받아온 `schema.json`을 해석하여 동적 입력 폼(Dynamic Form)을 그려내는 범용 컴포넌트(`DynamicStrategySettings.tsx` 등)를 개발한다.
    *   **Visual Debugging:** 동적 화면 렌더링 시 기존 플랫폼의 폰트 사이즈(최소 11px) 및 타이포그래피 표준이 깨지지 않는지 브라우저를 띄워 육안으로 철저히 검증하라.

---

## 🎯 최종 마스터 승인 조건 (Definition of Done)
1. 백엔드의 `pytest tests/` 결과가 100% 통과(Green) 상태인가?
2. 프론트엔드 E2E 테스트(`npx playwright test`)가 모두 통과되었는가?
3. 새로운 더미 전략(예: `strategies/custom_mock_v1/`)을 빈 껍데기로 하나 추가했을 때, 기존 `os_v11_1`의 시뮬레이션 결과에 1원 단위의 오차도 발생하지 않음이 증명되었는가? (완벽한 Sandboxing 증명)