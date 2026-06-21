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
  - 법인 계좌, **연금 계좌, 개인 일반계좌의 초기 자산 규모**를 사용자가 직접 설정한다. (코드 내 상수 제거)
  - **[REQ-RAMS-1.2.1] 문서 기본 초기 버킷 배치:** 사용자가 계좌 총액만 제공하고 전략 카테고리별 초기 금액/비중을 명시하지 않은 문서 기본 모드에서는, 현재 Phase 기준으로 초기 버킷을 자동 배치해야 한다.
    - 법인: `SGOV Buffer = 법인 부담 월지출 30개월`, `Bond Buffer = 법인 부담 월지출 18개월`, 나머지 주식 슬리브
    - 개인연금: `SGOV Buffer = 월 2.5m 24개월`, `Bond Buffer = 월 2.5m 18개월`, 나머지 주식 슬리브
  - **[REQ-RAMS-1.2.2] 초기 주식 슬리브 비율:** 문서 기본 초기 버킷 배치에서 남는 주식 슬리브는 법인 `Dividend Growth/Growth Engine`이 문서상 `VOO/QQQM = 85/15`를, 개인연금은 `75/25`를 재현하도록 배치되어야 한다. 사용자가 전략 카테고리 비중을 명시한 경우에는 자동 배치 대신 사용자 입력을 우선한다.
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
  - **[REQ-RAMS-1.7.1] 공통 카테고리:** Corporate/Pension/Personal Taxable 포트폴리오는 모두 `SGOV Buffer`, `Bond Buffer`, `High Income`, `Dividend Growth`, `Growth Engine`의 5개 전략 카테고리를 공통 구조로 가진다.
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
  - **[REQ-RAMS-3.2.2] 필요금액 2계층 분리:** 시뮬레이션은 `월 가계필요비용(household_monthly_need)`을 독립 입력으로 관리해야 한다. 법인 비용은 평균값으로 뭉개지지 않아야 하며, `월 기장비(monthly_bookkeeping_fee)`는 매월, `연 세무조정료(annual_corp_tax_adjustment_fee)`는 매년 3월에 실제 현금유출로 반영해야 한다. 기존 단일 `target_monthly_cashflow`는 두 금액을 섞어 표현해서는 안 된다.
  - **[REQ-RAMS-3.2.3] 가계 지급 우선 공식:** 매월 가계에 필요한 세후 현금은 `household_monthly_need`를 기준으로 계산하며, 이를 `개인연금`, `국민연금`, `법인 급여 실수령`, `주주대여금 상환`으로 채워야 한다.
  - **[REQ-RAMS-3.2.4] 법인 월 현금 생성 공식:** 법인이 매월 `SGOV Buffer`에서 마련해야 할 총 현금은 `법인 급여 총액 + 법인필요비용 + 주주대여금 상환액`이다. 이때 주주대여금 상환액은 세후 부족분 공식으로 계산된 값이어야 한다.
  - **[REQ-RAMS-3.2.5] 개인연금 월 인출:** 개인연금 계좌는 Phase 2부터 `monthly_withdrawal_target`을 `SGOV Buffer`에서 인출한다. Stress/Crash20 BOOST가 활성화되면 추가 인출액을 같은 계좌에서 한시적으로 더 인출할 수 있다.
  - **[REQ-RAMS-3.2.5a] BOOST 발동 조건:** BOOST는 `Shock Flag = ON` 또는 5월 정기점검 결과 `Stress`인 상태에서, 법인 계정이 주식 저가매도로 밀릴 위험이 클 때만 검토한다.
  - **[REQ-RAMS-3.2.5b] BOOST ladder 및 원복:** BOOST 추가 인출액은 주식 슬리브 drawdown 기준으로 `15~20% = +1.0m`, `20~30% = +2.0m`, `30% 초과 = +3.0m`을 사용하며, 발동 후 `6개월`만 유지되고 이후 자동으로 0으로 원복되어야 한다.
  - **[REQ-RAMS-3.2.6] 법인 5월 정기점검:** 5월에는 승인된 월 법인 현금 생성액을 기준으로 법인 `SGOV Buffer`를 30개월, `Bond Buffer`를 floor 12개월 / target 18개월 / upper 24개월 구조로 재구성한다.
  - **[REQ-RAMS-3.2.6a] 법인 8월 미니점검:** 8월에는 법인세 중간예납 등 확정 현금이벤트를 반영한 뒤 필요한 경우 `SGOV Buffer`만 조정할 수 있다. 이 달에는 `Bond Buffer`와 주식성 카테고리의 비중 재정렬이나 강제 리밸런싱을 수행하면 안 된다.
  - **[REQ-RAMS-3.2.7] 법인 11월 반기정비:** 11월에는 법인 `SGOV Buffer`를 27개월 기준으로 복구하고 `Bond Buffer` 상태를 재점검한다. Shock Flag가 켜져 있으면 `Bond Buffer`와 `SGOV Buffer`를 주식성 카테고리보다 우선한다.
  - **[REQ-RAMS-3.2.8] 개인연금 5월 정기점검:** 5월에는 개인연금 `SGOV Buffer`를 24개월, `Bond Buffer`를 floor 12개월 / target 18개월 / upper 24개월 구조로 재구성한다.
  - **[REQ-RAMS-3.2.9] 개인연금 중간 점검:** 개인연금 `SGOV Buffer`가 12개월 floor 미만으로 내려가면, 우선 `Bond Buffer`에서 `SGOV Buffer`를 보충한다. 그래도 부족하면 다음 5월 정기점검에서 전면 조정한다.
  - **[REQ-RAMS-3.2.10] donor 규칙 일반화:** 정기점검 시 `SGOV Buffer`와 `Bond Buffer` 보강은 문서의 donor 우선순위를 따르되, `High Income`, `Dividend Growth`, `Growth Engine`은 서로 다른 버킷으로 독립 유지해야 한다.
  - **[REQ-RAMS-3.2.10a] 법인 donor 순서:** 법인 정기점검에서 `SGOV Buffer`/`Bond Buffer` 보강 재원이 필요할 때는 `전술 슬리브 -> 목표 대비 오버웨이트 자산 -> Bond upper band(24개월) 초과분 -> 필요 시 Bond floor 12개월까지 -> Dividend Growth(VOO 역할) -> Growth Engine(QQQM 역할)` 순서를 따라야 한다. `High Income` 카테고리를 별도로 쓰는 사용자 포트폴리오는 이를 전술 슬리브/우선 donor로 취급하되, 표준 v11.1 4자산 모드에서는 비중 0이어야 한다. 원문 내 `donor 규칙`과 `5월/11월 세부 운용 규칙`이 충돌할 때는, 더 구체적인 세부 운용 규칙인 `18~24개월 유지 / 24개월 초과분 활용 가능`을 우선 해석한다.
  - **[REQ-RAMS-3.2.10b] 개인연금 donor 순서:** 개인연금 정기점검에서 `SGOV Buffer` 보강이 필요할 때는 `Bond upper band(24개월) 초과분 -> 필요 시 Bond floor 12개월까지 -> Dividend Growth(VOO 역할) -> Growth Engine(QQQM 역할)` 순서를 따라야 한다. 개인연금도 동일하게 `18~24개월은 정상 범위 유지, 24개월 초과분만 자동 donor 후보`로 해석한다.
  - **[REQ-RAMS-3.2.11] 카테고리 혼합 금지:** `Bond Buffer`와 `High Income`, `Dividend Growth`, `Growth Engine`은 계산 과정에서 동일 자산군으로 합산하거나 동일 성장률/하한선 규칙을 공유해서는 안 된다.
  - **[REQ-RAMS-3.2.12] 법인 실현소득 과세 기준:** 법인세 과세표준은 월별 배당/이자/인컴 등 `실현소득`만 누적하여 계산해야 하며, `PA`로 반영되는 미실현 자산가격 상승분은 법인세 과세표준에 포함하면 안 된다.
  - **[REQ-RAMS-3.2.13] 8월 중간예납:** 법인은 매년 8월에 `직전 연도 확정 법인세의 50%`를 중간예납으로 납부해야 한다. 이 금액은 해당 연도의 법인 `SGOV Buffer` 현금유출로 반영되어야 한다.
  - **[REQ-RAMS-3.2.14] 3월 확정 납부:** 법인은 매년 3월에 `직전 연도 1월~12월 실현소득 - 해당 연도 급여/월 기장비 등 비용` 기준으로 법인세를 산출하고, `직전 8월에 낸 중간예납`을 차감한 잔액만 추가 납부해야 한다. 같은 3월에는 `연 세무조정료`도 별도 현금유출로 반영해야 한다.
  - **[REQ-RAMS-3.2.15] 개인 일반계좌 운용:** 개인 일반계좌는 선택적 세 번째 계좌로서 법인/연금과 동일한 5개 버킷과 저장된 전략 비중을 사용한다. 초기자산이 0이면 기존 법인/연금 결과를 변경하지 않아야 한다.
  - **[REQ-RAMS-3.2.16] 실제 거래 이벤트 원장:** 비현금 카테고리에서 다른 카테고리로 이동한 실제 금액만 매도 이벤트로 기록하며 고정 매도비율을 금지한다.
  - **[REQ-RAMS-3.2.17] 취득원가와 실현손익:** 계좌/카테고리별 aggregate 취득원가를 유지하고 이동 전 source 평가액 대비 실제 매도비율로 매도원가를 계산한다.
  - **[REQ-RAMS-3.2.18] 개인 일반계좌 현금흐름 경계:** 월 인출 목표는 personal_account_params.monthly_withdrawal_target으로 독립 관리하며 기본값은 0이다.
  - **[REQ-RAMS-3.2.19] 활성 마스터 계좌 경계:** 활성 마스터 전략이 있으면 선택되지 않은 계좌의 초기자산, 급여, 운영비, 인출 목표를 시뮬레이션에서 제외한다. Corporate와 Personal은 동시에 활성화할 수 없으며 Pension은 어느 운용 방식과도 조합할 수 있다.
  - **[REQ-RAMS-3.2.20] 개인 일반계좌 가계 현금흐름:** Personal Taxable의 실제 월 인출액은 가계 현금 유입으로 처리하여 월 필요금액의 부족분을 줄여야 한다. Personal 단독 전략에서는 법인 급여·주주대여금·법인 운영비를 생성하면 안 된다.
  - **[REQ-RAMS-3.2.21] 미국 상장 자산 범위:** 개인 일반계좌 세금 엔진의 1차 범위는 한국 세법상 거주자가 직접 보유하는 미국 상장 주식·ETF로 제한한다. 국내 상장 ETF, 파생상품, 채권 직접투자, 비거주자 과세는 후속 범위로 둔다.
  - **[REQ-RAMS-3.2.22] 미국 배당 세금 원장:** 월별 총분배금, 미국 원천징수세, 국내 산출세액, 외국납부세액공제, 국내 추가납부액을 분리한다. 미국 원천징수세는 지급월에 차감하고 금융소득 종합과세 추가세액은 다음 해 5월에 납부한다.
  - **[REQ-RAMS-3.2.23] 해외주식 양도소득세:** 실제 매도 이벤트의 원화 매도대금과 비례 취득원가로 연간 실현손익을 통산하고, 연간 기본공제 후 설정 세율을 적용한다. 미실현 평가이익은 과세하지 않으며 산출세액은 다음 해 5월 Personal SGOV에서 납부한다.
  - **[REQ-RAMS-3.2.24] 세금 납부 재원:** Personal SGOV가 세금·건보료보다 부족하면 기존 Personal donor 및 실제 거래 이벤트 규칙으로 현금을 조달하고, 그 매도는 당해 연도 양도손익 원장에 기록한다.
  - **[REQ-RAMS-3.2.25] 금융소득 종합과세 추정:** 미국 배당과 사용자 입력 외부 금융소득 합계가 설정 기준을 초과하면 기타 종합소득 과세표준을 기준으로 누진세액 증가분을 추정한다. 비교과세 하한과 외국납부세액공제를 적용하고 결과를 추정치로 명시한다.
  - **[REQ-RAMS-3.2.26] 지역건보 반영 시차:** 지역건보 재산분은 현재 재산세 과세표준으로 매월 계산하고, 금융소득분은 설정된 최소 반영소득과 신고자료 반영연도·월을 거친 뒤 보험료에 포함한다. 양도소득은 금융소득으로 합산하지 않는다.
  - **[REQ-RAMS-3.2.27] 개인 세금 감사 출력:** 월별 결과와 연간 원장에 총배당, 원천세, 국내 추가세, 실현손익, 기본공제, 양도세, 건보료, 납부시점, 기말 취득원가를 노출한다. 모든 정책값은 설정에서 주입하며 코드 상수에만 의존하지 않는다.
