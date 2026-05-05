# Test Cases: Retirement Asset Management System (RAMS)

## 1. 개요 및 테스트 전략
본 문서는 은퇴 시뮬레이션 엔진(Retirement Engine)의 정밀도와 신뢰성을 검증하기 위한 테스트 시나리오를 정의한다. 특히 **포트폴리오 매니저 데이터 통합(REQ-RAMS-1.4)**에 따른 데이터 흐름과 세무 엔진과의 정합성을 집중 검증한다.

---

## 2. 도메인별 테스트 시나리오

### [Structure 1] 프로필 및 자산 데이터 (REQ-RAMS-1.1 ~ 1.4)
- **[TEST-RAMS-1.1] 사용자 프로필 연동:** 
    - 입력된 생년월일과 은퇴 시점이 엔진의 개월 수 계산에 정확히 반영되는지 확인.
- **[TEST-RAMS-1.2] 초기 자산 설정:** 
    - `retirement_config.json`의 초기 자산 값이 시뮬레이션 0개월 차 잔액과 일치하는지 확인.
- **[TEST-RAMS-1.3] 미래 자금 이벤트:** 
    - 특정 월(예: 60개월 후)에 설정된 지출 이벤트가 발생하여 해당 월의 잔액이 차감되는지 확인.
- **[TEST-RAMS-1.4] 포트폴리오 통합 연동 (Portfolio Integration):**
    - **[TEST-RAMS-1.4.1] 계좌 타입별 데이터 로드:** `portfolios.json`에 저장된 'Corporate'와 'Pension' 타입 포트폴리오가 각각 올바르게 추출되는지 확인.
    - **[TEST-RAMS-1.4.2] 가중 평균 수익률(WARR) 검증:** 특정 비중(예: VOO 50%, SCHD 50%)의 포트폴리오를 주입했을 때, 산출된 기대수익률이 수학적으로 정확한지 확인.
    - **[TEST-RAMS-1.4.3] Fallback 로직 검증:** 포트폴리오 데이터가 비어있을 때 시스템이 중단되지 않고 `Settings`의 기본값을 사용하는지 확인.
    - **[TEST-RAMS-1.4.4] 실시간 동기화:** 포트폴리오 수정 후 시뮬레이션 재실행 시 결과 값이 즉시 변경되는지 E2E 테스트.
    - **[TEST-RAMS-1.4.5] 포트폴리오 가시성(Visibility) 검증:**
        - 시뮬레이션 결과 화면 상단에 사용된 포트폴리오 명칭(예: "존6.0-STD-법인")과 배당률(예: "4.27%")이 배지 형태로 정확히 렌더링되는지 확인. (Playwright)
- **[TEST-RAMS-1.5] 마스터 포트폴리오(Master Portfolio) 검증:**
    - **[TEST-RAMS-1.5.1] 전략 선택 및 엔진 연동:** 활성화된 마스터 포트폴리오의 구성(Corp/Pen 조합)이 은퇴 시뮬레이션의 기초 데이터로 정확히 주입되는지 확인.
    - **[TEST-RAMS-1.5.2] 삭제 방지(Dependency):** 마스터 전략에서 사용 중인 개별 포트폴리오 삭제 시도 시 적절한 경고와 함께 차단되는지 확인.
    - **[TEST-RAMS-1.5.3] 가중 평균 수치 정확성:** 마스터 전략 리스트에 표시되는 전체 수익률/배당률이 구성된 포트폴리오들의 가중 평균과 일치하는지 확인.
- **[TEST-RAMS-1.6] 마스터 전략 퀵 스위처 및 삭제 보호 검증 [NEW]:**
    - **[TEST-RAMS-1.6.1] 실시간 전략 교체:** `Retirement` 탭에서 다른 전략 선택 시 `activate` API 호출 및 시뮬레이션 데이터 갱신 여부 확인.
    - **[TEST-RAMS-1.6.2] 활성 전략 삭제 차단:** `Portfolio Manager` 리스트에서 활성화된 전략 삭제 시도 시 차단 및 안내 메시지 노출 확인.
- **[TEST-RAMS-1.7] 전략 카테고리 구조 검증 [NEW]:**
    - **[TEST-RAMS-1.7.1] 계좌 공통 5카테고리 렌더링:** Corporate/Pension 모두 `SGOV Buffer/Bond Buffer/High Income/Dividend Growth/Growth Engine`이 정확히 렌더링되는지 확인.
    - **[TEST-RAMS-1.7.2] 사용자 종목 배치:** 사용자가 각 전략 카테고리에 종목을 추가/이동/삭제한 결과가 저장 및 재로드 후 유지되는지 확인.
    - **[TEST-RAMS-1.7.3] 엔진 연동 정합성:** 저장된 전략 카테고리 비중이 시뮬레이션 엔진의 5개 자산 버킷 초기값으로 정확히 반영되는지 확인.
    - **[TEST-RAMS-1.7.4] 카테고리 혼합 금지:** `Bond Buffer`, `High Income`, `Dividend Growth`, `Growth Engine`이 엔진 내부에서 동일 버킷으로 합쳐지지 않는지 확인.

