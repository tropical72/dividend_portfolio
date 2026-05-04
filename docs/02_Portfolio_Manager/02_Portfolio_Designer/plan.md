# Plan: Portfolio (02) [Master Execution Plan]

## 🔄 진행 현황 (Progress Mapping)

### [Phase 1] Backend & Analytics (T-02-1)
- **T-02-1.1: 멀티 영속성 고도화**
    - [x] UUID 기반 CRUD 및 저장 로직 (`portfolios.json`).
    - [x] **T-02-1.1.2** 포트폴리오 업데이트(PATCH) API 연동. (REQ-PRT-04.2)
    - [ ] **T-02-1.1.3** 계좌 유형(개인/연금) 필드 추가 및 저장 로직 확장. (REQ-PRT-04.1)
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

### [Phase 4] Frontend: Comparison Dashboard (T-02-4) - DONE
- **T-02-4.1: 비교 리스트 및 로드**
    - [x] **T-02-4.1.1** 포트폴리오 리스트(아코디언) 및 원화 기준 수치 표시. (REQ-PRT-06.1, 06.2)
    - [x] **T-02-4.1.2** 저장 리스트에서 편집/이름변경/로드 기능. (REQ-PRT-04.2, 04.3)
- **T-02-4.2: 월별 수입 시각화**
    - [x] **T-02-4.2.1** 리스트 다중 선택 및 월별 막대 차트(Bar Chart) 통합 렌더링. (REQ-PRT-06.4)
- **T-02-4.3: 전역 시뮬레이터**
    - [x] **T-02-4.3.1** 비교 탭 상단 통합 투자금 입력 구역 구축. (REQ-PRT-06.3)

### [Phase 5] UI 가독성 개선 및 명칭 통일 (T-02-5) - DONE
- **T-02-5.1: 명칭 전환 (Personal -> Corporate)**
    - [x] **T-02-5.1.1** `PortfolioTab.tsx` 상태 변경 및 렌더링 텍스트 업데이트.
    - [x] **T-02-5.1.2** 백엔드 API 호환성 및 `portfolios.json` 저장 로직 검증.
- **T-02-5.2: UI 가독성 고도화**
    - [x] **T-02-5.2.1** 서브 탭 내비게이션(Designer/Manage) 크기(`text-sm`) 및 패딩 확대.
    - [x] **T-02-5.2.2** 계좌 타입 선택기 크기(`text-sm`) 및 선택 상태 색상 대비 강력 개선.

### [Phase 7] Portfolio Name Management & Save UX (T-02-7) - DONE
- **T-02-7.1: Designer 탭 이름 입력 UX 개선**
    - [ ] **T-02-7.1.1** 포트폴리오 이름 필드에 Edit 아이콘 추가 및 포커스 스타일 강화.
    - [ ] **T-02-7.1.2** 저장(Save) 버튼 클릭 시 '이름 확인/수정' 모달 구현.
- **T-02-7.2: 저장된 리스트 내 이름 변경 기능**
    - [x] **T-02-7.2.1** `PortfolioDashboard.tsx` 리스트 항목에 Rename 버튼 및 인라인 편집 UI 추가.
    - [x] **T-02-7.2.2** 백엔드 PATCH API 연동을 통한 실시간 이름 업데이트.
    - [x] **T-02-7.2.3** 저장된 개별 포트폴리오 이름 변경 흐름에 대한 회귀 검증 추가.

### [Phase 8] Master Strategy Management (T-02-8) - DONE
- **T-02-8.4: 마스터 전략 이름 변경 지원**
    - [x] **T-02-8.4.1** `master_portfolios` PATCH API를 추가해 저장된 전략명 수정 경로를 제공한다.
    - [x] **T-02-8.4.2** `PortfolioDashboard.tsx` 리스트 항목에 마스터 전략 Rename 버튼 및 인라인 편집 UI를 추가한다.

### [Phase 10] 전략 카테고리 편집기 재설계 (T-02-10) - DONE
- **T-02-10.1: 계좌별 4카테고리 데이터 모델 정렬**
    - [x] **T-02-10.1.1** Corporate/Pension 계좌별 허용 카테고리 정의 및 타입 반영.
    - [x] **T-02-10.1.2** 기존 3단 카테고리 포트폴리오 마이그레이션 규칙 구현.
- **T-02-10.2: Portfolio Designer UI 개편**
    - [x] **T-02-10.2.1** Corporate용 `SGOV Buffer/Bond Buffer/High Income/Dividend Growth/Growth Engine` 편집 레이아웃 구현.
    - [x] **T-02-10.2.2** Pension용 `SGOV Buffer/Bond Buffer/Dividend Growth/Growth Engine` 편집 레이아웃 구현.
    - [x] **T-02-10.2.3** 각 카테고리 설명, 매도 우선순위, 역할 안내 UI 추가.
- **T-02-10.3: Watchlist 연동 및 분석 리포트 정합성**
    - [x] **T-02-10.3.1** 종목 이관 팝업의 카테고리 선택지를 계좌 타입별 카테고리 구조에 맞게 교체.
    - [x] **T-02-10.3.2** 분석 리포트와 비교 대시보드의 카테고리 집계를 새 전략 카테고리 기준으로 갱신.

### [Implementation Notes] 구현 메모
- 기존 `Fixed/Cash/Growth/Dividend/HighIncome` 타입은 즉시 삭제하지 않고 호환 레이어로 잠시 유지한다.
- Portfolio 저장 시에는 새 카테고리 문자열로 정규화하여 저장하고, 레거시 데이터는 로드 시 한 번만 변환한다.
- 계좌 타입이 바뀌면 호환되지 않는 카테고리 종목은 자동 이동시키지 말고, 사용자 확인 후 재배치하도록 설계한다.

---
*마지막 업데이트: 2026-04-16 17:05:00*
