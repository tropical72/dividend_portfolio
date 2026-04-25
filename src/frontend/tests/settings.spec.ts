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
});
