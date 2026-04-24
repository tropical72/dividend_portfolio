# Plan: System Core & Global Standards (00)

## 🔄 진행 현황 (Progress Mapping)

### [Phase 1] 기본 아키텍처 및 설정 (DONE)
- [x] **T-00-1.1** FastAPI/React 개발 환경 구축.
- [x] **T-00-1.2** 설정 탭(SettingsTab) 구현 및 API 키 관리 UI.

### [Phase 10] 수익률 지표 표준화 (DY 중심 & PA 가산 모델) [NEW] - DONE
- **T-GLB-10.1: [Backend] 설정값 확장 및 계산 로직 정립**
    - [x] **T-GLB-10.1.1** `settings.json`에 `price_appreciation_rate` 필드 추가 및 `SettingsRequest` 모델 업데이트.
    - [x] **T-GLB-10.1.2** `ProjectionEngine` 입력 시 `TR = DY + PA` 공식을 적용하도록 `api.py` 수정.
- **T-GLB-10.2: [Frontend] 설정 UI 고도화 및 저장 버그 수정**
    - [x] **T-GLB-10.2.1** `SettingsTab.tsx`에 '기본 자산 성장률(PA)' 입력 필드 추가.
    - [x] **T-GLB-10.2.2** [Bug] 백엔드 모델 누락으로 인한 설정값 저장 실패 현상 수정 완료.
- **T-GLB-10.3: [Frontend] 포트폴리오 디자이너/대시보드 UI 개편**
    - [x] **T-GLB-10.3.1** `PortfolioDashboard.tsx` 리스트에서 'Yield'를 메인으로, 'TR'을 서브로 표시하도록 변경.
    - [x] **T-GLB-10.3.2** `PortfolioTab.tsx` 분석 섹션에서 'Expected Yield'와 'Total Return (Yield + Growth)'를 명확히 구분하여 표시.
- **T-GLB-10.4: [Frontend] 은퇴 시뮬레이션 결과 투명성 강화**
    - [x] **T-GLB-10.4.1** `RetirementTab.tsx` 시뮬레이션 기초 정보 배지에 DY와 PA를 각각 노출하여 TR의 산출 근거 시각화.
- **T-GLB-10.5: [Validation] TDD 기반 정합성 검증**
    - [x] **T-GLB-10.5.1** 계산 로직 단위 테스트 (`test_yield_centric_math.py`) 추가 및 검증 완료.
    - [x] **T-GLB-10.5.2** UI 지표 일관성 및 저장 기능 검증을 위한 Playwright 테스트 (`regression_metrics.spec.ts`) 작성 및 통과.

### [Phase 11] 품질 게이트 명시화 및 전역 부채 추적 [NEW]
- **T-GLB-11.1: [Policy] Feature 단위 품질 게이트 고정**
    - [x] **T-GLB-11.1.1** Python 변경 feature의 필수 게이트를 `ruff + black --check + 관련 pytest`로 명시한다.
    - [x] **T-GLB-11.1.2** Frontend 변경 feature의 필수 게이트를 `eslint + build + prettier --check + 관련 Playwright`로 명시한다.
- **T-GLB-11.2: [Tooling] 생성물 제외 및 스타일 검증 정리**
    - [x] **T-GLB-11.2.1** Frontend Prettier 검사 대상에서 `playwright-report`, `test-results`, `dist`를 제외한다.
- **T-GLB-11.3: [Debt] 전역 정적 분석 부채 추적**
    - [x] **T-GLB-11.3.1** 저장소 전체 `black --check src tests` 실패 원인을 분류하고 정비 계획을 수립한다.
    - [x] **T-GLB-11.3.2** 저장소 전체 `mypy src tests` 실패 원인을 분류하고 정비 계획을 수립한다.
