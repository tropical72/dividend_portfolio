# Plan: Analysis & Graph (03)

## 🔄 진행 현황 (Progress)

### [Phase 1] Backend API 구현
- **Task 1.1: 시뮬레이션 엔진 API**
    - [ ] **1.1.1** `GET /api/simulation/historical` (대표 배당금 로직) 구현
    - [ ] **1.1.2** `GET /api/simulation/yield` (공시 배당률 로직) 구현
- **Task 1.2: 데이터 포맷팅**
    - [ ] **1.2.1** 그래프용 월별 데이터(JSON) 생성기 구현
    - [ ] **1.2.2** 현지 통화(천원 단위 등) 포맷팅 로직 추가

### [Phase 2] Frontend UI 구현
- **Task 2.1: Recharts 기반 막대 그래프**
    - [ ] **2.1.1** 월별 배당 막대 그래프 (Tooltip, Legend 포함) 구현
    - [ ] **2.1.2** 차트 Y축 마진 최적화 및 텍스트 현지화
- **Task 2.2: 분석 인터페이스**
    - [ ] **2.2.1** 계산 방식 선택 콤보박스 및 상태 동기화 구현
    - [ ] **2.2.2** 분석 테이블/그래프 연동 필터링 UI 구현

## 📅 향후 작업 일정 (Backlog)
- [ ] [SIM-03] 분석 결과 테이블 (원화/달러 2줄 표시)
