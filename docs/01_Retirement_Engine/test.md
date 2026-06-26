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
- **[TEST-RAMS-1.2.1] 문서 기본 초기 버킷 배치 검증 [NEW]:**
  - 전략 카테고리별 초기 비중이 비어 있는 문서 기본 모드에서, 현재 Phase 기준으로 법인 `SGOV 30개월 / Bond 18개월`, 개인연금 `SGOV 24개월 / Bond 18개월` 초기 버킷이 계산되는지 확인.
  - 사용자가 전략 카테고리 비중을 명시한 경우에는 문서 기본 자동 배치 대신 사용자 입력 비중이 그대로 우선되는지 확인.
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
- **[TEST-TAX-04] 세후 부족분 기반 주주대여금 상환 검증 [NEW]:**
  - 예시: 가계 세후 필요금액 1,000만원, 급여 총액 250만원, 급여 실수령액 230만원, 연금 수령 0원일 때 주주대여금 상환 필요액이 770만원으로 계산되는지 확인.
  - 급여 총액 250만원을 차감하는 750만원 로직이 아니라, 실수령액 기준 770만원 로직이 사용되는지 확인.
- **[TEST-TAX-05] 법인 월 현금 생성액 분리 검증 [NEW]:**
  - 법인 월 현금 생성액이 `급여 총액 + 법인필요비용 + 주주대여금 상환액`으로 계산되는지 확인.
  - `월 기장비`는 매월 차감되고 `연 세무조정료`는 3월 단일 이벤트로 차감되는지 확인.
- **[TEST-TAX-06] 실현소득 기준 법인세 검증 [NEW]:**
  - 법인세 과세표준이 `배당/이자/인컴 등 실현소득`만으로 계산되고, `PA` 기반 미실현 상승분은 포함되지 않는지 확인.
  - 8월에는 `직전 연도 확정 법인세의 50%`가 중간예납으로 빠지고, 다음 해 3월에는 `직전 연도 확정세액 - 직전 8월 선납분`만 추가 납부되는지 확인.

### [Structure 3] 생애 주기 시뮬레이션 (REQ-RAMS-3.1 ~ 3.3)

- **[TEST-PHS-01] Phase 자동 전환:** 설정된 나이(예: 65세)에 도달했을 때 Phase 1에서 Phase 2(연금 수령)로 자동 전환되는지 확인.
- **[TEST-SUR-01] 자산 고갈 시점 계산:** 기대수익률과 인플레이션을 반영하여 자산이 0이 되는 시점이 산술적으로 타당한지 확인.
- **[TEST-SUR-02] 5월/11월 정기점검 게이트 검증 [NEW]:**
  - 법인 `SGOV 30개월` 복구가 5월에만, `SGOV 27개월` 복구가 11월에만 발생하는지 확인.
  - 개인연금 정기 리밸런싱은 5월에만 실행되고 11월에는 실행되지 않는지 확인.
  - 8월 법인 미니점검은 확정 현금이벤트 반영 후 `SGOV Buffer`만 조정하고 `Bond Buffer`/주식성 카테고리 리밸런싱은 수행하지 않는지 확인.
- **[TEST-SUR-03] Phase별 법인 부담 월지출 검증 [NEW]:**
  - Phase 1/2/3에서 가계 지급 부족분이 `가계 세후 필요금액 - 개인연금 - 국민연금 - 급여 실수령액` 공식대로 계산되는지 확인.
  - 법인 월 현금 생성액이 `급여 총액 + 법인필요비용 + 주주대여금 상환액`으로 연결되는지 확인.
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
  - 연 `PA`는 복리 월 변환으로 적용되어 12개월 누적 가격상승률이 입력한 연 `PA`와 일치하고, 월 `DY`는 현금 수확을 위해 연 `DY / 12`로 SGOV에 적립되는지 확인.
  - 비현금 카테고리의 분배금은 별도 run-rate에서 산출되어야 하며, 가격 하락 `PA`만으로 다음 달 분배금 절대액이 기계적으로 감소하지 않는지 확인.
  - `distribution_rules.<account>.<category>.growth_rate`가 있으면 분배금 run-rate가 복리 월 성장하고, 12개월 뒤 월 분배금이 입력 연 성장률과 일치하는지 확인.
  - Crash20 또는 정기점검 Stress가 발생하고 `stress_cut_rate`가 설정된 경우, 다음 달부터 해당 카테고리 분배금 run-rate가 지정 비율만큼 삭감되는지 확인.
  - 리밸런싱/이체로 비현금 카테고리를 부분 매도하면 다음 달 분배금 run-rate가 매도 비율만큼 감소하는지 확인.
  - SGOV/Bond 초과분을 비현금 카테고리로 신규 배치하면 target 카테고리 DY 기준의 분배금 run-rate가 새로 생성되는지 확인.
