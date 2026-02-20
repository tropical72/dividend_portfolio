import { test, expect } from "@playwright/test";

test.describe("Watchlist - Multi-selection and Bulk Delete", () => {
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
    
    // AAPL 추가 및 확인
    await input.fill("AAPL");
    await addButton.click();
    await expect(page.locator('tbody')).toContainText("AAPL", { timeout: 15000 });
    
    // MSFT 추가 및 확인
    await input.fill("MSFT");
    await addButton.click();
    await expect(page.locator('tbody')).toContainText("MSFT", { timeout: 15000 });
  });

  test("should select all and delete both stocks", async ({ page }) => {
    // 1. 전체 선택 클릭 전, 행이 2개 나타날 때까지 확실히 대기
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(2, { timeout: 15000 });

    // 2. 헤더 체크박스(전체 선택) 클릭
    const selectAllHeader = page.getByRole("checkbox", { name: "Select all stocks" });
    await selectAllHeader.click({ force: true });

    // 3. 모든 행이 체크되었는지 확인
    const rowCheckboxes = page.locator('tbody [role="checkbox"]');
    await expect(rowCheckboxes.first()).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    const count = await rowCheckboxes.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rowCheckboxes.nth(i)).toHaveAttribute("aria-checked", "true");
    }

    // 3. 'Delete (2)' 버튼 노출 확인 및 클릭
    const deleteBtn = page.getByRole("button", { name: /Delete \(2\)/i });
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click({ force: true });

    // 4. 삭제 확인 모달의 '삭제' 버튼 클릭
    const confirmBtn = page.getByRole("button", { name: /^삭제$/ });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click({ force: true });

    // 5. 테이블이 비어있는지 확인
    await expect(page.locator('tbody')).not.toContainText("AAPL");
    await expect(page.locator('tbody')).not.toContainText("MSFT");
  });

  test("should select all, deselect one, and delete only the selected one", async ({ page }) => {
    // 0. 행이 2개 나타날 때까지 대기
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(2, { timeout: 15000 });

    // 1. 전체 선택
    await page.getByRole("checkbox", { name: "Select all stocks" }).click({ force: true });
    
    // 2. 모든 행이 체크되었는지 먼저 확인
    const rowCheckboxes = page.locator('tbody [role="checkbox"]');
    await expect(rowCheckboxes.first()).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    
    // 3. MSFT만 해제 (행 내부의 체크박스 영역을 직접 클릭)
    const msftRow = page.getByRole("row", { name: /MSFT/i });
    const msftCheckbox = msftRow.locator('[role="checkbox"]');
    await msftCheckbox.scrollIntoViewIfNeeded();
    await msftCheckbox.click({ force: true });
    
    // 4. 'Delete (1)' 버튼 확인 (AAPL만 선택됨)
    const deleteBtn = page.getByRole("button", { name: /Delete \(1\)/i });
    await deleteBtn.scrollIntoViewIfNeeded();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click({ force: true });

    // 5. 삭제 확정
    const confirmBtn = page.getByRole("button", { name: /^삭제$/ });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click({ force: true });

    // 6. AAPL은 사라지고 MSFT는 남아있어야 함
    await expect(page.locator('tbody')).not.toContainText("AAPL");
    await expect(page.locator('tbody')).toContainText("MSFT");
  });
});
