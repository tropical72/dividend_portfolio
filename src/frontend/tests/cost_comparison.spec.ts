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
    await expect(page.getByTestId("cc-input-section")).toBeVisible();
    await expect(page.getByTestId("cc-result-section")).toBeVisible();
    await expect(page.getByTestId("cc-result-empty")).toBeVisible();
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
    await page.getByTestId("cc-corp-tax-rate").selectOption("0.22");
    await page.getByTestId("cc-salary-0").fill("3000000");
    await page.getByTestId("cc-mode-target").click();

    await page.getByTestId("cc-save-button").click();
    await expect(
      page.getByTestId("cost-comparison-save-success"),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-cost-comparison").click();
    await expect(page.getByTestId("cc-investment-assets")).toHaveValue(
      "3,000,000,000",
    );
    await expect(page.getByTestId("cc-result-empty")).toBeVisible();
    await expect(page.getByTestId("cc-simulation-years")).toHaveValue("5");
    await expect(page.getByTestId("cc-target-monthly-cash")).toHaveValue(
      "10,000,000",
    );
    await expect(page.getByTestId("cc-salary-0")).toHaveValue("3,000,000");
    await expect(page.getByTestId("cc-corp-tax-rate")).toHaveValue("0.22");

    const runResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/cost-comparison/run") &&
        response.request().method() === "POST" &&
        response.ok(),
    );
    await Promise.all([
      runResponsePromise,
      page.getByTestId("cc-run-button").click(),
    ]);
    const runPayload = await (await runResponsePromise).json();
    expect(
      runPayload.data.corporate.breakdown.audit_details.corp_tax.nominal_rate,
    ).toBe(0.22);
    expect(
      runPayload.data.corporate.breakdown.audit_details.corp_tax.effective_rate,
    ).toBeCloseTo(0.242);

    await expect(page.getByTestId("cc-assumption-portfolio")).toBeVisible();
    await expect(page.getByTestId("cc-assumption-corp-tax-rate")).toContainText(
      /22%.*24\.2%/,
    );
    await expect(page.getByTestId("cc-assumption-tr")).not.toHaveText("-");
    await page.getByTestId("cc-kpi-personal").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("cc-kpi-personal")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-corporate")).toBeVisible();
    await expect(page.getByTestId("cc-comparison-winner")).toContainText(
      /우세합니다|ahead|우열이 같습니다|tied/i,
    );
    await expect(page.getByTestId("cc-winner-summary-annual")).toContainText(
      /연 순현금흐름 기준|annual net cashflow/i,
    );
    await expect(
      page.getByTestId("cc-winner-summary-annual-delta"),
    ).toContainText(/₩|원/);
    await expect(
      page.getByTestId("cc-winner-summary-cumulative"),
    ).toContainText(/누적 순현금흐름|cumulative/i);
    await expect(page.getByTestId("cc-winner-basis")).toContainText(
      /연 순현금흐름|annual net cashflow/i,
    );
    await expect(page.getByTestId("cc-winner-basis-formula")).toContainText(
      /법인.*개인|corporate.*personal/i,
    );
    await expect(page.getByTestId("cc-driver-0")).toBeVisible();
    await expect(page.getByTestId("cc-breakdown-chart")).toBeVisible();
    await expect(page.getByTestId("cc-cumulative-chart")).toBeVisible();
    await expect(page.getByTestId("cc-household-cash-chart")).toBeVisible();
    await expect(page.getByTestId("cc-total-value-chart")).toBeVisible();
    await expect(page.getByTestId("cc-sustainability-chart")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-chart")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-revenue")).toBeVisible();
    await expect(
      page.getByTestId("cc-waterfall-step-gross-salary"),
    ).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-tax")).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-health")).toBeVisible();
    await expect(
      page.getByTestId("cc-waterfall-step-company-insurance"),
    ).toBeVisible();
    await expect(page.getByTestId("cc-waterfall-step-fixed")).toBeVisible();
    await expect(
      page.getByTestId("cc-waterfall-step-net-salary"),
    ).toBeVisible();
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
      /필요 자산|필요한 투자자산|investment asset base|required assets/i,
    );
    await expect(page.getByTestId("cc-household-cash-note")).toContainText(
      /현재 투자자산|current investment asset/i,
    );
    await expect(page.getByTestId("cc-total-value-note")).toContainText(
      /연 순현금|annual net cash/i,
    );
    await expect(page.getByTestId("cc-sustainability-note")).toContainText(
      /몇 년|how many years/i,
    );
    await expect(page.locator("body")).not.toContainText(/renderValue/i);
    await page.getByTestId("cc-tooltip-trigger-sustainability").focus();
    await expect(
      page.getByTestId("cc-tooltip-trigger-sustainability-content"),
    ).toContainText(/몇 년|how many full years/i);
    await expect(page.getByTestId("cc-waterfall-note")).toContainText(
      /왼쪽에서 오른쪽|left to right/i,
    );
    await expect(page.getByTestId("cc-waterfall-basis")).toContainText(
      /법인 순현금|net corporate cash|투자자산 x TR|investment assets multiplied by TR/i,
    );
  });

  test("should run asset-driven mode with monthly disposable cash labeling", async ({
    page,
  }) => {
    await page.getByTestId("cc-investment-assets").fill("1000000000");
    await page.getByTestId("cc-pa-rate").fill("5");
    await page.getByTestId("cc-simulation-years").fill("2");
    await page.getByTestId("cc-mode-asset").click();
    await page.getByTestId("cc-save-button").click();
    await expect(
      page.getByTestId("cost-comparison-save-success"),
    ).toBeVisible();

    const runResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/cost-comparison/run") &&
        response.request().method() === "POST" &&
        response.ok(),
    );

    await page.getByTestId("cc-run-button").click();
    const runResponse = await runResponsePromise;
    const runPayload = await runResponse.json();

    expect(runPayload.data.assumptions.simulation_mode).toBe("asset");
    await expect(page.getByTestId("cc-kpi-personal-cash-label")).toContainText(
      /최종 순현금|final net cash/i,
    );
    await expect(page.getByTestId("cc-kpi-corporate-cash-label")).toContainText(
      /최종 순현금|final net cash/i,
    );
    await expect(
      page.getByTestId("cc-kpi-personal-growth-label"),
    ).toContainText(/세후 수익률|net yield/i);
    await expect(
      page.getByTestId("cc-kpi-corporate-growth-label"),
    ).toContainText(/세후 수익률|net yield/i);
    await expect(page.getByTestId("cc-cumulative-chart")).toHaveCount(0);
    await expect(page.getByTestId("cc-household-cash-chart")).toHaveCount(0);
  });

  test("should save and run with selected master portfolio", async ({
    page,
    request,
  }) => {
    const seededState = JSON.parse(
      JSON.stringify(originalState),
    ) as BackendTestState & {
      cost_comparison_config: Record<string, unknown>;
      master_portfolios: Array<Record<string, unknown>>;
      portfolios: Array<Record<string, unknown>>;
    };

    seededState.portfolios.push(
      {
        id: "ccs-custom-corp",
        name: "CCS Custom Corporate",
        account_type: "Corporate",
        total_capital: 100000000,
        currency: "USD",
        created_at: "2026-05-01T00:00:00",
        items: [
          {
            ticker: "HIGHC",
            name: "High Yield Corp",
            weight: 100,
            category: "High Income",
            dividend_yield: 12,
          },
        ],
      },
      {
        id: "ccs-custom-pen",
        name: "CCS Custom Pension",
        account_type: "Pension",
        total_capital: 100000000,
        currency: "USD",
        created_at: "2026-05-01T00:00:00",
        items: [
          {
            ticker: "HIGHP",
            name: "High Yield Pension",
            weight: 100,
            category: "Dividend Growth",
            dividend_yield: 9,
          },
        ],
      },
    );
    seededState.master_portfolios.push({
      id: "ccs-custom-master",
      name: "CCS Custom Master",
      corp_id: "ccs-custom-corp",
      pension_id: "ccs-custom-pen",
      is_active: false,
    });
    seededState.cost_comparison_config = {
      ...seededState.cost_comparison_config,
      master_portfolio_id: null,
    };

    await restoreBackendState(request, seededState);
    await page.reload();
    await page.getByTestId("nav-cost-comparison").click();

    await page
      .getByTestId("cc-master-portfolio")
      .selectOption("ccs-custom-master");
    await page.getByTestId("cc-save-button").click();
    await expect(
      page.getByTestId("cost-comparison-save-success"),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-cost-comparison").click();
    await expect(page.getByTestId("cc-master-portfolio")).toHaveValue(
      "ccs-custom-master",
    );

    const runResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/cost-comparison/run") &&
        response.request().method() === "POST" &&
        response.ok(),
    );
    await page.getByTestId("cc-run-button").click();
    const runPayload = await (await runResponsePromise).json();

    expect(runPayload.data.assumptions.master_portfolio_id).toBe(
      "ccs-custom-master",
    );
    await expect(
      page.getByTestId("cc-assumption-master-portfolio"),
    ).toContainText(/CCS Custom Master/);
    await expect(
      page.getByTestId("cc-assumption-corporate-portfolio"),
    ).toContainText(/CCS Custom Corporate/);
    await expect(
      page.getByTestId("cc-assumption-pension-portfolio"),
    ).toContainText(/CCS Custom Pension/);
  });
});