- **T-GLB-11.4: [Isolation] Playwright 백엔드 상태 복구 체계**
    - [x] **T-GLB-11.4.1** 백엔드에 상태 snapshot/restore API를 추가하여 실제 데이터 오염 없이 E2E가 복구 가능하도록 한다.
    - [x] **T-GLB-11.4.2** 상태를 변경하는 Playwright 스펙에 공통 snapshot/restore helper를 적용하고, 실제 백엔드 재기동 상태에서 재검증한다.

### [Phase 11 Notes] 2026-04-16 전역 부채 1차 정비
- `mypy src tests` 기준 오류를 41건에서 0건으로 감축했다.
- 1차 정리 완료 범주:
    - `Optional` 기본값 시그니처 정리 (`trigger_engine`, `stress_engine`, `rebalance_engine`, `tax_engine`)
    - `main.py` 요청 모델의 `Optional`/리스트 기본값 정리
    - `api.py`의 `strategy_weights`/설정/스냅샷 반환 경계 타입 정리
- 정비 완료:
    - `src/backend/data_provider.py`의 `requests` stub 처리
    - `src/backend/data_provider.py` 반환 타입 정리
    - 저장소 전체 `black --check src tests` 통과
    - 저장소 전체 `mypy src tests` 통과
    - 저장소 전체 `ruff check src tests` 통과

### [Phase 12] UI 다국어 지원 (ko/en) [NEW]
- **T-GLB-12.1: [Docs] 다국어 요구사항/테스트/추적 기준 수립**
    - [x] **T-GLB-12.1.1** `REQ-SYS-05` UI 다국어 요구사항을 전역 문서에 추가한다.
    - [x] **T-GLB-12.1.2** `TEST-SYS-I18N-*` 회귀 테스트 기준을 추가하고 `trace_matrix`에 작업을 등록한다.
- **T-GLB-12.2: [Backend] 언어 설정 저장 스키마 추가**
    - [x] **T-GLB-12.2.1** `settings.json` 및 설정 API에 `ui_language` 필드를 추가한다.
    - [x] **T-GLB-12.2.2** 미설정 환경의 기본 언어를 정의하고 하위 호환 마이그레이션을 보장한다.
- **T-GLB-12.3: [Frontend] i18n 기반 계층 도입**
    - [x] **T-GLB-12.3.1** 번역 사전과 `t(key)` 호출 계층을 추가한다.
    - [x] **T-GLB-12.3.2** 전역 언어 상태와 즉시 반영 로직을 연결한다.
- **T-GLB-12.4: [Frontend] 핵심 화면 1차 다국어화**
    - [x] **T-GLB-12.4.1** 전역 네비게이션과 공통 버튼/레이블/빈 상태를 이관한다.
    - [x] **T-GLB-12.4.2** `RetirementTab.tsx`와 `SettingsTab.tsx`의 사용자 노출 문자열을 한국어/영어 모두 지원하도록 전환한다.
- **T-GLB-12.5: [Frontend] 나머지 관리 화면 확장**
    - [x] **T-GLB-12.5.1** `Portfolio Manager`와 `Watchlist`를 동일 번역 계층으로 이관한다.
    - [ ] **T-GLB-12.5.2** 토스트/에러/경고 메시지의 문자열 출처를 정리한다.
- **T-GLB-12.6: [Validation] 다국어 회귀 검증**
    - [x] **T-GLB-12.6.1** 언어 저장/재로드 유지와 즉시 전환을 검증하는 Playwright 스펙을 작성한다.
    - [x] **T-GLB-12.6.2** 핵심 화면이 언어별로 혼용 없이 렌더링되는지 회귀 검증한다.

## [Phase 13] 시뮬레이션 정교화 및 용어 표준화 [NEW]
- **T-GLB-13.1: [Backend] 설정 모델 및 엔진 고도화**
    - [x] **T-GLB-13.1.1** `Settings` 스키마에 `appreciation_rates` (4종)와 `national_pension_amount/age` 필드 추가.
    - [x] **T-GLB-13.1.2** `ProjectionEngine`이 종목의 카테고리 정보를 읽어 해당 `기대주가상승률(PA)`을 적용하도록 로직 수정.