### [Structure 2] 세무 및 수익성 엔진 (REQ-RAMS-2.1 ~ 2.3)
- **[TEST-TAX-01] 법인/개인 세무 산출:** 매월 발생하는 지역건보료와 법인 운영비가 자산에서 정확히 차감되는지 확인.
- **[TEST-TAX-02] 비과세 반환 로직:** 주주대여금 반환 시 세금이 발생하지 않고 순자산만 이동하는지 확인.
- **[TEST-TAX-03] 법인 현금 원천 검증 [NEW]:**
    - 법인 운영비와 주주대여금 반환이 먼저 법인 현금 버퍼에서 집행되고, 현금 부족 시에만 정의된 순서에 따라 자산 매도가 발생하는지 확인.
    - 배당/인컴이 자산 가치에 즉시 재투자되지 않고 현금 버퍼로 유입되는지 확인.
    - 리밸런싱 월에는 `fixed/high income -> dividend -> growth` 순서로 법인 자산 매도가 발생하는지 확인.

### [Structure 3] 생애 주기 시뮬레이션 (REQ-RAMS-3.1 ~ 3.3)
- **[TEST-PHS-01] Phase 자동 전환:** 설정된 나이(예: 65세)에 도달했을 때 Phase 1에서 Phase 2(연금 수령)로 자동 전환되는지 확인.
- **[TEST-SUR-01] 자산 고갈 시점 계산:** 기대수익률과 인플레이션을 반영하여 자산이 0이 되는 시점이 산술적으로 타당한지 확인.
- **[TEST-SUR-02] 5월/11월 정기점검 게이트 검증 [NEW]:**
    - 법인 `SGOV 30개월` 복구가 5월에만, `SGOV 27개월` 복구가 11월에만 발생하는지 확인.
    - 개인연금 정기 리밸런싱은 5월에만 실행되고 11월에는 실행되지 않는지 확인.
- **[TEST-SUR-03] Phase별 법인 부담 월지출 검증 [NEW]:**
    - Phase 1/2/3에서 법인 부담 월지출이 `총 필요금액 - 개인연금 - 국민연금` 공식대로 계산되는지 확인.
    - 총 필요금액은 자동 감소하지 않고 법인 부담액만 변하는지 확인.
- **[TEST-SUR-04] SGOV only 인출 검증 [NEW]:**
    - 평시 월 인출에서 `Bond Buffer`, `High Income`, `Dividend Growth`, `Growth Engine`이 직접 감소하지 않는지 확인.
- **[TEST-SUR-05] 개인연금 floor breach 중간보충 검증 [NEW]:**
    - 개인연금 `SGOV Buffer`가 12개월 미만이 되면 `Bond Buffer`에서 우선 보충되고, 다른 카테고리는 즉시 매도되지 않는지 확인.
- **[TEST-SUR-06] Shock / Crash20 / Stress 검증 [NEW]:**
    - 주식성 슬리브가 직전 5월 기준 대비 20% 이상 하락하면 Shock Flag가 ON 되는지 확인.
    - Stress가 월말 숫자가 아니라 5월 A/B/C 테스트 결과로만 판정되는지 확인.
    - Shock Flag는 5월 정기점검에서만 해제되는지 확인.
- **[TEST-SUR-07] 인플레이션 승인/동결 검증 [NEW]:**
    - 5월 테스트 통과 시 후보 총 필요금액이 승인되고 6월~다음해 5월까지 고정 적용되는지 확인.
    - 테스트 실패 시 기존 총 필요금액이 그대로 유지되는지 확인.
- **[TEST-SUR-08] 자산군별 PA/DY/TR 독립 적용 검증 [NEW]:**
    - `SGOV`, `Bond`, `High Income`, `Dividend`, `Growth`가 서로 다른 `PA/DY/TR`을 가질 때 월별 증가율이 독립적으로 반영되는지 확인.
    - 계정 전체 평균 성장률 1개가 모든 비현금 자산에 공유되지 않는지 확인.
- **[TEST-SUR-09] 사용자 변형 포트폴리오 호환성 검증 [NEW]:**
    - 문서 표준 포트폴리오가 아닌 다른 종목/비중 조합을 넣어도, 같은 자산군 카테고리 규칙으로 동일 엔진이 동작하는지 확인.
