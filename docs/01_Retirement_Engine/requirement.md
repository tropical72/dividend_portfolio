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
    - **[REQ-RAMS-1.4.2] 실시간 가중 평균 배당률(DY) 및 총수익률(TR) 산출:** 
        - 선정된 포트폴리오의 각 종목(`items`)에 대해 다음 공식을 적용하여 엔진 주입용 지표를 산출한다.
        - `Dividend Yield (DY) = Σ(종목별 배당률 * 종목 비중 / 100)`
        - `Engine Total Return (TR) = DY + Price Appreciation (from Settings)`
        - 종목별 가격 상승률은 별도 계산하지 않으며, `Price Appreciation`는 오직 `Settings`의 전역 가정값을 사용한다.
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
- **[REQ-RAMS-1.7] 계좌별 4단계 전략 카테고리 구조:**
    - **[REQ-RAMS-1.7.1] 연금 계좌 카테고리:** 연금 포트폴리오는 `SGOV Buffer`, `Bond Buffer`, `Dividend Growth`, `Growth Engine`의 4개 카테고리를 기본 구조로 가진다.
    - **[REQ-RAMS-1.7.2] 법인 계좌 카테고리:** 법인 포트폴리오는 `SGOV Buffer`, `High Income`, `Dividend Growth`, `Growth Engine`의 4개 카테고리를 기본 구조로 가진다.
    - **[REQ-RAMS-1.7.3] 사용자 종목 배치:** 사용자는 Portfolio Manager 화면에서 각 계좌 타입별 4개 카테고리에 원하는 종목을 직접 배치하고 수정할 수 있어야 한다.
    - **[REQ-RAMS-1.7.4] 엔진 카테고리 정합성:** Retirement Engine은 위 4개 카테고리를 직접 인식하여 인출 및 리밸런싱 전략에 사용해야 하며, 기존의 일반화된 `Cash/Fixed/Dividend/Growth` 추상 분류만으로 처리해서는 안 된다.

### [Structure 2] 세무 및 수익성 엔진 (Tax Engine)
- **[REQ-RAMS-2.1] 법인/개인 세무 산출:** 지역건보료, 종합소득세, 법인세를 정밀 계산한다.
- **[REQ-RAMS-2.2] 정보 출처 투명성:** 건보료 점수 단가 등 국가 정책 수치의 경우, UI에 출처(예: 국민건강보험공단)를 명시한다.
- **[REQ-RAMS-2.3] 법인 현금흐름과 주주대여금 반환 분리:**
    - **[REQ-RAMS-2.3.1] 법인 현금 원천:** 법인 계좌의 생활비/운영비/주주대여금 반환 재원은 오직 법인 계좌 내에서 발생한 배당·인컴 및 현금성 자산 매도 대금으로 구성되어야 한다.
    - **[REQ-RAMS-2.3.2] 주주대여금 반환 처리:** `initial_shareholder_loan`은 비과세 반환 가능 한도를 의미하며, 실제 반환은 법인 현금 잔액이 확보된 범위 내에서만 이루어져야 한다.
    - **[REQ-RAMS-2.3.3] 자본금/대여금/총운용자산 관계 명시:** `capital_stock`은 법인 설립 시 납입 자본금, `initial_shareholder_loan`은 법인에 빌려준 주주대여금 원금, `initial_investment`는 실제로 법인 계좌에서 운용되는 총자산을 의미한다. 초기 시점의 `initial_investment`는 `capital_stock + initial_shareholder_loan + 기타 유보 현금`의 합으로 구성될 수 있으며, 엔진은 자산 운용 수익 계산에는 `initial_investment`를 사용하고, 비과세 반환 한도 계산에는 `initial_shareholder_loan` 잔액을 사용해야 한다.

### [Structure 3] 생애 주기 인출 및 이벤트 통합 시뮬레이션
- **[REQ-RAMS-3.1] 월 단위 Phase 및 이벤트 반영:**
    - 나이와 월을 계산하여 Phase를 자동 전환하고, 해당 월에 등록된 **Planned Cashflow 이벤트를 자산 잔액에 즉시 가감**한다.
