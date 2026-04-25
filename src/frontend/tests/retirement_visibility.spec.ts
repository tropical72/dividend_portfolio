import { test, expect } from "@playwright/test";

test.describe("Retirement Simulation Portfolio Visibility [REQ-RAMS-1.4.5]", () => {
  test.beforeEach(async ({ page }) => {
    // 1. 초기 데이터 준비 (Mocking 없이 실제 백엔드 연동 확인)
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-retirement").click();
    await expect(page.getByTestId("retirement-tab-content")).toBeVisible({
      timeout: 20000,
    });
  });

  test("should display active master strategy badge at the top of Step 1", async ({
    page,
  }) => {
    await expect(page.getByTestId("master-switcher-trigger")).toBeVisible();
    await expect(
      page.getByTestId("active-strategy-master-metrics"),
    ).toContainText(/Master Yield|마스터 배당수익률/);
    await expect(
      page.getByTestId("active-strategy-master-metrics"),
    ).toContainText(/TR|마스터 총수익률/);
    await expect(page.getByTestId("active-strategy-summary")).toHaveCount(1);
    await expect(page.getByTestId("active-strategy-corp-card")).toContainText(
      /Corporate|법인/,
    );
    await expect(
      page.getByTestId("active-strategy-pension-card"),
    ).toContainText(/Pension|연금/);
    await expect(
      page.getByTestId("active-strategy-exchange-rate"),
    ).toContainText(/Exchange Rate|현재 환율/);
  });

  test("should show exactly two named assumption cards in Step 1", async ({
    page,
  }) => {
    const cards = page.locator('[data-testid^="assumption-card-"]');
    await expect(cards).toHaveCount(2);
    await expect(page.locator("text=입력 가이드")).toHaveCount(1);
    await expect(page.getByTestId("assumption-card-v1")).toContainText(
      /Standard Profile|표준 프로필/,
    );
    await expect(
      page.getByTestId("assumption-card-conservative"),
    ).toContainText(/Conservative Profile|보수 프로필/);
  });

  test("should update badges when switching between assumptions", async ({
    page,
  }) => {
    // Assumption 카드 클릭 시 시뮬레이션 재실행 및 배지 유지 확인
    const assumptions = page.locator('[data-testid^="assumption-card-"]');
    const count = await assumptions.count();
    if (count > 1) {
      await assumptions.nth(1).click();
      // 시뮬레이션 로딩 대기
      await page.waitForTimeout(1000);
      // 포트폴리오 카드와 규칙 요약이 여전히 유효한지 확인
      await expect(page.getByTestId("active-strategy-corp-card")).toBeVisible();
      await expect(
        page.getByTestId("active-strategy-pension-card"),
      ).toBeVisible();
      await expect(page.getByTestId("strategy-rules-summary")).toBeVisible();
    }
  });

  test("should display applied strategy rules summary in Step 2", async ({
    page,
  }) => {
    const rulesSummary = page.getByTestId("strategy-rules-summary");
    const resultSnapshot = page.getByTestId("retirement-result-snapshot");
    const survivalMetric = page.getByTestId("retirement-metric-survival-years");

    await expect(page.getByTestId("retirement-step-2-title")).toBeVisible();
    await expect(resultSnapshot).toHaveCount(1);
    await expect(survivalMetric).toHaveCount(1);
    await expect(rulesSummary).toBeVisible();
    await expect(rulesSummary).toContainText(/Rebalance|리밸런싱/);
    await expect(rulesSummary).toContainText(/Corp SGOV|법인 SGOV/);
    await expect(rulesSummary).toContainText(/Pension SGOV|연금 SGOV/);
    await expect(rulesSummary).toContainText(/Bear Freeze|하락장 동결/);
    await expect(page.getByTestId("rule-badge-monthly-cost")).toBeVisible();
    await expect(page.getByTestId("rule-badge-monthly-cost")).toContainText(
      /Monthly Cost|월 생활비/,
    );
  });
});
