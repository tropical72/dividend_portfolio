# Test: Watchlist (01)

## [Auto] 자동화 테스트 (pytest / Playwright)

### [Backend Test]
- **[TEST-WCH-1.1.1] 종목 추가 중복 체크**
    - 시나리오: 동일한 티커로 두 번 POST 요청 시 400 에러 및 메시지 반환 여부.
- **[TEST-WCH-1.2.2] 삭제 보호 로직**
    - 시나리오: 포트폴리오에 존재하는 종목 삭제 요청 시 실패 응답(403) 반환 여부.

### [Frontend E2E Test]
- **[TEST-WCH-2.1.1] 실시간 테이블 업데이트**
    - 시나리오: 'Add' 클릭 후 Mock API가 성공 응답을 주면 테이블에 즉시 행이 추가되는가?
- **[TEST-WCH-2.2.1] 로딩 상태 UI**
    - 시나리오: API 응답이 오기 전까지 버튼이 'disabled' 상태이며 텍스트가 바뀌는가?
- **[TEST-WCH-2.3.1] 필수 컬럼 노출 확인 (REQ-WCH-03.1)**
    - 시나리오: 테이블 헤더에 Ticker, Name, Price, Yield, Return, Ex-Div Date, Last Amount, Last Yield, Monthly Div 9개 항목이 모두 존재하는가?

## [Manual/UX] 수동 테스트
- [ ] 테이블 컬럼 폭이 다양한 해상도에서 적절히 유지되는가?
- [ ] 한국 종목(.KS) 자동 완성 시 시각적 어색함이 없는가?
