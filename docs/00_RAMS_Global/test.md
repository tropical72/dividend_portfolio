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
- **[TEST-SYS-2.2.2] Playwright 백엔드 상태 복구**
    - 시나리오: 실제 백엔드와 연결되는 E2E 시작 전에 `/api/test/state`로 상태 snapshot을 저장하고, 테스트 종료 후 restore 호출 시 포트폴리오/마스터 전략/설정/은퇴 설정이 원래 상태로 복구되는가?

- **[TEST-SYS-2.3.1] 설정 UI 및 API 키 저장**
    - 시나리오 1: 사용자가 설정 탭에서 OpenDart API 키 입력 후 'Save' 클릭 시 `settings.json`에 기록되는가?
    - 시나리오 2: 저장된 키가 UI에서 마스킹(`****`) 처리되어 표시되는가?
    - 시나리오 3: 잘못된 키 입력 시 API 유효성 검사 실패 메시지가 노출되는가?

## [Manual/UX] 수동 테스트
- **[UX-SYS-03] 통합 실행 스크립트 (run_dev.py) 검증**
    - 체크리스트:
        - [ ] 스크립트 실행 시 두 개의 프로세스가 정상적으로 뜨는가?
        - [ ] 브라우저가 자동으로 `localhost:5173`을 여는가?
        - [ ] `Ctrl+C` 입력 시 모든 프로세스가 정상 종료되는가?

## [Quality Gate] 커밋 전 코드품질 검증 [NEW]
- **[TEST-SYS-QG-01] Python 변경분 정적 분석:**
    - 시나리오: Python 파일 수정이 포함된 기능은 커밋 전 `PYTHONPATH=. .venv/bin/ruff check <changed_python_files>`와 `PYTHONPATH=. .venv/bin/black --check <changed_python_files>`를 모두 통과해야 한다.
- **[TEST-SYS-QG-02] Frontend 변경분 정적 분석 및 스타일 검증:**
    - 시나리오: 프론트엔드 수정이 포함된 기능은 커밋 전 `npm run lint`, `npm run build`, `npx prettier --check <changed_frontend_files>`를 모두 통과해야 한다.
- **[TEST-SYS-QG-03] 기능 단위 자동 검증:**
    - 시나리오: 각 feature는 변경 범위에 해당하는 `pytest` 및 `Playwright` 시나리오를 모두 통과해야 한다.
- **[TEST-SYS-QG-04] 전역 타입/포맷 부채 추적:**
    - 시나리오: 저장소 전체 기준 `mypy`, `black --check src tests` 등 전역 검사가 실패할 경우, 해당 오류는 별도 전역 태스크로 추적되며 신규 feature 커밋에서 오류 개수가 증가하지 않아야 한다.
