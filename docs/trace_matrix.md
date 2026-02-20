# Traceability Matrix (Master Task List)

## 📊 진행 가이드 (TDD Protocol)
1. **Test Written (Red):** 구현은 `Pending`인데 테스트는 `Red`인 상태 -> 테스트 코드가 먼저 준비됨을 증명.
2. **Implementation Done:** 구현이 `Done`으로 바뀌고 테스트는 여전히 `Red`인 상태 -> 코드 작성 중.
3. **Verification (Pass):** 테스트가 `Pass`로 바뀌는 순간 -> 기능 완성.
4. **Final (Done):** 커밋 후 상태가 `Done`으로 완료 -> 전체 공정 종료.

| ID | 도메인 | 작업명 (Task) | 구현 | 테스트 | 상태 | Git Commit ID |
|:---|:---|:---|:---|:---|:---|:---|
| **[T-00]** | System | 인프라 및 도구 구축 (0.1 ~ 2.2) | Done | Pass | Done | 23ef0d3 |
| **[T-01-1.1]** | Watchlist | 종목 추가/조회 API | Done | Pass | Done | 127ab60 |
| **[T-01-1.2]** | Watchlist | 삭제 무결성 체크 | Done | Pass | Done | d9eaff4 |
| **[T-01-1.3]** | Watchlist | 필수 필드 보강 (Backend) | Done | Pass | Done | a209741 |
| **[T-01-2.1]** | Watchlist | 테이블 및 입력 UI | Done | Pass | Done | fd41a4c |
| **[T-01-2.2]** | Watchlist | 로딩 및 알림 UX | Done | Pass | Done | 784a83c |
| **[T-01-2.3]** | Watchlist | 컬럼 확장 및 바인딩 | Done | Pass | Done | a209741 |
| **[T-01-1.4]** | Watchlist | 배당 주기 및 지급 월 분석 (API) | Done | Pass | Done | d8bc2cc |
| **[T-01-1.5]** | Watchlist | 한국 종목 DART 데이터 전수 보정 | Done | Pass | Done | (Pending Commit) |
| **[T-00-2.3]** | System | API 키 및 사용자 설정 관리 UI | Done | Pass | Done | 188d02f |
| **[T-01-2.4]** | Watchlist | 테이블 정렬 및 컨텍스트 메뉴 (UI) | Done | Pass | Done | 188d02f |
| **[T-01-2.5]** | Watchlist | UX 폴리싱 (모달/스크롤/배당 주기 UI) | Done | Pass | Done | 2c4a169 |
| **[T-01-2.6]** | Watchlist | 다중 선택 및 일괄 삭제 기능 | Done | Pass | Done | (Pending Commit) |
| **[T-02-1.1]** | Portfolio | 포트폴리오 CRUD 및 영속성 | Pending | Pending | Pending | - |
| **[T-02-1.2]** | Portfolio | 환율 및 계산 엔진 | Pending | Pending | Pending | - |
| **[T-02-2.1]** | Portfolio | 3단 카테고리 대시보드 UI | Pending | Pending | Pending | - |
| **[T-02-2.2]** | Portfolio | 실시간 비중 검증 및 피드백 | Pending | Pending | Pending | - |
| **[T-03-1.1]** | Analysis | Historical 대표값 로직 엔진 | Pending | Pending | Pending | - |
| **[T-03-2.1]** | Analysis | Recharts 월별 배당 막대 그래프 | Pending | Pending | Pending | - |
| **[T-03-2.2]** | Analysis | 스플릿터 및 UI 고도화 | Pending | Pending | Pending | - |
| **[T-04-1.1]** | AI Advisor | Gemini/ChatGPT 통합 어댑터 | Pending | Pending | Pending | - |
| **[T-04-1.2]** | AI Advisor | 슬라이딩 윈도우 및 영속성 | Pending | Pending | Pending | - |
| **[T-04-2.1]** | AI Advisor | Markdown 채팅 및 로딩 UI | Pending | Pending | Pending | - |

---
*모든 Task는 테스트 선행(Test-First) 방식으로 진행되며, 100% 통과 후 커밋 승인을 요청합니다.*
*마지막 업데이트: 2026-02-17*
