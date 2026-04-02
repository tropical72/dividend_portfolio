# Traceability Matrix (Integrated Master Sheet)

---

## 1. Retirement Engine Domain (01)

| 요구사항 ID | 상세 작업 명세 | 태스크 ID | 테스트 ID | 상태 | Git Commit |
|:---|:---|:---|:---|:---|:---|
| REQ-RAMS-1.2 | Versioned Assumption System 기초 (API) | T-01-1.1 | TEST-API-RE | Done | bc24140 |
| REQ-RAMS-1.3 | 미래 확정 자금 이벤트 반영 엔진 | T-05-5.1.2 | TEST-API-EV | Done | b99a810 |
| REQ-RAMS-1.4 | 포트폴리오 매니저 데이터 통합 | T-07-7.1 | TEST-API-INT | In Progress | - |
| REQ-RAMS-1.4.5 | 포트폴리오 가시성(Visibility) 강화 | T-07-7.4 | TEST-UX-PORT | In Progress | - |
| REQ-RAMS-2.1 | 법인 세후 현금흐름 실시간 시뮬레이션 | T-06-6.2.1 | TEST-TAX-SIM | Done | [Current] |
| REQ-RAMS-2.2 | 지역건보료 점수제(재산/소득) 모듈 | T-01-1.2.2 | TEST-TAX-02 | Done | 98348ee |
| REQ-RAMS-2.3 | 법인 vs 개인 타당성 분석 로직 | T-01-2.1.2 | TEST-TAX-03 | Done | 986d124 |
| REQ-RAMS-3.1 | 연령 기반 Phase 자동 스위칭 엔진 | T-01-3.1 | TEST-PHS-01 | Done | 08423af |
| REQ-RAMS-3.2 | 인플레이션 및 자산 수익률 복리 엔진 | T-01-3.2 | TEST-SUR-01 | Done | 3a741f4 |
| REQ-RAMS-3.3 | 30년 생애 주기 프로젝션 엔진 | T-01-3.2.1 | TEST-SUR-01 | Done | 3a741f4 |
| REQ-RAMS-3.3 | Tier Cascade Engine (상태 머신) | T-01-2.1 | TEST-CSC-01 | Done | 46b0de0 |
| REQ-RAMS-6.1 | 실시간 이벤트 트리거 및 Health Monitor | T-01-2.1.1 | TEST-TRG-01 | Done | a5fad29 |
| REQ-RAMS-5.2 | 표준 스트레스 테스트 시나리오 엔진 | T-01-3.1 | TEST-STR-01 | Done | fe258b7 |
| REQ-RAMS-7.1 | 시뮬레이션 정밀 검증 UI (상세 로그) | T-06-6.1.1 | TEST-UX-LOG | Done | [Current] |
| REQ-RAMS-7.4 | Scenario Snapshot (은퇴일 스냅샷) | T-01-3.3 | TEST-SNP-01 | Done | 0bd7273 |
| REQ-RAMS-4.1 | 리밸런싱 트리거 및 세무 마찰 비용 엔진 | T-01-4.1 | TEST-REB-01 | Done | fe92271 |

---

## 2. Portfolio Manager Domain (02)

| 요구사항 ID | 상세 작업 명세 | 태스크 ID | 테스트 ID | 상태 | Git Commit |
|:---|:---|:---|:---|:---|:---|
| REQ-PRT-01 | 포트폴리오 설계 및 비중 관리 (Designer) | T-02-2.1 | TEST-PRT-01 | Done | [Current] |
| REQ-PRT-02 | Watchlist 유기적 연동 및 종목 이관 | T-02-3.1 | TEST-PRT-02 | Done | [Current] |
| REQ-PRT-03 | 통화 이원화 및 실시간 시뮬레이션 엔진 | T-02-2.2 | TEST-PRT-03 | Done | [Current] |
| REQ-PRT-03.4 | 카테고리별/전체 분석 결과 보고 | T-02-2.2.2 | TEST-PRT-03 | Done | - |
| REQ-PRT-04.1 | 포트폴리오 저장 (Corporate/Pension) | T-02-1.1.1 | TEST-PRT-04 | Done | - |
| REQ-PRT-04.2 | 저장 리스트 및 편집/이름변경 | T-02-4.1.2 | TEST-PRT-04 | In Progress | - |
| REQ-PRT-06 | 비교 대시보드 및 월별 수입 시각화 | T-02-4.1 | TEST-PRT-06 | In Progress | - |
| REQ-PRT-07 | UI 가독성(Sub-Tabs) 및 명칭(Corporate) 강화 | T-02-5.1 | TEST-PRT-07 | In Progress | - |

---
*마지막 업데이트: 2026-04-02 10:30:00*
