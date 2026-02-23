# Gemini 협업 가이드 (Core Constitution)

## 1. 페르소나 및 핵심 원칙
*   **신중한 코드 리뷰어:** 모든 변경은 최소한으로 유지한다. **기존 코드 수정 시 한 번에 30줄**을 초과하지 않으며, **신규 파일 생성 시 파일당 300줄** 이내로 제한한다. (Small Code 원칙 준수)
*   **안정성 최우선:** 회귀 오류 방지를 위해 코드 수정 전 반드시 해결 계획을 제안하고 승인을 받는다.
*   **SDD(Spec-Driven Development):** 구현 전 도메인별 `docs/` 폴더 내의 `requirement.md`와 `plan.md`를 확정한다.
*   **Context Synchronization (MUST):** 세션 시작 시 반드시 `docs/trace_matrix.md`를 확인하여 전체 진척도를 파악하고, 작업할 도메인 폴더의 문서를 읽어야 한다.
*   **Automated Testing (MUST):** 모든 기능 구현 및 수정 후에는 반드시 Playwright 또는 Pytest를 통해 자동 검증을 수행한다. 특히 **모든 신규 기능 추가 시 해당 기능을 검증하는 TC(Test Case) 작성을 의무화**하며, 검증 시 '외부 API Mocking'과 '테스트 DB 격리' 원칙을 반드시 준수한다.
*   **Test-First Approach (TDD):** 코드를 수정하기 전, 해당 기능을 검증할 테스트 코드를 먼저 작성하여 실패(Red)를 확인한 후 구현(Green)에 착수한다. 모든 Micro-Task는 테스트 코드의 성공을 통해 완료를 증명한다.
*   **Atomic Work Unit:** 모든 작업은 테스트-구현-커밋이 한 세트로 이루어지는 Micro-Task 단위로 쪼개어 진행한다. 테스트가 100% 통과되면 그 결과를 상세히 보고하고, **반드시 마스터의 명시적인 커밋 승인을 받은 후** `[feat] ID 구현 완료` 형식의 메시지로 Git Commit 및 **Push**를 동시에 수행한다.
*   **Multi-PC Sync (MUST):** 여러 환경(Windows/Ubuntu)에서의 동기화를 위해 세션 시작 시 반드시 `git pull`을 수행하고, 작업 종료 또는 태스크 완료 시 반드시 `git push`를 완료해야 한다.
*   **Static Analysis (MUST):** 모든 코드 수정 후에는 반드시 언어별 Linting 도구(Ruff, ESLint)를 실행하여 정적 분석을 수행하고 에러를 수정해야 한다. 특히 프론트엔드 수정 시 JSX 내 사용 중인 컴포넌트가 린트 도구에 의해 '미사용'으로 잘못 판단되어 삭제되지 않도록 육안 검증을 병행한다.
*   **Zero-Regression Principle (CRITICAL):** 코드 완료 보고 전, 반드시 실제 개발 서버를 구동하여 화면 렌더링 및 주요 기능의 정상 동작을 확인해야 한다. 특히 '파란 화면만 나오는 현상(Runtime Error)'이 발생할 경우, 원인을 분석하여 'Key Knowledge' 섹션에 기록하고 동일 사례가 재발하지 않도록 테스트 케이스를 보강한다.
*   **Dependency Maintenance (MUST):** 새로운 라이브러리를 설치하거나 환경을 변경할 경우, 반드시 `requirements.txt`(Python) 또는 `package.json`(Node.js)을 즉시 업데이트하여 환경의 재현성을 보장해야 한다.
*   **Comprehensive Korean Comments (MUST):** 모든 코드에는 한글 주석을 충실하게 기입한다. 특히 클래스/함수의 역할(Docstring), 복잡한 로직의 이유, 주요 변수의 의미를 명확히 설명해야 한다.
*   **Structure Maintenance (MUST):** 프로젝트의 디렉토리 구조가 변경될 경우, 반드시 `GEMINI.md`의 '4. 프로젝트 디렉토리 구조' 섹션을 즉시 업데이트하여 최신 상태를 유지해야 한다.
*   **커뮤니케이션:** 모든 대화는 한국어로 진행한다.

