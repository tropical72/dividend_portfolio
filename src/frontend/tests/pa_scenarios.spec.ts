import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import {
  captureBackendState,
  restoreBackendState,
  type BackendTestState,
} from "./helpers/backendState";
import { acquireE2ELock, releaseE2ELock } from "./helpers/e2eLock";

const deterministicPaSettings = {
  default_pa_scenario: "base",
  price_appreciation_rate: 7.5,
  appreciation_rates: {
    conservative: {
      cash_sgov: 0,
      bond_buffer: -0.8,
      high_income: 0.5,
      dividend_stocks: 5.5,
      growth_stocks: 6.5,
    },
    base: {
      cash_sgov: 0,
      bond_buffer: -0.2,
      high_income: 1.5,
      dividend_stocks: 6.5,
      growth_stocks: 7.5,
    },
    optimistic: {
      cash_sgov: 0,
      bond_buffer: 0.6,
      high_income: 2.5,
      dividend_stocks: 8,
      growth_stocks: 9,
    },
  },
};

async function setDeterministicPaSettings(request: APIRequestContext) {
  const response = await request.post("http://127.0.0.1:8000/api/settings", {
    data: deterministicPaSettings,
  });
  expect(response.ok()).toBeTruthy();
}

async function createPortfolio(
  request: APIRequestContext,
  name: string,
  accountType: "Corporate" | "Pension",
  category: "Growth Engine" | "Dividend Growth" = "Growth Engine",
) {
  const response = await request.post("http://127.0.0.1:8000/api/portfolios", {
    data: {
      name,
      account_type: accountType,
      total_capital: 1000000,
      currency: "USD",
      items: [
        {
          symbol: `${name}-PA`,
          name: `${name} PA Holding`,
          category,
          weight: 100,
          price: 100,
          dividend_yield: 0,
          last_div_amount: 0,
          payment_months: [1, 4, 7, 10],
        },
      ],
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data.id as string;
}

async function createMasterPortfolio(
  request: APIRequestContext,
  name: string,
  corpId: string,
  pensionId: string,
) {
  const response = await request.post(
    "http://127.0.0.1:8000/api/master-portfolios",
    {
      data: {
        name,
        corp_id: corpId,
        pension_id: pensionId,
      },
    },
  );
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data.id as string;
}

async function runCostComparison(page: Page) {
  const runResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/cost-comparison/run") &&
      response.request().method() === "POST" &&
      response.ok(),
  );
  await page.getByTestId("cc-run-button").click();
  const payload = await (await runResponsePromise).json();
  return payload.data.assumptions as {
    pa: number;
    pa_scenario: string;
    tr: number;
  };
}

test.describe("PA Scenario UI [REQ-GLB-16]", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120000);

  let originalState: BackendTestState;

  test.beforeEach(async ({ request }) => {
    await acquireE2ELock();
    originalState = await captureBackendState(request);
    await setDeterministicPaSettings(request);
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

  test("should edit and persist default PA scenario settings", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();

    await page
      .getByTestId("settings-default-pa-scenario")
      .selectOption("optimistic");
    await page.getByTestId("settings-pa-scenario-optimistic").click();

    const growthInput = page
      .getByTestId("input-group-pa-growth-stocks")
      .locator("input");
    await growthInput.fill("11.1");
    await page.getByTestId("apply-settings-button").click();
    await expect(
      page.getByText(
        /All strategy settings were saved.|모든 전략 설정이 저장되었습니다./,
      ),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-default-pa-scenario")).toHaveValue(
      "optimistic",
    );
    await page.getByTestId("settings-pa-scenario-optimistic").click();
    await expect(growthInput).toHaveValue("11.1");
  });

  test("should update portfolio dashboard TR immediately when scenario changes", async ({
    page,
    request,
  }) => {
    const suffix = Date.now();
    const portfolioId = await createPortfolio(
      request,
      `PA-Dashboard-${suffix}`,
      "Corporate",
    );

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-asset-setup").click();
    await page.getByTestId("portfolio-subtab-dashboard").click();
    await expect(
      page.getByTestId(`portfolio-card-${portfolioId}`),
    ).toBeVisible();

    await expect(page.getByTestId("portfolio-pa-scenario-base")).toHaveClass(
      /bg-emerald-500/,
    );
    await expect(page.getByTestId(`portfolio-tr-${portfolioId}`)).toHaveText(
      "7.50%",
    );

    await page.getByTestId("portfolio-pa-scenario-optimistic").click();
    await expect(
      page.getByTestId("portfolio-pa-scenario-optimistic"),
    ).toHaveClass(/bg-emerald-500/);
    await expect(page.getByTestId(`portfolio-tr-${portfolioId}`)).toHaveText(
      "9.00%",
    );
  });

  test("should refetch retirement simulation with selected PA scenario", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-retirement").click();
    await expect(page.getByTestId("retirement-pa-scenario-base")).toHaveClass(
      /bg-emerald-500/,
    );

    const simResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/retirement/simulate") &&
        response.url().includes("pa_scenario=optimistic") &&
        response.ok(),
    );
    await page.getByTestId("retirement-pa-scenario-optimistic").click();
    await simResponsePromise;

    await expect(
      page.getByTestId("retirement-pa-scenario-optimistic"),
    ).toHaveClass(/bg-emerald-500/);
  });

  test("should run cost comparison with selected PA scenario", async ({
    page,
    request,
  }) => {
    const suffix = Date.now();
    const corpId = await createPortfolio(
      request,
      `PA-CC-Corp-${suffix}`,
      "Corporate",
    );
    const pensionId = await createPortfolio(
      request,
      `PA-CC-Pension-${suffix}`,
      "Pension",
    );
    const masterId = await createMasterPortfolio(
      request,
      `PA-CC-Master-${suffix}`,
      corpId,
      pensionId,
    );

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-cost-comparison").click();
    await expect(page.getByTestId("cost-comparison-title")).toBeVisible();
    await page.getByTestId("cc-master-portfolio").selectOption(masterId);

    await page.getByTestId("cc-pa-scenario-base").click();
    const baseAssumptions = await runCostComparison(page);
    await expect(page.getByTestId("cc-assumption-pa")).not.toHaveText("-");
    const basePaText = await page.getByTestId("cc-assumption-pa").textContent();

    await page.getByTestId("cc-pa-scenario-optimistic").click();
    const optimisticAssumptions = await runCostComparison(page);
    await expect(page.getByTestId("cc-assumption-pa")).not.toHaveText(
      basePaText || "",
    );

    expect(baseAssumptions.pa_scenario).toBe("base");
    expect(optimisticAssumptions.pa_scenario).toBe("optimistic");
    expect(optimisticAssumptions.pa).toBeGreaterThan(baseAssumptions.pa);
    expect(optimisticAssumptions.tr).toBeGreaterThan(baseAssumptions.tr);
  });
});
