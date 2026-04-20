# Traceability Matrix (Integrated Master Sheet)

---

## 1. Retirement Engine Domain (01)

> `LEGACY-*` ID는 2026-04-16 요구사항 재정의 이전 커밋을 보존하기 위한 역사적 식별자다. 현재 활성 요구사항의 기준은 `docs/01_Retirement_Engine/requirement.md`다.

| 요구사항 ID | 상세 작업 명세 | 태스크 ID | 테스트 ID | 상태 | Git Commit | 완료 일시 |
|:---|:---|:---|:---|:---|:---|:---|
| REQ-RAMS-1.2 | Versioned Assumption System 기초 (API) | T-01-1.1 | TEST-API-RE | Done | b06085c | 2026.04.15-17.15 |
| REQ-RAMS-1.3 | 미래 확정 자금 이벤트 반영 엔진 | T-05-5.1.2 | TEST-API-EV | Done | b99a810 | 2026.02.22-21.40 |
| REQ-RAMS-1.4 | 포트폴리오 매니저 데이터 통합 | T-07-7.1 | TEST-API-INT | Done | 23abcca | 2026.04.15-13.36 |
| REQ-RAMS-1.4.5 | 포트폴리오 가시성(Visibility) 강화 | T-07-7.4 | TEST-UX-PORT | Done | 23abcca | 2026.04.15-13.36 |
| REQ-RAMS-1.4.6 | Retirement 상단 포트폴리오 정보 배지 UI | T-07-7.4.2 | TEST-UX-PORT | Done | 05a0469 | 2026.04.16-12.30 |
| REQ-RAMS-1.5 | 마스터 포트폴리오 기반 엔진 구동 | T-02-8.1.3 | TEST-RAMS-1.5 | Done | 23abcca | 2026.04.15-13.36 |
| REQ-RAMS-1.6 | 마스터 전략 퀵 스위처 및 활성 전략 삭제 보호 | T-02-8.3 | TEST-RAMS-1.6 | Done | 9d4d333 | 2026.04.16-12.24 |
| REQ-RAMS-2.1 | 법인 세후 현금흐름 실시간 시뮬레이션 | T-06-6.2.1 | TEST-TAX-SIM | Done | 7a8fe62 | 2026.02.22-23.24 |
| REQ-RAMS-2.2 | 지역건보료 점수제(재산/소득) 모듈 | T-01-1.2.2 | TEST-TAX-02 | Done | 98348ee | 2026.02.22-03.34 |
| LEGACY-RAMS-2.3 | 법인 vs 개인 타당성 분석 로직 | T-01-2.1.2 | TEST-TAX-03 | Done | 986d124 | 2026.02.22-03.58 |
| REQ-RAMS-3.1 | 연령 기반 Phase 자동 스위칭 엔진 | T-01-3.1 | TEST-PHS-01 | Done | 08423af | 2026.02.22-19.42 |
| LEGACY-RAMS-3.2 | 인플레이션 및 자산 수익률 복리 엔진 | T-01-3.2 | TEST-SUR-01 | Done | 3a741f4 | 2026.02.22-04.01 |
| REQ-RAMS-3.3 | 30년 생애 주기 프로젝션 엔진 | T-01-3.2.1 | TEST-SUR-01 | Done | 3a741f4 | 2026.02.22-04.01 |
| LEGACY-RAMS-3.3 | Tier Cascade Engine (상태 머신) | T-01-2.1 | TEST-CSC-01 | Done | 46b0de0 | 2026.02.22-03.47 |
| REQ-RAMS-6.1 | 실시간 이벤트 트리거 및 Health Monitor | T-01-2.1.1 | TEST-TRG-01 | Done | a5fad29 | 2026.02.22-13.26 |
| REQ-RAMS-5.2 | 표준 스트레스 테스트 시나리오 엔진 | T-01-3.1 | TEST-STR-01 | Done | fe258b7 | 2026.02.22-12.11 |
| REQ-RAMS-7.1 | 시뮬레이션 정밀 검증 UI (상세 로그) | T-06-6.1.1 | TEST-UX-LOG | Done | f605a94 | 2026.04.15-14.13 |
| REQ-RAMS-7.4 | Scenario Snapshot (은퇴일 스냅샷) | T-01-3.3 | TEST-SNP-01 | Done | 0bd7273 | 2026.02.22-12.18 |
| REQ-RAMS-4.1 | 리밸런싱 트리거 및 세무 마찰 비용 엔진 | T-01-4.1 | TEST-REB-01 | Done | fe92271 | 2026.02.22-13.30 |
| REQ-RAMS-1.7 | 계좌별 4단계 전략 카테고리 구조 | T-01-9.1.1 | TEST-RAMS-1.7 | Done | 5029b04 | 2026.04.16-16.24 |
| REQ-RAMS-2.3 | 법인 현금흐름과 주주대여금 반환 분리 | T-01-9.2.1 | TEST-TAX-03 | Done | 5b73a18 | 2026.04.16-12.17 |
| REQ-RAMS-3.2 | 연 1회 전략 매도 및 역할 하한선 상태 머신 | T-01-9.3.1 | TEST-SUR-02 | Done | 5b73a18 | 2026.04.16-12.17 |
| REQ-RAMS-8.1 | 전략 파라미터 사용자 설정화 | T-01-9.4.1 | TEST-UI-RULE-01 | Done | 8e9f885 | 2026.04.16-11.40 |
| D-RAMS-8.1.1 | Settings Assumptions 영역의 테스트 전용 프리셋 노출 제거 및 활성 프리셋 정규화 | T-01-9.4.2 | TEST-UI-RULE-07 | Done | 1abf653 | 2026.04.16-21.46 |
| D-RAMS-8.1.2 | 월 필요 생활비 입력 누락으로 인한 저지출 시뮬레이션 오인 방지 및 Settings 노출 보강 | T-01-9.4.4 | TEST-UI-RULE-08 | Done | 1f34368 | 2026.04.16-22.00 |
| D-RAMS-8.1.3 | Projection Result에서 실제 적용 중인 월 필요 생활비 배지 노출 | T-01-9.4.5 | TEST-UI-RULE-09 | Done | dffc4e6 | 2026.04.16-22.10 |