- **[REQ-RAMS-3.2] 동적 인출 및 리밸런싱 알고리즘:**
    - **[REQ-RAMS-3.2.1] 공통 원칙:** 매년 1회(기본값: 1월 둘째 주) 기계적 매도 및 리밸런싱을 실행하며, 평시에는 월별 투자 판단 개입 없이 현금흐름과 이벤트만 반영한다.
    - **[REQ-RAMS-3.2.2] 연금 계좌 전략:** 
        - 기본 매도 순서: `SGOV Buffer -> Bond Buffer -> Dividend Growth -> Growth Engine`.
        - 연간 인출액은 우선 `SGOV Buffer`에서 조달한다.
        - `SGOV Buffer`가 연 인출액 2년치 미만으로 하락하면 `Bond Buffer` 매도를 통해 `SGOV Buffer`를 보충한다.
        - `Bond Buffer`가 연 인출액 5년치 또는 총 연금 자산의 5% 이하로 하락하면 `Dividend Growth` 자산 매도를 통해 완충 자산을 보강한다.
        - `Dividend Growth` 비중이 총 연금 자산의 10% 이하이고 Phase 3에 진입한 경우에만 `Growth Engine` 매도를 허용한다.
    - **[REQ-RAMS-3.2.3] 법인 계좌 전략:**
        - 기본 매도 순서: `SGOV Buffer -> High Income -> Dividend Growth -> Growth Engine`.
        - `SGOV Buffer`는 생활비 부족분 기준 36개월치 목표를 유지해야 한다.
        - `SGOV Buffer`가 30개월치 미만이면 신규 인컴과 추가 유입금, 필요시 `High Income` 일부 매도 대금을 모두 `SGOV Buffer` 보강에 우선 투입한다.
        - `High Income` 비중이 20% 미만으로 하락하면 `Dividend Growth` 자산으로 `SGOV Buffer`를 보충한다.
        - `Growth Engine`은 원칙적으로 매도 금지이며, 기대수명 10년 미만 또는 `SGOV Buffer < 24개월`이면서 `High Income`과 `Dividend Growth`가 모두 소진된 구조적 위기에서만 예외적으로 허용한다.
    - **[REQ-RAMS-3.2.4] 하락장 방어:** 하락장(Panic Threshold 도달 시) 리밸런싱을 중단하고 `Growth Engine` 및 `Dividend Growth` 매도를 금지한다.
    - **[REQ-RAMS-3.2.5] 배당/인컴 현금화 분리:** 배당 및 인컴은 자산 자체에 자동 재투자되지 않고 우선 계좌별 현금 버퍼(`SGOV Buffer` 또는 현금 잔액)로 유입된 뒤, 지출/보강/재배치에 사용되어야 한다.
    - **[REQ-RAMS-3.2.6] 운영비 처리:** 법인 급여, 4대보험, 고정비는 모두 법인 계좌의 현금 버퍼에서 우선 차감되며, 현금 부족 시에만 전략 규칙에 따라 자산 매도가 발생해야 한다.

### [Structure 4] 사용자 설정 가능 전략 파라미터 (Simulation Controls)
- **[REQ-RAMS-8.1] 설정값의 사용자화:** `stock-plan.txt`에 정의된 버퍼 개월수, 역할 하한선, 리밸런싱 월, 성장 자산 매도 허용 조건 등은 모두 Settings 화면에서 사용자 수정 가능해야 하며, 문서의 수치는 기본값으로 제공한다.
- **[REQ-RAMS-8.2] 계좌별 전략 설정 UI:**
    - 연금 계좌용 설정과 법인 계좌용 설정을 시각적으로 분리하여 제공한다.
    - 각 설정은 설명 툴팁과 기본값 복원 기능을 포함한다.
- **[REQ-RAMS-8.3] 시뮬레이션 프로필 구조화:** 기존 Settings 화면은 단순 입력 목록이 아니라 `User Profile / Pension / Corporate / Strategy Rules / Assumptions / Events` 등 구조화된 섹션으로 재편될 수 있어야 한다.
- **[REQ-RAMS-8.4] 기본값 복원:** 사용자는 전략 파라미터를 문서 기본값으로 즉시 되돌릴 수 있어야 한다.
- **[REQ-RAMS-8.5] 투명성:** Step 2 Projection Result에는 실제 사용된 핵심 설정값(예: 법인 SGOV 목표 개월수, 연금 SGOV 하한, 리밸런싱 실행 월)을 확인할 수 있는 요약 정보 또는 상세 패널이 제공되어야 한다.

---

## 3. UI/UX 원칙
- 모든 입력 필드는 엔터 키로 확정하며, 소수점 1자리로 자동 포맷팅한다.
- 사용자가 임의 수정한 값은 언제든 '마스터 설정값'으로 되돌릴 수 있는 리셋 기능을 제공한다.
- Retirement 탭 `Step 1. Set the Basis`의 `Standard Profile` 수익률 리셋 기준값은 현재 활성 마스터 전략의 `TR`이어야 한다.
- 미래 자금 이벤트는 리스트 형태로 추가/삭제가 가능해야 한다.
