# Test: System Core (00)

## [Auto] 자동화 테스트 (pytest / Playwright)

### [Phase 1: Backend]
- **[TEST-SYS-1.1.1] 서버 가용성**
    - 시나리오: `/health` 호출 시 `{ "status": "ok" }` 반환 여부.
- **[TEST-SYS-1.2.1] API Mocking 격리**
    - 시나리오: 네트워크를 차단한 상태에서 `yfinance` 요청 시 Mock 데이터가 반환되는가?
- **[TEST-SYS-1.3.1] 데이터 영속성 API**
    - 시나리오: API를 통해 종목 추가 후, `test_watchlist.json` 파일에 물리적으로 기록되는가?

### [Phase 2: Frontend]
- **[TEST-SYS-2.1.1] 라우팅 및 레이아웃**
    - 시나리오: 각 탭 버튼 클릭 시 URL 또는 화면 컨텐츠가 정확히 전환되는가?
- **[TEST-SYS-2.2.1] Playwright Mocking 동작**
    - 시나리오: 브라우저에서 나가는 API 요청이 가로채어져 Mock 데이터가 화면에 표시되는가?

## [Manual/UX] 수동 테스트
- **[UX-SYS-01] 초기 기동 속도**
    - 체크리스트: 앱 실행 후 첫 화면이 뜨기까지 2초 이내인가?
- **[UX-SYS-02] 다크모드/라이트모드 일관성**
    - 체크리스트: Tailwind CSS 테마가 모든 컴포넌트에 균일하게 적용되는가?
