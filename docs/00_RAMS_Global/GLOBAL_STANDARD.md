# Global UI/UX Standard

## 1. Typography Standard (가독성 원칙)

사용자의 시력 보호와 직관적인 정보 전달을 위해 아래의 폰트 크기 표준을 절대 준수한다.

- **[Min-Size Principle]:** 시스템 전체에서 사용하는 **절대 최소 폰트 크기는 10px**이다. 어떤 상황에서도 `text-[10px]`보다 작은 크기(8px, 9px 등)를 사용할 수 없다.
- **[Standard Text]:** 일반적인 텍스트, 라벨, 도움말은 **`text-xs` (12px)** 또는 **`text-sm` (14px)** 이상을 권장한다. 
- **[Heading Standard]:**
    - 메인 타이틀: `text-3xl` (30px) ~ `text-4xl` (36px)
    - 섹션 타이틀: `text-xl` (20px) ~ `text-2xl` (24px)
    - 카드 헤더: `text-lg` (18px)
- **[Data Highlighting]:** 시뮬레이션 결과 수치나 핵심 지표는 `text-base` (16px) 이상으로 강조하며, 굵은 서체(font-black 또는 font-bold)를 사용한다.
- **[Exception]:** 차트의 축(Axis) 레이블이나 매우 부수적인 메타데이터에 한해서만 `text-[10px]`~`text-xs` 사용을 허용한다.

---

## 2. Color & Layout Standard
- **Background:** `bg-slate-950` 기반의 다크 테마.
- **Accent:** `emerald-500` (Main), `blue-500` (Pension), `amber-500` (Warning).
- **Radius:** 카드 및 버튼은 `rounded-2xl` 이상의 큰 곡률을 사용하여 현대적인 느낌을 유지한다.
