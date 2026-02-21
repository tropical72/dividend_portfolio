# Architecture: Retirement Asset Management System (RAMS)

## 1. 아키텍처 원칙 매핑 (Principle Mapping)

본 설계는 마스터의 5대 아키텍처 요구사항을 다음과 같이 구현한다.

1.  **[REQ-ARCH-1] & [REQ-ARCH-2] ➜ `src/core/` (Pure Logic Layer):**
    - 모든 세금, 건보료, 복리 계산은 `src/core/` 내의 순수 파이썬 함수로 작성한다.
    - 데이터베이스 접근이나 UI 상태 변경 로직을 절대 포함하지 않는다.
2.  **[REQ-ARCH-3] ➜ `CascadeEngine` (State Machine):**
    - 자산 매도 순서를 제어하는 로직을 FSM(상태 머신) 클래스로 구현하여 `src/core/cascade_engine.py`에 배치한다.
3.  **[REQ-ARCH-4] ➜ `ScenarioManager` (Backend Layer):**
    - 스트레스 테스트 시나리오 프리셋을 데이터화하여 라이브러리 형태로 보관하고, 시뮬레이션 파라미터를 동적으로 변경한다.
4.  **[REQ-ARCH-5] ➜ `AssumptionManager` (Data Persistence):**
    - `retirement_config.json` 내부에 `active_assumption_id`와 `assumptions` 맵을 두어 버전별 설정을 영속화한다.

---

## 2. 시스템 모듈 구조

### 2.1. Core Engine (src/core/)
- `tax_engine.py`: 결정론적 세무 계산기.
- `cascade_engine.py`: 인출 전략 상태 머신.
- `simulation_engine.py`: 시계열 데이터 생성기.

### 2.2. Backend Application (src/backend/)
- `api.py`: FastAPI 엔드포인트 제공.
- `storage.py`: 설정 버전 관리 및 스냅샷 저장 I/O.
- `trigger_handler.py`: 시뮬레이션 결과 기반 실시간 트리거 감시.

---

## 3. 데이터 흐름도

```text
[UI: Assumption Switch] ➜ [Backend: Load Version V2] ➜ [Core: Run Simulation] ➜ [UI: Re-render Chart]
```
- 모든 흐름은 단방향이며, Core Engine은 오직 인자로 전달된 데이터만 사용하여 결과를 산출한다.
