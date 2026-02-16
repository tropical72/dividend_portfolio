# Plan: Portfolio (02)

## 🔄 진행 현황 (Progress)

### [Phase 1] Backend API 구현
- **Task 1.1: 포트폴리오 CRUD 및 영속성 (REQ-PRT-04)**
    - [ ] **1.1.1** `portfolios.json` 스캐폴딩 및 기초 CRUD API 구현
    - [ ] **1.1.2** 카테고리(Fixed, Growth, Cash)를 포함한 저장 구조 설계 (REQ-PRT-01.2)
- **Task 1.2: 계산 및 환율 엔진 API (REQ-PRT-03)**
    - [ ] **1.2.1** 총 투자 금액(USD/KRW) 상호 환산 로직 구현 (REQ-PRT-03.1)
    - [ ] **1.2.2** 종목별 비중 및 예상 배당금(연간/월평균) 계산 로직 구현 (REQ-PRT-03.4)

### [Phase 2] Frontend UI 구현
- **Task 2.1: 3단 카테고리 대시보드 (REQ-PRT-01)**
    - [ ] **2.1.1** 카테고리별 독립 섹션 및 시각적 구분 UI 구현 (REQ-PRT-01.3)
    - [ ] **2.1.2** Watchlist에서 종목 이관(우클릭 메뉴 연동) 기능 구현 (REQ-PRT-02.1)
- **Task 2.2: 투자 정보 입력 및 실시간 검증 (REQ-PRT-03)**
    - [ ] **2.2.1** 투자 금액(USD/KRW) 및 비중(%) 입력 필드 구현 (REQ-PRT-03.2)
    - [ ] **2.2.2** 비중 합계 100% 검증 및 색상 피드백(Green/Red) 구현 (REQ-PRT-03.3)
- **Task 2.3: 포트폴리오 관리 및 비교 (REQ-PRT-04)**
    - [ ] **2.3.1** 포트폴리오 저장/로드 모달 및 명칭 변경 기능 구현
    - [ ] **2.3.2** 'Load to Portfolio' 클릭 시 탭 자동 전환 및 상태 복구 구현 (REQ-PRT-04.3)

## 📅 향후 작업 일정 (Backlog)
- [ ] [PRT-EXTRA] 카테고리 간 드래그 앤 드롭 이동 기능
