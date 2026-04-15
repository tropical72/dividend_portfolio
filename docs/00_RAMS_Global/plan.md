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

---
*마지막 업데이트: 2026-04-15 19:10:00*
