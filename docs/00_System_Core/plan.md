# Plan: System Core (00)

## 🔄 진행 현황 (Progress)

- **[Task 0.1] 아키텍처 재설계 및 문서화**
  - 상태: ✅ 완료 (2026-02-16)
  - 내용: FastAPI + React 기반 SDD 문서 업데이트 및 테스트 표준 수립.
- **[Task 0.2] 환경 정리 및 레거시 아카이브**
  - 상태: ✅ 완료 (2026-02-16)
  - 내용: 기존 Kivy 코드를 `src/frontend_legacy`로 이동 및 구조 정의 완료.

### [Phase 1] Backend API 전환 (FastAPI)
- **Task 1.1: FastAPI 기초 인프라**
    - [x] **1.1.1** 서버 스캐폴딩 및 기동 테스트 (`/health`)
    - [ ] **1.1.2** FastAPI와 기존 `DividendBackend` 로직 연결 기초
- **Task 1.2: Mocking 및 데이터 API**
    - [ ] **1.2.1** Pytest 기반 외부 API Mocking 환경 구축 (yfinance 등)
    - [ ] **1.2.2** 주식 정보 조회 API 엔드포인트 구현
- **Task 1.3: 영속성 및 설정 API**
    - [ ] **1.3.1** Watchlist 데이터 CRUD API 연동
    - [ ] **1.3.2** 설정(Settings) 데이터 읽기/쓰기 API 연동

### [Phase 2] Frontend & Test 인프라 (React/Playwright)
- **Task 2.1: React 프로젝트 초기화**
    - [ ] **2.1.1** Vite + TS + Tailwind 스캐폴딩
    - [ ] **2.1.2** 전역 상태 관리 및 라우팅 구조(Tab 전환) 구축
- **Task 2.2: 자동화 테스트 환경**
    - [ ] **2.2.1** Playwright 연동 및 기초 E2E 시나리오 작성
    - [ ] **2.2.2** Playwright용 API Interceptor (Mocking) 유틸리티 구현

## 📅 향후 작업 일정 (Backlog)
- [ ] [SYS-04] pywebview를 이용한 데스크톱 패키징 (Phase 3)
