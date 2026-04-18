import { expect, test } from "@playwright/test";

import {
  captureBackendState,
  restoreBackendState,
  type BackendTestState,
} from "./helpers/backendState";
import { acquireE2ELock, releaseE2ELock } from "./helpers/e2eLock";

test.describe("Cost Comparison Simulator", () => {
  let originalState: BackendTestState;

  test.beforeEach(async ({ page, request }) => {
    await acquireE2ELock();
    originalState = await captureBackendState(request);

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-cost-comparison").click();
    await expect(page.getByTestId("cost-comparison-title")).toBeVisible();
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

  test("should persist config and render KPI cards", async ({ page }) => {
    await page.getByTestId("cc-investment-assets").fill("3000000000");
    await page.getByTestId("cc-pension-assets").fill("700000000");
    await page.getByTestId("cc-real-estate-value").fill("650000000");
    await page.getByTestId("cc-real-estate-ratio").fill("0.5");
    await page.getByTestId("cc-pa-rate").fill("3");
    await page.getByTestId("cc-simulation-years").fill("5");
    await page.getByTestId("cc-monthly-fixed-cost").fill("500000");
    await page.getByTestId("cc-initial-loan").fill("500000000");
    await page.getByTestId("cc-annual-loan-repayment").fill("108000000");
    await page.getByTestId("cc-salary-0").fill("3000000");

    await page.getByTestId("cc-save-button").click();
    await expect(
      page.getByTestId("cost-comparison-save-success"),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-cost-comparison").click();
    await expect(page.getByTestId("cc-investment-assets")).toHaveValue(
      "3000000000",
    );
    await expect(page.getByTestId("cc-simulation-years")).toHaveValue("5");
    await expect(page.getByTestId("cc-salary-0")).toHaveValue("3000000");

    await page.getByTestId("cc-run-button").click();

    await expect(page.getByTestId("cc-assumption-portfolio")).toBeVisible();
    await expect(page.getByTestId("cc-assumption-tr")).not.toHaveText("-");
    await expect(page.getByTestId("cc-kpi-personal")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-corporate")).toBeVisible();
    await expect(page.getByTestId("cc-comparison-winner")).toBeVisible();
    await expect(page.getByTestId("cc-driver-0")).toBeVisible();
    await expect(page.getByTestId("cc-breakdown-chart")).toBeVisible();
    await expect(page.getByTestId("cc-cumulative-chart")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-chart")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-revenue")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-tax")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-health")).toBeVisible();
    await expect(
      page.getByTestId("cc-waterfall-step-disposable"),
    ).toBeVisible();
    await expect(page.getByTestId("cc-warning-0")).toContainText(
      /보수 외 소득월액보험료|outside income/i,
    );
  });
});
