import { test, expect } from "@playwright/test";

import {
  captureBackendState,
  restoreBackendState,
  type BackendTestState,
} from "./helpers/backendState";
import { acquireE2ELock, releaseE2ELock } from "./helpers/e2eLock";

test.describe("Portfolio Strategy Categories", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    const nav = page.getByTestId("nav-asset-setup");
    await nav.waitFor({ state: "visible", timeout: 30000 });
    await nav.click({ force: true });
    await page.getByTestId("portfolio-subtab-design").waitFor({
      state: "visible",
      timeout: 15000,
    });
  });

  test("should render five asset categories for corporate accounts", async ({
    page,
  }) => {
    await expect(page.getByTestId("portfolio-account-corporate")).toBeVisible();
    await expect(
      page.getByTestId("portfolio-designer-monthly-dividend-chart"),
    ).toBeVisible();
    await expect(
      page.getByTestId("portfolio-designer-dividend-currency-krw"),
    ).toHaveClass(/text-emerald-700/);
    await page.getByTestId("portfolio-designer-dividend-currency-usd").click();
    await expect(
      page.getByTestId("portfolio-designer-dividend-currency-usd"),
    ).toHaveClass(/text-emerald-700/);
    await expect(page.getByText("SGOV Buffer")).toBeVisible();
    await expect(page.getByText("Bond Buffer")).toBeVisible();
    await expect(page.getByText("High Income")).toBeVisible();
    await expect(page.getByText("Dividend Growth")).toBeVisible();
    await expect(page.getByText("Growth Engine")).toBeVisible();
  });

  test("should switch to pension-specific categories", async ({ page }) => {
    await page.getByTestId("portfolio-account-pension").click();

    await expect(page.getByText("SGOV Buffer")).toBeVisible();
    await expect(page.getByText("Bond Buffer")).toBeVisible();
    await expect(page.getByText("Dividend Growth")).toBeVisible();
    await expect(page.getByText("Growth Engine")).toBeVisible();
    await expect(page.getByText("High Income")).toHaveCount(0);
  });

  test("should use retirement config KRW capital for selected account", async ({
    page,
    request,
  }) => {
    let originalState: BackendTestState | null = null;
    await acquireE2ELock();

    try {
      originalState = await captureBackendState(request);
      const configResponse = await request.post(
        "http://127.0.0.1:8000/api/retirement/config",
        {
          data: {
            corp_params: {
              initial_investment: 2100000000,
              capital_stock: 10000000,
              initial_shareholder_loan: 0,
            },
            pension_params: {
              initial_investment: 600000000,
              severance_reserve: 30000000,
              other_reserve: 4000000,
            },
          },
        },
      );
      expect(configResponse.ok()).toBeTruthy();
      const configPayload = await configResponse.json();
      expect(configPayload.success).toBeTruthy();

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByTestId("nav-asset-setup").click({ force: true });
      await page.getByTestId("portfolio-subtab-design").click({ force: true });

      await expect(
        page.getByTestId("portfolio-design-capital-krw-input"),
      ).toHaveValue("2,100,000,000");

      await page.getByTestId("portfolio-account-pension").click();
      await expect(
        page.getByTestId("portfolio-design-capital-krw-input"),
      ).toHaveValue("634,000,000");
      await expect(
        page.getByTestId("portfolio-design-capital-usd-display"),
      ).not.toHaveValue("");
    } finally {
      if (originalState) {
        await restoreBackendState(request, originalState);
      }
      await releaseE2ELock();
    }
  });
});

test("should support personal taxable account categories and capital", async ({
  page,
  request,
}) => {
  let originalState: BackendTestState | null = null;
  await acquireE2ELock();
  try {
    originalState = await captureBackendState(request);
    const response = await request.post(
      "http://127.0.0.1:8000/api/retirement/config",
      {
        data: {
          personal_account_params: {
            initial_investment: 480000000,
            monthly_withdrawal_target: 2000000,
          },
        },
      },
    );
    expect(response.ok()).toBeTruthy();

    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("nav-asset-setup").click({ force: true });
    await page.getByTestId("portfolio-subtab-design").click({ force: true });
    await page.getByTestId("portfolio-account-personal").click();

    await expect(
      page.getByTestId("portfolio-design-capital-krw-input"),
    ).toHaveValue("480,000,000");
    await expect(page.getByText("SGOV Buffer")).toBeVisible();
    await expect(page.getByText("Bond Buffer")).toBeVisible();
    await expect(page.getByText("High Income")).toBeVisible();
    await expect(page.getByText("Dividend Growth")).toBeVisible();
    await expect(page.getByText("Growth Engine")).toBeVisible();
  } finally {
    if (originalState) await restoreBackendState(request, originalState);
    await releaseE2ELock();
  }
});
