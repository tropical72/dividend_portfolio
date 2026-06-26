# Traceability Matrix (Integrated Master Sheet)

---

## 1. Retirement Engine Domain (01)

> `LEGACY-*` ID는 2026-04-16 요구사항 재정의 이전 커밋을 보존하기 위한 역사적 식별자다. 현재 활성 요구사항의 기준은 `docs/01_Retirement_Engine/requirement.md`다.

| 요구사항 ID     | 상세 작업 명세                                                                                       | 태스크 ID             | 테스트 ID                                                                                                       | 상태        | Git Commit | 완료 일시        |
| :-------------- | :--------------------------------------------------------------------------------------------------- | :-------------------- | :-------------------------------------------------------------------------------------------------------------- | :---------- | :--------- | :--------------- |
| REQ-RAMS-1.2    | Versioned Assumption System 기초 (API)                                                               | T-01-1.1              | TEST-API-RE                                                                                                     | Done        | b06085c    | 2026.04.15-17.15 |
| REQ-RAMS-1.3    | 미래 확정 자금 이벤트 반영 엔진                                                                      | T-05-5.1.2            | TEST-API-EV                                                                                                     | Done        | b99a810    | 2026.02.22-21.40 |
| REQ-RAMS-1.4    | 포트폴리오 매니저 데이터 통합                                                                        | T-07-7.1              | TEST-API-INT                                                                                                    | Done        | 23abcca    | 2026.04.15-13.36 |
| REQ-RAMS-1.4.5  | 포트폴리오 가시성(Visibility) 강화                                                                   | T-07-7.4              | TEST-UX-PORT                                                                                                    | Done        | 23abcca    | 2026.04.15-13.36 |
| REQ-RAMS-1.4.6  | Retirement 상단 포트폴리오 정보 배지 UI                                                              | T-07-7.4.2            | TEST-UX-PORT                                                                                                    | Done        | 05a0469    | 2026.04.16-12.30 |
| REQ-RAMS-1.5    | 마스터 포트폴리오 기반 엔진 구동                                                                     | T-02-8.1.3            | TEST-RAMS-1.5                                                                                                   | Done        | 23abcca    | 2026.04.15-13.36 |
| REQ-RAMS-1.6    | 마스터 전략 퀵 스위처 및 활성 전략 삭제 보호                                                         | T-02-8.3              | TEST-RAMS-1.6                                                                                                   | Done        | 9d4d333    | 2026.04.16-12.24 |
| REQ-RAMS-2.1    | 법인 세후 현금흐름 실시간 시뮬레이션                                                                 | T-06-6.2.1            | TEST-TAX-SIM                                                                                                    | Done        | 7a8fe62    | 2026.02.22-23.24 |
| REQ-RAMS-2.2    | 지역건보료 점수제(재산/소득) 모듈                                                                    | T-01-1.2.2            | TEST-TAX-02                                                                                                     | Done        | 98348ee    | 2026.02.22-03.34 |
| LEGACY-RAMS-2.3 | 법인 vs 개인 타당성 분석 로직                                                                        | T-01-2.1.2            | TEST-TAX-03                                                                                                     | Done        | 986d124    | 2026.02.22-03.58 |
| REQ-RAMS-3.1    | 연령 기반 Phase 자동 스위칭 엔진                                                                     | T-01-3.1              | TEST-PHS-01                                                                                                     | Done        | 08423af    | 2026.02.22-19.42 |
| LEGACY-RAMS-3.2 | 인플레이션 및 자산 수익률 복리 엔진                                                                  | T-01-3.2              | TEST-SUR-01                                                                                                     | Done        | 3a741f4    | 2026.02.22-04.01 |
| REQ-RAMS-3.3    | 30년 생애 주기 프로젝션 엔진                                                                         | T-01-3.2.1            | TEST-SUR-01                                                                                                     | Done        | 3a741f4    | 2026.02.22-04.01 |
| LEGACY-RAMS-3.3 | Tier Cascade Engine (상태 머신)                                                                      | T-01-2.1              | TEST-CSC-01                                                                                                     | Done        | 46b0de0    | 2026.02.22-03.47 |
| REQ-RAMS-6.1    | 실시간 이벤트 트리거 및 Health Monitor                                                               | T-01-2.1.1            | TEST-TRG-01                                                                                                     | Done        | a5fad29    | 2026.02.22-13.26 |
| REQ-RAMS-5.2    | 표준 스트레스 테스트 시나리오 엔진                                                                   | T-01-3.1              | TEST-STR-01                                                                                                     | Done        | fe258b7    | 2026.02.22-12.11 |
| REQ-RAMS-7.1    | 시뮬레이션 정밀 검증 UI (상세 로그)                                                                  | T-06-6.1.1            | TEST-UX-LOG                                                                                                     | Done        | f605a94    | 2026.04.15-14.13 |
| REQ-RAMS-7.4    | Scenario Snapshot (은퇴일 스냅샷)                                                                    | T-01-3.3              | TEST-SNP-01                                                                                                     | Done        | 0bd7273    | 2026.02.22-12.18 |
| REQ-RAMS-4.1    | 리밸런싱 트리거 및 세무 마찰 비용 엔진                                                               | T-01-4.1              | TEST-REB-01                                                                                                     | Done        | fe92271    | 2026.02.22-13.30 |
| REQ-RAMS-1.7    | 계좌별 4단계 전략 카테고리 구조                                                                      | T-01-9.1.1            | TEST-RAMS-1.7                                                                                                   | Done        | 5029b04    | 2026.04.16-16.24 |
| REQ-RAMS-2.3    | 법인 현금흐름과 주주대여금 반환 분리                                                                 | T-01-9.2.1            | TEST-TAX-03                                                                                                     | Done        | 5b73a18    | 2026.04.16-12.17 |
| REQ-RAMS-3.2    | 연 1회 전략 매도 및 역할 하한선 상태 머신                                                            | T-01-9.3.1            | TEST-SUR-02                                                                                                     | Done        | 5b73a18    | 2026.04.16-12.17 |
| D-RAMS-3.2.1    | OS v11.1 기준 5카테고리 분리, 5월/11월 운영 캘린더, 자산군별 PA/DY/TR 독립 적용으로 은퇴 엔진 재정렬 | T-01-10.1 ~ T-01-10.7 | TEST-RAMS-1.7.4 / TEST-SUR-02 ~ TEST-SUR-09                                                                     | Done        | -          | 2026.05.05-19.20 |
| D-RAMS-3.2.2    | 문서 기준 실측 대조를 위한 실사용 API 경로 정합화 및 잔여 운영규칙 갭 정리                           | T-01-11.1 ~ T-01-11.4 | TEST-RAMS-1.2.1 / TEST-SUR-08 / TEST-API-INT / TEST-SUR-10 / TEST-SUR-11 / TEST-SUR-12 / TEST-SUR-13 / TEST-SUR-14 / TEST-SUR-15 | Done        | -          | 2026.05.14 |
| D-RAMS-3.2.3    | 세후 가계현금흐름 기준으로 법인 급여/주주대여금/법인필요비용 모델을 재정의                           | T-01-12.1 ~ T-01-12.4 | TEST-TAX-04 / TEST-TAX-05 / TEST-TAX-06 / TEST-SUR-03 / TEST-UI-RULE-08 / TEST-UI-RULE-09 / TEST-UI-RULE-10 / TEST-UI-RULE-11 | Done        | -          | 2026.05.14 |
| D-RAMS-3.2.4    | 장기 시뮬레이션 PA 월 변환을 단순 월분할에서 복리 월변환으로 정밀화                                  | T-01-14.1              | TEST-SUR-08 / TEST-MATH-01                                                                                      | Done        | f5823f9    | 2026.05.15 |
| D-RAMS-3.3.1    | 비현금 카테고리 분배금 run-rate를 가격 평가액과 분리하고 성장/Stress 삭감 규칙을 엔진 내부에 추가   | T-01-15.1.1 ~ T-01-15.1.3 | TEST-SUR-08                                                                                                  | Done        | ca27fb4    | 2026.05.15 |
| D-RAMS-3.3.2    | 리밸런싱/이체 시 source run-rate 비례 감소와 target 구조적 DY 기반 run-rate 신규 생성을 적용         | T-01-15.1.4 ~ T-01-15.1.6 | TEST-SUR-08                                                                                                   | Done        | 6db403f    | 2026.05.16 |
| D-RAMS-3.3.3    | 분배금 성장률/Stress 삭감률의 retirement config/API/Settings UI 노출                                | T-01-16.1.1 ~ T-01-16.1.3 | TEST-API-RET-10 / TEST-UI-RULE / E2E                                                                         | Done        | -          | 2026.05.18 |
| D-RAMS-3.3.4    | 신규 매수분 구조적 DY override(`distribution_yield_overrides`)의 retirement config/API/Settings 노출 | T-01-16.1.4 ~ T-01-16.1.5 | TEST-API-RET-11 / TEST-UI-RULE / E2E                                                                         | Done        | -          | 2026.05.18 |
| REQ-RAMS-8.1    | 전략 파라미터 사용자 설정화                                                                          | T-01-9.4.1            | TEST-UI-RULE-01                                                                                                 | Done        | 8e9f885    | 2026.04.16-11.40 |
| D-RAMS-8.1.1    | Settings Assumptions 영역의 테스트 전용 프리셋 노출 제거 및 활성 프리셋 정규화                       | T-01-9.4.2            | TEST-UI-RULE-07                                                                                                 | Done        | 1abf653    | 2026.04.16-21.46 |
| D-RAMS-8.1.2    | 월 필요 생활비 입력 누락으로 인한 저지출 시뮬레이션 오인 방지 및 Settings 노출 보강                  | T-01-9.4.4            | TEST-UI-RULE-08                                                                                                 | Done        | 1f34368    | 2026.04.16-22.00 |
| D-RAMS-8.1.3    | Projection Result에서 실제 적용 중인 월 필요 생활비 배지 노출                                        | T-01-9.4.5            | TEST-UI-RULE-09                                                                                                 | Done        | dffc4e6    | 2026.04.16-22.10 |
| D-RAMS-8.1.4    | v11.1 전략 설정 전체 노출 및 `rebalance_month` 동적 캘린더 연동                                     | T-01-13.1 ~ T-01-13.2 | TEST-SUR-14 / TEST-UI-RULE-05                                                                                   | Done        | a4e292d / aa181a7 | 2026.05.15 |
| D-RAMS-8.1.4a   | Settings 전략 규칙 섹션에 OS v11.1 핵심 운용 정책 설명 카드 추가                                   | T-01-13.2.4           | TEST-UI-RULE-05a                                                                                                | Done        | -          | 2026.05.20 |
| D-RAMS-8.1.5    | Settings의 미사용 trigger 설정을 활성 입력에서 제거하거나 미적용 상태로 명시                         | T-01-17.1             | TEST-UI-RULE-12                                                                                                 | Done        | -          | 2026.05.18 |
| D-RAMS-8.1.6    | retirement simulate API의 dead params와 stress scenario ghost 계약 정리                              | T-01-17.2 ~ T-01-17.4 | TEST-API-RET-09                                                                                                 | Done        | -          | 2026.05.18 |
| D-RAMS-8.1.7    | frontend legacy `monthly_fixed_cost` 및 defaults legacy strategy fields 정리                         | T-01-17.5 ~ T-01-17.6 | TEST-UI-RULE-12 / TEST-RAMS-1.2.1                                                                               | Done        | -          | 2026.05.18 |
| D-RAMS-8.1.8    | 비표준 프로필 TR override의 정적 PA 배율 스케일링 제거                                               | T-01-18.1 ~ T-01-18.3 | TEST-SUR-09                                                                                                      | Done        | a8f2800    | 2026.05.18 |

