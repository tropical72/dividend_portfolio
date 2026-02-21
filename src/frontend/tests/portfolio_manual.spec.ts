import { test, expect } from "@playwright/test";

test.describe("Portfolio Manual Add", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    const portfolioNavBtn = page.getByTestId("nav-portfolio");
    await portfolioNavBtn.click();
  });

  test("should open manual add modal and add a stock", async ({ page }) => {
    // 1. Fixed Income 섹션의 Add Manually 버튼 클릭
    const addBtn = page.locator("div:has(h3:text('Fixed Income'))").getByRole("button", { name: /Add Manually/i }).first();
    await addBtn.click();

    // 2. 모달이 뜨는지 확인
    await expect(page.getByText(/Add Asset Manually/i)).toBeVisible();

    // 3. 폼 입력 (모달 내부 필드 지목)
    const modal = page.locator("div.bg-slate-900").filter({ hasText: "Add Asset Manually" });
    await modal.getByPlaceholder(/e.g. AAPL/i).fill("TEST");
    await modal.getByPlaceholder(/e.g. Apple Inc./i).fill("Manual Test Stock");
    await modal.getByPlaceholder("0").fill("10");

    // 4. 추가 버튼 클릭
    await modal.getByRole("button", { name: "Add Asset" }).click();

    // 5. 테이블에 추가되었는지 확인
    await expect(page.getByRole("cell", { name: "TEST", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "Manual Test Stock" }).first()).toBeVisible();
  });
});
