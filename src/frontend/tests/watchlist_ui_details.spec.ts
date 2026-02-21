import { test, expect } from "@playwright/test";

test.describe("Watchlist UI Details - Regression Tests", () => {
  test.beforeEach(async ({ page, request }) => {
    // 데이터 초기화
    const watchlistRes = await request.get("http://localhost:8000/api/watchlist");
    const { data } = await watchlistRes.json();
    if (data && data.length > 0) {
      for (const item of data) {
        await request.delete(`http://localhost:8000/api/watchlist/${item.symbol}`);
      }
    }
    await page.goto("http://localhost:5173");
  });

  test("should display currency units and Last Amt column correctly", async ({ page }) => {
    // [D-04/REQ-WCH-03.5, 03.6]
    const input = page.locator('input[placeholder*="Ticker"]');
    await input.fill("AAPL");
    await page.getByRole("button", { name: /^Add$/i }).click();
    
    // 1. Last Amt 헤더 존재 확인
    await expect(page.getByText("Last Amt")).toBeVisible();
    
    // 2. 금액 데이터 옆에 USD 단위 표시 확인
    const priceCell = page.locator("tbody tr").first().locator("td").nth(3); // Price 컬럼
    await expect(priceCell).toContainText("USD");
    
    const monthlyCell = page.locator("tbody tr").first().locator("td").last(); // Monthly 컬럼
    await expect(monthlyCell).toContainText("USD");
  });

  test("should show (NEW) label for new stocks with grey color", async ({ page }) => {
    // [REQ-WCH-04.5]
    const input = page.locator('input[placeholder*="Ticker"]');
    await input.fill("0104H0"); // KoAct ETF (New)
    await page.getByRole("button", { name: /^Add$/i }).click();
    
    const cycleCell = page.getByText("(NEW)");
    await expect(cycleCell).toBeVisible();
    
    // 색상 검증: Slate (회색) 계열인지 확인 (Tailwind text-slate-500)
    await expect(cycleCell).toHaveClass(/text-slate-500/);
  });

  test("should wrap long stock names into multiple lines", async ({ page }) => {
    // [REQ-WCH-03.8]
    const input = page.locator('input[placeholder*="Ticker"]');
    await input.fill("441640"); // 긴 이름의 ETF
    await page.getByRole("button", { name: /^Add$/i }).click();
    
    const nameCell = page.locator("tbody tr").first().locator("td").nth(2);
    // line-clamp-2 또는 whitespace-normal 클래스가 포함되어 있는지 확인
    await expect(nameCell).toHaveClass(/whitespace-normal/);
  });

  test("should show TTM label in Yield header", async ({ page }) => {
    // [REQ-WCH-03.7]
    const yieldHeader = page.locator("thead th", { hasText: "Yield" });
    await expect(yieldHeader.locator("span")).toContainText("TTM");
  });
});
