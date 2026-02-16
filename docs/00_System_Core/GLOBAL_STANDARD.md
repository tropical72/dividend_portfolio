# Global Standards (GS)

본 문서는 프로젝트 전체에서 공통적으로 준수해야 하는 UI/UX, 데이터 처리 및 테스트 표준을 정의합니다.

## [GS-UI-03] 모던 디자인 원칙 (Modern Design System)
본 프로젝트는 사용자 경험 극대화를 위해 다음 디자인 지침을 엄격히 준수한다.

1. **기술 스택:** 
   - **Tailwind CSS:** 모든 스타일링에 사용 (일관성 유지).
   - **Shadcn UI:** Radix UI 기반의 고품질 컴포넌트 라이브러리 사용.
   - **Lucide React:** 모든 아이콘은 세련된 Lucide 아이콘 셋 사용.
2. **배색 및 테마:**
   - **배경:** 다크 모드(`Slate-900`)를 기본으로 하며, 약간의 투명도와 블러(`backdrop-blur`)를 적용한 **Glassmorphism** 지향.
   - **강조색:** 배당 성장을 상징하는 **Emerald** 색상만 사용 (원색적인 빨강/노랑 지양).
   - **텍스트:** `Slate-100`을 기본으로 하되 두께(Weight)의 대비로 계층화.
3. **간격 및 형태:**
   - **여백:** 컴포넌트 사이의 간격을 넓게 잡아 답답함 제거.
   - **모서리:** 모든 카드 및 버튼은 `rounded-xl`(12px) 이상으로 부드럽게 처리.
   - **그림자:** 대담한 카드 기반 레이아웃에 은은한 그림자(`shadow-sm`) 적용.
4. **인터랙션:** 모든 버튼 및 클릭 요소에는 부드러운 크기/색상 변화(`transition`) 효과 부여.

## [GS-TEST-01] 외부 API 격리 (Mocking)
- **원칙:** 테스트 실행 시 외부 네트워크 의존성(yfinance, Gemini API 등)을 완전히 차단한다.
- **Backend:** `pytest-respx` 또는 Mock 라이브러리를 사용하여 고정된 JSON 응답을 반환하도록 설정한다.
- **Frontend:** Playwright의 `page.route()`를 사용하여 브라우저에서 나가는 API 요청을 가로채고 Mock 데이터를 제공한다.

## [GS-TEST-02] 상태 격리 (State Isolation)
- **원칙:** 각 테스트 케이스는 독립적인 환경에서 실행되어야 하며, 이전 테스트의 데이터가 영향을 주지 않아야 한다.
- **테스트 DB:** 테스트 실행 시 `tests/tmp/` 하위에 임시 데이터 파일(`test_watchlist.json` 등)을 생성하여 사용한다.
- **Teardown:** 테스트 종료 후 임시 데이터는 반드시 삭제하거나 초기화한다.

## [GS-TEST-03] 고도화된 E2E 및 자동화 테스트 전략
본 앱은 배당 데이터의 특수성과 AI 연동의 복잡성을 고려하여 아래 원칙을 반드시 준수한다.

1. **시간 결정성 제어 (Time Travel):** 배당금 계산 로직 검증 시, `freezegun`(Backend) 및 `page.clock`(Frontend)을 사용하여 고정된 가짜 현재 시간을 기준으로 실행한다.
2. **비동기 상태 제어:** 단순 강제 지연(`sleep`)을 금지하고, Playwright의 명시적 대기(`expect`, `wait_for_response`)를 사용하여 레이스 컨디션을 방지한다.
3. **비밀키 격리:** `.env.test`를 사용하여 가짜 API 키와 테스트용 임시 스토리지 경로를 강제 매핑한다.
4. **AI API 지연 처리:** AI 연동 테스트 시 긴 타임아웃을 부여하거나, 회귀 테스트 시에는 즉각적인 Mock 응답을 반환하도록 설계한다.
5. **데이터 시딩 (Data Seeding):** UI를 통한 반복적 입력을 피하기 위해, 테스트 시작 전 완성된 `mock_portfolio.json`을 직접 주입하거나 API를 통해 세팅하여 테스트 속도를 최적화한다.
6. **시각적 회귀 테스트 (VRT):** 그래프나 복잡한 테이블 레이아웃은 Playwright의 스크린샷 비교(`toHaveScreenshot`)를 사용하여 렌더링 무결성을 검증한다.
7. **반응형 뷰포트 테스트:** 데스크톱과 모바일(Android WebView 예정) 환경 모두에서 UI가 깨지지 않는지 Playwright의 다중 뷰포트 프로필로 검증한다.

## [GS-UX-01] 비동기 처리 및 로딩 표시
- 모든 네트워크 요청(FastAPI 호출 등)은 비동기적으로 처리한다.
- 작업 중에는 관련 버튼을 비활성화하고 "응답 생성 중..." 또는 Spinner 등을 통해 상태를 명확히 표시한다.

## [GS-CODE-01] 한글 주석 표준 (Korean Commenting)
- **클래스 및 함수:** Docstring을 사용하여 한글로 역할, 파라미터, 반환값을 상세히 기술한다.
- **복잡한 로직:** 코드의 동작 방식보다는 **왜 그렇게 구현했는지(Why)**를 중심으로 한글 주석을 작성한다.
- **상수 및 변수:** 의미가 불분명한 경우 옆에 한글 설명을 덧붙인다.

## [GS-CODE-02] 코드 정적 분석 및 포맷팅 (Linting & Formatting)
코드의 안정성과 가독성을 위해 에이전트는 다음 지침을 반드시 수행한다.

1. **언어별 도구 구성:**
   - **Backend (Python):** `Ruff`를 사용하여 PEP8 스타일 체크, 임포트 정렬, 미사용 변수 제거를 수행한다. (`ruff check --fix .`, `ruff format .`)
   - **Frontend (Web):** `ESLint`와 `Prettier`를 사용하여 React Hook 규칙 및 일관된 스타일을 유지한다. (`npm run lint`, `npm run format`)
2. **작업 프로세스:**
   - **Step 1:** 코드 구현 및 수정.
   - **Step 2 (Linting):** 언어별 도구 실행 및 에러 자율 수정.
   - **Step 3 (Testing):** 린팅 통과 후 `pytest` 및 `Playwright` 테스트 수행.
   - **Step 4 (Commit):** 1~3단계 완료 후 명세서 업데이트 및 마스터 승인 후 커밋.
3. **에이전트 메시지 규칙:** 완료 보고 시 린팅 및 테스트 결과를 요약 제공한다.
   - 예: "✅ Linting 완료 (Ruff, ESLint 통과) / ✅ 모든 테스트 통과 / 📝 Trace Matrix 업데이트 완료"
