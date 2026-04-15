# Test Cases: Portfolio Manager

## 1. 테스트 시나리오

### [TEST-PRT-01] 전략 카테고리 편집기 검증 [NEW]
- **[TEST-PRT-01.1] Corporate 4카테고리 렌더링:**
    - Corporate 계좌 선택 시 `SGOV Buffer`, `High Income`, `Dividend Growth`, `Growth Engine` 4개 섹션이 렌더링되는지 확인한다.
- **[TEST-PRT-01.2] Pension 4카테고리 렌더링:**
    - Pension 계좌 선택 시 `SGOV Buffer`, `Bond Buffer`, `Dividend Growth`, `Growth Engine` 4개 섹션이 렌더링되는지 확인한다.
- **[TEST-PRT-01.3] 카테고리 설명 표시:**
    - 각 섹션에 역할 설명과 매도 우선순위 안내가 노출되는지 확인한다.
- **[TEST-PRT-01.4] 저장/재로드 정합성:**
    - 4개 카테고리에 배치한 종목과 비중이 저장 후 재로드 시 동일하게 복원되는지 확인한다.
- **[TEST-PRT-01.5] 레거시 마이그레이션:**
    - 기존 3단 카테고리 포트폴리오를 열 때 계좌 타입 기준의 4단 전략 카테고리로 안전하게 변환되는지 확인한다.

### [TEST-PRT-07] UI 가독성 및 Corporate 명칭 통일 검증
- **[TEST-PRT-07.1] 내비게이션 렌더링:**
    - 'Portfolio Designer' 버튼과 'Manage & Compare' 버튼의 폰트 크기가 `14px`(text-sm) 이상으로 렌더링되며, 클릭 시 시각적 반응이 확실한지 검증한다.
- **[TEST-PRT-07.2] 계좌 타입 스위처 검증:**
    - 기존 'Personal' 대신 'Corporate' 버튼이 표시되는지 확인.
    - 버튼 크기가 기존(`10px`)보다 큰 최소 `14px`(text-sm) 이상으로 렌더링되는지 검증.
- **[TEST-PRT-07.3] 데이터 무결성 검증:**
    - Corporate 계좌 타입으로 새로운 포트폴리오 저장 시 API를 통해 데이터베이스에 `account_type: "Corporate"`로 저장되는지 확인.
- **[TEST-PRT-07.4] 전략 중심 정보 구조 검증:**
    - 4카테고리 편집기에서 각 카테고리의 역할/우선순위가 시각적으로 구분되며, 폰트 크기가 11px 미만으로 내려가지 않는지 검증한다.

## 2. Feature Completion Gate [NEW]
- Portfolio Designer 관련 Frontend 변경은 커밋 전 `npm run lint`, `npm run build`, `npx prettier --check <changed_frontend_files>`를 통과해야 한다.
- Portfolio Designer 관련 Backend 변경은 커밋 전 `PYTHONPATH=. .venv/bin/ruff check <changed_python_files>`와 `PYTHONPATH=. .venv/bin/black --check <changed_python_files>`를 통과해야 한다.
- 기능 완료 증명은 관련 `pytest`와 `Playwright` 시나리오 통과로 마감한다.
