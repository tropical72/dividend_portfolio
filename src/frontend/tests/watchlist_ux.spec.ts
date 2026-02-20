import { test, expect } from "@playwright/test";

test.describe("Watchlist UX - Sorting and Context Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    
    // 테스트용 데이터가 없는 경우를 대비해 하나 추가 (실제 백엔드 연동)
    const input = page.locator('input[placeholder*="Ticker"]');
    await input.fill("AAPL");
    await page.keyboard.press("Enter");
    await expect(page.getByText("AAPL")).toBeVisible();
    
    await input.fill("MSFT");
    await page.keyboard.press("Enter");
    await expect(page.getByText("MSFT")).toBeVisible();
  });

  test("should sort table by Price when header is clicked", async ({ page }) => {
    // 1. Price 헤더 클릭
    const priceHeader = page.getByText("Price");
    await priceHeader.click(); // 첫 클릭: 오름차순 또는 내림차순

    // 2. 첫 번째 행의 Ticker 확인
    const firstRowTicker = await page.locator("tbody tr").first().locator("td").first().innerText();
    
    // 3. 다시 클릭하여 정렬 방향 전환
    await priceHeader.click();
    const switchedTicker = await page.locator("tbody tr").first().locator("td").first().innerText();
    
    // 4. 정렬 결과가 달라졌는지 확인 (AAPL vs MSFT 가격 차이 이용)
    expect(firstRowTicker).not.toBe(switchedTicker);
  });

  test("should show context menu on right click", async ({ page }) => {
    // 1. 특정 행 우클릭
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click({ button: "right" });

    // 2. 컨텍스트 메뉴 노출 확인
    const menu = page.getByText("Add to Portfolio");
    await expect(menu).toBeVisible();

    // 3. 메뉴 클릭 시 동작 확인
    await menu.click();
    // 성공 알림 등이 뜨는지 확인 (구현 예정)
  });
});
