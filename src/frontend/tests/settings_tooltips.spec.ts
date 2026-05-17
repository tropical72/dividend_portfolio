import { expect, test } from "@playwright/test";

test.describe("Settings Advanced Trigger Notice", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();
  });

  test("should hide unused trigger inputs and show a not-applied notice", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name.includes("mobile"),
      "Settings advanced notice regression is validated on desktop layout only.",
    );

    await page.getByTestId("advanced-settings-toggle").click();
    await expect(page.getByTestId("advanced-settings-content")).toBeVisible();

    await expect(
      page.getByTestId("advanced-trigger-settings-notice"),
    ).toBeVisible();
    await expect(
      page.getByTestId("advanced-trigger-settings-notice"),
    ).toContainText(
      /미적용|not connected|hidden until the engine contract is implemented/i,
    );

    await expect(page.getByTestId("input-group-equity-mult")).toHaveCount(0);
    await expect(page.getByTestId("input-group-debt-mult")).toHaveCount(0);
  });
});
