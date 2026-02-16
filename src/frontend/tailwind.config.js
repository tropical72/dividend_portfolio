/** @type {import('tailwindcss').Config} */
export default {
  // 콘텐츠 경로 설정: Tailwind CSS가 적용될 파일들을 지정합니다.
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // 프로젝트 고유의 테마 확장이 필요할 경우 여기에 정의합니다.
    },
  },
  plugins: [],
};
