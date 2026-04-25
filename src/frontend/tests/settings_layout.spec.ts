import { test, expect } from "@playwright/test";

test.describe("Settings Layout Integrity", () => {
  test("Cashflow Event fields should not overlap", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();

    await page.getByRole("button", { name: /Add Event|이벤트 추가/ }).click();

    const eventCard = page.locator('[data-testid^="cashflow-event-"]').last();
    await expect(eventCard).toBeVisible();

    const amountInput = eventCard.locator('input[type="text"]').first();
    const yearInput = eventCard.locator('input[type="number"]').first();

    const amountBox = await amountInput.boundingBox();
    const yearBox = await yearInput.boundingBox();

    if (amountBox && yearBox) {
      const amountRightEdge = amountBox.x + amountBox.width;
      const amountBottomEdge = amountBox.y + amountBox.height;
      const yearRightEdge = yearBox.x + yearBox.width;
      const yearBottomEdge = yearBox.y + yearBox.height;

      const separated =
        amountRightEdge <= yearBox.x ||
        yearRightEdge <= amountBox.x ||
        amountBottomEdge <= yearBox.y ||
        yearBottomEdge <= amountBox.y;

      expect(separated).toBe(true);
    }
  });
});
