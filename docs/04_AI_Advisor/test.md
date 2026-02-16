# Test: AI Advisor (04)

## [Auto] 자동화 테스트 (pytest / Playwright)

### [Backend API Test]
- **[TEST-ADV-BE-01] 슬라이딩 윈도우 (REQ-ADV-04.2):** 컨텍스트 초과 시 이전 대화 생략 로직 확인.
- **[TEST-ADV-BE-02] 영속성 복구 (REQ-ADV-04.1):** chat_history.json 기반 대화 재구성 확인.

### [Frontend E2E Test]
- **[TEST-ADV-FE-01] Markdown 렌더링:** 표, 볼드, 코드 블록의 DOM 렌더링 무결성 확인.
- **[TEST-ADV-FE-02] 비동기 상태 UI (REQ-ADV-03.3):** "응답 생성 중..." 인디케이터 노출 확인.
- **[TEST-ADV-FE-03] 채팅 흐름:** 전송 후 입력창 비우기 및 최하단 스크롤 확인.
- **[TEST-ADV-FE-04] 모델 정보 표시 (REQ-ADV-01.3):** 현재 사용 중인 모델 이름이 UI 상단에 명시되는가?

## [Manual/UX] 수동 테스트
- **[UX-ADV-01] 시각적 구분 (REQ-ADV-03.2):** 질문/답변의 색상 및 번호 매기기 확인.
- **[UX-ADV-02] 에러 핸들링 (REQ-ADV-03.4):** API 장애 시 친화적인 한글 안내 노출 여부.
- **[UX-ADV-03] 대화 초기화 (REQ-ADV-04.3):** '새 분석 시작' 클릭 시 화면과 파일 데이터가 즉시 삭제되는가?