---

## 2. Portfolio Manager Domain (02)

| 요구사항 ID | 상세 작업 명세 | 태스크 ID | 테스트 ID | 상태 | Git Commit | 완료 일시 |
|:---|:---|:---|:---|:---|:---|:---|
| REQ-PRT-01 | 포트폴리오 설계 및 비중 관리 (Designer) | T-02-2.1 | TEST-PRT-01 | Done | 0bd7273 | 2026.02.22-12.18 |
| REQ-WCH-01.8 | 시스템 기본 관심종목 보장 및 보호 (System Default) | T-02-1.2 | TEST-WCH-01 | Done | a93aacb | 2026.04.16-18.00 |
| REQ-PRT-02 | Watchlist 유기적 연동 및 종목 이관 | T-02-3.1 | TEST-PRT-02 | Done | f605a94 | 2026.04.15-14.13 |
| REQ-PRT-03 | 통화 이원화 및 실시간 시뮬레이션 엔진 | T-02-2.2 | TEST-PRT-03 | Done | 7c5af70 | 2026.04.15-16.34 |
| REQ-PRT-03.4 | 카테고리별/전체 분석 결과 보고 | T-02-2.2.2 | TEST-PRT-03 | Done | f674f26 | 2026.04.15-16.23 |
| REQ-PRT-04.1 | 포트폴리오 저장 (Corporate/Pension) | T-02-1.1.1 | TEST-PRT-04 | Done | bd97ad2 | 2026.04.15-15.43 |
| REQ-PRT-04.2 | 저장 리스트 및 편집/이름변경/복제 | T-02-7.2 | TEST-PRT-04 | Done | bd97ad2 | 2026.04.15-15.43 |
| REQ-PRT-06 | 비교 대시보드 및 시각화 고도화(Radar) | T-02-6.1 | TEST-PRT-06 | Done | f674f26 | 2026.04.15-16.23 |
| REQ-PRT-07 | UI 가독성(Sub-Tabs) 및 명칭(Corporate) 강화 | T-02-5.1 | TEST-PRT-07 | Done | 23abcca | 2026.04.15-13.36 |
| REQ-PRT-08 | 마스터 전략(Master Strategy) 구성 및 관리 | T-02-8.1 | TEST-RAMS-1.5 | Done | 23abcca | 2026.04.15-13.36 |
| REQ-PRT-08.6 | 시스템 기본 번들 보장 및 보호 (System Default) | T-02-8.6 | TEST-RAMS-1.5 | Done | 21955e3 | 2026.04.16-17.40 |
| REQ-PRT-09 | 실시간 환율 동기화 및 캐싱 시스템 | T-02-9.1 | TEST-PRT-09 | Done | 7c5af70 | 2026.04.15-16.34 |
| REQ-GLB-01 | 수익률 지표 표준화 (DY 중심 & PA 가산 모델) 및 설정 저장 버그 수정 | T-GLB-10.1 | TEST-GLB-10 | Done | a7f2b1d | 2026.04.15-19.10 |
| REQ-PRT-01.1 | 계좌별 4단 전략 카테고리 편집기 | T-02-10.2.1 | TEST-PRT-01 | Done | 04bd94d | 2026.04.16-02.22 |

---

## 3. Global Standards Domain (00)

