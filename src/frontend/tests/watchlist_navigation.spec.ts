import { expect, test } from "@playwright/test";

test.describe("Watchlist Navigation", () => {
  test("should stay on watchlist after adding a stock to portfolio", async ({
    page,
  }) => {
    test.skip(
      test.info().project.name.includes("mobile"),
      "Right-click context menu flow is desktop-only.",
    );

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-watchlist").click();
    await expect(page.getByTestId("watchlist-title")).toBeVisible();

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click({ button: "right", force: true });

    const addToPortfolio = page.getByRole("button", {
      name: /Add to Portfolio|포트폴리오에 추가/i,
    });
    await expect(addToPortfolio).toBeVisible();
    await addToPortfolio.click({ force: true });

    const categoryButton = page.getByRole("button", {
      name: /SGOV Buffer/i,
    });
    await expect(categoryButton).toBeVisible();
    await categoryButton.click({ force: true });

    await expect(page.getByTestId("watchlist-title")).toBeVisible();
    await expect(page.getByTestId("portfolio-subtab-design")).not.toBeVisible();
  });
});
