# Plan: Watchlist (01)

## 🔄 진행 현황 (Progress)

### [Phase 1] Backend API 구현
- **Task 1.1: 종목 추가/조회 로직 API화**
    - [x] **1.1.1** `POST /api/watchlist` 구현 (중복 체크 및 유효성 검사 포함)
    - [x] **1.1.2** `GET /api/watchlist` 구현 (저장된 목록 반환)
- **Task 1.2: 종목 삭제 및 무결성 검사**
    - [x] **1.2.1** `DELETE /api/watchlist/{ticker}` 구현
    - [x] **1.2.2** 삭제 시 포트폴리오 포함 여부 체크 로직 추가

### [Phase 2] Frontend UI 구현
- **Task 2.1: Watchlist 테이블 및 입력창**
    - [x] **2.1.1** React 기반 데이터 테이블 (정렬 기능 포함) 구현
    - [x] **2.1.2** Ticker 입력 및 국가 선택 컴포넌트 구현
- **Task 2.2: UX 피드백 및 알림**
    - [x] **2.2.1** 추가 중 "Adding..." 상태 및 비동기 처리 UI 구현
    - [x] **2.2.2** 성공/실패 시 상태바 알림(Toast) 및 삭제 확인 팝업 구현

## 📅 향후 작업 일정 (Backlog)
- [ ] [WCH-03] 우클릭 컨텍스트 메뉴를 통한 포트폴리오 이관 기능
