import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 테스트 환경 설정
 * [GS-TEST-03] 고도화된 E2E 테스트 전략을 반영합니다.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // 테스트 시 사용할 기본 URL
    baseURL: 'http://localhost:5173',
    // 스크린샷 및 비디오 기록 설정 (실패 시 유용)
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* 프로젝트 설정: 데스크톱 및 모바일 뷰포트 검증 [GS-TEST-03.7] */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* 테스트 실행 전 로컬 서버 자동 시작 설정 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2분으로 타임아웃 확장
  },
});
