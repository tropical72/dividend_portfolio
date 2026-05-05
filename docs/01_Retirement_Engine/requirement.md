# Requirement: Retirement Asset Management System (RAMS)

## 1. 시스템 개요 및 최종 목표

본 시스템은 사용자의 은퇴 전략을 기반으로 법인과 연금 자산의 운용 실익을 증명하고, 생애 주기별 동적 인출 및 **미래 확정적 자금 이벤트**를 반영한 시뮬레이션을 통해 "원하는 모습으로 은퇴할 수 있다"는 심리적 확신을 제공하는 것을 목표로 한다.

---

## 2. 도메인별 상세 요구사항

### [Structure 1] 자산 및 사용자 프로필 관리 (Profile & Assets)

- **[REQ-RAMS-1.1] 정밀한 사용자 프로필:**
  - 생년월일을 월 단위까지 입력받아 연금 개시 시점의 정밀도를 확보한다.
  - 개인연금 개시 연령과 국민연금 수령 연령을 분리하여 마일스톤으로 관리한다.
- **[REQ-RAMS-1.2] 계좌별 초기 자산 설정:**
  - 법인 계좌 및 **연금 계좌의 초기 자산 규모**를 사용자가 직접 설정한다. (코드 내 상수 제거)
- **[REQ-RAMS-1.3] 미래 확정 자금 이벤트 (Planned Cashflow):**
  - 향후 발생할 유입(예: 자산 매각) 및 지출(예: 대규모 비용) 계획을 복수개 등록하고 관리한다.
- **[REQ-RAMS-1.4] 포트폴리오 매니저 통합 연동 (Portfolio Integration):**
  - **[REQ-RAMS-1.4.1] 계좌 타입별 대표 포트폴리오 매핑:**
    - 엔진 실행 시 `portfolios.json`에서 `account_type`이 'Corporate'인 포트폴리오와 'Pension'인 포트폴리오를 각각 로드한다.
    - 복수 존재 시 가장 최근에 수정된(또는 첫 번째) 포트폴리오를 기본값으로 사용한다.
  - **[REQ-RAMS-1.4.2] 자산군별 가중 평균 배당률(DY) 및 총수익률(TR) 산출:**
    - 엔진은 포트폴리오 전체 평균값 1개가 아니라, 전략 카테고리별 집계값을 주입받아야 한다.
    - 각 전략 카테고리(`SGOV Buffer`, `Bond Buffer`, `High Income`, `Dividend Growth`, `Growth Engine`)에 대해 다음 공식을 적용한다.
    - `Category DY = Σ(종목별 배당률 * 종목 비중 / 100)`
    - `Category TR = Category DY + Category PA`
    - `Category PA`는 Settings의 시나리오값을 사용하되, 반드시 자산군별로 분리 적용한다.
    - 문서 기반 표준 시뮬레이션에서는 사용하지 않는 카테고리(예: `High Income`)의 비중을 0으로 둘 수 있어야 하며, 다른 카테고리와 합쳐 계산해서는 안 된다.
  - **[REQ-RAMS-1.4.3] 엔진 주입 및 동적 동기화:**
    - `ProjectionEngine`은 초기화 시 외부에서 주입된 `portfolio_stats` 객체를 확인하며, 값이 존재할 경우 내부 하드코딩 상수를 덮어쓴다(Override).
    - 사용자가 포트폴리오를 수정하거나 `Settings`에서 '자산 성장률(PA)'을 변경할 경우, 은퇴 시뮬레이션 결과에 즉시 반영되어야 한다.
  - **[REQ-RAMS-1.4.4] 데이터 누락 시 Fallback 로직:**
    - 포트폴리오 데이터가 비어있거나 유효하지 않은 경우, `Settings`에 정의된 '기본 자산 배당률(예: SCHD 3.5%)'에 '자산 성장률(PA)'을 더하여 시뮬레이션을 수행한다.
    - 단, 활성화된 마스터 전략이 가리키는 포트폴리오 참조가 깨진 경우는 단순 누락이 아니라 데이터 무결성 오류로 간주하며, 임의의 TR fallback을 사용하지 않는다.
  - **[REQ-RAMS-1.4.5] 시뮬레이션 결과의 투명한 근거 표시 (Traceability):**
    - 은퇴 시뮬레이션 결과 화면 상단에 기초 데이터가 된 포트폴리오 명칭과 함께 **[배당률(DY)]**과 **[자산 성장률(PA)]**을 각각 명시적으로 표시하여 총 수익률(TR)의 산출 근거를 공개해야 한다.
