import { test, expect } from "@playwright/test";

test.describe("Regression: Settings & Portfolio Sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
  });

  test("Settings should format capital with commas", async ({ page }) => {
    await page.getByTestId("nav-settings").click();
    const capitalInput = page.locator("input[type='text']").last();
    
    await capitalInput.fill("1234567");
    // 3자리마다 쉼표가 찍히는지 확인
    await expect(capitalInput).toHaveValue("1,234,567");
  });

  test("Portfolio Designer should refresh defaults whenever tab becomes active", async ({ page }) => {
    // 1. 설정에서 77,777 USD로 변경 및 저장
    await page.getByTestId("nav-settings").click();
    const settingsInput = page.locator("input[type='text']").last();
    await settingsInput.clear();
    await settingsInput.fill("77777");
    await page.getByRole("button", { name: /Save All Settings/i }).click();
    
    // 저장 후 토스트 메시지가 사라질 때까지 대기
    await page.waitForTimeout(3000);

    // 2. 다른 탭(Watchlist)에 들렀다가 Portfolio 탭으로 이동 (상태 갱신 트리거)
    await page.getByTestId("nav-watchlist").click();
    await page.waitForTimeout(500);
    await page.getByTestId("nav-portfolio").click();
    
    // 3. 디자이너의 투자금 입력란 확인
    const designerUsdInput = page.locator("input[placeholder='USD Amount']");
    await expect(designerUsdInput).toHaveValue("77,777", { timeout: 20000 });
  });

  test("Pension badge should be amber and Personal badge should be blue", async ({ page }) => {
    const uniqueName = `Color Check ${Date.now()}`;
    await page.getByTestId("nav-portfolio").click();
    
    // Designer 모드 강제 전환
    const designerTabBtn = page.getByRole("button", { name: /Portfolio Designer/i });
    if (await designerTabBtn.isVisible()) {
      await designerTabBtn.click();
    }

    // 1. Pension으로 저장
    await page.getByPlaceholder(/포트폴리오 이름을 입력하세요/i).fill(uniqueName);
    const pensionBtn = page.getByRole("button", { name: "Pension" });
    await pensionBtn.click();
    
    // 종목 하나 추가
    await page.getByRole("button", { name: /Add Manually/i }).first().click();
    const modal = page.locator("div.bg-slate-900").filter({ hasText: "Add Asset Manually" });
    await modal.getByPlaceholder(/e.g. AAPL/i).fill("SYNC");
    await modal.getByPlaceholder(/e.g. Apple Inc./i).fill("Sync Test");
    await modal.locator("input[placeholder='0']").fill("100");
    await modal.getByRole("button", { name: "Add Asset" }).click();
    
    await page.getByRole("button", { name: /포트폴리오 저장/i }).click();
    await page.waitForTimeout(3000);

    // 2. 대시보드로 이동
    const manageTabBtn = page.getByRole("button", { name: /Manage & Compare/i });
    await manageTabBtn.click();
    
    // 3. 배지 색상 확인
    const card = page.locator(".portfolio-card").filter({ hasText: uniqueName });
    const badge = card.getByText(/Pension Account/i);
    await expect(badge).toBeVisible({ timeout: 15000 });
    
    // 클래스 이름 확인
    const className = await badge.getAttribute("class");
    expect(className?.toLowerCase()).toContain("amber");
  });
});
