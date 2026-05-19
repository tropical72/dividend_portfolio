import { expect, test } from "@playwright/test";

import {
  captureBackendState,
  restoreBackendState,
  type BackendTestState,
} from "./helpers/backendState";
import { acquireE2ELock, releaseE2ELock } from "./helpers/e2eLock";

test.describe("Settings Strategy Rules", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120000);

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
    await expect(page.getByTestId("os-v11-summary-card")).toBeVisible();
    await expect(page.getByTestId("os-v11-summary-card")).toContainText(
      /OS v11\.1|운용 정책/,
    );

    const rebalanceMonthInput = page
      .getByTestId("input-group-rebalance-month")
      .locator("input");
    await rebalanceMonthInput.fill("3");

    const corpTargetInput = page
      .getByTestId("input-group-corp-target-buffer")
      .locator("input");
    await corpTargetInput.fill("40");

    const corpNovemberInput = page
      .getByTestId("input-group-corp-november-sgov-target")
      .locator("input");
    await corpNovemberInput.fill("29");

    const corpBondTargetInput = page
      .getByTestId("input-group-corp-bond-target")
      .locator("input");
    await corpBondTargetInput.fill("16");

    const pensionSgovTargetInput = page
      .getByTestId("input-group-pension-sgov-target")
      .locator("input");
    await pensionSgovTargetInput.fill("36");

    const pensionBondUpperInput = page
      .getByTestId("input-group-pension-bond-upper")
      .locator("input");
    await pensionBondUpperInput.fill("22");

    const monthlyLivingCostInput = page
      .getByTestId("input-group-monthly-living-cost")
      .locator("input");
    await monthlyLivingCostInput.fill("");
    await expect(monthlyLivingCostInput).toHaveValue("");
    await monthlyLivingCostInput.type("10000000");
    await expect(monthlyLivingCostInput).toHaveValue("10,000,000");
    await expect(
      page.getByTestId("input-group-monthly-living-cost-unit"),
    ).toContainText(/KRW|원/i);

    const uiLanguageSelect = page.getByTestId("ui-language-select");
    await uiLanguageSelect.selectOption("en");

    await page.getByTestId("apply-settings-button").click();

    await expect(
      page.getByText("All strategy settings were saved."),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();

    await expect(rebalanceMonthInput).toHaveValue("3");
    await expect(corpTargetInput).toHaveValue("40");
    await expect(corpNovemberInput).toHaveValue("29");
    await expect(corpBondTargetInput).toHaveValue("16");
    await expect(pensionSgovTargetInput).toHaveValue("36");
    await expect(pensionBondUpperInput).toHaveValue("22");
    await expect(monthlyLivingCostInput).toHaveValue("10,000,000");
    await expect(uiLanguageSelect).toHaveValue("en");
  });

  test("should delete a cashflow event and persist the removal", async ({
    page,
  }) => {
    const events = page.locator('[data-testid^="cashflow-event-"]');
    const initialCount = await events.count();

    await page.getByRole("button", { name: /Add Event|이벤트 추가/ }).click();

    const deleteButton = page
      .locator('[data-testid^="delete-cashflow-"]')
      .first();
    const eventCard = page.locator('[data-testid^="cashflow-event-"]').first();

    await expect(eventCard).toBeVisible();
    await deleteButton.click();
    await expect(events).toHaveCount(initialCount);

    await page.getByTestId("apply-settings-button").click();
    await expect(
      page.getByText(
        /All strategy settings were saved.|모든 전략 설정이 저장되었습니다./,
      ),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();
    await expect(page.locator('[data-testid^="cashflow-event-"]')).toHaveCount(
      initialCount,
    );
  });

  test("should persist household cashflow inputs and expose them in retirement summary", async ({
    page,
  }) => {
    const monthlyLivingCostInput = page
      .getByTestId("input-group-monthly-living-cost")
      .locator("input");
    const monthlySalaryInput = page
      .getByTestId("input-group-monthly-salary")
      .locator("input");
    const bookkeepingInput = page
      .getByTestId("input-group-monthly-bookkeeping-fee")
      .locator("input");
    const annualAdjustmentInput = page
      .getByTestId("input-group-annual-tax-adjustment-fee")
      .locator("input");

    await monthlyLivingCostInput.fill("12300000");
    await monthlySalaryInput.fill("3000000");
    await bookkeepingInput.fill("500000");
    await annualAdjustmentInput.fill("1200000");

    const netSalaryEstimate = (
      (await page.getByTestId("net-salary-estimate-value").textContent()) || ""
    ).match(/[\d,]+/)?.[0];
    const corporateNeedEstimate = (
      (await page.getByTestId("corporate-need-estimate-value").textContent()) ||
      ""
    ).match(/[\d,]+/)?.[0];

    await page.getByTestId("apply-settings-button").click();
    await expect(
      page.getByText(
        /All strategy settings were saved\.|모든 전략 설정이 저장되었습니다\./,
      ),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();

    await expect(monthlyLivingCostInput).toHaveValue("12,300,000");
    await expect(monthlySalaryInput).toHaveValue("3,000,000");
    await expect(bookkeepingInput).toHaveValue("500,000");
    await expect(annualAdjustmentInput).toHaveValue("1,200,000");

    await page.getByTestId("nav-retirement").click();
    await expect(page.getByTestId("retirement-tab-content")).toBeVisible();
    await expect(page.getByTestId("strategy-rules-summary")).toBeVisible();

    await expect(page.getByTestId("rule-badge-monthly-cost")).toContainText(
      "₩12,300,000",
    );
    await expect(
      page.getByTestId("rule-badge-corp-operating-cost"),
    ).toContainText(`₩${corporateNeedEstimate}`);
    await expect(
      page.getByTestId("rule-badge-estimated-net-salary"),
    ).toContainText(`₩${netSalaryEstimate}`);
  });

  test("should persist distribution rules and reflect them in simulation income", async ({
    page,
    request,
  }) => {
    const corpDividendGrowthInput = page
      .getByTestId("input-group-corp-dividend-growth-distribution-growth-rate")
      .locator("input");
    const corpGrowthEngineInput = page
      .getByTestId("input-group-corp-growth-engine-distribution-growth-rate")
      .locator("input");
    const corpGrowthStressCutInput = page
      .getByTestId(
        "input-group-corp-growth-engine-distribution-stress-cut-rate",
      )
      .locator("input");
    const corpGrowthNewBuyYieldInput = page
      .getByTestId("input-group-corp-growth-engine-distribution-new-buy-yield")
      .locator("input");
    const pensionDividendNewBuyYieldInput = page
      .getByTestId(
        "input-group-pension-dividend-growth-distribution-new-buy-yield",
      )
      .locator("input");

    await corpDividendGrowthInput.fill("100");
    await corpGrowthEngineInput.fill("100");
    await corpGrowthStressCutInput.fill("40");
    await corpGrowthNewBuyYieldInput.fill("8");
    await pensionDividendNewBuyYieldInput.fill("5");

    await page.getByTestId("apply-settings-button").click();
    await expect(
      page.getByText(
        /All strategy settings were saved\.|모든 전략 설정이 저장되었습니다\./,
      ),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();
    await expect(corpDividendGrowthInput).toHaveValue("100.0");
    await expect(corpGrowthEngineInput).toHaveValue("100.0");
    await expect(corpGrowthStressCutInput).toHaveValue("40.0");
    await expect(corpGrowthNewBuyYieldInput).toHaveValue("8.0");
    await expect(pensionDividendNewBuyYieldInput).toHaveValue("5.0");

    const configResponse = await request.get(
      "http://localhost:8000/api/retirement/config",
    );
    expect(configResponse.ok()).toBeTruthy();
    const configPayload = await configResponse.json();
    expect(
      configPayload.data.distribution_rules.corp["Dividend Growth"].growth_rate,
    ).toBeCloseTo(1.0);
    expect(
      configPayload.data.distribution_rules.corp["Growth Engine"].growth_rate,
    ).toBeCloseTo(1.0);
    expect(
      configPayload.data.distribution_rules.corp["Growth Engine"]
        .stress_cut_rate,
    ).toBeCloseTo(0.4);
    expect(
      configPayload.data.distribution_yield_overrides.corp["Growth Engine"],
    ).toBeCloseTo(0.08);
    expect(
      configPayload.data.distribution_yield_overrides.pension[
        "Dividend Growth"
      ],
    ).toBeCloseTo(0.05);

    const simulationResponse = await request.get(
      "http://localhost:8000/api/retirement/simulate?pa_scenario=base",
    );
    expect(simulationResponse.ok()).toBeTruthy();
    const simulationPayload = await simulationResponse.json();
    expect(simulationPayload.success).toBeTruthy();
    expect(
      simulationPayload.data.monthly_data[1].corp_realized_income,
    ).toBeGreaterThan(
      simulationPayload.data.monthly_data[0].corp_realized_income,
    );
  });
});