- **[TEST-SUR-09] 프로필 TR override 정합성 [NEW]:**
  - Corporate와 Pension의 개별 TR이 서로 다르지만 통합 master TR이 하나로 표시되는 master portfolio를 준비한다.
  - `Standard Profile`과 `Conservative Profile`에 동일한 master TR 및 동일 인플레이션을 적용하면 최종순자산과 월별 주요 결과가 동일한지 확인한다.
  - Conservative TR을 master TR보다 높게 설정하면 모든 카테고리 PA에 동일한 delta만 더해지고, 특정 성장 카테고리 PA가 배율 스케일링으로 과도하게 증폭되지 않는지 확인한다.
  - 월별 `monthly_return_overrides`가 초기 run-rate 또는 신규 매수분 run-rate 생성에 섞이지 않는지 확인.
  - `distribution_yield_overrides`가 있으면 신규 매수분 run-rate 생성 시 category DY보다 우선 적용되는지 확인.
  - 위 두 run-rate 동기화는 `_transfer()` 직접 호출뿐 아니라 5월 리밸런싱과 surplus deploy를 통과하는 월별 시뮬레이션 결과에서도 검증해야 한다.
- **[TEST-API-RET-10] distribution_rules 설정 계약 검증 [NEW]:**
  - retirement config 기본 응답에 `distribution_rules = { corp: {}, pension: {} }` 구조가 포함되는지 확인.
  - `distribution_rules.<account>.<category>.growth_rate/stress_cut_rate` 부분 업데이트가 저장 후 재조회에서 유지되는지 확인.
  - Settings UI에서 입력한 분배금 규칙 값이 페이지 reload 후 다시 표시되는지 확인한다.
  - `/api/retirement/simulate`가 저장된 `distribution_rules`를 `ProjectionEngine` params로 전달하는지 확인.
  - UI에서 저장한 `distribution_rules`가 실제 시뮬레이션의 다음 달 `corp_realized_income` 변화에 반영되는지 확인한다.
- **[TEST-API-RET-11] distribution_yield_overrides 설정 계약 검증 [NEW]:**
  - retirement config 기본 응답에 `distribution_yield_overrides = { corp: {}, pension: {} }` 구조가 포함되는지 확인.
  - `distribution_yield_overrides.<account>.<category>` 부분 업데이트가 저장 후 재조회에서 유지되는지 확인.
  - Settings UI에서 입력한 신규매수 DY override가 페이지 reload 후 다시 표시되는지 확인한다.
  - `/api/retirement/simulate`가 저장된 `distribution_yield_overrides`를 `ProjectionEngine` params로 전달하는지 확인.
- **[TEST-SUR-09] 사용자 변형 포트폴리오 호환성 검증 [NEW]:**
  - 문서 표준 포트폴리오가 아닌 다른 종목/비중 조합을 넣어도, 같은 자산군 카테고리 규칙으로 동일 엔진이 동작하는지 확인.
- **[TEST-SUR-10] 실사용 API 경로 자산군 수익률 전달 검증 [NEW]:**
  - 저장 포트폴리오에서 계산한 자산군별 `DY/PA/TR`이 은퇴 API를 거쳐 엔진까지 전달되는지 확인.
  - `VGIT`와 `Growth Engine`이 동일 월에 서로 다른 증가율과 현금 유입을 만드는지 확인.