- **[REQ-RAMS-3.3] 자산군별 PA/DY/TR 적용 엔진:**
  - **[REQ-RAMS-3.3.1] 자산군별 독립 성장률:** 월 수익 계산은 계정 평균 수익률 1개가 아니라 전략 카테고리별 `PA`, `DY`, `TR`을 독립 적용해야 한다.
  - **[REQ-RAMS-3.3.2] 수식 정합성:** 각 카테고리는 `TR = DY + PA`를 만족해야 하며, 장기 시뮬레이션의 PA 낙관 편향을 막기 위해 월 변환은 `월 PA = (1 + 연 PA)^(1/12) - 1`, `월 DY = 연 DY / 12`를 사용한다.
  - **[REQ-RAMS-3.3.3] 사용자 변형 포트폴리오 지원:** 문서의 표준 플랜과 다른 종목/비중을 넣어도, 자산군 카테고리와 운용 규칙이 동일하면 같은 엔진으로 시뮬레이션할 수 있어야 한다.
  - **[REQ-RAMS-3.3.4] 분배금 run-rate 분리:** `Bond Buffer`, `High Income`, `Dividend Growth`, `Growth Engine`의 월 배당/이자/인컴은 현재 월 평가액에 고정 DY를 다시 곱하는 방식만으로 계산해서는 안 된다. 엔진은 카테고리별 연간 분배금 run-rate를 별도 상태로 보유하고, 월 분배금은 `연간 run-rate / 12`로 `SGOV Buffer`에 현금 수확해야 한다. 단, `SGOV Buffer`는 현금성 자산이므로 기존처럼 DY가 해당 잔고에 머무르는 재투자형 처리를 유지한다.
  - **[REQ-RAMS-3.3.5] 가격-분배금 독립성:** `PA` 충격이나 가격 하락은 해당 월 평가액을 조정하지만, 별도 분배금 삭감 이벤트가 없으면 다음 달 분배금 절대액을 기계적으로 줄이면 안 된다. 분배금 run-rate는 선택적 `growth_rate`로 성장할 수 있고, Crash20 또는 정기점검 Stress 발생 시 선택적 `stress_cut_rate`만큼 삭감될 수 있어야 한다.
  - **[REQ-RAMS-3.3.6] run-rate 호환성:** 명시적 `distribution_run_rates` 입력이 없으면 초기 run-rate는 `초기 카테고리 평가액 * 구조적 연 DY`로 산정하여 기존 DY 기반 설정과 호환되어야 한다. 구조적 연 DY의 우선순위는 `distribution_yield_overrides -> category_return_rates.dy -> category_dividend_yields -> fallback dividend_yield`이며, 월별 `monthly_return_overrides`는 초기 run-rate 산정에 개입하면 안 된다. 이 모델은 카테고리 단위 평가액/현금흐름 모델이며, 종목별 주식 수와 정확한 미래 체결 가격 장부를 대체하지 않는다.
  - **[REQ-RAMS-3.3.7] 리밸런싱 run-rate 동기화:** 리밸런싱, floor refill, surplus deploy 등 카테고리 간 자산 이동은 평가액뿐 아니라 분배금 run-rate도 함께 조정해야 한다. Source 비현금 카테고리는 `이동금액 / 이동 전 source 평가액` 비율로 run-rate를 줄이고, Target 비현금 카테고리는 구조적 연 DY 기준으로 `이동금액 * target DY`만큼 run-rate를 생성해야 한다.
  - **[REQ-RAMS-3.3.8] 명시 run-rate와 신규 매수분 정책 분리:** `distribution_run_rates`는 초기 보유분의 명시적 연간 분배금 run-rate를 뜻한다. 이후 신규 매수분의 run-rate 생성은 별도 `distribution_yield_overrides` 또는 카테고리 DY 규칙을 따라야 하며, 월별 `monthly_return_overrides`와 섞이면 안 된다. 설정 계약에서는 `distribution_run_rates`를 "초기 보유분 장부값", `distribution_yield_overrides`를 "신규 매수분 구조적 DY override"로 분리해 다뤄야 한다.
  - **[REQ-RAMS-3.3.9] 프로필 TR override 정합성:** `Conservative Profile` 등 비표준 프로필의 `expected_return`은 각 계좌를 동일 TR로 강제 스케일링하는 값이 아니라, 현재 활성 master portfolio의 통합 TR 대비 차이(`target TR - master TR`)를 카테고리별 PA에 동일하게 더하는 포트폴리오 레벨 시나리오 delta로 해석해야 한다. 따라서 비표준 프로필의 `expected_return`이 표준 master TR과 같고 인플레이션도 같으면, Standard Profile과 동일한 카테고리별 `DY/PA/TR` 경로를 사용해 동일한 시뮬레이션 결과를 반환해야 한다. 특정 자산군의 PA만 배율로 증폭하여 시간이 지날수록 목표 TR에서 이탈하는 정적 스케일링은 금지한다.
