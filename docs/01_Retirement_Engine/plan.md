# Plan: Retirement Asset Management System (RAMS)

## 🔄 진행 현황 (Progress Mapping)

### [Phase 1] Core Engine 및 기초 인프라 (T-05-1)
- **T-05-1.1: Versioned Assumption System**
    - [x] **T-05-1.1.1** 멀티 프로필 지원 `retirement_config.json` 설계 및 CRUD API 구축 완료.
    - [x] **T-05-1.1.2** UI에서 가정 버전(v1, conservative 등) 스위칭 기능 구현 완료. (`src/frontend/src/components/RetirementTab.tsx`)
- **T-05-1.2: Tax Engine (Pure Functions)**
    - [x] **T-05-1.2.1** 지역건보료 및 법인세 산출 모듈 완료. (`src/core/tax_engine.py`)

### [Phase 2] 구조 2 & 3: 인출 및 수익성 엔진 (T-05-2)
- **T-05-2.1: Tier Cascade Engine**
    - [x] **T-05-2.1.1** 상태 머신 기반 인출 로직 구현 완료. (`src/core/cascade_engine.py`)
- **T-05-2.2: 법인 수익성 엔진**
    - [ ] T-05-2.2.1 세후 CAGR 및 가용 현금흐름 산출 로직.

### [Phase 3] 구조 5 & 7: 위험 관리 및 심리적 대시보드 (T-05-3)
- **T-05-3.1: 스트레스 테스트 및 프로젝션**
    - [ ] T-05-3.1.1 3대 스트레스 시나리오 연동.
- **T-05-3.2: Psychological Dashboard**
    - [ ] T-05-3.2.1 안심 등급 판정 및 정서적 UI 구현.
- **T-05-3.3: Scenario Snapshot** (신규)
    - [ ] **T-05-3.3.1** 은퇴 시점 데이터 스냅샷 생성 및 저장 로직.
    - [ ] **T-05-3.3.2** 원본 계획 vs 현재 상태 델타(Delta) 분석 및 비교 UI.

---

## 🧪 테스트 케이스
- **Snapshot-Data-Integrity:** 스냅샷 저장 후 시간이 지나도 원본 데이터가 훼손되지 않고 정확히 로드되는지 확인.
- **Delta-Calculation-Test:** 자산이 은퇴일 대비 10% 하락했을 때 정확히 -10%의 편차를 계산해내는지 검증.