- **[TEST-SUR-11] 문서 대표 캘린더 기준선 검증 [NEW]:**
  - 문서 대표 Phase 2 시나리오에서 법인 `SGOV 30 -> (10월 말 25) -> 11월 복구 27 -> (4월 말 22) -> 다음 5월 복구 30` 구조가 재현되는지 확인.
- **[TEST-UI-RULE-12] Settings 미사용 trigger 설정 비노출/미적용 안내 [NEW]:**
  - Advanced Settings에서 `high_income_cap_rate`, `equity_yield_multiplier`, `debt_yield_multiplier`, `market_panic_threshold`가 활성 입력으로 보이지 않는지 확인.
  - 대신 `현재 은퇴 시뮬레이션에 미적용` 안내가 노출되는지 확인.
- **[TEST-API-RET-09] simulate dead param 정리 검증 [NEW]:**
  - `main.py`가 엔진 미사용 값을 더 이상 retirement simulation params에 넣지 않거나, 넣는 경우 실제 엔진 소비 경로가 존재하는지 확인.
  - 개인연금 `SGOV 24 -> 11월 말 18 -> 다음 5월 복구 24` 구조가 재현되는지 확인.
- **[TEST-SUR-12] Shock / Inflation Freeze / BOOST Ladder 대표 시나리오 검증 [NEW]:**
  - 6월 Crash20 발생 후 다음 해 5월까지 `Shock Flag`가 유지되고, 해당 5월에는 인플레이션 승인이 동결되는지 확인.
  - `BOOST`가 발동하려면 `Shock Flag = ON` 또는 5월 Stress가 전제되어야 하며, 법인 주식 저가매도 회피 목적의 보조 인출로만 쓰이는지 확인.
  - `BOOST`가 Shock drawdown 구간에 따라 `+2m`, `+3m`으로 발동하는지 확인.
  - `BOOST` ladder의 첫 구간(15~20%)이 `+1m`으로 계산되는지 확인.
  - `BOOST`가 발동 후 정확히 6개월 유지되고 이후 자동 원복되는지 확인.
- **[TEST-SUR-13] Pre/Post Review 관측값 검증 [NEW]:**
  - 월별 기본 개월수 필드가 `월말(post-review)` 기준인지 확인.
  - `11월 직전 24개월`, `다음 5월 직전 21개월` 같은 문서 기준선이 `pre_review_*` 필드로 별도 노출되는지 확인.
- **[TEST-SUR-14] strategy_rules 동적 버퍼 연동 검증 [NEW]:**
  - API에서 `strategy_rules.corporate.sgov_target_months`, `strategy_rules.corporate.november_sgov_target_months`, `strategy_rules.corporate.bond_*_months`, `strategy_rules.pension.sgov_target_months`, `strategy_rules.pension.sgov_floor_months`, `strategy_rules.pension.bond_*_months`를 변경하면 5월 리밸런싱 결과 개월수가 즉시 달라지는지 확인.
  - `strategy_rules.rebalance_month`를 5월이 아닌 월로 변경하면 메인 정기점검/리밸런싱 실행 월이 함께 이동하고, 8월/11월에 해당하던 법인 미니점검/반기점검은 각각 `+3개월 / +6개월` 오프셋으로 이동하는지 확인.
  - 동적 메인 정기점검 월에서 승인된 인플레이션 조정액은 다음 달부터 적용되고, Crash20이 아닌 Stress 기반 BOOST도 동적 메인 정기점검 월에 발동하는지 확인.
- **[TEST-SUR-15] donor 우선순위 재현 검증 [NEW]:**
  - 법인 5월/11월 점검에서 `Bond upper band(24개월) 초과분`이 `Dividend Growth/Growth Engine`보다 먼저 donor로 사용되고, `18~24개월` 구간은 자동 donor로 소진되지 않으며, `Bond floor 12개월` 아래로는 자동 침범하지 않는지 확인.
  - 개인연금도 동일하게 `18~24개월 유지 / 24개월 초과분만 donor 후보` 해석이 재현되는지 확인.
  - 개인연금 5월 점검에서 `Bond target 초과분 -> Bond floor 12개월까지 -> Dividend Growth -> Growth Engine` 순서가 재현되는지 확인.

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
  - Settings에서 수정한 `rebalance_month`, `corporate.sgov_target_months`, `corporate.november_sgov_target_months`, `corporate.bond_*_months`, `pension.sgov_target_months`, `pension.sgov_floor_months`, `pension.bond_*_months` 값이 저장 후 재로드 시 유지되는지 확인.
