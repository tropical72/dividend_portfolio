import { test, expect } from "@playwright/test";

test.describe("RAMS Global Navigation & Hierarchy", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should land on Retirement Dashboard by default", async ({ page }) => {
    // 첫 화면이 은퇴 전략 플래너인지 확인
    await expect(page.getByText(/Retirement Strategic Planner/i)).toBeVisible();
  });

  test("should have organized sidebar groups", async ({ page }) => {
    // 새롭게 정의된 사이드바 버튼들이 존재하는지 확인
    await expect(page.getByTestId("nav-retirement")).toBeVisible();
    await expect(page.getByTestId("nav-asset-setup")).toBeVisible();
    await expect(page.getByTestId("nav-strategy-settings")).toBeVisible();
  });

  test("should switch to Asset Manager and show portfolio designer", async ({ page }) => {
    await page.getByTestId("nav-asset-setup").click();
    await expect(page.getByText(/Portfolio Designer/i)).toBeVisible();
  });

  test("should switch to Strategy Settings", async ({ page }) => {
    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByText(/Simulation Strategy Settings/i)).toBeVisible();
  });
});
