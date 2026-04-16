import { expect, test } from "@playwright/test";

const CONFIG_URL = "http://127.0.0.1:8000/api/retirement/config";

test.describe("Settings Strategy Rules", () => {
  let originalConfig: unknown;

  test.beforeEach(async ({ page, request }) => {
    const response = await request.get(CONFIG_URL);
    const payload = await response.json();
    originalConfig = payload.data;

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-strategy-settings").click();
    await page.waitForSelector("text=Strategy Center");
  });

  test.afterEach(async ({ request }) => {
    if (originalConfig) {
      await request.post(CONFIG_URL, { data: originalConfig });
    }
  });

  test("should render and persist strategy rules", async ({ page }) => {
    await expect(page.getByTestId("strategy-rules-section")).toBeVisible();
    await expect(page.getByText("Execution Policy")).toBeVisible();
    await expect(page.getByText("Corporate Rules")).toBeVisible();
    await expect(page.getByText("Pension Rules")).toBeVisible();

    const rebalanceMonthInput = page
      .getByTestId("input-group-rebalance-month")
      .locator("input");
    await rebalanceMonthInput.fill("3");

    const corpTargetInput = page
      .getByTestId("input-group-corp-target-buffer")
      .locator("input");
    await corpTargetInput.fill("40");

    const bondMinRatioInput = page
      .getByTestId("input-group-bond-min-ratio")
      .locator("input");
    await bondMinRatioInput.fill("7.5");

    await page.getByTestId("toggle-bear-freeze").getByRole("button").click();
    await page.getByRole("button", { name: /Apply All Changes/i }).click();

    await expect(
      page.getByText("모든 전략 설정이 저장되었습니다."),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-strategy-settings").click();
    await page.waitForSelector("text=Strategy Center");

    await expect(rebalanceMonthInput).toHaveValue("3");
    await expect(corpTargetInput).toHaveValue("40");
    await expect(bondMinRatioInput).toHaveValue("7.5");
    await expect(page.getByTestId("toggle-bear-freeze")).toContainText(
      "Disabled",
    );
  });
});
