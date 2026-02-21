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

## [REQ-SYS-04] API 키 및 사용자 설정 관리 UI
- **[REQ-SYS-04.1] 설정 전용 탭:** 사용자가 API 키(OpenDart, Gemini 등)를 입력하고 수정할 수 있는 전용 UI 탭 제공.
- **[REQ-SYS-04.2] 보안 처리:** 입력된 API 키는 UI 노출 시 마스킹(Masking) 처리(예: `1f8f...fd1`) 지원.
- **[REQ-SYS-04.3] 즉시 반영:** API 키 저장 시 백엔드 엔진(Data Provider 등)에 즉시 반영되어 재시작 없이 데이터 수집 가능.
- **[REQ-SYS-04.4] 유효성 검사:** 키 저장 시 간단한 연결 테스트를 통해 유효성 여부 피드백 제공.

## Related Files
- `src/backend/server.py` (FastAPI Entry Point)
- `src/frontend/src/` (React Source)
- `tests/conftest.py` (Pytest/Playwright Setup)
