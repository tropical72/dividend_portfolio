# Requirement: System Core (00)

## [REQ-SYS-01] 웹 기반 아키텍처 전환
- **[REQ-SYS-01.1] FastAPI 백엔드:** 기존 Python 로직을 REST API 엔드포인트로 노출.
- **[REQ-SYS-01.2] React 프론트엔드:** 최신 웹 표준 기반의 UI 컴포넌트 라이브러리 구축.
- **[REQ-SYS-01.3] pywebview 쉘:** 데스크톱 앱 실행 시 Python 런타임과 웹뷰를 결합하여 단일 창으로 실행.

## [REQ-SYS-02] 테스트 자동화 인프라
- **[REQ-SYS-02.1] Playwright 통합:** 브라우저 자동화를 통한 E2E 시나리오 검증 환경 구축.
- **[REQ-SYS-02.2] Mocking 서버:** 테스트 환경에서 외부 API(yfinance 등)를 대체하는 가짜 데이터 서버/핸들러 구현.
- **[REQ-SYS-02.3] 테스트 자동 실행:** 코드 변경 시 Gemini CLI가 직접 테스트 명령어를 실행하고 결과를 분석하는 워크플로우 지원.

## [REQ-SYS-03] 설정 및 영속성 (Web 환경)
- **[REQ-SYS-03.1] 로컬 스토리지:** 브라우저의 LocalStorage가 아닌, 백엔드(Python)를 통한 파일 저장 방식 유지.
- **[REQ-SYS-03.2] API 키 보안:** 클라이언트(JS)에 키를 노출하지 않고 백엔드에서만 처리 및 관리.

## Related Files
- `src/backend/server.py` (FastAPI Entry Point)
- `src/frontend/src/` (React Source)
- `tests/conftest.py` (Pytest/Playwright Setup)
