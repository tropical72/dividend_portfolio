import { test, expect } from "@playwright/test";

test.describe("Settings Tab - Core Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
  });

  test("should switch to strategy settings and save ui language", async ({
    page,
  }) => {
    await page.getByTestId("nav-strategy-settings").click();

    await expect(page.getByTestId("settings-title")).toBeVisible();

    const languageSelect = page.getByTestId("ui-language-select");
    await languageSelect.selectOption("en");

    await page.getByTestId("apply-settings-button").click();

    await expect(
      page.getByText(
        /All strategy settings were saved\.|모든 설정이 저장되었습니다\./,
      ),
    ).toBeVisible();

    await page.reload();
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("ui-language-select")).toHaveValue("en");
  });

  test("should allow clearing and typing multi-digit decimals in settings inputs", async ({
    page,
  }) => {
    await page.getByTestId("nav-strategy-settings").click();

    const percentInput = page.getByTestId("input-group-bond-min-ratio-input");
    await percentInput.click();
    await percentInput.press("Control+A");
    await percentInput.press("Backspace");
    await expect(percentInput).toHaveValue("");
    await percentInput.pressSequentially("12.3");
    await expect(percentInput).toHaveValue("12.3");
    await percentInput.blur();
    await expect(percentInput).toHaveValue("12.3");

    await page.getByTestId("advanced-settings-toggle").click();
    const healthUnitPriceInput = page.getByTestId("health-unit-price-input");
    await healthUnitPriceInput.click();
    await healthUnitPriceInput.press("Control+A");
    await healthUnitPriceInput.press("Backspace");
    await expect(healthUnitPriceInput).toHaveValue("");
    await healthUnitPriceInput.pressSequentially("145.7");
    await expect(healthUnitPriceInput).toHaveValue("145.7");
    await healthUnitPriceInput.blur();
    await expect(healthUnitPriceInput).toHaveValue("145.7");
  });
});
