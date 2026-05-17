import { expect, test } from "@playwright/test";

import {
  captureBackendState,
  restoreBackendState,
  type BackendTestState,
} from "./helpers/backendState";
import { acquireE2ELock, releaseE2ELock } from "./helpers/e2eLock";

test.describe("Portfolio Save Modal", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90000);

  let originalState: BackendTestState;

  test.beforeEach(async ({ page, request }) => {
    await acquireE2ELock();
    originalState = await captureBackendState(request);

    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    await page.getByTestId("nav-asset-setup").click();
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

  test("saves the account type selected in the save modal", async ({
    page,
    request,
  }) => {
    const portfolioName = `Save Modal Pension ${Date.now()}`;

    await page.getByTestId("portfolio-name-input").fill(portfolioName);

    const addButton = page
      .locator("div:has(h3:text('SGOV Buffer'))")
      .getByRole("button", { name: /Add Manually|직접 추가/i })
      .first();
    await addButton.click();

    const modal = page.getByTestId("manual-add-modal");
    await modal.getByPlaceholder(/e.g. AAPL/i).fill("SGOV");
    await modal.getByPlaceholder(/e.g. Apple Inc./i).fill("SGOV ETF");
    await modal.getByPlaceholder("0").fill("100");
    await modal.getByRole("button", { name: /Add Asset|자산 추가/i }).click();

    await page.getByTestId("portfolio-save-button").click();
    await page.getByTestId("save-modal-account-pension").click();
    await page.getByRole("button", { name: /Save|저장하기/i }).click();

    await expect(
      page.getByText(/Saved as a new portfolio|새 포트폴리오/),
    ).toBeVisible();

    const response = await request.get("http://127.0.0.1:8000/api/portfolios");
    const payload = await response.json();
    const saved = (
      payload.data as Array<{ name?: string; account_type?: string }>
    ).find((portfolio) => portfolio.name === portfolioName);

    expect(saved).toBeTruthy();
    expect(saved.account_type).toBe("Pension");
  });
});
