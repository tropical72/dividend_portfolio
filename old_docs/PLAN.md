# Project Plan & Progress

## 1. 완료된 작업 (Completed Tasks)
*   **[Setup] 프로젝트 환경 복구**
    *   내용: `src` 패키지 구조 정상화 및 실행 환경 구축.
    *   Commit: (이전 기록 생략)
*   **[Watchlist] 데이터 그리드 및 커스텀 메뉴 구현**
    *   내용: MDDataTable 연동, 정렬(Sort) 및 페이지 크기(Show) 메뉴 구현.
    *   Commit: (이전 기록 생략)
*   **[Test] E2E UI 테스트 환경 구축**
    *   내용: pytest 기반 Kivy UI 자동화 테스트 기초 설계 및 4개 케이스 통과.
    *   Commit: (이전 기록 생략)

## 2. 진행 중인 작업 (In Progress)
### Task 0: UX 개선 - 비동기 데이터 로딩
*   [ ] `add_stock` 시 UI 프리징 방지를 위한 Threading 도입
*   [ ] 로딩 중 상태를 표시하는 Spinner 또는 Progress 표시 (Optional)
*   [ ] 네트워크 타임아웃 처리 강화

### Task 1: 포트폴리오 관리 (Portfolio Tab) 구현
*   [ ] **1.1 Backend 데이터 구조 설계:** `portfolios.json` 스키마 정의 및 CRUD 함수 추가
*   [ ] **1.2 UI 레이아웃 구성:** 3가지 카테고리별 아코디언 또는 리스트 뷰 배치
*   [ ] **1.3 종목 추가 UX:** Watchlist 선택 항목을 포트폴리오로 복사하는 기능
*   [ ] **1.4 실시간 계산 로직:** 수량/단가 입력 시 비중 및 예상 배당금 자동 계산
*   [ ] **1.5 검증 로직:** 비중 100% 초과 시 경고 UI 구현

## 3. 예정된 작업 (Backlog)
*   [ ] 실시간 USD/KRW 환율 수집 (yfinance)
*   [ ] 포트폴리오 자산 통화 환산 기능

### Task 3: AI Advisor (Gemini API)
*   [ ] Gemini API 연동 모듈 작성
*   [ ] 포트폴리오 분석 및 조언 프롬프트 엔지니어링

---
*마지막 업데이트: 2026-02-16*
