# Traceability Matrix (Master Task List)

이 문서는 요구사항(Requirement)부터 구현(Task), 그리고 검증(Test)까지의 전체 생명주기를 추적합니다. 모든 항목은 SDD(Spec-Driven Development) 원칙에 따라 상호 연결됩니다.

---

## 1. Watchlist Domain (01)

| 요구사항 ID | 요구사항 명세 (Requirement) | 구현 태스크 (Task ID) | 테스트 케이스 (Test ID) | 상태 | 검증 | Git Commit |
|:---|:---|:---|:---|:---|:---|:---|
| **[REQ-WCH-01]** | **종목 추가 및 기본 관리** | | | | | |
| REQ-WCH-01.1 | 티커 입력을 통한 종목 추가 | T-01-1.1 | test_watchlist_api.py | Done | Pass | 127ab60 |
| REQ-WCH-01.2 | 추가 전 데이터 유효성 검증 | T-01-1.1 | test_watchlist_api.py | Done | Pass | 127ab60 |
| REQ-WCH-01.3 | 중복 종목 추가 방지 | T-01-1.1 | test_watchlist_api.py | Done | Pass | 127ab60 |
| REQ-WCH-01.6 | 다중 선택 및 일괄 삭제 | T-01-2.6 | watchlist_multi.spec.ts | Done | Pass | fb3841d |
| **[REQ-WCH-02]** | **사용자 경험 (UX) 강화** | | | | | |
| REQ-WCH-02.1 | 로딩 상태 표시 (Add...) | T-01-2.2 | watchlist.spec.ts | Done | Pass | 784a83c |
| REQ-WCH-02.3 | 상태 알림 토스트 (Toast) | T-01-2.2 | watchlist.spec.ts | Done | Pass | 784a83c |
| REQ-WCH-02.4 | 삭제 전 확인 다이얼로그 | T-01-2.5 | watchlist_ux.spec.ts | Done | Pass | 2c4a169 |
| REQ-WCH-02.5 | 컨텍스트 메뉴 (우클릭 삭제) | T-01-2.4 | watchlist_ux.spec.ts | Done | Pass | 188d02f |
| **[REQ-WCH-03]** | **데이터 표시 및 정렬** | | | | | |
| REQ-WCH-03.1 | 필수 데이터 필드 보강 | T-01-1.3 | test_stock_api.py | Done | Pass | a209741 |
| REQ-WCH-03.2 | 배당 주기 및 지급월 분석 | T-01-1.4 | test_stock_api.py | Done | Pass | d8bc2cc |
| REQ-WCH-03.3 | 테이블 컬럼 정렬 기능 | T-01-2.4 | watchlist_ux.spec.ts | Done | Pass | 188d02f |
| **[REQ-WCH-04]** | **한국 종목 데이터 특화 (DART)** | | | | | |
| REQ-WCH-04.1 | DART API Source of Truth 적용 | T-01-1.5 | test_stock_api.py | Done | Pass | 2c4a169 |
| REQ-WCH-04.2 | 한국식 배당 주기 (분기/반기) 보정 | T-01-1.5 | test_stock_api.py | Done | Pass | 2c4a169 |

---

## 2. Portfolio Domain (02)

| 요구사항 ID | 요구사항 명세 (Requirement) | 구현 태스크 (Task ID) | 테스트 케이스 (Test ID) | 상태 | 검증 | Git Commit |
|:---|:---|:---|:---|:---|:---|:---|
| **[REQ-PRT-01]** | **포트폴리오 자산 배분 구조** | | | | | |
| REQ-PRT-01.1 | 포트폴리오 생성 및 기본 정보 설정 | T-02-1.1 | test_persistence_api.py | Pending | - | - |
| REQ-PRT-01.2 | 3단 카테고리 (Growth/Income/Buffer) | T-02-2.1 | - | Pending | - | - |
| **[REQ-PRT-03]** | **통화 및 비중 계산 엔진** | | | | | |
| REQ-PRT-03.1 | USD/KRW 통합 자산 평가 | T-02-1.2 | - | Pending | - | - |
| REQ-PRT-03.3 | 자산 비중 자동 계산 (0~100%) | T-02-1.2 | - | Pending | - | - |

---

## 3. System Core (00)

| 요구사항 ID | 요구사항 명세 (Requirement) | 구현 태스크 (Task ID) | 테스트 케이스 (Test ID) | 상태 | 검증 | Git Commit |
|:---|:---|:---|:---|:---|:---|:---|
| **[REQ-SYS-01]** | **영속성 및 환경 설정** | | | | | |
| REQ-SYS-01.1 | 사용자 설정 저장 (API Key 등) | T-00-2.3 | settings.spec.ts | Done | Pass | 188d02f |
| REQ-SYS-01.2 | 데이터 자동 백업 및 복구 | T-00-1.1 | test_persistence_api.py | Done | Pass | 127ab60 |

---

## 문서 관리 규칙
1. **ID 정합성:** 모든 요구사항 ID는 각 도메인의 `requirement.md`와 일치해야 합니다.
2. **테스트 필수:** 검증(Verification)이 `Pass`가 되기 위해서는 자동화된 테스트 케이스가 반드시 존재해야 합니다.
3. **업데이트 시점:** 기능 구현(Green) 완료 직후, 커밋 승인 요청 전에 본 문서를 최신화합니다.

*마지막 업데이트: 2026-02-21*