- **[TEST-UI-RULE-05a] OS v11.1 설명 카드:**
  - Settings 전략 규칙 섹션에 OS v11.1 설명 카드가 노출되고, 법인/연금 운용 구분과 자산군 역할 요약을 확인할 수 있는지 검증한다.
- **[TEST-UI-RULE-06] Step 2 규칙 요약 노출:**
  - `Projection Result` 영역에 실제 적용된 `Rebalance Month`, `Corp SGOV`, `Pension SGOV` 요약 배지가 렌더링되는지 확인.
- **[TEST-UI-RULE-07] 사용자 노출 Assumption 프리셋 정규화 [NEW]:**
  - `retirement_config.json`에 테스트 전용 assumption(`test_event`, `test_zero`)이 남아 있어도 Settings/Retirement UI에는 `Standard Profile`, `Conservative Profile`만 노출되는지 확인.
  - `active_assumption_id`가 숨김 assumption을 가리킬 경우 백엔드가 `v1`로 정규화하여 시뮬레이션과 UI 상태가 깨지지 않는지 확인.
- **[TEST-UI-RULE-08] 월 필요 생활비 설정 노출 및 저장 [NEW]:**
  - Settings `Sim Control` 섹션에 `월 가계필요비용`, `시뮬레이션 시작 연/월` 입력이 노출되는지 확인.
  - 각 입력값 저장 후 재로드 시 동일 값이 유지되고, Retirement 시뮬레이션이 해당 값을 기준으로 재계산되는지 확인.
- **[TEST-UI-RULE-09] 결과 화면 월 필요 생활비 배지 노출 [NEW]:**
  - Step 2 `Applied Rules` 영역에 `월 가계필요비용`, `법인필요비용`, `급여 실수령 추정액` 배지가 노출되는지 확인.
  - 배지 값이 현재 저장된 설정값과 동일한 원화 표기값으로 렌더링되는지 확인.
- **[TEST-UI-RULE-10] 급여 실수령 추정액 표시 검증 [NEW]:**
  - Settings `Corporate` 섹션의 급여 입력 옆에 세후 실수령 추정액이 즉시 표시되는지 확인.
  - 급여 변경 시 실수령 추정액이 함께 갱신되는지 확인.
- **[TEST-UI-RULE-11] 파생 법인필요비용 표시 검증 [NEW]:**
  - Settings `Corporate` 섹션에 `법인필요비용=(월 기장비 + 연 세무조정료/12)` 계산값이 읽기 전용으로 표시되는지 확인.
  - 월 기장비 또는 연 세무조정료 수정 시 파생값이 즉시 갱신되는지 확인.

