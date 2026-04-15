import { test, expect } from "@playwright/test";

test.describe("Portfolio Strategy Categories", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
    await page.getByTestId("nav-portfolio-manager").click();
  });

  test("should render four strategy categories for corporate accounts", async ({
    page,
  }) => {
    await expect(page.getByRole("button", { name: "Corporate" })).toBeVisible();
    await expect(page.getByText("SGOV Buffer")).toBeVisible();
    await expect(page.getByText("High Income")).toBeVisible();
    await expect(page.getByText("Dividend Growth")).toBeVisible();
    await expect(page.getByText("Growth Engine")).toBeVisible();
  });

  test("should switch to pension-specific categories", async ({ page }) => {
    await page.getByRole("button", { name: "Pension" }).click();

    await expect(page.getByText("SGOV Buffer")).toBeVisible();
    await expect(page.getByText("Bond Buffer")).toBeVisible();
    await expect(page.getByText("Dividend Growth")).toBeVisible();
    await expect(page.getByText("Growth Engine")).toBeVisible();
    await expect(page.getByText("High Income")).toHaveCount(0);
  });
});