---

## 2. Portfolio Manager Domain (02)

| 요구사항 ID  | 상세 작업 명세                                                     | 태스크 ID             | 테스트 ID                   | 상태        | Git Commit | 완료 일시        |
| :----------- | :----------------------------------------------------------------- | :-------------------- | :-------------------------- | :---------- | :--------- | :--------------- |
| REQ-PRT-01   | 포트폴리오 설계 및 비중 관리 (Designer)                            | T-02-2.1              | TEST-PRT-01                 | Done        | 0bd7273    | 2026.02.22-12.18 |
| REQ-WCH-01.8 | 시스템 기본 관심종목 보장 및 보호 (System Default)                 | T-02-1.2              | TEST-WCH-01                 | Done        | a93aacb    | 2026.04.16-18.00 |
| REQ-WCH-02.6 | 관심종목에서 포트폴리오 추가 후 현재 탭 유지                       | T-02-2.5.4            | TEST-WCH-02                 | Done        | 087517f    | 2026.05.18       |
| REQ-PRT-02   | Watchlist 유기적 연동 및 종목 이관                                 | T-02-3.1              | TEST-PRT-02                 | Done        | f605a94    | 2026.04.15-14.13 |
| REQ-PRT-03   | 통화 이원화 및 실시간 시뮬레이션 엔진                              | T-02-2.2              | TEST-PRT-03                 | Done        | 7c5af70    | 2026.04.15-16.34 |
| D-PRT-03.1.1 | Portfolio Designer 시뮬레이션 투자금을 은퇴 설정의 계좌별 KRW 투자금 기준으로 전환 | T-02-2.2.1a           | TEST-PRT-03.1.1             | Done        | -          | 2026.05.19       |
| REQ-PRT-03.4 | 카테고리별/전체 분석 결과 보고                                     | T-02-2.2.2            | TEST-PRT-03                 | Done        | f674f26    | 2026.04.15-16.23 |
| REQ-PRT-04.1 | 포트폴리오 저장 (Corporate/Pension)                                | T-02-1.1.1            | TEST-PRT-04                 | Done        | bd97ad2    | 2026.04.15-15.43 |
| REQ-PRT-04.2 | 저장 리스트 및 편집/이름변경/복제                                  | T-02-7.2              | TEST-PRT-04                 | Done        | bd97ad2    | 2026.04.15-15.43 |
| REQ-PRT-06   | 비교 대시보드 및 시각화 고도화(Radar)                              | T-02-6.1              | TEST-PRT-06                 | Done        | f674f26    | 2026.04.15-16.23 |
| D-PRT-06.4.1 | 설계 화면 및 관리/비교 화면의 월별 배당금 그래프 확장, 마스터 전략 다중 비교 지원 | T-02-2.2.3 / T-02-4.2.2 | TEST-PRT-03.6 / TEST-PRT-06.4.1 | Done        | -          | 2026.05.18 |
| REQ-PRT-07   | UI 가독성(Sub-Tabs) 및 명칭(Corporate) 강화                        | T-02-5.1              | TEST-PRT-07                 | Done        | 23abcca    | 2026.04.15-13.36 |
| REQ-PRT-08   | 마스터 전략(Master Strategy) 구성 및 관리                          | T-02-8.1              | TEST-RAMS-1.5               | Done        | 23abcca    | 2026.04.15-13.36 |
| REQ-PRT-08.6 | 시스템 기본 번들 보장 및 보호 (System Default)                     | T-02-8.6              | TEST-RAMS-1.5               | Done        | 21955e3    | 2026.04.16-17.40 |
| D-PRT-08.7   | 저장된 마스터 전략/개별 포트폴리오 이름 변경 경로 보강             | T-02-8.4 / T-02-7.2.3 | TEST-PRT-04 / TEST-PRT-09.4 | Done        | -          | 2026.05.04       |
| REQ-PRT-09   | 실시간 환율 동기화 및 캐싱 시스템                                  | T-02-9.1              | TEST-PRT-09                 | Done        | 7c5af70    | 2026.04.15-16.34 |
| REQ-GLB-01   | 수익률 지표 표준화 (DY 중심 & PA 가산 모델) 및 설정 저장 버그 수정 | T-GLB-10.1            | TEST-GLB-10                 | Done        | a7f2b1d    | 2026.04.15-19.10 |
| REQ-PRT-01.1 | 계좌별 4단 전략 카테고리 편집기                                    | T-02-10.2.1           | TEST-PRT-01                 | Done        | 04bd94d    | 2026.04.16-02.22 |

