import { test, expect } from "@playwright/test";

/**
 * 관심종목 필수 컬럼 테스트 [REQ-WCH-03.1]
 * 테이블에 9개의 필수 컬럼이 모두 표시되는지 검증합니다.
 */
test.describe("Watchlist Columns", () => {
  test("9개 필수 컬럼 헤더 노출 확인", async ({ page }) => {
    // API Mocking: 9개 필드를 포함한 가짜 데이터 제공
    await page.route("**/api/watchlist", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{
            symbol: "AAPL",
            name: "Apple Inc.",
            price: 250.0,
            currency: "USD",
            dividend_yield: 0.5,
            one_yr_return: 15.0,
            ex_div_date: "2024-02-10",
            last_div_amount: 0.24,
            last_div_yield: 0.1,
            past_avg_monthly_div: 0.08
          }]
        }),
      });
    });

    await page.goto("/");

    // 9개 필수 헤더 존재 여부 확인
    const expectedHeaders = [
      "Ticker", "Name", "Price", "Yield", "1-Yr Return", 
      "Ex-Div Date", "Last Amt", "Last Yield", "Monthly Div"
    ];

    for (const header of expectedHeaders) {
      await expect(page.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
    }
  });
});
