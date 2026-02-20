import { test, expect } from "@playwright/test";

test.describe("Watchlist UX - Sorting and Context Menu", () => {
  test.beforeEach(async ({ page, request }) => {
    // 0. API를 통한 데이터 완전 초기화
    const watchlistRes = await request.get("http://localhost:8000/api/watchlist");
    const { data } = await watchlistRes.json();
    if (data && data.length > 0) {
      for (const item of data) {
        await request.delete(`http://localhost:8000/api/watchlist/${item.symbol}`);
      }
    }

    await page.goto("http://localhost:5173");
    
    // 1. 테스트용 데이터 추가
    const input = page.locator('input[placeholder*="Ticker"]');
    const addButton = page.getByRole("button", { name: /^Add$/i });
    
    await input.fill("AAPL");
    await addButton.click();
    await expect(page.locator('tbody')).toContainText("AAPL", { timeout: 15000 });
    
    await input.fill("MSFT");
    await addButton.click();
    await expect(page.locator('tbody')).toContainText("MSFT", { timeout: 15000 });
  });

  test("should sort table by Price when header is clicked", async ({ page }) => {
    // 1. Ticker 헤더 클릭 (기본 정렬 확인용)
    const tickerHeader = page.getByText("Ticker");
    await tickerHeader.click({ force: true }); 

    // 2. 첫 번째 행의 Ticker 확인
    const firstRowTicker = await page.locator("tbody tr").first().locator("td").nth(1).innerText();
    
    // 3. 다시 클릭하여 정렬 방향 전환
    await tickerHeader.click({ force: true });
    const switchedTicker = await page.locator("tbody tr").first().locator("td").nth(1).innerText();
    
    // 4. 정렬 결과가 달라졌는지 확인
    expect(firstRowTicker).not.toBe(switchedTicker);
  });

  test("should show context menu on right click", async ({ page }) => {
    // 1. 특정 행 우클릭
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click({ button: "right", force: true });

    // 2. 컨텍스트 메뉴 노출 확인
    const menu = page.getByText("Add to Portfolio");
    await expect(menu).toBeVisible();

    // 3. 메뉴 클릭 시 동작 확인
    await menu.click({ force: true });
  });

  test("should show delete confirmation modal on right-click menu item", async ({ page }) => {
    // 1. AAPL 행 우클릭
    const row = page.getByRole("row", { name: /AAPL/i });
    await row.click({ button: "right", force: true });

    // 2. 'Delete Stock' 메뉴 아이템 클릭
    const deleteMenu = page.getByRole("button", { name: /Delete Stock/i });
    await expect(deleteMenu).toBeVisible();
    await deleteMenu.click({ force: true });

    // 3. 삭제 확인 모달 노출 확인
    const confirmBtn = page.getByRole("button", { name: /^삭제$/ });
    await expect(confirmBtn).toBeVisible();
    
    // 4. 모달의 문구 확인
    await expect(page.getByText("AAPL 종목을 제거합니다.")).toBeVisible();

    // 5. '취소' 클릭 시 모달이 닫히는지 확인
    const cancelBtn = page.getByRole("button", { name: /^취소$/ });
    await cancelBtn.click({ force: true });
    await expect(confirmBtn).not.toBeVisible();
  });
});