---

## 3. Global Standards Domain (00)

| 요구사항 ID  | 상세 작업 명세                                | 태스크 ID    | 테스트 ID        | 상태        | Git Commit        | 완료 일시        |
| :----------- | :-------------------------------------------- | :----------- | :--------------- | :---------- | :---------------- | :--------------- |
| REQ-GLB-11.1 | Feature 단위 품질 게이트 명시화               | T-GLB-11.1   | TEST-SYS-QG-01   | Done        | 04bd94d           | 2026.04.16-02.22 |
| REQ-GLB-11.2 | Frontend Prettier 생성물 제외 설정            | T-GLB-11.2.1 | TEST-SYS-QG-02   | Done        | 04bd94d           | 2026.04.16-02.22 |
| REQ-GLB-11.3 | 전역 black/mypy 부채 정비 계획 수립           | T-GLB-11.3   | TEST-SYS-QG-04   | Done        | 06750bc           | 2026.04.16-16.37 |
| REQ-SYS-02.4 | Playwright 백엔드 상태 snapshot/restore 격리  | T-GLB-11.4.1 | TEST-SYS-2.2.2   | Done        | d665e97           | 2026.04.16-17.02 |
| REQ-SYS-05   | UI 다국어 지원 (ko/en)                        | T-GLB-12.5   | TEST-SYS-I18N-03 | Done        | fcf36b4           | 2026.04.17-15.50 |
| D-GLB-12.5.2a | Watchlist 상태/에러/확인 메시지 번역 키 이관 | T-GLB-12.5.2a | TEST-SYS-I18N-05 | Done | - | 2026.06.26 |
| D-GLB-12.5.2b | Portfolio/Retirement 상태/에러/확인 메시지 번역 키 이관 | T-GLB-12.5.2b | TEST-SYS-I18N-06 | Done | - | 2026.06.26 |
| D-GLB-13.2.2 | 국민연금 Settings UI 보강 구현 상태 문서 정합화 | T-GLB-13.2.2 | TEST-SYS-STR-01 | Done | - | 2026.06.26 |
| REQ-GLB-13   | 자산군별 기대주가상승률 차등화 및 용어 표준화 | T-GLB-13.1   | TEST-SYS-STR-01  | Done        | 2830367           | 2026.04.17-18.15 |
| D-GLB-13.4 | 자산군별 PA 차등 적용 및 국민연금 입력값 결과 반영 검증 | T-GLB-13.4 | TEST-SYS-STR-05 / TEST-SYS-STR-06 | Done | - | 2026.06.26 |
| REQ-GLB-16   | 자산군별 PA 시나리오 3중화 (Phase 1)          | T-GLB-16.1 ~ T-GLB-16.4 | TEST-SYS-STR-02 / TEST-SYS-STR-03 | Done | 2608b2d           | 2026.05.15       |
| D-GLB-18.1 | 레거시 Kivy 테스트 제거, API 상태 격리 및 설정 병합 우선순위 정상화 | T-GLB-18 | TEST-GLB-18 | Done | - | 2026.06.22 |
| REQ-SYS-03.5 | 공개 저장소 기본값과 로컬 런타임 데이터 분리  | T-GLB-14.1   | TEST-SYS-1.3.2   | Done        | 75902aa           | 2026.04.25-01.42 |
| REQ-SYS-03.6 | 공개 저장소 진입 문서 및 레거시 자산 정리     | T-GLB-15.1   | TEST-SYS-QG-04   | Done        | 0cef9b8 / 1dc1cb1 | 2026.04.25-23.47 |
| REQ-SYS-02.3 | Antigravity CLI 마이그레이션                  | T-GLB-17.1   | TEST-SYS-MIG-01  | Done        | -                 | 2026-06-12       |

