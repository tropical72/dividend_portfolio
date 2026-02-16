# Global Standards (GS)

본 문서는 프로젝트 전체에서 공통적으로 준수해야 하는 UI/UX, 데이터 처리 및 테스트 표준을 정의합니다.

## [GS-UI-01] 금액 표시 형식 (Currency Formatting)
- **원화(KRW):** 소수점 이하를 표시하지 않는 정수 형식 (예: 1,234,567).
- **그 외 통화(USD 등):** 소수점 2자리까지 표시 (예: 1,234.56).
- **공통:** 천 단위 구분 기호(,) 사용.

## [GS-TEST-01] 외부 API 격리 (Mocking)
- **원칙:** 테스트 실행 시 외부 네트워크 의존성(yfinance, Gemini API 등)을 완전히 차단한다.
- **Backend:** `pytest-respx` 또는 Mock 라이브러리를 사용하여 고정된 JSON 응답을 반환하도록 설정한다.
- **Frontend:** Playwright의 `page.route()`를 사용하여 브라우저에서 나가는 API 요청을 가로채고 Mock 데이터를 제공한다.

## [GS-TEST-02] 상태 격리 (State Isolation)
- **원칙:** 각 테스트 케이스는 독립적인 환경에서 실행되어야 하며, 이전 테스트의 데이터가 영향을 주지 않아야 한다.
- **테스트 DB:** 테스트 실행 시 `tests/tmp/` 하위에 임시 데이터 파일(`test_watchlist.json` 등)을 생성하여 사용한다.
- **Teardown:** 테스트 종료 후 임시 데이터는 반드시 삭제하거나 초기화한다.

## [GS-UX-01] 비동기 처리 및 로딩 표시
- 모든 네트워크 요청(FastAPI 호출 등)은 비동기적으로 처리한다.
- 작업 중에는 관련 버튼을 비활성화하고 "응답 생성 중..." 또는 Spinner 등을 통해 상태를 명확히 표시한다.

## [GS-ARCH-01] 통신 표준
- Frontend와 Backend는 RESTful API(JSON)를 통해서만 통신한다.
- 모든 API 응답은 일관된 형식(`{ "success": boolean, "data": ..., "message": ... }`)을 유지한다.
