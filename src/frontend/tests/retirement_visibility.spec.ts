import { test, expect } from "@playwright/test";

test.describe("Retirement Simulation Portfolio Visibility [REQ-RAMS-1.4.5]", () => {
  test.beforeEach(async ({ page }) => {
    // 1. 초기 데이터 준비 (Mocking 없이 실제 백엔드 연동 확인)
    await page.goto("http://localhost:5173");
    await page.click('button:has-text("Retirement")');
  });

  test("should display active master strategy badge at the top of Step 1", async ({
    page,
  }) => {
    await expect(page.getByTestId("portfolio-visibility-badges")).toBeVisible();
    await expect(page.getByTestId("master-strategy-badge")).toBeVisible();
    await expect(page.getByTestId("corp-portfolio-badge")).toBeVisible();
    await expect(page.getByTestId("pension-portfolio-badge")).toBeVisible();
  });

  test("should update badges when switching between assumptions", async ({
    page,
  }) => {
    // Assumption 카드 클릭 시 시뮬레이션 재실행 및 배지 유지 확인
    const assumptions = page.locator('section:has-text("Step 1") .grid > div');
    const count = await assumptions.count();
    if (count > 1) {
      await assumptions.nth(1).click();
      // 시뮬레이션 로딩 대기
      await page.waitForTimeout(1000);
      // 포트폴리오 카드와 규칙 요약이 여전히 유효한지 확인
      await expect(page.getByTestId("corp-portfolio-badge")).toBeVisible();
      await expect(page.getByTestId("pension-portfolio-badge")).toBeVisible();
      await expect(page.getByTestId("strategy-rules-summary")).toBeVisible();
    }
  });

  test("should display applied strategy rules summary in Step 2", async ({
    page,
  }) => {
    await expect(page.getByText("Step 2. Projection Result")).toBeVisible();
    await expect(page.getByTestId("strategy-rules-summary")).toBeVisible();
    await expect(page.getByText(/Rebalance:/i)).toBeVisible();
    await expect(page.getByText(/Corp SGOV:/i)).toBeVisible();
    await expect(page.getByText(/Pension SGOV:/i)).toBeVisible();
    await expect(page.getByText(/Bear Freeze:/i)).toBeVisible();
  });
});