- **[TEST-SUR-16] 실제 매도 이벤트 및 취득원가 검증 [NEW]:** 실제 이동금액, 비례 취득원가, 실현손익 및 SGOV 매수 비과세를 검증한다.
- **[TEST-SUR-17] 개인 일반계좌 회귀 검증 [NEW]:** 초기자산 0 회귀와 저장 전략 기반 리밸런싱을 검증한다.
- **[TEST-SUR-18] 개인운용 계좌 경계 및 가계 현금흐름 [NEW]:** Personal 단독 마스터에서 Corporate/Pension 초기자산과 법인 급여·운영비가 제외되고, 실제 Personal 인출액이 가계 부족분을 감소시키며, 통합 DY/TR 메타가 Personal 포트폴리오만 반영하는지 검증한다.
- **[TEST-SUR-19] 미국 상장 개인계좌 세금 원장 [NEW]:** 2,000만 원 이하·초과 배당의 원천세/종합과세 분기, 소득세법 제62조 일반산출세액·비교산출세액 선택, 기타 금융소득 혼합 시 미국 배당 비례 배분, 외국납부세액공제, 해외주식 연간 손익통산과 250만 원 기본공제, 미실현이익 비과세, 다음 해 5월 납부를 정확한 기대금액으로 검증한다.
- **[TEST-SUR-20] 개인 세금 현금흐름 [NEW]:** 배당 지급월 원천세 차감, 세금 납부를 위한 실제 donor 매도, 세금 매도로 발생한 당해 실현손익, Personal 인출과 세금의 중복 차감 방지를 검증한다.
- **[TEST-SUR-21] 지역건보 반영 시차 [NEW]:** 재산분의 월별 부과, 금융소득 최소 반영기준, 전년도 소득의 설정월 반영, 양도차익 제외, 월별 감사 필드를 검증한다.
- **[TEST-SUR-22] 개인 세금 연도별 감사표 [NEW]:** 세금연도별 배당, 원천세, 실현손익, 기본공제, 양도세, 건보료 합계, 납부연월, 연말 취득원가가 원장과 월별 결과에서 일관되게 집계되는지 검증한다.
- **[TEST-SUR-23] 세금 재원 매도 추적 [NEW]:** 원천세, 연간세금, 건보료 재원 조달 매도에 각각 `cash_obligation`이 기록되고 일반 리밸런싱 거래와 구분되는지 검증한다.
- **[TEST-SUR-24] 활성 계좌 예정 현금흐름 경계 [REGRESSION]:** Personal-only 전략에서 Corporate 예정 유입이 법인 잔액과 총자산에 생성되지 않고, 활성 Personal/Pension 이벤트만 반영되는지 검증한다.
- **[TEST-SUR-25] 개인운용 Phase별 자동 가계 인출 [REGRESSION]:** Personal-only 및 Personal+Pension 전략에서 개인 인출 목표가 Phase별 연금·국민연금 차감 후 부족분으로 감소하고, 사용자 최소 인출액보다 작아지지 않으며 실제 인출이 가계 미충족액을 줄이는지 검증한다.
- **[TEST-SUR-26] 개인운용 5월 Stress/인플레이션 [REGRESSION]:** Corporate 비활성 시 Personal SGOV/Bond와 활성 총자산으로 5월 A/B/C를 판정하고, 충분한 개인자산이 있으면 인플레이션이 승인되는지 검증한다.
- **[TEST-SUR-27] 가계 현금흐름 완전성 요약 [REGRESSION]:** 누적 필요액 = 누적 지급액 + 누적 미충족액이고 최초 미충족 연월이 월별 원장과 일치하며 UI에 최종자산과 함께 표시되는지 검증한다.
- **[TEST-UI-RULE-13] 개인 초기자산 0 경고 [REGRESSION]:** Personal 활성 전략에서 초기자산이 0이면 Retirement 결과에 명시적 경고가 표시되고, 0보다 크면 경고가 사라지는지 검증한다.
- **[TEST-SUR-28] 법인 리밸런싱 실현차익 과세 [REGRESSION]:** Corporate 실제 거래 이벤트의 연간 실현차익이 배당·이자와 함께 법인세 과세표준에 포함되고 Cost Comparison과 동일한 과세 철학을 따르는지 검증한다.
- **[TEST-SUR-29] 단일 가계 필요액 [REGRESSION]:** Personal 레거시 월 인출값이 0 또는 가계 필요액보다 커도 실제 인출은 연금·국민연금 차감 후 순부족액과 일치하는지 검증한다.
- **[TEST-SUR-30] Operating Account 공통 버퍼 규칙 [REGRESSION]:** 동일 자산과 가계 부족액의 Corporate/Personal이 5월 SGOV 30개월, 11월 27개월, Bond 12/18/24개월과 같은 donor 순서를 사용하는지 검증한다.
- **[TEST-SUR-31] 법인 대여금 소진 후 과세 지급 [REGRESSION]:** 주주대여금이 0이어도 법인이 순가계 부족액을 주주분배 gross-up으로 지급하고, gross 현금유출·원천징수 추정액·가계 순수령액을 분리하며 미충족액을 0으로 유지하는지 검증한다.
- **[TEST-SUR-32] 비금전적 미충족 잔차 제거 [REGRESSION]:** 과세 주주분배 gross-up 후 `1e-6원` 미만 부동소수점 잔차가 월·누적 미충족액과 최초 미충족 연월을 생성하지 않는지 검증한다.
- **[TEST-SUR-33] 비교 엔진 개인 배당세 단일화 [REGRESSION]:** 금융소득 2,400만 원·기타 종합소득 0원에서 Cost Comparison 개인 배당 총세액이 비교산출세액 3,696,000원과 일치하고, 외국 원천세 3,600,000원과 국내 추가세 96,000원을 분리하는지 검증한다.
- **[TEST-SUR-34] 실현·미실현 과세 경계 [REGRESSION]:** DY 0·PA 양수·실제 매도 0인 경우 개인 배당세, 양도세, 건보 소득과 법인 과세표준이 모두 0이며 순자산만 증가하는지 검증한다.
- **[TEST-SUR-35] 비교 스케줄 Operating Account 경계 [REGRESSION]:** Personal 비교 스케줄은 Personal 자산과 30/27개월 규칙을, Corporate 비교 스케줄은 Corporate 자산과 같은 운용 포트폴리오 통계를 사용하며 Pension 24개월 규칙으로 대체되지 않는지 검증한다. 직접 운용자산 DY/TR도 같은 Operating Portfolio 단독 통계와 일치해야 한다.
- **[TEST-SUR-36] Operating Account 완전 동등성 [REGRESSION]:** 비세무·비용 경로를 제거한 동일 입력에서 360개월 Corporate/Personal 월별 5개 카테고리 잔액, 거래 이벤트, 기말 분배금 run-rate와 세전 총자산이 일치하는지 검증한다.
- **[TEST-SUR-37] Operating 정책 단일 키 [REGRESSION]:** `distribution_rules.corp`와 `distribution_yield_overrides.corp`만 설정해도 Personal에 동일한 분배금 성장·신규 매수 DY·Shock Stress cut이 적용되고 별도 `personal` 정책이 필요하지 않은지 검증한다.
- **[TEST-SUR-38] Pension 비활성 BOOST 경계 [REGRESSION]:** 동일한 5월 Stress에서 Corporate/Personal의 Stress와 자산 경로가 일치하고, Pension이 비활성이면 Personal 경로에 BOOST 수입이 생성되지 않는지 검증한다.

