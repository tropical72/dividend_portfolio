# Dividend Portfolio Manager

FastAPI 백엔드와 React 프론트엔드로 구성된 배당 포트폴리오/은퇴/법인-개인 비용 비교 도구입니다.

## 실행

백엔드:

```bash
PYTHONPATH=. .venv/bin/python -m uvicorn src.backend.main:app --host 127.0.0.1 --port 8000
```

프론트엔드:

```bash
cd src/frontend
npm install
npm run dev
```

개발 편의용으로 저장소 루트에서 다음도 사용할 수 있습니다.

```bash
python run_dev.py
```

## 데이터 구조

- Git 기본값: `defaults/*.json`
- 사용자 로컬 데이터: `APP_DATA_DIR` 하위
- 기본 `APP_DATA_DIR`: `~/.local/share/dividend_portfolio`
- 비밀 설정: `settings.local.json` 또는 환경변수
- 예시 비밀 설정: `settings.local.example.json`

즉, 저장소에 포함된 기본값만으로 클론 직후 실행할 수 있고, 사용자가 저장한 값은 로컬에만 기록됩니다.

## Public 저장소 원칙

- 저장소에는 공개 가능한 기본값과 예시 설정만 포함합니다.
- 사용자 저장값, API 키, 캐시, 테스트 산출물, 임시 문서는 Git에 올리지 않습니다.
- 실제 키가 필요하면 `settings.local.example.json`을 복사해 로컬 `settings.local.json`로 사용합니다.
- 앱이 생성하는 설정/데이터는 저장소 루트가 아니라 `APP_DATA_DIR` 아래에 저장됩니다.

## 주요 디렉터리

- `src/backend`: FastAPI API, 저장 계층, 데이터 제공자
- `src/core`: 세금/프로젝션/리밸런싱 등 계산 엔진
- `src/frontend`: React/Vite 프론트엔드
- `defaults`: 공개 가능한 기본 설정
- `docs`: 요구사항, 계획, 테스트, 추적 문서
- `settings.local.example.json`: 로컬 비밀 설정 예시

## 테스트

백엔드:

```bash
PYTHONPATH=. .venv/bin/ruff check src tests
PYTHONPATH=. .venv/bin/black --check src tests
PYTHONPATH=. .venv/bin/pytest tests/test_persistence_api.py tests/test_cost_comparison_api.py -q
```

프론트엔드:

```bash
cd src/frontend
npm run lint
npm run build
npx playwright test
```
