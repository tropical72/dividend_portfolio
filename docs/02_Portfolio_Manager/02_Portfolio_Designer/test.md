# Test Cases: Portfolio Manager

## 1. 테스트 시나리오

### [TEST-PRT-07] UI 가독성 및 Corporate 명칭 통일 검증
- **[TEST-PRT-07.1] 내비게이션 렌더링:**
    - 'Portfolio Designer' 버튼과 'Manage & Compare' 버튼의 폰트 크기가 `14px`(text-sm) 이상으로 렌더링되며, 클릭 시 시각적 반응이 확실한지 검증한다.
- **[TEST-PRT-07.2] 계좌 타입 스위처 검증:**
    - 기존 'Personal' 대신 'Corporate' 버튼이 표시되는지 확인.
    - 버튼 크기가 기존(`10px`)보다 큰 최소 `14px`(text-sm) 이상으로 렌더링되는지 검증.
- **[TEST-PRT-07.3] 데이터 무결성 검증:**
    - Corporate 계좌 타입으로 새로운 포트폴리오 저장 시 API를 통해 데이터베이스에 `account_type: "Corporate"`로 저장되는지 확인.
