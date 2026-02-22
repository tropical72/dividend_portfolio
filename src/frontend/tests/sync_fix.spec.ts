import { test, expect } from "@playwright/test";

test.describe("Real Backend Sync Check", () => {
  test("should fetch simulation data from real backend without CORS error", async ({ page }) => {
    // 1. 페이지 접속
    await page.goto("http://localhost:5173");
    
    // 2. 전역 로딩 화면 대기 (엔진 초기화)
    const loading = page.getByText(/Initializing RAMS Engine/i);
    if (await loading.isVisible()) {
      await expect(loading).not.toBeVisible({ timeout: 30000 });
    }
    
    // 3. 은퇴 탭 컨텐츠 렌더링 확인 (TestID 사용)
    const tabContent = page.getByTestId("retirement-tab-content");
    await expect(tabContent).toBeVisible({ timeout: 20000 });
    
    // 4. 차트 SVG 요소가 존재하는지 확인 (데이터 로드 성공의 증거)
    const chart = page.locator(".recharts-surface");
    await expect(chart).toBeVisible({ timeout: 30000 });
    
    // 5. 서버에서 실제 데이터를 받았는지 확인 (숫자 텍스트 존재 여부)
    // 16억/6억 설정이므로 '억'이라는 글자가 포함된 텍스트가 있어야 함
    await expect(page.locator("text=억").first()).toBeVisible({ timeout: 20000 });
  });
});
