# Test Cases: Portfolio Manager

## 1. 테스트 시나리오

### [TEST-PRT-01] 전략 카테고리 편집기 검증 [NEW]

- **[TEST-PRT-01.1] Corporate 5카테고리 렌더링:**
  - Corporate 계좌 선택 시 `SGOV Buffer`, `Bond Buffer`, `High Income`, `Dividend Growth`, `Growth Engine` 5개 섹션이 렌더링되는지 확인한다.
- **[TEST-PRT-01.2] Pension 4카테고리 렌더링:**
  - Pension 계좌 선택 시 `SGOV Buffer`, `Bond Buffer`, `Dividend Growth`, `Growth Engine` 4개 섹션이 렌더링되는지 확인한다.
- **[TEST-PRT-01.3] 카테고리 설명 표시:**
  - 각 섹션에 역할 설명과 매도 우선순위 안내가 노출되는지 확인한다.
- **[TEST-PRT-01.4] 저장/재로드 정합성:**
  - 현재 계좌 타입에서 제공되는 카테고리에 배치한 종목과 비중이 저장 후 재로드 시 동일하게 복원되는지 확인한다.
- **[TEST-PRT-01.5] 레거시 마이그레이션:**
  - 기존 3단 카테고리 포트폴리오를 열 때 계좌 타입 기준의 4단 전략 카테고리로 안전하게 변환되는지 확인한다.
- **[TEST-PRT-01.6] 버퍼 개월 수 환산 입력:**
  - SGOV Buffer 또는 Bond Buffer 항목 추가/수정 시 개월 수를 입력하면 `개월 수 × 월 필요현금 ÷ 총 투자금 × 100`으로 비중(%)이 즉시 환산되는지 확인한다.
  - 환산된 비중이 저장 payload의 `weight` 값으로 반영되는지 확인한다.
- **[TEST-PRT-03.1.1] 계좌별 설정 투자금 기준:**
  - Portfolio Designer 진입 시 Corporate 선택 상태에서는 `corp_params.initial_investment`가 KRW 입력값으로 표시되는지 확인한다.
  - Pension으로 전환하면 `pension_params.initial_investment + severance_reserve + other_reserve`가 KRW 입력값으로 표시되는지 확인한다.
  - USD 필드는 사용자가 직접 입력하는 기준값이 아니라 현재 환율 기준 환산값으로 표시되는지 확인한다.
- **[TEST-PRT-03.6] 설계 화면 월별 배당 그래프:**
  - Portfolio Designer에서 현재 종목의 `payment_months`와 `last_div_amount` 기준 월별 배당금 막대 그래프가 렌더링되는지 확인한다.
  - 투자금 또는 종목 비중을 변경하면 그래프 금액이 같은 계산식으로 갱신되는지 확인한다.
  - 그래프 표시 통화 기본값은 KRW이며, USD로 전환하면 축/툴팁 금액도 USD 기준으로 표시되는지 확인한다.
- **[TEST-PRT-04.2] 저장된 개별 포트폴리오 이름 변경:**
  - `Manage & Compare` 리스트에서 저장된 포트폴리오 이름을 수정 후 저장하면 즉시 카드 제목과 API 응답에 반영되는지 확인한다.
- **[TEST-PRT-06.4.1] 마스터 전략 월별 배당 비교:**
  - `Manage & Compare`에서 복수 마스터 전략을 선택하면 기존 월별 배당 비교 그래프에 각 마스터 전략이 별도 series로 표시되는지 확인한다.
  - 마스터 전략의 월별 금액은 연결된 법인/연금 포트폴리오 금액의 합계와 일치해야 한다.
  - 마스터 전략과 저장된 개별 포트폴리오를 동시에 선택해도 같은 그래프에서 함께 비교되어야 한다.
  - 그래프 표시 통화 기본값은 KRW이며, USD 전환은 전역 투자금 입력 통화와 독립적으로 동작해야 한다.

### [TEST-PRT-07] UI 가독성 및 Corporate 명칭 통일 검증

- **[TEST-PRT-07.1] 내비게이션 렌더링:**
  - 'Portfolio Designer' 버튼과 'Manage & Compare' 버튼의 폰트 크기가 `14px`(text-sm) 이상으로 렌더링되며, 클릭 시 시각적 반응이 확실한지 검증한다.
- **[TEST-PRT-07.2] 계좌 타입 스위처 검증:**
  - 기존 'Personal' 대신 'Corporate' 버튼이 표시되는지 확인.
  - 버튼 크기가 기존(`10px`)보다 큰 최소 `14px`(text-sm) 이상으로 렌더링되는지 검증.
- **[TEST-PRT-07.3] 데이터 무결성 검증:**
  - Corporate 계좌 타입으로 새로운 포트폴리오 저장 시 API를 통해 데이터베이스에 `account_type: "Corporate"`로 저장되는지 확인.
- **[TEST-PRT-07.4] 전략 중심 정보 구조 검증:**
  - 카테고리 편집기에서 각 카테고리의 역할/우선순위가 시각적으로 구분되며, 폰트 크기가 11px 미만으로 내려가지 않는지 검증한다.
- **[TEST-PRT-09.4] 저장된 마스터 전략 이름 변경:**
  - `Manage & Compare` 리스트에서 저장된 마스터 전략 이름을 수정 후 저장하면 즉시 카드 제목과 API 응답에 반영되는지 확인한다.

- **[TEST-PRT-10] 개인 일반계좌 통합 [NEW]:**
  - Portfolio Designer에서 Personal 계좌 타입을 선택하고 5개 카테고리 포트폴리오를 저장/재로드한다.
  - Personal 선택 시 personal_account_params.initial_investment가 설계 투자금 기준으로 적용된다.
  - 마스터 전략에 personal_id를 저장하고 삭제 보호, 가중 DY/TR, 월별 배당 합계에 포함한다.
  - Retirement 결과의 초기값, 월별 차트, 상세표에 personal_balance가 표시되고 total_net_worth에 포함된다.

## 2. Feature Completion Gate [NEW]

- Portfolio Designer 관련 Frontend 변경은 커밋 전 `npm run lint`, `npm run build`, `npx prettier --check <changed_frontend_files>`를 통과해야 한다.
- Portfolio Designer 관련 Backend 변경은 커밋 전 `PYTHONPATH=. .venv/bin/ruff check <changed_python_files>`와 `PYTHONPATH=. .venv/bin/black --check <changed_python_files>`를 통과해야 한다.
- 기능 완료 증명은 관련 `pytest`와 `Playwright` 시나리오 통과로 마감한다.
