# Requirement: System Core (00)

## [REQ-SYS-01] 웹 기반 아키텍처 전환
- **[REQ-SYS-01.1] FastAPI 백엔드:** 기존 Python 로직을 REST API 엔드포인트로 노출.
- **[REQ-SYS-01.2] React 프론트엔드:** 최신 웹 표준 기반의 UI 컴포넌트 라이브러리 구축.
- **[REQ-SYS-01.3] pywebview 쉘:** 데스크톱 앱 실행 시 Python 런타임과 웹뷰를 결합하여 단일 창으로 실행.

## [REQ-SYS-02] 테스트 자동화 인프라
- **[REQ-SYS-02.1] Playwright 통합:** 브라우저 자동화를 통한 E2E 시나리오 검증 환경 구축.
- **[REQ-SYS-02.2] Mocking 서버:** 테스트 환경에서 외부 API(yfinance 등)를 대체하는 가짜 데이터 서버/핸들러 구현.
- **[REQ-SYS-02.3] 테스트 자동 실행:** 코드 변경 시 Gemini CLI가 직접 테스트 명령어를 실행하고 결과를 분석하는 워크플로우 지원.
- **[REQ-SYS-02.4] E2E 상태 격리:** 실제 백엔드와 연결되는 Playwright 테스트는 실행 전 백엔드 상태 snapshot을 저장하고, 종료 후 원상 복구하여 사용자 데이터와 테스트 간 상호 오염을 방지해야 한다.

## [REQ-SYS-03] 설정 및 영속성 (Web 환경)
- **[REQ-SYS-03.1] 로컬 스토리지:** 브라우저의 LocalStorage가 아닌, 백엔드(Python)를 통한 파일 저장 방식 유지.
- **[REQ-SYS-03.2] API 키 보안:** 클라이언트(JS)에 키를 노출하지 않고 백엔드에서만 처리 및 관리.

## [REQ-SYS-04] API 키 및 사용자 설정 관리 UI
- **[REQ-SYS-04.1] 설정 전용 탭:** 사용자가 API 키(OpenDart, Gemini 등)를 입력하고 수정할 수 있는 전용 UI 탭 제공.
- **[REQ-SYS-04.2] 보안 처리:** 입력된 API 키는 UI 노출 시 마스킹(Masking) 처리(예: `1f8f...fd1`) 지원.
- **[REQ-SYS-04.3] 즉시 반영:** API 키 저장 시 백엔드 엔진(Data Provider 등)에 즉시 반영되어 재시작 없이 데이터 수집 가능.
- **[REQ-SYS-04.4] 유효성 검사:** 키 저장 시 간단한 연결 테스트를 통해 유효성 여부 피드백 제공.

## [REQ-SYS-05] UI 다국어 지원 (Korean / English)
- **[REQ-SYS-05.1] 언어 설정 저장:** 사용자는 `Settings` 화면에서 UI 언어를 `ko` 또는 `en`으로 선택할 수 있어야 하며, 선택값은 백엔드를 통해 영속 저장되어 재실행 후에도 유지되어야 한다.
- **[REQ-SYS-05.2] 키 기반 번역 레이어:** 프론트엔드의 사용자 노출 문자열은 하드코딩 문장 대신 번역 키 기반으로 관리되어야 하며, 최소 한국어/영어 번역 사전을 제공해야 한다.
- **[REQ-SYS-05.3] 즉시 전환:** 언어 변경 시 앱 재시작 없이 현재 열린 화면의 텍스트가 즉시 선택 언어로 반영되어야 한다.
- **[REQ-SYS-05.4] 핵심 화면 우선 적용:** 1차 적용 범위는 전역 네비게이션, `Retirement`, `Settings`, 공통 에러/빈 상태 메시지로 정의한다.
- **[REQ-SYS-05.5] 혼용 방지:** 하나의 화면에서 한국어/영어가 임의로 섞여 노출되지 않아야 하며, 번역 키 누락 시에는 정의된 fallback 언어로 일관되게 처리되어야 한다.

## Related Files
- `src/backend/server.py` (FastAPI Entry Point)
- `src/frontend/src/` (React Source)
- `tests/conftest.py` (Pytest/Playwright Setup)
