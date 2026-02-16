# Test: Analysis & Graph (03)

## [Auto] 자동화 테스트 (pytest / Playwright)

### [Backend API Test]
- **[TEST-SIM-BE-01] Historical 로직 (REQ-SIM-03.2):** 지급 월 마지막 배당액 추출 무결성 검증.
- **[TEST-SIM-BE-02] 데이터 정합성 (REQ-SIM-03.1):** 테이블 총계와 그래프 시계열 데이터 합계 일치 확인.

### [Frontend E2E Test]
- **[TEST-SIM-FE-01] 시각적 회귀 (REQ-SIM-01):** 그래프 렌더링 기준점(Baseline) 비교.
- **[TEST-SIM-FE-02] 모드 동기화 (REQ-SIM-02.4):** 탭 간 계산 방식 상태 공유 확인.
- **[TEST-SIM-FE-03] 통화 2줄 표시 (REQ-SIM-04.2):** 분석 테이블 내 원화/달러가 상하로 나뉘어 표시되는가?

## [Manual/UX] 수동 테스트
- **[UX-SIM-01] 그래프 가독성:** 막대 상단 숫자가 Y축 마진 부족으로 잘리지 않는가? (REQ-SIM-01.3)
- **[UX-SIM-02] 스플릿터 조절:** 리스트와 그래프 사이 경계선 드래그 동작 확인.
- **[UX-SIM-03] 그래프 현지화 (REQ-SIM-01.2):** 축 레이블(월) 한글 표시 및 천원 단위 단위 변환 확인.
- **[UX-SIM-04] 수치-시뮬레이션 일치:** 테이블의 월별 수치와 그래프의 막대 높이가 시각적으로 일치하는가?