- **[REQ-RAMS-3.4] Shock / Stress / Inflation 운영 규칙:**
  - **[REQ-RAMS-3.4.1] Crash20:** 월말 기준 주식성 슬리브 평가액이 직전 5월 기준값의 80% 이하가 되면 Shock Flag를 활성화한다.
  - **[REQ-RAMS-3.4.2] Stress 판정:** Stress는 월말 숫자로 즉시 판정하지 않고 5월 정기점검의 A/B/C 테스트 결과로만 판정한다.
  - **[REQ-RAMS-3.4.3] 인플레이션 적용:** 인플레이션 반영 여부는 5월 정기점검에서만 승인/동결하며, 승인된 총 필요금액은 6월부터 다음 해 5월까지 12개월 고정 적용한다.
  - **[REQ-RAMS-3.4.4] 출력 투명성:** 월별 결과에는 최소한 Phase, 총 필요금액, 법인 부담 월지출, Shock Flag, Stress, 계정별 SGOV/Bond 개월수, 계정별 카테고리 잔액이 포함되어야 한다.
  - **[REQ-RAMS-3.4.5] 관측 시점 명시:** 월별 로그의 기본 개월수/잔액 필드는 해당 월의 이벤트, 인출, 정기점검, 리밸런싱이 모두 반영된 `월말(post-review)` 값임을 명시해야 한다. 문서의 `11월 직전`, `다음 5월 직전`과 같은 기준선을 대조하기 위해 `pre-review` 개월수 관측값을 별도로 제공해야 한다.

