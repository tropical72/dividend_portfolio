# Traceability Matrix (Integrated Master Sheet)

---

## 1. Retirement Engine Domain (01)

| 요구사항 ID | 상세 작업 명세 | 태스크 ID | 테스트 ID | 상태 | Git Commit |
|:---|:---|:---|:---|:---|:---|
| REQ-RAMS-1.2 | Versioned Assumption System 기초 (API) | T-01-1.1 | TEST-API-RE | Done | bc24140 |
| REQ-RAMS-2.1 | 법인 세후 현금흐름 순수 함수 엔진 | T-01-1.2 | TEST-TAX-01 | Done | 98348ee |
| REQ-RAMS-2.2 | 지역건보료 점수제(재산/소득) 모듈 | T-01-1.2.2 | TEST-TAX-02 | Done | 98348ee |
| REQ-RAMS-2.3 | 법인 vs 개인 타당성 분석 로직 | T-01-2.1.2 | TEST-TAX-03 | Done | 986d124 |
| REQ-RAMS-3.2 | 인플레이션 및 자산 수익률 복리 엔진 | T-01-3.2 | TEST-SUR-01 | Done | 3a741f4 |
| REQ-RAMS-3.3 | 30년 생애 주기 프로젝션 엔진 | T-01-3.2.1 | TEST-SUR-01 | Done | 3a741f4 |
| REQ-RAMS-3.3 | Tier Cascade Engine (상태 머신) | T-01-2.1 | TEST-CSC-01 | Done | 46b0de0 |
| REQ-RAMS-6.1 | 실시간 이벤트 트리거 및 Health Monitor | T-01-2.1.1 | TEST-TRG-01 | Done | a5fad29 |
| REQ-RAMS-5.2 | 표준 스트레스 테스트 시나리오 엔진 | T-01-3.1 | TEST-STR-01 | Done | fe258b7 |
| REQ-RAMS-7.1 | 심리적 안도감(Assurance) 산출 로직 | T-01-3.2 | TEST-PSY-01 | Done | 5e0b224 |
| REQ-RAMS-7.4 | Scenario Snapshot (은퇴일 스냅샷) | T-01-3.3 | TEST-SNP-01 | Done | 0bd7273 |
| REQ-RAMS-4.1 | 리밸런싱 트리거 및 세무 마찰 비용 엔진 | T-01-4.1 | TEST-REB-01 | Pending | - |

---

## 2. Portfolio Manager Domain (02)

| 요구사항 ID | 상세 작업 명세 | 태스크 ID | 테스트 ID | 상태 | Git Commit |
|:---|:---|:---|:---|:---|:---|
| REQ-PRT-01.1 | 3단 카테고리 자산 배분 레이아웃 | T-02-2.1.1 | TEST-UX-05 | Done | b3a8b70 |
| REQ-PRT-01.4 | 비중 100% 검증 및 저장 차단 | T-02-2.1.2 | TEST-UX-02 | Done | b3a8b70 |
| REQ-PRT-02.1 | Watchlist 종목 포트폴리오 이관 | T-02-3.1.1 | TEST-UX-01 | Done | b3a8b70 |
| REQ-PRT-02.2 | 포트폴리오 영속성(CRUD) 엔진 | T-02-1.3.1 | TEST-API-01 | Done | 6ec74b8 |
| REQ-PRT-03.1 | USD/KRW 통화 이원화 및 실시간 연동 | T-02-1.2.1 | TEST-UX-03 | Done | 4cfbb3e |
| REQ-PRT-03.4 | 기대 수익 리포트 (연/월 수입) | T-02-2.2.2 | TEST-UX-06 | Done | b3a8b70 |
| REQ-PRT-06.1 | 포트폴리오 리스트 및 요약 정보 | T-02-4.1.1 | TEST-DSB-01 | Done | c4b130a |
| REQ-PRT-06.4 | 월별 배당 분포 시각화 (Bar Chart) | T-02-4.2.1 | TEST-DSB-02 | Done | c4b130a |

---
*마지막 업데이트: 2026-02-22 20:15:00*