| 요구사항 ID | 상세 작업 명세 | 태스크 ID | 테스트 ID | 상태 | Git Commit | 완료 일시 |
|:---|:---|:---|:---|:---|:---|:---|
| REQ-GLB-11.1 | Feature 단위 품질 게이트 명시화 | T-GLB-11.1 | TEST-SYS-QG-01 | Done | 04bd94d | 2026.04.16-02.22 |
| REQ-GLB-11.2 | Frontend Prettier 생성물 제외 설정 | T-GLB-11.2.1 | TEST-SYS-QG-02 | Done | 04bd94d | 2026.04.16-02.22 |
| REQ-GLB-11.3 | 전역 black/mypy 부채 정비 계획 수립 | T-GLB-11.3 | TEST-SYS-QG-04 | Done | 06750bc | 2026.04.16-16.37 |
| REQ-SYS-02.4 | Playwright 백엔드 상태 snapshot/restore 격리 | T-GLB-11.4.1 | TEST-SYS-2.2.2 | Done | d665e97 | 2026.04.16-17.02 |
| REQ-SYS-05 | UI 다국어 지원 (ko/en) | T-GLB-12.5 | TEST-SYS-I18N-03 | Done | fcf36b4 | 2026.04.17-15.50 |
| REQ-GLB-13 | 자산군별 기대주가상승률 차등화 및 용어 표준화 | T-GLB-13.1 | TEST-SYS-STR-01 | Done | 2830367 | 2026.04.17-18.15 |

---

## 4. Cost Comparison Simulator Domain (02)

| 요구사항 ID | 상세 작업 명세 | 태스크 ID | 테스트 ID | 상태 | Git Commit | 완료 일시 |
|:---|:---|:---|:---|:---|:---|:---|
| REQ-CCS-1 | 개인운용 vs 법인운용 비교 공정성 및 동일 TR 강제 | T-CCS-1.2 | TEST-CCS-13 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-3 | 사용자 설정 기간 기반 단년/누적 비교 | T-CCS-3.4 | TEST-CCS-45 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-10 | 가구 프로필 입력 모델 | T-CCS-2.2.1 | TEST-CCS-01 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-12 | 부동산을 건보료용 재산으로만 반영 | T-CCS-2.2.2 | TEST-CCS-21 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-14 | 개인연금 자산 별도 고정자산 처리 | T-CCS-2.2.2 | TEST-CCS-23 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-20 | 활성 master portfolio 기반 기준 포트폴리오 | T-CCS-3.1.1 | TEST-CCS-10 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-23 | `TR = DY + PA` 계산 및 표시 | T-CCS-3.1.2 | TEST-CCS-12 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-30 | 개인운용 100% 시나리오 계산 | T-CCS-3.2 | TEST-CCS-20 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-32 | 개인운용 지역건보료 계산 | T-CCS-3.2.2 | TEST-CCS-21 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-40 | 법인운용 100% 시나리오 계산 | T-CCS-3.3 | TEST-CCS-30 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-42 | 급여 수령자 최대 4명 설정 | T-CCS-2.2.3 | TEST-CCS-31 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-43 | 직장건강보험료 총가구 비용 반영 | T-CCS-3.3.2 | TEST-CCS-32 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-46 | 주주대여금 상환 모델 | T-CCS-3.3.4 | TEST-CCS-35 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-50 | 핵심 KPI 비교 카드 | T-CCS-6.1 | TEST-CCS-40 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-54 | 비용/차이 항목 분해 | T-CCS-3.5.2 | TEST-CCS-43 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-60 | 독립 탭 제공 | T-CCS-5.1 | TEST-CCS-50 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-63 | 비용 분해 차트 | T-CCS-6.2 | TEST-CCS-53 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-64 | 순현금흐름 워터폴 | T-CCS-6.3 | TEST-CCS-54 | Done | [ID] | 2026.04.20-15.45 |
| REQ-CCS-65 | 기간 누적 비교 그래프 | T-CCS-6.4 | TEST-CCS-55 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-70 | 비교 시뮬레이터 설정 영속성 | T-CCS-4.1 | TEST-CCS-01 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-72 | 테스트 상태 격리 | T-CCS-7.3.4 | TEST-CCS-04 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-80 | 정책 수치 출처 명시 | T-CCS-4.3.2 | TEST-CCS-61 | Done | [ID] | 2026.04.20-15.45 |
| REQ-CCS-81 | 기준 연도 노출 | T-CCS-4.3.1 | TEST-CCS-60 | Done | 533b578 | 2026.04.18-00.55 |
| REQ-CCS-82 | 추정치 경고 노출 | T-CCS-6.5.3 | TEST-CCS-62 | Done | [ID] | 2026.04.20-15.45 |

---
*마지막 업데이트: 2026-04-20 15:45:00*