- **[REQ-RAMS-1.5] 마스터 포트폴리오(Master Portfolio) 기반 엔진 구동:**
  - **[REQ-RAMS-1.5.1] 동적 데이터 주입:** 엔진은 현재 '활성화(Active)'된 마스터 포트폴리오의 구성을 조회하여 법인/연금 데이터를 로드한다.
  - **[REQ-RAMS-1.5.2] Fallback 전략:** 마스터 포트폴리오에 특정 계좌(Corp 또는 Pension)가 지정되지 않은 경우, 해당 계좌는 `Settings`의 기본 수익률을 사용하거나 자산 0원으로 처리한다.
- **[REQ-RAMS-1.6] Retirement 탭 내 마스터 전략 퀵 스위처 (Quick Switcher):**
  - **[REQ-RAMS-1.6.1] 실시간 전략 교체:** 사용자는 은퇴 탭 메인 화면에서 즉시 다른 마스터 전략을 선택하여 시뮬레이션을 재실행할 수 있어야 한다.
  - **[REQ-RAMS-1.6.2] 드롭다운 인터페이스:** 현재 활성 전략 명칭 클릭 시 저장된 전체 전략 리스트를 노출하고 선택을 지원한다.
- **[REQ-RAMS-1.7] 계좌 공통 5단계 전략 카테고리 구조:**
  - **[REQ-RAMS-1.7.1] 공통 카테고리:** Corporate/Pension 포트폴리오는 모두 `SGOV Buffer`, `Bond Buffer`, `High Income`, `Dividend Growth`, `Growth Engine`의 5개 전략 카테고리를 공통 구조로 가진다.
  - **[REQ-RAMS-1.7.2] 사용자 종목 배치:** 사용자는 Portfolio Manager 화면에서 각 계좌의 종목을 위 5개 카테고리 중 하나에 직접 배치하고 수정할 수 있어야 한다.
  - **[REQ-RAMS-1.7.3] 문서 기반 표준 플랜 호환성:** 표준 OS v11.1 시뮬레이션에서는 `High Income`을 사용하지 않을 수 있으며, 이 경우 비중 0으로 처리해야 한다.
  - **[REQ-RAMS-1.7.4] 엔진 카테고리 분리:** Retirement Engine은 위 5개 카테고리를 독립 버킷으로 직접 인식해야 하며, 어느 카테고리도 다른 카테고리와 자동 병합하거나 동일 버킷으로 환원해서는 안 된다.
  - **[REQ-RAMS-1.7.5] 사용자 책임 분리:** 종목을 어느 카테고리에 넣을지는 사용자의 책임이며, 엔진은 저장된 카테고리 배치를 있는 그대로 해석해 시뮬레이션해야 한다.

### [Structure 2] 세무 및 수익성 엔진 (Tax Engine)

