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

  test("should block saving when total weight is not 100%", async ({ page }) => {
    // [REQ-PRT-01.5]
    // 1. 초기 상태(0%)에서 저장 클릭
    const saveBtn = page.getByRole("button", { name: /저장/i });
    await saveBtn.click({ force: true });

    // 2. 에러 알림 확인 (Toast 또는 Alert)
    await expect(page.getByText(/비중 합계가 100%여야 합니다/i)).toBeVisible();
  });
});