### [Structure 4] 사용자 설정 가능 전략 파라미터 (Simulation Controls)

- **[REQ-RAMS-8.1] 설정값의 사용자화:** 활성 운용 문서인 `stock-plan-v11.1.md`와 `simulation rule-v11.1.md`에 정의된 버퍼 개월수, 역할 하한선, 리밸런싱 월, 성장 자산 매도 허용 조건 등은 모두 Settings 화면에서 사용자 수정 가능해야 하며, 문서의 수치는 기본값으로 제공한다.
- **[REQ-RAMS-8.2] 계좌별 전략 설정 UI:**
  - 연금 계좌용 설정과 법인 계좌용 설정을 시각적으로 분리하여 제공한다.
  - 각 설정은 설명 툴팁과 기본값 복원 기능을 포함한다.
- **[REQ-RAMS-8.2.1] OS v11.1 설명 노출:** Settings 화면은 사용자가 이 프로그램이 `OS v11.1` 운용 정책을 시뮬레이션한다는 사실을 이해할 수 있도록 짧은 설명 카드를 제공해야 한다.
  - 설명은 법인/연금 계좌 구분, 5단 자산 역할, SGOV-only 월 인출, 정기점검 기반 버퍼 보충/리밸런싱을 핵심만 요약한다.
  - 설명은 설정 입력을 방해하지 않도록 전략 규칙 섹션의 안내 카드 수준으로 제공한다.
