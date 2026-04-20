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
    await page.getByTestId("cc-investment-assets").fill("");
    await expect(page.getByTestId("cc-investment-assets")).toHaveValue("");
    await page.getByTestId("cc-investment-assets").type("3000000000");
    await expect(page.getByTestId("cc-investment-assets")).toHaveValue(
      "3,000,000,000",
    );
    await expect(page.getByTestId("cc-investment-assets-unit")).toContainText(
      /KRW|원/i,
    );
    await page.getByTestId("cc-pension-assets").fill("700000000");
    await page.getByTestId("cc-real-estate-value").fill("650000000");
    await page.getByTestId("cc-real-estate-ratio").fill("0.5");
    await page.getByTestId("cc-pa-rate").fill("3");
    await page.getByTestId("cc-simulation-years").fill("5");
    await page.getByTestId("cc-target-monthly-cash").fill("10000000");
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
      "3,000,000,000",
    );
    await expect(page.getByTestId("cc-simulation-years")).toHaveValue("5");
    await expect(page.getByTestId("cc-target-monthly-cash")).toHaveValue(
      "10,000,000",
    );
    await expect(page.getByTestId("cc-salary-0")).toHaveValue("3,000,000");

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/cost-comparison/run") &&
          response.request().method() === "POST" &&
          response.ok(),
      ),
      page.getByTestId("cc-run-button").click(),
    ]);

    await expect(page.getByTestId("cc-assumption-portfolio")).toBeVisible();
    await expect(page.getByTestId("cc-assumption-tr")).not.toHaveText("-");
    await page.getByTestId("cc-kpi-personal").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("cc-kpi-personal")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-corporate")).toBeVisible();
    await expect(page.getByTestId("cc-comparison-winner")).toContainText(
      /우세합니다|ahead/i,
    );
    await expect(page.getByTestId("cc-winner-basis")).toContainText(
      /연 총비용|annual total cost/i,
    );
    await expect(page.getByTestId("cc-driver-0")).toBeVisible();
    await expect(page.getByTestId("cc-breakdown-chart")).toBeVisible();
    await expect(page.getByTestId("cc-cumulative-chart")).toBeVisible();
    await expect(page.getByTestId("cc-household-cash-chart")).toBeVisible();
    await expect(page.getByTestId("cc-total-value-chart")).toBeVisible();
    await expect(page.getByTestId("cc-sustainability-chart")).toBeVisible();
    await expect(page.getByTestId("cc-loan-gap-card")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-chart")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-revenue")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-tax")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-health")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-social")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-fixed")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-payroll")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-retained")).toBeVisible();
    await expect(
      page.getByTestId("cc-waterfall-step-disposable"),
    ).toBeVisible();
    await expect(page.getByTestId("cc-warning-0")).toContainText(
      /보수 외 소득월액보험료|outside income/i,
    );

    await page.getByTestId("cc-tooltip-trigger-cc-investment-assets").focus();
    await expect(
      page.getByTestId("cc-tooltip-trigger-cc-investment-assets-content"),
    ).toBeVisible();
    await expect(
      page.getByTestId("cc-tooltip-trigger-cc-investment-assets-content"),
    ).toContainText(/과세 투자자산|taxable investment assets/i);

    await page.getByTestId("cc-tooltip-trigger-cc-kpi-personal-growth").focus();
    await expect(
      page.getByTestId("cc-tooltip-trigger-cc-kpi-personal-growth-content"),
    ).toBeVisible();
    await expect(
      page.getByTestId("cc-tooltip-trigger-cc-kpi-personal-growth-content"),
    ).toContainText(/필요한 투자자산|required investment assets/i);

    await expect(page.getByTestId("cc-breakdown-total-personal")).toBeVisible();
    await expect(
      page.getByTestId("cc-breakdown-total-corporate"),
    ).toBeVisible();
    await expect(page.getByTestId("cc-cumulative-note")).toContainText(
      /필요한 투자자산|required investment asset/i,
    );
    await expect(page.getByTestId("cc-household-cash-note")).toContainText(
      /현재 투자자산|current investment asset/i,
    );
    await expect(page.getByTestId("cc-total-value-note")).toContainText(
      /목표 월현금|target monthly household cash/i,
    );
    await expect(page.getByTestId("cc-sustainability-note")).toContainText(
      /몇 년|how many years/i,
    );
    await expect(page.locator("body")).not.toContainText(/renderValue/i);
    await page.getByTestId("cc-tooltip-trigger-sustainability").focus();
    await expect(
      page.getByTestId("cc-tooltip-trigger-sustainability-content"),
    ).toContainText(/몇 년|how many full years/i);
    await page.getByTestId("cc-tooltip-trigger-loan-gap").focus();
    await expect(
      page.getByTestId("cc-tooltip-trigger-loan-gap-content"),
    ).toContainText(/주주대여금 반환|shareholder-loan repayment/i);
    await page.getByTestId("cc-status-asset-feasibility-tooltip").focus();
    await expect(
      page.getByTestId("cc-status-asset-feasibility-tooltip-content"),
    ).toContainText(/현재 투자자산|current investment assets/i);
    await expect(page.getByTestId("cc-waterfall-note")).toContainText(
      /왼쪽에서 오른쪽|left to right/i,
    );
    await expect(page.getByTestId("cc-waterfall-basis")).toContainText(
      /투자자산 x TR|investment assets multiplied by TR/i,
    );
  });
});
