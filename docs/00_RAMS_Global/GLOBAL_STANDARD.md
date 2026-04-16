# Global Standard: 수익률 지표 및 계산 로직

## 1. 용어 정의 (Terminology)
- **Dividend Yield (DY, 배당 수익률):** 포트폴리오의 각 종목이 지급하는 배당금의 가중 평균 합계. UI에서 가장 우선적으로 노출되는 지표이다.
- **Price Appreciation (PA, 자산 성장률):** 주가 상승에 따른 자산 가치의 증가율. 종목별 예측이 아닌, `Settings` 탭에서 사용자가 설정한 '시장 평균 성장률'을 전역적으로 적용한다.
- **Total Return (TR, 총 수익률):** 은퇴 시뮬레이션 엔진에서 자산의 미래 가치를 계산하기 위해 사용하는 합계 수익률. (`TR = DY + PA`)

## 1.1 계산 책임 경계
- 포트폴리오 매니저는 종목별 배당 기반 `DY`만 확정 계산한다.
- 종목별 또는 포트폴리오별 `Price Appreciation`는 별도 예측 계산하지 않는다.
- 자산 성장률 가정은 오직 `Settings.price_appreciation_rate` 한 곳에서만 정의한다.
- 은퇴 엔진과 마스터 전략 요약에서 사용하는 `TR`은 항상 `Portfolio DY + Global PA`로 계산한다.

## 2. 계산 공식 (Calculation Formula)

### 2.1 포트폴리오 가중 평균 배당률 (Portfolio DY)
$$DY_{portfolio} = \sum_{i=1}^{n} (Yield_i \times \frac{Weight_i}{100})$$
- $Yield_i$: i번째 종목의 연간 배당률 (세전)
- $Weight_i$: i번째 종목의 포트폴리오 내 비중 (%)

### 2.2 은퇴 엔진 주입용 총 수익률 (Engine TR)
$$TR_{engine} = DY_{portfolio} + PA_{settings}$$
- $PA_{settings}$: `Settings` 탭에 저장된 '기본 자산 성장률' (Default: 3.0%)

### 2.3 마스터 전략 요약용 총 수익률 (Master TR)
- 활성화된 마스터 전략의 법인/연금 포트폴리오별 `TR`을 자산 비중으로 가중 평균한다.
- 단, 마스터 전략이 참조하는 포트폴리오 ID가 깨져 있으면 `TR`을 추정값으로 대체하지 않는다.
- 이 경우 시스템은 `broken master reference` 오류를 반환하고, 사용자는 포트폴리오 연결을 먼저 복구해야 한다.

## 3. UI 노출 원칙
1. **Portfolio Manager:** 'Dividend Yield'를 메인 지표로 표시한다. 'Total Return'은 분석용 보조 지표로만 활용하거나, 툴팁을 통해 PA가 합산된 결과임을 명시한다.
2. **Retirement Engine:** 시뮬레이션 결과 화면에서 기초가 된 'Dividend Yield'와 적용된 'Price Appreciation'을 분리하여 표시함으로써 계산의 근거를 투명하게 공개한다.
3. **Retirement Step 1:** `Standard Profile`의 기준 수익률은 현재 활성 마스터 전략의 `TR`을 표시한다.
4. **Settings:** 사용자가 'Price Appreciation'을 언제든 수정할 수 있도록 입력 필드를 제공하며, 이는 즉시 모든 은퇴 시뮬레이션에 반영된다.

---
*Last Updated: 2026-04-15*
