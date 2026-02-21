import { test, expect } from "@playwright/test";

test.describe("Portfolio Editor UX - Basic Structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    // Portfolio 탭으로 이동
    await page.getByRole("button", { name: /Portfolio/i }).click();
  });

  test("should display three category sections", async ({ page }) => {
    // 1. 카테고리 헤더 확인
    await expect(page.getByText("Fixed Income")).toBeVisible();
    await expect(page.getByText("Bond/Cash Buffer")).toBeVisible();
    await expect(page.getByText("Growth/Dividend Growth")).toBeVisible();
  });

  test("should have a Reset/New button", async ({ page }) => {
    // 2. 새로만들기 버튼 확인
    await expect(page.getByRole("button", { name: /새로만들기/i })).toBeVisible();
  });
});