- **T-GLB-13.2: [Frontend] Settings 탭 UI 개편**
    - [x] **T-GLB-13.2.1** '자산군별 기대주가상승률' 설정 섹션 구현 (입력창 + 기본값 복구 버튼).
    - [ ] **T-GLB-13.2.2** '은퇴 수입(국민연금)' 설정 섹션 보강 (시작 연령 및 수령액).
- **T-GLB-13.3: [Frontend] Portfolio Designer 및 용어 통일**
    - [x] **T-GLB-13.3.1** 카테고리별 헤더에 `배당수익률 | 기대주가상승률 | TR` 수치 노출 로직 추가.
    - [x] **T-GLB-13.3.2** 전체 소스코드 내 수익률 관련 레이블을 표준 용어(TR, 배당수익률, 기대주가상승률)로 일괄 치환.
- **T-GLB-13.4: [Validation] 정합성 검증**
    - [ ] **T-GLB-13.4.1** 자산군별 PA 차등 적용 시 시뮬레이션 결과의 합리적 차이(SGOV 정체 vs 성장주 우상향) 검증.
    - [ ] **T-GLB-13.4.2** 국민연금 입력값 변경 시 65세 이후 그래프 곡선 변화 확인.

### [Phase 14] 공개 저장소용 기본값/로컬 데이터 분리 [NEW] - DONE
- **T-GLB-14.1: [Backend] 저장소 기본값과 로컬 런타임 데이터 분리**
    - [x] **T-GLB-14.1.1** `StorageManager`가 로컬 데이터 디렉터리 우선, `defaults/` fallback 구조를 지원하도록 확장한다.
    - [x] **T-GLB-14.1.2** `main.py`의 기본 `APP_DATA_DIR`를 사용자 로컬 앱 데이터 디렉터리로 변경한다.
- **T-GLB-14.2: [Repo] Git 추적 기본값 구조 재배치**
    - [x] **T-GLB-14.2.1** 공개 가능한 기본 설정을 `defaults/settings.json`, `defaults/cost_comparison_config.json`, `defaults/retirement_config.json`으로 이동한다.
    - [x] **T-GLB-14.2.2** 저장소 루트의 구 영속성 JSON 및 생성물 추적을 제거하고 `.gitignore`를 보강한다.
- **T-GLB-14.3: [Validation] 기본값 fallback 및 로컬 저장 분리 검증**
    - [x] **T-GLB-14.3.1** 로컬 설정 부재 시 `defaults/` 기본값이 로드되는지 테스트한다.
    - [x] **T-GLB-14.3.2** 사용자 저장이 `APP_DATA_DIR` 하위 로컬 파일에만 기록되고 Git 기본값 파일은 오염되지 않는지 검증한다.

### [Phase 15] 공개 저장소용 레거시/임시 자산 정리 [NEW] - DONE
- **T-GLB-15.1: [Repo] 실행 경로와 무관한 레거시 자산 제거**
    - [x] **T-GLB-15.1.1** `src/frontend_legacy/`, `old_docs/`, `tests/debug_*.py`, `tests/download_font.py`, `update_settings.py`를 제거한다.
    - [x] **T-GLB-15.1.2** 레거시 제거 후 남는 문서 참조를 현재 구조에 맞게 갱신한다.
- **T-GLB-15.2: [Docs] 공개 저장소 진입 문서 보강**
    - [x] **T-GLB-15.2.1** 루트 `README.md`를 추가해 실행 방법, 데이터 구조, 테스트 명령을 문서화한다.
    - [x] **T-GLB-15.2.2** 디버그 산출물(`debug_screen.png`)이 Git에 포함되지 않도록 ignore 규칙을 보강한다.

---
*마지막 업데이트: 2026-04-25 13:45:00*
