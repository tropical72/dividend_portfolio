import { test, expect } from "@playwright/test";

test.describe("Critical Fix: Settings to Portfolio Sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
  });

  test("should immediately reflect new default capital in Portfolio Designer", async ({ page }) => {
    const newDefault = "99999";
    const formattedDefault = "99,999";

    // 1. 설정 탭에서 값 변경 및 저장
    await page.getByTestId("nav-settings").click();
    const settingsInput = page.locator("input[type='text']").last();
    await settingsInput.clear();
    await settingsInput.fill(newDefault);
    await page.getByRole("button", { name: /Save All Settings/i }).click();
    
    // 2. 저장 완료 확인 (UI 피드백 대기)
    await page.waitForTimeout(1000);

    // 3. 포트폴리오 탭으로 이동
    await page.getByTestId("nav-portfolio").click();
    
    // 4. Portfolio Designer 모드에서 값이 반영되었는지 확인
    const designerUsdInput = page.locator("input[placeholder='USD Amount']");
    await expect(designerUsdInput).toHaveValue(formattedDefault, { timeout: 10000 });
  });
});