- **[REQ-RAMS-2.1] 법인/개인 세무 산출:** 지역건보료, 종합소득세, 법인세를 정밀 계산한다.
- **[REQ-RAMS-2.2] 정보 출처 투명성:** 건보료 점수 단가 등 국가 정책 수치의 경우, UI에 출처(예: 국민건강보험공단)를 명시한다.
- **[REQ-RAMS-2.3] 법인 현금흐름과 주주대여금 반환 분리:**
  - **[REQ-RAMS-2.3.1] 법인 현금 원천:** 법인 계좌의 생활비/운영비/주주대여금 반환 재원은 오직 법인 계좌 내에서 발생한 배당·인컴 및 현금성 자산 매도 대금으로 구성되어야 한다.
  - **[REQ-RAMS-2.3.2] 주주대여금 반환 처리:** `initial_shareholder_loan`은 비과세 반환 가능 한도를 의미하며, 실제 반환은 법인 현금 잔액이 확보된 범위 내에서만 이루어져야 한다.
  - **[REQ-RAMS-2.3.3] 가계 현금흐름 보전 순서:** 가계 기준 월 필요금액은 세후 기준(`household_monthly_need`)으로 관리한다. 매월 가계로 들어가는 현금은 `개인연금 실수령 + 국민연금 실수령 + 법인 급여 실수령 + 주주대여금 상환`의 합으로 정의한다.
  - **[REQ-RAMS-2.3.4] 급여/주주대여금 분리 규칙:** 법인은 먼저 설정된 월 급여를 지급하고, 엔진은 급여의 대략적인 세후 실수령액을 계산해야 한다. 가계 필요금액이 이 실수령액과 연금 수령액의 합보다 크면, 부족분만큼만 주주대여금 상환을 추가 집행해야 한다.
  - **[REQ-RAMS-2.3.5] 세후 부족분 공식:** `주주대여금 상환 필요액 = max(0, household_monthly_need - private_pension_income - national_pension_income - net_salary_to_household)` 이어야 한다. 급여 총액이 아니라 실수령액을 기준으로 부족분을 계산해야 한다.
  - **[REQ-RAMS-2.3.6] 자본금/대여금/총운용자산 관계 명시:** `capital_stock`은 법인 설립 시 납입 자본금, `initial_shareholder_loan`은 법인에 빌려준 주주대여금 원금, `initial_investment`는 실제로 법인 계좌에서 운용되는 총자산을 의미한다. 초기 시점의 `initial_investment`는 `capital_stock + initial_shareholder_loan + 기타 유보 현금`의 합으로 구성될 수 있으며, 엔진은 자산 운용 수익 계산에는 `initial_investment`를 사용하고, 비과세 반환 한도 계산에는 `initial_shareholder_loan` 잔액을 사용해야 한다.

### [Structure 3] 생애 주기 인출 및 이벤트 통합 시뮬레이션

- **[REQ-RAMS-3.1] 월 단위 Phase 및 이벤트 반영:**
  - 나이와 월을 계산하여 Phase를 자동 전환하고, 해당 월에 등록된 **Planned Cashflow 이벤트를 자산 잔액에 즉시 가감**한다.
- **[REQ-RAMS-3.1.1] 날짜 하드코딩 금지:**
  - 문서에 기재된 Phase 2/3 시작월은 특정 사용자 사례를 설명하는 값일 뿐이며, 실제 엔진은 `birth_year`, `birth_month`, `private_pension_start_age`, `national_pension_start_age`, `simulation_start_year`, `simulation_start_month`를 사용해 동적으로 동일 시점을 계산해야 한다.