---

## 4. Cost Comparison Simulator Domain (02)

| 요구사항 ID | 상세 작업 명세                                                               | 태스크 ID   | 테스트 ID    | 상태        | Git Commit | 완료 일시        |
| :---------- | :--------------------------------------------------------------------------- | :---------- | :----------- | :---------- | :--------- | :--------------- |
| REQ-CCS-1   | 개인운용 vs 법인운용 비교 공정성 및 동일 TR 강제                             | T-CCS-1.2   | TEST-CCS-13  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-3   | 사용자 설정 기간 기반 단년/누적 비교                                         | T-CCS-3.4   | TEST-CCS-45  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-10  | 가구 프로필 입력 모델                                                        | T-CCS-2.2.1 | TEST-CCS-01  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-12  | 부동산을 건보료용 재산으로만 반영                                            | T-CCS-2.2.2 | TEST-CCS-21  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-14  | 개인연금 자산 별도 고정자산 처리                                             | T-CCS-2.2.2 | TEST-CCS-23  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-20  | 활성 master portfolio 기반 기준 포트폴리오                                   | T-CCS-3.1.1 | TEST-CCS-10  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-23  | `TR = DY + PA` 계산 및 표시                                                  | T-CCS-3.1.2 | TEST-CCS-12  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-30  | 개인운용 100% 시나리오 계산                                                  | T-CCS-3.2   | TEST-CCS-20  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-32  | 개인운용 지역건보료 계산                                                     | T-CCS-3.2.2 | TEST-CCS-21  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-40  | 법인운용 100% 시나리오 계산                                                  | T-CCS-3.3   | TEST-CCS-30  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-42  | 급여 수령자 최대 4명 설정                                                    | T-CCS-2.2.3 | TEST-CCS-31  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-43  | 직장건강보험료 총가구 비용 반영                                              | T-CCS-3.3.2 | TEST-CCS-32  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-46  | 주주대여금 상환 모델                                                         | T-CCS-3.3.4 | TEST-CCS-35  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-50  | 핵심 KPI 비교 카드                                                           | T-CCS-6.1   | TEST-CCS-40  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-54  | 비용/차이 항목 분해                                                          | T-CCS-3.5.2 | TEST-CCS-43  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-60  | 독립 탭 제공                                                                 | T-CCS-5.1   | TEST-CCS-50  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-63  | 비용 분해 차트                                                               | T-CCS-6.2   | TEST-CCS-53  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-64  | 순현금흐름 워터폴                                                            | T-CCS-6.3   | TEST-CCS-54  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-65  | 기간 누적 비교 그래프                                                        | T-CCS-6.4   | TEST-CCS-55  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-70  | 비교 시뮬레이터 설정 영속성                                                  | T-CCS-4.1   | TEST-CCS-01  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-72  | 테스트 상태 격리                                                             | T-CCS-7.3.4 | TEST-CCS-04  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-80  | 정책 수치 출처 명시                                                          | T-CCS-4.3.2 | TEST-CCS-61  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-81  | 기준 연도 노출                                                               | T-CCS-4.3.1 | TEST-CCS-60  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-82  | 추정치 경고 노출                                                             | T-CCS-6.5.3 | TEST-CCS-62  | Done        | 531a8fb    | 2026.04.20-15.55 |
| REQ-CCS-4.1 | 비교 모드 스위처 (Target vs Asset)                                           | T-CCS-9.3.1 | TEST-CCS-90  | Done        | 3a4d33a    | 2026.04.23-14.30 |
| REQ-CCS-55  | 상세 비용 감사(Audit) 내역 패널                                              | T-CCS-9.3.2 | TEST-CCS-91  | Done        | 3a4d33a    | 2026.04.23-14.30 |
| REQ-CCS-95  | Asset-driven 순방향 계산 모델                                                | T-CCS-9.1.1 | TEST-CCS-92  | Done        | 3a4d33a    | 2026.04.23-14.30 |
| REQ-CCS-3.3 | 30년 장기 프로젝션 연동                                                      | T-CCS-9.1.3 | TEST-CCS-93  | Done        | 3a4d33a    | 2026.04.23-14.30 |
| D-CCS-9.3.3 | Asset-driven 모드 wiring 및 KPI 단위 표기 회귀 수정                          | T-CCS-9.3.3 | TEST-CCS-94  | Done        | 5362208    | 2026.04.25-01.11 |
| D-CCS-9.3.4 | 개인 Asset-driven 장기 시계열 이중 계산 회귀 수정                            | T-CCS-9.3.4 | TEST-CCS-95  | Done        | 5362208    | 2026.04.25-01.11 |
| D-CCS-9.3.5 | 비교 결과 우열 문구 명시성 강화                                              | T-CCS-9.3.5 | TEST-CCS-96  | Done        | 5362208    | 2026.04.25-01.11 |
| D-CCS-9.3.6 | 우열 판정 기준을 순현금흐름으로 재정렬하고 주주대여금 상환 driver 제거       | T-CCS-9.3.6 | TEST-CCS-97  | Done        | 5362208    | 2026.04.25-01.11 |
| D-CCS-9.3.7 | 목표/자산 기반 공통 비교 철학을 `개인 순현금 vs 법인 순현금 + 순급여`로 통일 | T-CCS-9.3.7 | TEST-CCS-98  | Done        | 5362208    | 2026.04.25-01.11 |
| D-CCS-9.3.8 | 비용 비교 화면의 기본 모드, 입력/결과 분리, 최소 11px 타이포 규칙 정비       | T-CCS-9.3.8 | TEST-CCS-99  | Done        | 3c810cb    | 2026.04.25-18.43 |
| D-CCS-9.3.9 | 2026년 법인세율 및 지방소득세 포함 실효세율 반영                             | T-CCS-9.3.9 | TEST-CCS-100 | Done        | -          | 2026.05.01       |
| D-CCS-10.1  | 저장된 Master Portfolio 기반 비용 비교 실행                                  | T-CCS-10.1  | TEST-CCS-101 | Done        | 138a5b8    | 2026.05.18       |
| D-CCS-11.1  | 법인 운영비 입력을 월 기장비와 연 법인세 조정료로 분리                       | T-CCS-11.1  | TEST-CCS-102 | Done        | c14857f    | 2026.05.18       |
| D-CCS-12.1  | 배당·미실현 PA·리밸런싱 실현차익 분리 및 건보/세금 반영 정정                | T-CCS-12    | TEST-CCS-103 | Done        | -          | 2026.06.12       |
| D-RAMS-19.1 | 개인 일반계좌 및 실제 거래 이벤트/취득원가 원장 | T-01-19 | TEST-SUR-16 / TEST-SUR-17 | Done | 78021e9 | 2026.06.19 |
| D-RAMS-20.1 | 개인운용 활성 마스터 계좌 경계, 가계 현금흐름 및 통합 수익률 정합화 | T-01-20 | TEST-SUR-18 | Done | - | 2026.06.21 |
| D-RAMS-21.1 | 미국 상장 개인계좌 배당·양도세·금융소득 종합과세·지역건보 시차 원장 | T-01-21 | TEST-SUR-19 ~ 21 | Done | - | 2026.06.21 |
| D-RAMS-22.1 | 개인 세금 연도별 감사표와 세금 재원 매도 추적 | T-01-22 | TEST-SUR-22 / 23 | Done | 076acbe | 2026.06.22 |
| D-RAMS-23.1 | 개인운용 Retirement 활성 계좌·가계 인출·Stress·미충족 KPI 정합화 | T-01-23 | TEST-SUR-24 ~ 28 / TEST-UI-RULE-13 | Done | 5bce073 | 2026.06.22 |
| D-RAMS-24.1 | Operating Account 단일 가계 인출·공통 버퍼·법인 과세 지급 정합화 | T-01-24 | TEST-SUR-29 ~ 32 / TEST-UI-RULE-14 ~ 15 | Done | - | 2026.06.22 |
| D-RAMS-25.1 | 금융소득 종합과세 소득세법 제62조 비교과세 정합화 | T-01-25 | TEST-SUR-19 | Done | - | 2026.06.22 |
| D-RAMS-26.1 | 실현·미실현 과세 경계 및 Cost Comparison 세금/리밸런싱 엔진 단일화 | T-01-26 | TEST-SUR-33 ~ 35 | Done | - | 2026.06.22 |
| D-RAMS-27.1 | Operating Account 공통 컴포넌트화 및 Corporate/Personal 운용 동등성 | T-01-27 | TEST-SUR-36 ~ 38 | Done | - | 2026.06.23 |
| D-PRT-11.1 | 개인 일반계좌 Portfolio Designer/Master/Retirement UI 통합 | T-02-11 | TEST-PRT-10 | Done | - | 2026.06.19 |
| D-PRT-12.1 | 법인운용과 개인운용의 마스터 전략 동시 구성 금지 및 기존 개인 리밸런싱 전략 재사용 | T-02-12 | TEST-PRT-11 | Done | - | 2026.06.21 |
| D-PRT-13.1 | Corporate/Personal 버퍼 개월수 환산 분모를 공통 가계 필요액으로 통일 | T-02-13 | TEST-PRT-12 | Done | - | 2026.06.22 |
| D-CCS-13.1 | 고정 매도비율 폐기 및 실제 리밸런싱 매도 연동 | T-CCS-13 | TEST-CCS-104 | Done | - | 2026.06.13 |
| D-CCS-14.1 | 지역건보 재산 60등급·소득월액·장기요양 공식 산식 정합화 | T-CCS-14 | TEST-CCS-105 | Done | - | 2026.06.20 |
| D-CCS-15.1 | Cost Comparison 비교과세 및 Operating Portfolio 엔진 단일화 | T-CCS-15 | TEST-CCS-106 | Done | - | 2026.06.22 |

---

_마지막 업데이트: 2026-06-21_