- **[REQ-RAMS-8.3] 시뮬레이션 프로필 구조화:** 기존 Settings 화면은 단순 입력 목록이 아니라 `User Profile / Pension / Corporate / Strategy Rules / Assumptions / Events` 등 구조화된 섹션으로 재편될 수 있어야 한다.
  - `Sim Control` 섹션에서 `household_monthly_need`(월 가계필요비용), `simulation_years`, `simulation_start_year`, `simulation_start_month`를 수정할 수 있어야 한다.
- **[REQ-RAMS-8.3.0] 법인필요비용 파생값 노출:** `Corporate` 섹션에는 `월 기장비 + 연 세무조정료/12`로 계산한 `법인필요비용`을 읽기 전용으로 즉시 표시해야 한다.
- **[REQ-RAMS-8.3.1] 급여 실수령 가시화:** `Corporate` 섹션의 월 급여 입력 옆에는 추정 세후 실수령액을 즉시 계산해 보여줘야 한다. 이 값은 가계 필요금액 부족분 계산에 직접 쓰이는 기준값이어야 한다.
- **[REQ-RAMS-8.4] 기본값 복원:** 사용자는 전략 파라미터를 문서 기본값으로 즉시 되돌릴 수 있어야 한다.
- **[REQ-RAMS-8.5] 투명성:** Step 2 Projection Result에는 실제 사용된 핵심 설정값(예: 법인 SGOV 목표 개월수, 연금 SGOV 하한, 리밸런싱 실행 월)을 확인할 수 있는 요약 정보 또는 상세 패널이 제공되어야 한다.
  - 요약 정보에는 `household_monthly_need`(월 가계필요비용), `corporate_monthly_operating_cost`(법인필요비용 파생값), `monthly_salary`, `estimated_net_salary`도 포함되어 사용자가 현재 시뮬레이션이 어떤 현금흐름 가정 위에서 계산되었는지 즉시 확인할 수 있어야 한다.
