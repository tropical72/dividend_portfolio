# Traceability Matrix (Master Task List)

이 문서는 요구사항(Requirement)부터 구현(Task), 그리고 검증(Test)까지의 전체 생명주기를 추적합니다. 모든 항목은 SDD(Spec-Driven Development) 원칙에 따라 상호 연결됩니다.

---

## 1. Watchlist Domain (01)

| 요구사항 ID | 요구사항 명세 (Requirement) | 구현 태스크 (Task ID) | 테스트 케이스 (Test ID) | 상태 | 검증 | Git Commit |
|:---|:---|:---|:---|:---|:---|:---|
| **[REQ-WCH-01]** | **종목 추가 및 기본 관리** | | | | | |
| REQ-WCH-01.1 | 티커 입력을 통한 종목 추가 | T-01-1.1 | test_watchlist_api.py | Done | Pass | 127ab60 |
| REQ-WCH-01.6 | 다중 선택 및 일괄 삭제 | T-01-2.6 | watchlist_multi.spec.ts | Done | Pass | fb3841d |
| REQ-WCH-01.7 | 스마트 티커 자동 감지 (Alphanumeric) | T-01-1.1 | - | Done | Pass | af62402 |
| **[REQ-WCH-02]** | **사용자 경험 (UX) 강화** | | | | | |
| REQ-WCH-02.1 | 로딩 상태 표시 (Add...) | T-01-2.2 | watchlist.spec.ts | Done | Pass | 784a83c |
| REQ-WCH-02.4 | 삭제 전 확인 다이얼로그 | T-01-2.5 | watchlist_ux.spec.ts | Done | Pass | 2c4a169 |
| **[REQ-WCH-03]** | **데이터 표시 및 정합성** | | | | | |
| REQ-WCH-03.5 | 통화 단위 명시 (USD/KRW) | T-01-2.4 | - | Done | Pass | fb3841d |
| REQ-WCH-03.6 | 컬럼 정합성 (Last Amt 추가) | T-01-2.4 | - | Done | Pass | fb3841d |
| REQ-WCH-03.7 | 수익률 방식 명시 (TTM) | T-01-2.4 | - | Done | Pass | fd7c5d4 |
| REQ-WCH-03.8 | 종목명 가독성 보장 (줄바꿈 및 너비) | T-01-2.4 | - | Done | Pass | (Pending) |
| **[REQ-WCH-04]** | **배당 데이터 보정 및 판별** | | | | | |
| REQ-WCH-04.1 | DART API Source of Truth 적용 | T-01-1.5 | test_stock_api.py | Done | Pass | 2c4a169 |
| REQ-WCH-04.2 | 한국식 배당 주기 (분기/반기) 보정 | T-01-1.5 | test_stock_api.py | Done | Pass | 2c4a169 |
| REQ-WCH-04.4 | 배당 주기 판별 고도화 (공시 키워드) | T-01-1.5 | - | Done | Pass | af62402 |
| REQ-WCH-04.5 | 신규 종목 데이터 불충분 표기 (New) | T-01-1.5 | - | Done | Pass | ab7bf11 |

---

## 2. Portfolio Domain (02)

| 요구사항 ID | 요구사항 명세 (Requirement) | 구현 태스크 (Task ID) | 테스트 케이스 (Test ID) | 상태 | 검증 | Git Commit |
|:---|:---|:---|:---|:---|:---|:---|
| REQ-PRT-01.1 | 포트폴리오 생성 및 기본 정보 설정 | T-02-1.1 | test_persistence_api.py | Pending | - | - |
| REQ-PRT-03.1 | USD/KRW 통합 자산 평가 | T-02-1.2 | - | Pending | - | - |

---

## 3. System Core (00)

| 요구사항 ID | 요구사항 명세 (Requirement) | 구현 태스크 (Task ID) | 테스트 케이스 (Test ID) | 상태 | 검증 | Git Commit |
|:---|:---|:---|:---|:---|:---|:---|
| REQ-SYS-01.1 | 사용자 설정 저장 (API Key 등) | T-00-2.3 | settings.spec.ts | Done | Pass | 188d02f |

---

## 4. Defects & Regressions (D)

| 결함 ID | 결함 설명 (Defect Description) | 수정 태스크 | 관련 요구사항 | 상태 | 검증 | Git Commit |
|:---|:---|:---|:---|:---|:---|:---|
| **[D-03]** | 한국 월배당 ETF 데이터 누락 (수익률 0%) | T-01-1.5 | REQ-WCH-04.2 | Fixed | Pass | 2056f83 |
| **[D-04]** | 테이블 컬럼 누락 및 통화 단위 미표시 | T-01-2.4 | REQ-WCH-03.5 | Fixed | Pass | fb3841d |
| **[D-05]** | 한국 종목 배당 주기 판별 오류 (Annually 오판) | T-01-1.5 | REQ-WCH-04.4 | Fixed | Pass | af62402 |

---

## 문서 관리 규칙
1. **ID 정합성:** 모든 요구사항 ID는 각 도메인의 `requirement.md`와 일치해야 합니다.
2. **테스트 필수:** 검증(Verification)이 `Pass`가 되기 위해서는 자동화된 테스트 케이스가 반드시 존재해야 합니다.
3. **업데이트 시점:** 기능 구현(Green) 완료 직후, 커밋 승인 요청 전에 본 문서를 최신화합니다.

*마지막 업데이트: 2026-02-21*