- **[TEST-SUR-10] 실사용 API 경로 자산군 수익률 전달 검증 [NEW]:**
    - 저장 포트폴리오에서 계산한 자산군별 `DY/PA/TR`이 은퇴 API를 거쳐 엔진까지 전달되는지 확인.
    - `VGIT`와 `Growth Engine`이 동일 월에 서로 다른 증가율과 현금 유입을 만드는지 확인.
- **[TEST-SUR-11] 문서 대표 캘린더 기준선 검증 [NEW]:**
    - 문서 대표 Phase 2 시나리오에서 법인 `SGOV 30 -> (10월 말 25) -> 11월 복구 27 -> (4월 말 22) -> 다음 5월 복구 30` 구조가 재현되는지 확인.
    - 개인연금 `SGOV 24 -> 11월 말 18 -> 다음 5월 복구 24` 구조가 재현되는지 확인.

### [Structure 4] 설정 사용자화 및 UI 검증 (REQ-RAMS-8.1 ~ 8.5)
- **[TEST-UI-RULE-01] 전략 설정 UI 렌더링:**
    - Settings 화면에 `Corporate Rules`, `Pension Rules`, `Execution Policy` 섹션이 구조적으로 렌더링되는지 확인.
- **[TEST-UI-RULE-02] 기본값 복원 기능:**
    - 사용자가 버퍼/하한 값을 변경한 뒤 기본값 복원 버튼으로 문서 기본값을 되돌릴 수 있는지 확인.
- **[TEST-UI-RULE-03] 시뮬레이션 반영성:**
    - Settings에서 변경한 전략 규칙이 시뮬레이션 재실행 시 즉시 반영되는지 확인.
- **[TEST-UI-RULE-04] API 저장/기본값 병합:**
    - `strategy_rules` 일부 필드만 저장해도 백엔드가 나머지 기본값을 유지하는지 확인.
- **[TEST-UI-RULE-05] 재로드 지속성:**
    - Settings에서 수정한 `rebalance_month`, `corporate.sgov_target_months`, `pension.bond_min_total_ratio`, `bear_market_freeze_enabled` 값이 저장 후 재로드 시 유지되는지 확인.
- **[TEST-UI-RULE-06] Step 2 규칙 요약 노출:**
    - `Projection Result` 영역에 실제 적용된 `Rebalance`, `Corp SGOV`, `Pension SGOV`, `Bear Freeze` 요약 배지가 렌더링되는지 확인.
- **[TEST-UI-RULE-07] 사용자 노출 Assumption 프리셋 정규화 [NEW]:**
    - `retirement_config.json`에 테스트 전용 assumption(`test_event`, `test_zero`)이 남아 있어도 Settings/Retirement UI에는 `Standard Profile`, `Conservative Profile`만 노출되는지 확인.
    - `active_assumption_id`가 숨김 assumption을 가리킬 경우 백엔드가 `v1`로 정규화하여 시뮬레이션과 UI 상태가 깨지지 않는지 확인.
- **[TEST-UI-RULE-08] 월 필요 생활비 설정 노출 및 저장 [NEW]:**
    - Settings `Sim Control` 섹션에 `Monthly Living Cost` 입력이 노출되는지 확인.
    - `10,000,000` 입력 후 저장/재로드 시 동일 값이 유지되고, Retirement 시뮬레이션이 해당 값을 기준으로 재계산되는지 확인.
- **[TEST-UI-RULE-09] 결과 화면 월 필요 생활비 배지 노출 [NEW]:**
    - Step 2 `Applied Rules` 영역에 `Monthly Cost` 배지가 노출되는지 확인.
    - 배지 값이 현재 저장된 `target_monthly_cashflow`와 동일한 원화 표기값으로 렌더링되는지 확인.

---

## 3. 검증 도구 및 환경
- **Pytest (Backend):** 엔진 내부 로직 및 API 정합성 검증.
- **Playwright (Frontend):** 시각화 결과 및 사용자 수정 사항 반영 여부 검증.
- **Isolated DB:** 테스트용 `portfolios_test.json` 등을 사용하여 사용자 데이터를 보호한다.

## 4. Feature Completion Gate [NEW]
- Retirement Engine 관련 Python 변경은 커밋 전 `PYTHONPATH=. .venv/bin/ruff check <changed_python_files>`와 `PYTHONPATH=. .venv/bin/black --check <changed_python_files>`를 통과해야 한다.
- Retirement UI 변경이 포함되면 `npm run lint`, `npm run build`, `npx prettier --check <changed_frontend_files>`를 추가 통과해야 한다.
- 기능 완료 증명은 변경 범위와 관련된 `pytest` 및 `Playwright` 케이스 통과로 마감한다.
