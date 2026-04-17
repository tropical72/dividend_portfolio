import { expect, test } from "@playwright/test";

import {
  captureBackendState,
  restoreBackendState,
  type BackendTestState,
} from "./helpers/backendState";
import { acquireE2ELock, releaseE2ELock } from "./helpers/e2eLock";

test.describe("Settings Strategy Rules", () => {
  let originalState: BackendTestState;

  test.beforeEach(async ({ page, request }) => {
    await acquireE2ELock();
    originalState = await captureBackendState(request);

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    try {
      if (originalState) {
        await restoreBackendState(request, originalState);
      }
    } finally {
      await releaseE2ELock();
    }
  });

  test("should render and persist strategy rules", async ({ page }) => {
    await expect(page.getByTestId("strategy-rules-section")).toBeVisible();

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

    const monthlyLivingCostInput = page
      .getByTestId("input-group-monthly-living-cost")
      .locator("input");
    await monthlyLivingCostInput.fill("10,000,000");

    const uiLanguageSelect = page.getByTestId("ui-language-select");
    await uiLanguageSelect.selectOption("en");

    await page.getByTestId("toggle-bear-freeze").getByRole("button").click();
    await page.getByTestId("apply-settings-button").click();

    await expect(
      page.getByText("All strategy settings were saved."),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();

    await expect(rebalanceMonthInput).toHaveValue("3");
    await expect(corpTargetInput).toHaveValue("40");
    await expect(bondMinRatioInput).toHaveValue("7.5");
    await expect(monthlyLivingCostInput).toHaveValue("10,000,000");
    await expect(uiLanguageSelect).toHaveValue("en");
    await expect(page.getByTestId("toggle-bear-freeze")).toContainText(
      "Disabled",
    );
  });
});
