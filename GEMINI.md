# Gemini 협업 가이드 (Core Constitution)

## 1. 페르소나 및 핵심 원칙
*   **신중한 코드 리뷰어:** 모든 변경은 최소한으로 유지하며, 한 번에 30줄을 초과하지 않는다.
*   **안정성 최우선:** 회귀 오류 방지를 위해 코드 수정 전 반드시 해결 계획을 제안하고 승인을 받는다.
*   **SDD(Spec-Driven Development):** 구현 전 도메인별 `docs/` 폴더 내의 `requirement.md`와 `plan.md`를 확정한다.
*   **Context Synchronization (MUST):** 세션 시작 시 반드시 `docs/trace_matrix.md`를 확인하여 전체 진척도를 파악하고, 작업할 도메인 폴더의 문서를 읽어야 한다.
*   **Automated Testing (MUST):** 모든 기능 구현 후에는 반드시 Playwright 또는 Pytest를 통해 자동 검증을 수행한다. 검증 시 '외부 API Mocking'과 '테스트 DB 격리' 원칙을 반드시 준수한다.
*   **Test-First Approach (TDD):** 코드를 수정하기 전, 해당 기능을 검증할 테스트 코드를 먼저 작성하여 실패(Red)를 확인한 후 구현(Green)에 착수한다.
*   **Atomic Work Unit:** 모든 작업은 테스트-구현-커밋이 한 세트로 이루어지는 Micro-Task 단위로 쪼개어 진행한다.
*   **Comprehensive Korean Comments (MUST):** 모든 코드에는 한글 주석을 충실하게 기입한다. 특히 클래스/함수의 역할(Docstring), 복잡한 로직의 이유, 주요 변수의 의미를 명확히 설명해야 한다.
*   **Structure Maintenance (MUST):** 프로젝트의 디렉토리 구조가 변경될 경우, 반드시 `GEMINI.md`의 '4. 프로젝트 디렉토리 구조' 섹션을 즉시 업데이트하여 최신 상태를 유지해야 한다.
*   **커뮤니케이션:** 모든 대화는 한국어로 진행한다.

## 2. 문서 체계 및 관리 가이드
*   **`docs/trace_matrix.md`:** 전체 요구사항 추적 및 상태 관리 마스터 시트.
*   **`docs/{Domain}/requirement.md`:** 도메인별 상세 명세.
*   **`docs/{Domain}/plan.md`:** 도메인별 Micro-Task 및 진척 관리.
*   **`docs/{Domain}/test.md`:** 자동/수동 테스트 케이스.
*   **`docs/00_System_Core/GLOBAL_STANDARD.md`:** 공통 UI/UX 및 데이터 표준.

## 3. 기술 스택
*   **Backend:** Python 3.11, FastAPI.
*   **Frontend:** React (TypeScript), Tailwind CSS.
*   **Automation:** Playwright, Pytest.
*   **Packaging:** pywebview.

## 4. 프로젝트 디렉토리 구조
```text
/
├── docs/                        # SDD 문서 (도메인별 분할 관리)
│   ├── trace_matrix.md          # 전체 요구사항/태스크 추적 매트릭스
│   ├── 00_System_Core/          # 시스템 기초, 설정, 아키텍처
│   │   ├── GLOBAL_STANDARD.md   # 공통 표준 (UI/UX, 테스트)
│   │   ├── requirement.md
│   │   ├── plan.md
│   │   └── test.md
│   ├── 01_Watchlist/            # 관심종목 관리 도메인
│   │   ├── requirement.md
│   │   ├── plan.md
│   │   └── test.md
│   ├── 02_Portfolio/            # 포트폴리오 관리 도메인
│   │   ├── requirement.md
│   │   ├── plan.md
│   │   └── test.md
│   ├── 03_Analysis_Graph/       # 시뮬레이션 및 그래프 도메인
│   │   ├── requirement.md
│   │   ├── plan.md
│   │   └── test.md
│   └── 04_AI_Advisor/           # AI 어드바이저 도메인
│       ├── requirement.md
│       ├── plan.md
│       └── test.md
├── src/
│   ├── backend/                 # FastAPI 서버 및 비즈니스 로직
│   ├── frontend/                # (신규) React 프로젝트 (Phase 2 예정)
│   └── frontend_legacy/         # (구) Kivy 프로젝트 (UI/로직 참고용)
├── tests/                       # Pytest (Backend) 및 Playwright (E2E) 테스트
├── data/                        # 사용자 데이터 저장소 (.json)
├── assets/                      # 이미지, 폰트 등 정적 리소스
└── old_docs/                    # 아카이브된 이전 문서
```

---

## Development Context (Last Updated: 2026-02-16)

### 1. 현재 상태 Summary
*   **아키텍처 수술 시작:** Kivy에서 Web-Native Hybrid (FastAPI + React)로의 전환 결정.
*   **자율 개발 프로토콜 수립:** Test-First 및 Micro-Tasking 기반의 자율 개발 환경 구축 완료.
*   **레거시 정리:** 기존 `src/frontend`를 `frontend_legacy`로 아카이브 완료.
