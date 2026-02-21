# Plan: Portfolio (02) [Master Execution Plan]

## 🔄 진행 현황 (Progress Mapping)

### [Phase 1] Backend & Analytics (T-02-1)
- **T-02-1.1: 멀티 영속성 고도화**
    - [x] UUID 기반 CRUD 및 저장 로직 (`portfolios.json`).
    - [ ] **T-02-1.1.2** 포트폴리오 이름 변경 API 구현. (REQ-PRT-04.2)
- **T-02-1.2: 시뮬레이션 엔진 완성**
    - [x] 실시간 환율 및 가중 평균 수익률 로직.
    - [ ] **T-02-1.2.3** TTM vs Forward 모드별 12개월 배당 분포 산출 로직. (REQ-PRT-03.3, 05.1)
- **T-02-1.3: 무결성 검증**
    - [x] Watchlist 삭제 방지 로직 (`is_stock_in_portfolio`).

### [Phase 2] Frontend: Portfolio Editor (T-02-2)
- **T-02-2.1: 설계 인터페이스 구축**
    - [x] **T-02-2.1.1** 3단 카테고리 레이아웃 및 종목 추가/삭제 UI. (REQ-PRT-01.1, 01.2)
    - [x] **T-02-2.1.2** 실시간 비중 합산 및 100% 검증/저장 차단 로직. (REQ-PRT-01.3, 01.4, 01.5)
- **T-02-2.2: 시뮬레이션 패널**
    - [x] **T-02-2.2.1** 투자금 통화 이원화 입력 및 환율 실시간 연동. (REQ-PRT-03.1, 03.2)
    - [x] **T-02-2.2.2** 카테고리별/전체 분석 결과 리포트 출력. (REQ-PRT-03.4)

### [Phase 3] Frontend: Watchlist Bridge (T-02-3)
- **T-02-3.1: 종목 이관 연동**
    - [x] **T-02-3.1.1** Watchlist 복수 선택용 'Add to Portfolio' 버튼 및 다이얼로그. (REQ-PRT-02.1)

### [Phase 4] Frontend: Comparison Dashboard (T-02-4)
- **T-02-4.1: 비교 리스트 및 로드**
    - [ ] **T-02-4.1.1** 포트폴리오 리스트(아코디언) 및 원화 기준 수치 표시. (REQ-PRT-06.1, 06.2)
    - [ ] **T-02-4.1.2** 저장 리스트에서 편집/이름변경/로드 기능. (REQ-PRT-04.2, 04.3)
- **T-02-4.2: 월별 수입 시각화**
    - [ ] **T-02-4.2.1** 리스트 다중 선택 및 월별 막대 차트(Bar Chart) 통합 렌더링. (REQ-PRT-06.4)
- **T-02-4.3: 전역 시뮬레이터**
    - [ ] **T-02-4.3.1** 비교 탭 상단 통합 투자금 입력 구역 구축. (REQ-PRT-06.3)
