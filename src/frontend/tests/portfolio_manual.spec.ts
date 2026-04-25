import { test, expect } from "@playwright/test";

test.describe("Portfolio Manual Add", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    const portfolioNavBtn = page.getByTestId("nav-asset-setup");
    await portfolioNavBtn.waitFor({ state: "visible", timeout: 30000 });
    await portfolioNavBtn.click({ force: true });
  });

  test("should open manual add modal and add a stock", async ({ page }) => {
    // 1. Corporate 기본 카테고리인 SGOV Buffer 섹션의 Add Manually 버튼 클릭
    const addBtn = page
      .locator("div:has(h3:text('SGOV Buffer'))")
      .getByRole("button", { name: /Add Manually|직접 추가/i })
      .first();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });

    // 2. 모달이 뜨는지 확인
    const modal = page.getByTestId("manual-add-modal");
    await expect(modal).toBeVisible();

    // 3. 폼 입력 (모달 내부 필드 지목)
    await modal.getByPlaceholder(/e.g. AAPL/i).fill("TEST");
    await modal.getByPlaceholder(/e.g. Apple Inc./i).fill("Manual Test Stock");
    await modal.getByPlaceholder("0").fill("10");

    // 4. 추가 버튼 클릭
    await modal.getByRole("button", { name: /Add Asset|자산 추가/i }).click();

    // 5. 테이블에 추가되었는지 확인
    await expect(
      page.getByRole("cell", { name: "TEST", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Manual Test Stock" }).first(),
    ).toBeVisible();
  });
});