- **[REQ-RAMS-3.2] 동적 인출 및 리밸런싱 알고리즘:**
  - **[REQ-RAMS-3.2.1] OS v11.1 공통 원칙:** 월 인출은 항상 `SGOV Buffer`에서만 발생해야 하며, `Bond Buffer`, `High Income`, `Dividend Growth`, `Growth Engine`은 정기점검 또는 명시된 보충 이벤트에서만 재배치/매도된다.
  - **[REQ-RAMS-3.2.2] 필요금액 2계층 분리:** 시뮬레이션은 `월 가계필요비용(household_monthly_need)`을 독립 입력으로 관리해야 하며, `법인필요비용(corporate_monthly_operating_cost)`은 `월 기장비 + 연 세무조정료/12` 파생값으로 계산해야 한다. 기존 단일 `target_monthly_cashflow`는 두 금액을 섞어 표현해서는 안 된다.
  - **[REQ-RAMS-3.2.3] 가계 지급 우선 공식:** 매월 가계에 필요한 세후 현금은 `household_monthly_need`를 기준으로 계산하며, 이를 `개인연금`, `국민연금`, `법인 급여 실수령`, `주주대여금 상환`으로 채워야 한다.
  - **[REQ-RAMS-3.2.4] 법인 월 현금 생성 공식:** 법인이 매월 `SGOV Buffer`에서 마련해야 할 총 현금은 `법인 급여 총액 + 법인필요비용 + 주주대여금 상환액`이다. 이때 주주대여금 상환액은 세후 부족분 공식으로 계산된 값이어야 한다.
  - **[REQ-RAMS-3.2.5] 개인연금 월 인출:** 개인연금 계좌는 Phase 2부터 `monthly_withdrawal_target`을 `SGOV Buffer`에서 인출한다. Stress/Crash20 BOOST가 활성화되면 추가 인출액을 같은 계좌에서 한시적으로 더 인출할 수 있다.
  - **[REQ-RAMS-3.2.6] 법인 5월 정기점검:** 5월에는 승인된 월 법인 현금 생성액을 기준으로 법인 `SGOV Buffer`를 30개월, `Bond Buffer`를 floor 12개월 / target 18개월 / upper 24개월 구조로 재구성한다.
  - **[REQ-RAMS-3.2.7] 법인 11월 반기정비:** 11월에는 법인 `SGOV Buffer`를 27개월 기준으로 복구하고 `Bond Buffer` 상태를 재점검한다. Shock Flag가 켜져 있으면 `Bond Buffer`와 `SGOV Buffer`를 주식성 카테고리보다 우선한다.
  - **[REQ-RAMS-3.2.8] 개인연금 5월 정기점검:** 5월에는 개인연금 `SGOV Buffer`를 24개월, `Bond Buffer`를 floor 12개월 / target 18개월 / upper 24개월 구조로 재구성한다.
  - **[REQ-RAMS-3.2.9] 개인연금 중간 점검:** 개인연금 `SGOV Buffer`가 12개월 floor 미만으로 내려가면, 우선 `Bond Buffer`에서 `SGOV Buffer`를 보충한다. 그래도 부족하면 다음 5월 정기점검에서 전면 조정한다.
  - **[REQ-RAMS-3.2.10] donor 규칙 일반화:** 정기점검 시 `SGOV Buffer`와 `Bond Buffer` 보강은 문서의 donor 우선순위를 따르되, `High Income`, `Dividend Growth`, `Growth Engine`은 서로 다른 버킷으로 독립 유지해야 한다.
  - **[REQ-RAMS-3.2.11] 카테고리 혼합 금지:** `Bond Buffer`와 `High Income`, `Dividend Growth`, `Growth Engine`은 계산 과정에서 동일 자산군으로 합산하거나 동일 성장률/하한선 규칙을 공유해서는 안 된다.
- **[REQ-RAMS-3.3] 자산군별 PA/DY/TR 적용 엔진:**
  - **[REQ-RAMS-3.3.1] 자산군별 독립 성장률:** 월 수익 계산은 계정 평균 수익률 1개가 아니라 전략 카테고리별 `PA`, `DY`, `TR`을 독립 적용해야 한다.
  - **[REQ-RAMS-3.3.2] 수식 정합성:** 각 카테고리는 `TR = DY + PA`를 만족해야 하며, 월 변환은 단순 월 분할 또는 복리 월 변환 중 하나를 일관되게 사용해야 한다.
  - **[REQ-RAMS-3.3.3] 사용자 변형 포트폴리오 지원:** 문서의 표준 플랜과 다른 종목/비중을 넣어도, 자산군 카테고리와 운용 규칙이 동일하면 같은 엔진으로 시뮬레이션할 수 있어야 한다.