- **[REQ-RAMS-8.6] 엔진 규칙 동적 연동:** `strategy_rules`에 저장된 버퍼 개월수와 Bond floor/target/upper 값은 화면 노출 여부와 무관하게 `ProjectionEngine`의 5월/8월/11월 점검, 연금 floor refill, Stress 판정에 실제로 반영되어야 한다. 엔진 내부에 동일 의미의 하드코딩 상수를 별도로 유지해서는 안 된다.
- **[REQ-RAMS-8.6a] 설정-엔진 정합성:** Settings와 API는 은퇴 시뮬레이션에 실제 반영되는 설정만 활성 제어로 노출해야 한다. 아직 엔진과 연결되지 않은 legacy/ghost 설정은 입력 가능 상태로 노출하면 안 되며, 숨기거나 `현재 미적용` 상태를 명시해야 한다.

---

## 3. UI/UX 원칙

- 모든 입력 필드는 엔터 키로 확정하며, 소수점 1자리로 자동 포맷팅한다.
- 사용자가 임의 수정한 값은 언제든 '마스터 설정값'으로 되돌릴 수 있는 리셋 기능을 제공한다.
- Retirement 탭 `Step 1. Set the Basis`의 `Standard Profile` 수익률 리셋 기준값은 현재 활성 마스터 전략의 `TR`이어야 한다.
- 미래 자금 이벤트는 리스트 형태로 추가/삭제가 가능해야 한다.
