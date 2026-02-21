import { test, expect } from "@playwright/test";

test.describe("Retirement Tab UX", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
    
    const navBtn = page.getByTestId("nav-retirement");
    await navBtn.waitFor({ state: "visible", timeout: 30000 });
    await navBtn.click();
  });

  test("should display the retirement dashboard header", async ({ page }) => {
    await expect(page.getByText(/Retirement Strategic Planner/i)).toBeVisible();
  });

  test("should allow switching between assumption versions", async ({ page }) => {
    const standardBtn = page.getByRole("button", { name: /Standard/i });
    const conservativeBtn = page.getByRole("button", { name: /Conservative/i });

    await expect(standardBtn).toBeVisible();
    await expect(conservativeBtn).toBeVisible();

    // Conservative 클릭 시 수익률 텍스트가 바뀌는지 확인 (3.50%)
    await conservativeBtn.click();
    await expect(page.getByText("3.50%")).toBeVisible();

    // 다시 Standard 클릭 시 (4.85%)
    await standardBtn.click();
    await expect(page.getByText("4.85%")).toBeVisible();
  });
});