- **[REQ-RAMS-3.4] Shock / Stress / Inflation 운영 규칙:**
  - **[REQ-RAMS-3.4.1] Crash20:** 월말 기준 주식성 슬리브 평가액이 직전 5월 기준값의 80% 이하가 되면 Shock Flag를 활성화한다.
  - **[REQ-RAMS-3.4.2] Stress 판정:** Stress는 월말 숫자로 즉시 판정하지 않고 5월 정기점검의 A/B/C 테스트 결과로만 판정한다.
  - **[REQ-RAMS-3.4.3] 인플레이션 적용:** 인플레이션 반영 여부는 5월 정기점검에서만 승인/동결하며, 승인된 총 필요금액은 6월부터 다음 해 5월까지 12개월 고정 적용한다.
  - **[REQ-RAMS-3.4.4] 출력 투명성:** 월별 결과에는 최소한 Phase, 총 필요금액, 법인 부담 월지출, Shock Flag, Stress, 계정별 SGOV/Bond 개월수, 계정별 카테고리 잔액이 포함되어야 한다.
  - **[REQ-RAMS-3.4.5] 관측 시점 명시:** 월별 로그의 기본 개월수/잔액 필드는 해당 월의 이벤트, 인출, 정기점검, 리밸런싱이 모두 반영된 `월말(post-review)` 값임을 명시해야 한다. 문서의 `11월 직전`, `다음 5월 직전`과 같은 기준선을 대조하기 위해 `pre-review` 개월수 관측값을 별도로 제공해야 한다.

### [Structure 4] 사용자 설정 가능 전략 파라미터 (Simulation Controls)

- **[REQ-RAMS-8.1] 설정값의 사용자화:** `stock-plan.txt`에 정의된 버퍼 개월수, 역할 하한선, 리밸런싱 월, 성장 자산 매도 허용 조건 등은 모두 Settings 화면에서 사용자 수정 가능해야 하며, 문서의 수치는 기본값으로 제공한다.
- **[REQ-RAMS-8.2] 계좌별 전략 설정 UI:**
  - 연금 계좌용 설정과 법인 계좌용 설정을 시각적으로 분리하여 제공한다.
  - 각 설정은 설명 툴팁과 기본값 복원 기능을 포함한다.
- **[REQ-RAMS-8.3] 시뮬레이션 프로필 구조화:** 기존 Settings 화면은 단순 입력 목록이 아니라 `User Profile / Pension / Corporate / Strategy Rules / Assumptions / Events` 등 구조화된 섹션으로 재편될 수 있어야 한다.
  - `Sim Control` 섹션에서 `household_monthly_need`(월 가계필요비용), `simulation_years`, `simulation_start_year`, `simulation_start_month`를 수정할 수 있어야 한다.
- **[REQ-RAMS-8.3.0] 법인필요비용 파생값 노출:** `Corporate` 섹션에는 `월 기장비 + 연 세무조정료/12`로 계산한 `법인필요비용`을 읽기 전용으로 즉시 표시해야 한다.
- **[REQ-RAMS-8.3.1] 급여 실수령 가시화:** `Corporate` 섹션의 월 급여 입력 옆에는 추정 세후 실수령액을 즉시 계산해 보여줘야 한다. 이 값은 가계 필요금액 부족분 계산에 직접 쓰이는 기준값이어야 한다.
- **[REQ-RAMS-8.4] 기본값 복원:** 사용자는 전략 파라미터를 문서 기본값으로 즉시 되돌릴 수 있어야 한다.
- **[REQ-RAMS-8.5] 투명성:** Step 2 Projection Result에는 실제 사용된 핵심 설정값(예: 법인 SGOV 목표 개월수, 연금 SGOV 하한, 리밸런싱 실행 월)을 확인할 수 있는 요약 정보 또는 상세 패널이 제공되어야 한다.
  - 요약 정보에는 `household_monthly_need`(월 가계필요비용), `corporate_monthly_operating_cost`(법인필요비용 파생값), `monthly_salary`, `estimated_net_salary`도 포함되어 사용자가 현재 시뮬레이션이 어떤 현금흐름 가정 위에서 계산되었는지 즉시 확인할 수 있어야 한다.

---

## 3. UI/UX 원칙

- 모든 입력 필드는 엔터 키로 확정하며, 소수점 1자리로 자동 포맷팅한다.
- 사용자가 임의 수정한 값은 언제든 '마스터 설정값'으로 되돌릴 수 있는 리셋 기능을 제공한다.
- Retirement 탭 `Step 1. Set the Basis`의 `Standard Profile` 수익률 리셋 기준값은 현재 활성 마스터 전략의 `TR`이어야 한다.
- 미래 자금 이벤트는 리스트 형태로 추가/삭제가 가능해야 한다.
