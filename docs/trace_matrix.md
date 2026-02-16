# Traceability Matrix (Master Task List)

## 📊 진행 가이드 (TDD Protocol)
1. **Test Written (Red):** 구현은 `Pending`인데 테스트는 `Red`인 상태 -> 테스트 코드가 먼저 준비됨을 증명.
2. **Implementation Done:** 구현이 `Done`으로 바뀌고 테스트는 여전히 `Red`인 상태 -> 코드 작성 중.
3. **Verification (Pass):** 테스트가 `Pass`로 바뀌는 순간 -> 기능 완성.
4. **Final (Done):** 커밋 후 상태가 `Done`으로 완료 -> 전체 공정 종료.

| ID | 도메인 | 작업명 (Task) | 구현 | 테스트 | 상태 | Git Commit ID |
|:---|:---|:---|:---|:---|:---|:---|
| **[T-00-1.1]** | System | FastAPI 기초 인프라 및 /health API | Done | Pass | Done | 6bcff66 |
| **[T-00-1.2]** | System | Mocking 환경 및 주식 정보 조회 API | Done | Pass | Done | dc06bca |
| **[T-00-1.3]** | System | 영속성(Watchlist/Settings) CRUD API | Done | Pass | Done | c3145fc |
| **[T-00-2.1]** | System | React 프로젝트 초기화 및 레이아웃 | Done | Pass | Done | - |
| **[T-00-2.2]** | System | Playwright E2E 테스트 인프라 구축 | Done | Pass | Done | - |
| **[T-01-1.1]** | Watchlist | 종목 추가/조회 백엔드 로직 API화 | Pending | Pending | Pending | - |
| **[T-01-1.2]** | Watchlist | 종목 삭제 및 포트폴리오 무결성 체크 | Pending | Pending | Pending | - |
| **[T-01-2.1]** | Watchlist | React 기반 데이터 테이블 및 입력 UI | Pending | Pending | Pending | - |
| **[T-01-2.2]** | Watchlist | 추가 중 로딩 상태 및 알림/팝업 UX | Pending | Pending | Pending | - |
| **[T-02-1.1]** | Portfolio | 포트폴리오 CRUD 및 카테고리 API | Pending | Pending | Pending | - |
| **[T-02-1.2]** | Portfolio | 실시간 비중/통화 계산 엔진 API | Pending | Pending | Pending | - |
| **[T-02-2.1]** | Portfolio | 3단 카테고리 레이아웃 및 종목 관리 UI | Pending | Pending | Pending | - |
| **[T-02-2.2]** | Portfolio | 비중 입력 및 100% 검증 색상 피드백 | Pending | Pending | Pending | - |
| **[T-03-1.1]** | Analysis | 시뮬레이션 엔진(Historical/Yield) API | Pending | Pending | Pending | - |
| **[T-03-2.1]** | Analysis | Recharts 기반 월별 배당 막대 그래프 | Pending | Pending | Pending | - |
| **[T-03-2.2]** | Analysis | 계산 방식 선택 및 상태 동기화 UI | Pending | Pending | Pending | - |
| **[T-04-1.1]** | AI Advisor | Gemini/ChatGPT API 어댑터 구현 | Pending | Pending | Pending | - |
| **[T-04-1.2]** | AI Advisor | 대화 기록 영속성 및 슬라이딩 윈도우 | Pending | Pending | Pending | - |
| **[T-04-2.1]** | AI Advisor | Markdown 채팅 UI 및 스트리밍 피드백 | Pending | Pending | Pending | - |

---
*모든 Task는 테스트 선행(Test-First) 방식으로 진행되며, 100% 통과 후 Commit 됩니다.*
*마지막 업데이트: 2026-02-16*
