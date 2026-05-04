import { test, expect } from "@playwright/test";

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
});
