# Requirement: Retirement Asset Management System (RAMS)

## 1. 시스템 개요 및 최종 목표
본 시스템은 마스터의 은퇴 전략을 기반으로 법인과 연금 자산의 운용 실익을 증명하고, 생애 주기별 동적 인출 시뮬레이션을 통해 "원하는 모습으로 은퇴할 수 있다"는 심리적 확신을 제공하는 것을 목표로 한다. 

특히 본 시스템은 아래 명시된 **5대 아키텍처 원칙(REQ-ARCH)**을 절대적으로 준수하여 설계 및 구현된다.

---

## 2. 시스템 아키텍처 요구사항 (Architectural Integrity)

- **[REQ-ARCH-1] Core Engine UI 독립성 보장:** 모든 금융/세무 계산 로직은 UI 프레임워크 및 외부 I/O와 완전히 분리된 독립 모듈(`src/core/`)로 존재해야 한다.
- **[REQ-ARCH-2] Deterministic Calculation Guarantee:** Core Engine은 동일한 입력에 대해 항상 동일한 결과를 반환하는 **순수 함수(Pure Function)** 기반으로 설계되어야 하며, 계산 과정에서 예외적인 부수 효과(Side Effect)를 배제한다.
- **[REQ-ARCH-3] State Machine 기반 Tier Cascade:** 연금/법인 계좌의 자산 매도 순서와 인출 전략은 **상태 머신(Finite State Machine)** 구조로 구현하여 로직의 명확성과 확장성을 보장한다.
- **[REQ-ARCH-4] Stress Scenario Preset Library:** 'Bear', 'Stagflation' 등 표준화된 위기 상황 시나리오를 라이브러리화하여 원클릭으로 시뮬레이션 파라미터에 주입할 수 있어야 한다.
- **[REQ-ARCH-5] Assumption Version Control:** 수익률, 세율, 인플레이션 등 핵심 가정을 프로필(v1, v2 등)로 관리하여 사용자가 다양한 미래 가정을 즉시 스위칭하며 비교할 수 있어야 한다.

---

## 3. 도메인별 상세 요구사항

### [Structure 1] 포트폴리오 및 가정 엔진 (Portfolio & Assumptions)
- **[REQ-RAMS-1.1]** 법인(Corp) 및 연금(Pension) 계좌별 자산 구성 관리.
- **[REQ-RAMS-1.2] 가변적 가정 시스템:** [REQ-ARCH-5]를 기반으로 멀티 버전 가정 프로필 관리.

### [Structure 2] 세무 비교 및 법인 수익성 엔진
- **[REQ-RAMS-2.1] 법인 세후 현금흐름 엔진:** [REQ-ARCH-2]를 준수하는 순수 계산 엔진.
- **[REQ-RAMS-2.2] 개인 세무 비교 모델:** 지역건보료 점수제 및 금융소득종합과세 산출.

### [Structure 3] 생애 주기 인출 및 계층 이동 엔진 (Withdrawal Engine)
- **[REQ-RAMS-3.3] Tier Cascade Engine:** [REQ-ARCH-3]을 기반으로 SGOV 30개월 버퍼를 지키는 상태 머신 구축.

### [Structure 4~7 생략 - 기존과 동일]
... (이하 생략) ...