- **[TEST-UI-RULE-14] 인출 설정 단일화 [REGRESSION]:** Settings에 월 가계필요비용만 인출 목표로 표시되고 Personal 별도 인출 입력은 없으며 Pension 입력은 월 개인연금 수령액으로 표시되는지 검증한다.
- **[TEST-UI-RULE-15] 취득원가 설명 [REGRESSION]:** 개인 취득원가 입력 도움말이 평가액/수익률에는 영향이 없고 실현손익·양도세 원장에만 사용됨을 명시하는지 검증한다.

---

## 3. 검증 도구 및 환경

- **Pytest (Backend):** 엔진 내부 로직 및 API 정합성 검증.
- **Playwright (Frontend):** 시각화 결과 및 사용자 수정 사항 반영 여부 검증.
- **Isolated DB:** 테스트용 `portfolios_test.json` 등을 사용하여 사용자 데이터를 보호한다.

## 4. Feature Completion Gate [NEW]

- Retirement Engine 관련 Python 변경은 커밋 전 `PYTHONPATH=. .venv/bin/ruff check <changed_python_files>`와 `PYTHONPATH=. .venv/bin/black --check <changed_python_files>`를 통과해야 한다.
- Retirement UI 변경이 포함되면 `npm run lint`, `npm run build`, `npx prettier --check <changed_frontend_files>`를 추가 통과해야 한다.
- 기능 완료 증명은 변경 범위와 관련된 `pytest` 및 `Playwright` 케이스 통과로 마감한다.
