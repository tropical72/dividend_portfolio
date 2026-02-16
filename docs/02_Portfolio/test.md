# Test: Portfolio (02)

## [Auto] 자동화 테스트 (pytest / Playwright)

### [Backend API Test]
- **[TEST-PRT-BE-01] 저장 구조 (REQ-PRT-04.1):** portfolios.json 내 카테고리 계층 구조 확인.
- **[TEST-PRT-BE-02] 계산 엔진 (REQ-PRT-03.4):** 비중별 투자금 및 배당금 산출 정확성(소수점 2자리).
- **[TEST-PRT-BE-03] 환율 변환 (REQ-PRT-03.1):** USD/KRW 상호 환산 로직 및 오차 범위 확인.

### [Frontend E2E Test]
- **[TEST-PRT-FE-01] 비중 검증 UI (REQ-PRT-03.3):** 100% 미달/초과 시 Red, 100% 시 Green 전환 확인.
- **[TEST-PRT-FE-02] 탭 전환/보존 (REQ-PRT-04.4):** 이동 후 복귀 시 입력 데이터 및 펼침 상태 유지 확인.
- **[TEST-PRT-FE-03] 종목 제거:** 카테고리 내 삭제 버튼 동작 확인.
- **[TEST-PRT-FE-04] 비교 탭 그룹화 (REQ-PRT-04.2):** 비교 화면에서 종목들이 카테고리별로 묶여서 노출되는가?

## [Manual/UX] 수동 테스트
- **[UX-PRT-01] 카테고리 시각 구분:** 3단 구성의 시각적 명확성 확인.
- **[UX-PRT-02] 금액 입력 (GS-UI-01):** 통화별 자동 포맷팅(콤마 등) 확인.
- **[UX-PRT-03] 로드 자동 전환 (REQ-PRT-04.3):** 비교에서 로드 시 Portfolio 탭으로 자동 이동 확인.
- **[UX-PRT-04] 비중 입력 제한 (REQ-PRT-03.2):** 숫자만 입력 가능하며 소수점 첫째자리까지만 허용되는가?
