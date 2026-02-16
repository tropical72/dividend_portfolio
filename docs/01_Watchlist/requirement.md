# Requirement: Watchlist (01)

## [REQ-WCH-01] 종목 추가 및 관리
- **[REQ-WCH-01.1] 추가 방식:** 티커(Ticker) 입력 및 국가(US/KR) 선택 후 'Add' 버튼 또는 'Enter' 키로 추가.
- **[REQ-WCH-01.2] 컨텍스트 메뉴:** 테이블에서 다중 종목 선택 후 우클릭 시 '포트폴리오에 추가' 메뉴 노출.
- **[REQ-WCH-01.3] 중복 방지:** 이미 등록된 티커 추가 시 경고 알림 및 추가 차단.
- **[REQ-WCH-01.4] 유효성 검사:** 존재하지 않는 티커 등 조회 실패 시 경고 메시지 표시 및 목록 제외.
- **[REQ-WCH-01.5] 영속성:** 프로그램 종료 후 재시작 시에도 티커 및 국가 정보 유지 ([REQ-SYS-03.1] 참조).

## [REQ-WCH-02] 사용자 경험 (UX) 개선
- **[REQ-WCH-02.1] 처리 중 표시:** 데이터 조회 중 'Add' 버튼 비활성화 및 "Adding..." 텍스트 변경, 마우스 커서 대기 상태 표시 ([GS-UX-01] 준수).
- **[REQ-WCH-02.2] 자동 스크롤:** 종목 추가 성공 시 해당 항목이 보이도록 테이블 자동 스크롤.
- **[REQ-WCH-02.3] 상태 알림:** 추가 성공 시 상태바(Status Bar)에 일시적 메시지 표시 ([GS-UI-02] 준수).
- **[REQ-WCH-02.4] 삭제 확인:** 종목 삭제 시 사용자 확인 대화상자(Confirm Dialog) 표시.
- **[REQ-WCH-02.5] 데이터 무결성 보호:** 포트폴리오(저장된 것 및 현재 탭 구성 중인 것 포함)에 포함된 종목은 삭제를 방지하고 경고 표시.

## [REQ-WCH-03] 데이터 표시 및 기능
- **[REQ-WCH-03.1] 필수 컬럼:** Ticker, Name(항상 동시 표시), Price, Annual Yield(%), 1-Yr Total Return(%), Last Ex-Div Date, Last Dividend Amount, Last Div Yield(%), Past Avg. Monthly Div.
- **[REQ-WCH-03.2] 배당 주기 표시:** 종목별 배당 주기(월/분기/반기/연) 및 지급 월 표시 컬럼 추가.
- **[REQ-WCH-03.3] 테이블 기능:** 모든 데이터는 읽기 전용(Read-only)이며, 헤더 클릭 시 정렬 기능 제공.
- **[REQ-WCH-03.4] 금액 포맷팅:** 모든 주가 및 배당금은 [GS-UI-01] 표준 포맷을 따름.

## Related Files
- `src/frontend/main.py` (Watchlist 테이블 UI)
- `src/backend/api.py` (종목 추가/삭제 로직)
- `src/backend/data_provider.py` (yfinance/DART 데이터 수집)
