import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  captureBackendState,
  restoreBackendState,
  type BackendTestState,
} from "./helpers/backendState";
import { acquireE2ELock, releaseE2ELock } from "./helpers/e2eLock";

async function createPortfolio(
  request: APIRequestContext,
  name: string,
  accountType: "Corporate" | "Pension",
  dividendYield = 0,
) {
  const response = await request.post("http://127.0.0.1:8000/api/portfolios", {
    data: {
      name,
      account_type: accountType,
      total_capital: 1000000,
      currency: "USD",
      items:
        dividendYield > 0
          ? [
              {
                symbol: `${name}-TICK`,
                name: `${name} Holding`,
                category: "Growth Engine",
                weight: 100,
                price: 100,
                dividend_yield: dividendYield,
                last_div_amount: 1,
                payment_months: [1, 4, 7, 10],
              },
            ]
          : [],
    },
  });
  const payload = await response.json();
  return payload.data.id as string;
}

test.describe("Master Strategy Switcher [T-02-8.3]", () => {
  test.describe.configure({ mode: "serial" });
  let originalState: BackendTestState;

  test.beforeEach(async ({ request }) => {
    await acquireE2ELock();
    originalState = await captureBackendState(request);
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

  test("should switch active master strategy from retirement tab", async ({
    page,
    request,
  }) => {
    const suffix = Date.now();
    const corpId = await createPortfolio(
      request,
      `Corp-${suffix}`,
      "Corporate",
    );
    const penId = await createPortfolio(request, `Pen-${suffix}`, "Pension");

    const firstRes = await request.post(
      "http://127.0.0.1:8000/api/master-portfolios",
      {
        data: {
          name: `Switch-A-${suffix}`,
          corp_id: corpId,
          pension_id: penId,
        },
      },
    );
    const firstMaster = (await firstRes.json()).data;

    const secondRes = await request.post(
      "http://127.0.0.1:8000/api/master-portfolios",
      {
        data: {
          name: `Switch-B-${suffix}`,
          corp_id: corpId,
          pension_id: penId,
        },
      },
    );
    const secondMaster = (await secondRes.json()).data;

    await request.post(
      `http://127.0.0.1:8000/api/master-portfolios/${firstMaster.id}/activate`,
    );

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-retirement").click();
    await expect(page.getByTestId("master-switcher-trigger")).toContainText(
      `Switch-A-${suffix}`,
    );

    await page.getByTestId("master-switcher-trigger").click();
    await expect(page.getByTestId("master-switcher-menu")).toBeVisible();
    await page.getByTestId(`master-switcher-item-${secondMaster.id}`).click();

    await expect(page.getByTestId("master-switcher-trigger")).toContainText(
      `Switch-B-${suffix}`,
    );
  });

  test("should show Standard Profile return as master TR after switching", async ({
    page,
    request,
  }) => {
    const suffix = Date.now();
    const paRate = 3;
    const firstDividendYield = 4;
    const secondDividendYield = 9;

    await request.post("http://127.0.0.1:8000/api/settings", {
      data: {
        price_appreciation_rate: paRate,
        appreciation_rates: {
          cash_sgov: 0.1,
          fixed_income: paRate,
          dividend_stocks: paRate,
          growth_stocks: paRate,
        },
      },
    });

    const firstCorpId = await createPortfolio(
      request,
      `TR-Corp-A-${suffix}`,
      "Corporate",
      firstDividendYield,
    );
    const secondCorpId = await createPortfolio(
      request,
      `TR-Corp-B-${suffix}`,
      "Corporate",
      secondDividendYield,
    );

    const firstRes = await request.post(
      "http://127.0.0.1:8000/api/master-portfolios",
      {
        data: {
          name: `TR-A-${suffix}`,
          corp_id: firstCorpId,
          pension_id: null,
        },
      },
    );
    const firstMaster = (await firstRes.json()).data;

    const secondRes = await request.post(
      "http://127.0.0.1:8000/api/master-portfolios",
      {
        data: {
          name: `TR-B-${suffix}`,
          corp_id: secondCorpId,
          pension_id: null,
        },
      },
    );
    const secondMaster = (await secondRes.json()).data;

    await request.post(
      `http://127.0.0.1:8000/api/master-portfolios/${firstMaster.id}/activate`,
    );

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-retirement").click();

    const standardReturnInput = page.getByTestId("return-v1");
    await expect(standardReturnInput).toHaveValue(
      (firstDividendYield + paRate).toFixed(1),
    );

    await page.getByTestId("master-switcher-trigger").click();
    await page.getByTestId(`master-switcher-item-${secondMaster.id}`).click();

    await expect(page.getByTestId("master-switcher-trigger")).toContainText(
      `TR-B-${suffix}`,
    );
    await expect(standardReturnInput).toHaveValue(
      (secondDividendYield + paRate).toFixed(1),
    );
  });

  test("should block deleting the active master strategy in portfolio dashboard", async ({
    page,
    request,
  }) => {
    const suffix = Date.now();
    const corpId = await createPortfolio(
      request,
      `Corp-Delete-${suffix}`,
      "Corporate",
    );

    const activeRes = await request.post(
      "http://127.0.0.1:8000/api/master-portfolios",
      {
        data: {
          name: `Delete-Guard-${suffix}`,
          corp_id: corpId,
          pension_id: null,
        },
      },
    );
    const activeMaster = (await activeRes.json()).data;
    await request.post(
      `http://127.0.0.1:8000/api/master-portfolios/${activeMaster.id}/activate`,
    );

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-asset-setup").click();
    await page.getByTestId("portfolio-subtab-dashboard").click();

    const deleteButton = page.getByTestId(`delete-master-${activeMaster.id}`);
    await expect(deleteButton).toBeDisabled();
    await expect(deleteButton).toHaveAttribute(
      "title",
      "활성 전략은 삭제할 수 없습니다",
    );
  });
});
