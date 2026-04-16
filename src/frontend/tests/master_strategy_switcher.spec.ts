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
) {
  const response = await request.post("http://127.0.0.1:8000/api/portfolios", {
    data: {
      name,
      account_type: accountType,
      total_capital: 1000000,
      currency: "USD",
      items: [],
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
    await page.getByRole("button", { name: "Retirement" }).click();
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
    await page.getByRole("button", { name: "Portfolio" }).click();
    await page.getByRole("button", { name: "Manage & Compare" }).click();

    const deleteButton = page.getByTestId(`delete-master-${activeMaster.id}`);
    await expect(deleteButton).toBeDisabled();
    await expect(deleteButton).toHaveAttribute(
      "title",
      "활성 전략은 삭제할 수 없습니다",
    );
  });
});
