# Test Spec: Portfolio & Integration

## 1. Backend Integration Tests (Pytest)
- **[TEST-API-01] 포트폴리오 무결성:**
    - 포트폴리오에 AAPL이 저장된 상태에서 `DELETE /api/watchlist/AAPL` 호출 시 `success: False` 및 에러 메시지 확인.
- **[TEST-API-02] TTM/Forward 로직:**
    - 동일 종목에 대해 두 모드 호출 시, 산출된 12개월 배당 분포의 수치 차이 검증.
- **[TEST-API-03] 통화 변환 정확도:**
    - KRW 기반 포트폴리오의 수입 합계가 실시간 환율을 통해 USD로 오차 범위(0.1%) 내에서 변환되는지 확인.

## 2. E2E UX Tests (Playwright)
- **[TEST-UX-01] Watchlist -> Portfolio 이관:**
    - 2개 종목 선택 -> 'Add to Portfolio' -> 'Fixed Income' 카테고리 선택 -> Portfolio 탭 이동 -> 해당 섹션에 종목 존재 확인.
- **[TEST-UX-02] 비중 100% 검증:**
    - 비중 50% 입력 -> '저장' 클릭 -> 경고 팝업 노출 및 저장 요청 차단 확인.
    - 비중 100% 수정 -> '저장' 성공 확인.
- **[TEST-UX-03] 시뮬레이션 인터랙션:**
    - USD 입력창에 '1000' 입력 -> KRW 입력창에 환율 적용된 값 자동 입력 확인.
    - 반대로 KRW 입력 시 USD 갱신 확인.
- **[TEST-UX-04] 비교 탭 차트 연동:**
    - 포트폴리오 A, B 저장 -> 비교 탭 이동 -> A, B 체크박스 선택 -> 막대 차트에 두 데이터 시리즈 렌더링 확인.
- **[TEST-UX-05] 새로만들기 및 로드:**
    - '새로만들기' 클릭 시 입력 폼 초기화 확인.
    - 리스트에서 'Load' 클릭 시 탭 전환 및 데이터 복구 확인.