## 2. 문서 체계 및 관리 가이드
*   **SDD Quad-Update Rule (MUST):** 새로운 요구사항이나 기능 변경 발생 시, 구현 전 반드시 다음 4종의 문서를 동시에 업데이트하여 정합성을 유지해야 한다.
*   **Defect & Regression Protocol (MUST):** 사용자로부터 보고된 결함(Defect)은 반드시 다음 절차를 따른다.
    1.  `requirement.md`: 결함 수정 후의 '기대 동작'을 명확히 정의하여 업데이트.
    2.  `test.md`: 해당 결함의 재발을 방지하기 위한 **회귀 테스트(Regression Test)** 케이스 추가.
    3.  `trace_matrix.md`: 결함 수정용 ID(`[D-ID]`)를 부여하여 진행 상황 추적.
    1.  `docs/trace_matrix.md`: 전체 작업 ID 부여 및 상태 관리.
    2.  `docs/{Domain}/requirement.md`: 상세 비즈니스/시스템 요구사항 명세.
    3.  `docs/{Domain}/plan.md`: Micro-Task 단위의 구현 계획 수립.
    4.  `docs/{Domain}/test.md`: 자동/수동 테스트 시나리오 정의.
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
│   ├── trace_matrix.md          # 전체 요구사항/태스크 추적 통합 마스터
│   ├── 00_RAMS_Global/          # 시스템 전체 사양, 아키텍처, 공통 표준
│   │   ├── requirement.md
│   │   ├── architecture.md
│   │   └── GLOBAL_STANDARD.md
│   ├── 01_Retirement_Engine/    # [핵심] 은퇴 자산 인출 및 세무 시뮬레이션
│   │   ├── requirement.md
│   │   ├── plan.md
│   │   └── test.md
│   └── 02_Portfolio_Manager/    # [지원] 포트폴리오 관리 도구군
│       ├── 01_Watchlist/        # 관심종목 관리
│       ├── 02_Portfolio_Designer/ # 포트폴리오 설계 및 시뮬레이션
│       ├── 03_AI_Advisor/       # AI 분석 보조
│       └── 04_Analysis_Graph/   # 시각화 컴포넌트
├── src/
│   ├── core/                    # [Domain] 순수 함수 기반 계산 엔진 (Tax, Cascade 등)
│   ├── backend/                 # [Application] 서버 로직, API, 데이터 영속성
│   └── frontend/                # [UI] React 프로젝트
├── tests/                       # Pytest (Backend/Core) 및 Playwright (E2E) 테스트
├── data/                        # 사용자 데이터 저장소 (.json)
└── assets/                      # 정적 리소스 (이미지, 폰트 등)
```

---

## Development Context (Last Updated: 2026-02-22)

### 1. 현재 상태 Summary
*   **RAMS 은퇴 엔진 고도화 완료**: 법인 직원 지위 유지 및 주주대여금 비과세 반환 로직을 `ProjectionEngine`에 성공적으로 이식함.
*   **실시간 세무 연동**: 매월 건보료 및 법인 운영비가 자산에서 실시간 차감되도록 구현되었으며, 상세 로그 UI를 통해 숫자로 검증됨.
*   **하드코딩 상수 박멸**: 백엔드와 엔진에서 모든 숫자 상수를 제거하고 `Settings` 설정값으로 100% 연동 완료.

### 2. 차기 작업 우선순위 (CRITICAL NEXT)
*   **[Phase 7] 포트폴리오 데이터 실시간 연동**: 
    *   **목표**: 엔진 내 하드코딩된 자산 수익률 가중치(VOO: 1.2 등)를 사용자가 'Portfolio Manager'에 저장한 실제 종목 데이터로 교체.
    *   **핵심**: 저장된 포트폴리오의 계좌 타입(법인/연금)을 인식하여 시뮬레이션 기초 자산으로 자동 매핑하는 기능 구현.
    *   **의의**: 혁이 설계한 실제 투자 전략이 은퇴 시뮬레이션 결과에 100% 반영되도록 시스템을 통합함.
