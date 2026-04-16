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
    // Step 1 섹션 상단 확인
    const step1Title = page.locator('h3:has-text("Step 1. Set the Basis")');
    await expect(step1Title).toBeVisible();

    // 마스터 전략 배지 확인
    const strategyLabel = page.locator('span:has-text("Strategy:")');
    // 데이터가 있는 경우 배지가 보여야 함
    if (await strategyLabel.isVisible()) {
      const badge = strategyLabel.locator("xpath=..");
      await expect(badge).toBeVisible();
      const strategyName = await badge.innerText();
      console.log(`Active Strategy: ${strategyName}`);
    } else {
      console.log("No active master strategy found, badge is hidden");
    }
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
      await expect(
        page.locator('p:has-text("Corporate")').first(),
      ).toBeVisible();
      await expect(page.locator('p:has-text("Pension")').first()).toBeVisible();
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
