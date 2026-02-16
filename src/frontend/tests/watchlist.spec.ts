import { test, expect } from "@playwright/test";

/**
 * 관심종목(Watchlist) UI 기능 테스트
 * [TEST-WCH-2.1.1] 실시간 테이블 업데이트 및 입력 컴포넌트를 검증합니다.
 */
test.describe("Watchlist UI", () => {
  test.beforeEach(async ({ page }) => {
    // API 호출 Mocking: 외부 의존성 제거 [GS-TEST-01]
    await page.route("**/api/watchlist", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      } else if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Apple Inc. 추가됨",
            data: {
              symbol: "AAPL",
              name: "Apple Inc.",
              price: 250.0,
              currency: "USD",
            },
          }),
        });
      }
    });

    await page.goto("/");
  });

  test("종목 추가 입력창 및 테이블 렌더링 확인", async ({ page }) => {
    // 1. 입력 필드 존재 확인
    const input = page.getByPlaceholder(/ticker/i);
    await expect(input).toBeVisible();

    // 2. 추가 버튼 존재 확인
    const addButton = page.getByRole("button", { name: /add/i });
    await expect(addButton).toBeVisible();
  });

  test("종목 추가 시 테이블에 즉시 반영되는지 확인", async ({ page }) => {
    const input = page.getByPlaceholder(/ticker/i);
    const addButton = page.getByRole("button", { name: /add/i });

    // 1. AAPL 입력 후 추가 버튼 클릭
    await input.fill("AAPL");
    await addButton.click();

    // 2. 테이블에 데이터가 나타나는지 확인
    // (구현 전이므로 여기서 실패(Red)가 발생해야 함)
    const tableRow = page.locator("table >> text=AAPL");
    await expect(tableRow).toBeVisible({ timeout: 5000 });
  });
});
