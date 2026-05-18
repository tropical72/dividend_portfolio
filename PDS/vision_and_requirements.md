# Portfolio Design Studio (PDS) - 비전 및 요구사항 명세서

## 1. 프로젝트 개요 및 비전
*   **프로젝트명:** PDS (Portfolio Design Studio)
*   **비전:** 기존의 특정 단일 자산운용 전략(v11.1)에 종속되었던 은퇴 시뮬레이터를 발전시켜, **생애 주기 전반의 다양한 자산 배분 및 운용 전략을 플러그인(Plug-in)처럼 교체하고 시뮬레이션할 수 있는 '범용 자산 설계 플랫폼'**으로 전환한다.
*   **핵심 철학:** "물리(Physics)와 전략(Strategy)의 완벽한 분리" 
    *   시간의 흐름, 복리 계산, 세금 징수 등 변하지 않는 '물리적/수학적 환경'은 코어 엔진이 담당한다.
    *   자산을 어떻게 구성하고, 언제 매도하며, 현금흐름을 어떻게 창출할지에 대한 '인간의 의지'는 개별 전략 모듈(Strategy Module)이 담당한다.

## 2. 핵심 요구사항 (Key Requirements)

### 2.1. 플러그인 기반의 전략 아키텍처 (Pluggable Strategy Architecture)
*   사용자는 UI를 통해 현재 구동할 '자산 운용 전략(예: OS v11.1, 60/40 정적 배분, 개인 계좌 중심 하이브리드 등)'을 자유롭게 선택할 수 있어야 한다.
*   새로운 전략의 추가는 기존 전략 코드에 어떠한 영향도 주지 않아야 한다(Sandboxing).
*   전략은 단순히 주식 매도/리밸런싱 규칙뿐만 아니라, **현금흐름 구조(법인/개인연금/개인계좌 운용 방식)와 세무 처리 시점** 등 전반적인 운용 철학을 모두 포괄하는 단위여야 한다.

### 2.2. 전략별 동적 UI 및 설정 관리 (Dynamic UI & Parameters)
*   각 전략은 자신이 필요로 하는 파라미터(예: v11.1의 `sgov_target_months` 등)가 다르다.
*   UI의 `Settings` 탭은 선택된 전략에 종속적인 설정값 입력 폼을 동적으로 렌더링해야 한다. (각 전략 폴더 내에 `schema.json` 등을 두어 프론트엔드가 이를 해석하는 구조).

### 2.3. 전략 종속적 포트폴리오 및 카테고리 (Strategy-scoped Portfolios & Categories)
*   **포트폴리오의 분리:** 마스터 포트폴리오 및 하위 포트폴리오(법인, 개인연금 등)는 글로벌하게 하나로 관리되는 것이 아니라, **각 운용 전략별로 분리되어 별도 저장/관리**되어야 한다. (A 전략용 포트폴리오 세트, B 전략용 포트폴리오 세트).
*   **카테고리의 자율화:** 현재의 5대 카테고리(SGOV, Bond, High Income, Dividend, Growth)는 글로벌 표준이 아닌 특정 전략(v11.1)의 규격으로 격하된다. 새로운 전략은 원자재(Gold), 부동산(Real Estate), 암호화폐(Crypto) 등 자신만의 자산 카테고리를 자유롭게 정의하고 시뮬레이션할 수 있어야 한다.

### 2.4. 핵심 로직의 독립 라이브러리화 (Extraction of Commons)
*   시스템의 확장성과 유지보수성을 위해, 특정 전략에 종속되지 않는 범용 로직들은 독립적인 패키지/라이브러리 형태로 분리한다.
    *   `TaxLib-KR`: 한국 소득세, 법인세, 건강보험료 등을 계산하는 순수 함수형 세무 라이브러리.
    *   `Finance-Math`: 복리 수익률 변환, 배당 Run-rate 모델링 등 금융 수학 유틸리티.
    *   `Portfolio-Buckets`: 우선순위에 따라 여러 자산 바구니 간에 자금을 이동시키는 밸런싱 알고리즘.

## 3. 타겟 디렉토리 및 아키텍처 구조 (Target Architecture Blueprint)
```text
src/
├── core/                        # [Physics] 공통 시뮬레이션 물리 엔진 및 독립 라이브러리
│   ├── projection_core.py       # 시간 관리, 기본 복리/배당 수학 (전략 객체를 주입받아 실행)
│   ├── libs/                    
│   │   ├── tax_kr/              # [Library] 한국 세무 라이브러리
│   │   ├── finance_math/        # [Library] 금융/복리 수학
│   │   └── bucket_manager/      # [Library] 자산 이동 유틸리티
├── strategies/                  # [Strategy] 전략별 독립 공간 (Sandboxed)
│   ├── base_strategy.py         # 모든 전략이 구현해야 할 공통 인터페이스 (추상 클래스)
│   ├── os_v11_1/                # 현재의 v11.1 전략 (법인+연금, 5카테고리)
│   │   ├── engine.py            # v11.1 고유 Rebalance/Cashflow 로직
│   │   ├── schema.json          # v11.1 전용 UI 설정 필드 정의
│   │   └── portfolios.json      # v11.1 전용 포트폴리오 저장소 (격리됨)
│   └── custom_hybrid_v1/        # (향후 추가될) 개인계좌 중심 하이브리드 전략
│       ├── engine.py
│       └── ...
└── backend/                     # API 및 시스템 오케스트레이션
    └── strategy_manager.py      # 활성 전략 로드, 설정 주입 및 결과 통합 반환
```

## 4. 새로운 세션(Agent)을 위한 Context 가이드
*   **Current State:** 현재 코드는 단일 전략(v11.1)이 시뮬레이션 엔진(`ProjectionEngine`)과 강하게 결합(Tightly-coupled)되어 있는 상태이다. 다만 수학적 무결성(복리 계산, 배당 Run-rate 독립 등)은 최상급으로 확보되어 있다.
*   **Next Action:** 새로운 기능 추가보다, 기존 시스템을 분해하여 `src/core/libs/`로 핵심 로직을 추출하고, 기존 v11.1 코드를 `src/strategies/os_v11_1/`로 Sandboxing하는 **'아키텍처 대공사(Refactoring & Extraction)'**가 최우선 과제이다.
*   이 과정에서 Playwright/Pytest 기반의 E2E 테스트 및 유닛 테스트가 훼손되지 않도록 점진적(Step-by-step)으로 진행해야 한다.