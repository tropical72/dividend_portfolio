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
    await expect(page.locator('section:visible tbody')).toContainText("AAPL", { timeout: 15000 });
    
    // MSFT 추가 및 확인
    await input.fill("MSFT");
    await addButton.click();
    await expect(page.locator('section:visible tbody')).toContainText("MSFT", { timeout: 15000 });
  });

  test("should select all and delete both stocks", async ({ page }) => {
    // 1. 전체 선택 클릭 전, 행이 2개 나타날 때까지 확실히 대기
    const rows = page.locator('section:visible tbody tr');
    await expect(rows).toHaveCount(2, { timeout: 15000 });

    // 2. 헤더 체크박스(전체 선택) 클릭
    const selectAllHeader = page.getByRole("checkbox", { name: "Select all stocks" });
    await selectAllHeader.click({ force: true });

    // 3. 모든 행이 체크되었는지 확인
    const rowCheckboxes = page.locator('section:visible tbody [role="checkbox"]');
    await expect(rowCheckboxes.first()).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    const count = await rowCheckboxes.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rowCheckboxes.nth(i)).toHaveAttribute("aria-checked", "true");
    }

    // 3. 'Delete' 버튼 노출 확인 및 클릭
    const deleteBtn = page.getByRole("button", { name: /^Delete$/i });
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click({ force: true });

    // 4. 삭제 확인 모달의 '삭제' 버튼 클릭
    const confirmBtn = page.getByRole("button", { name: /^삭제$/ });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click({ force: true });

    // 5. 테이블이 비어있는지 확인
    await expect(page.locator('section:visible tbody')).not.toContainText("AAPL");
    await expect(page.locator('section:visible tbody')).not.toContainText("MSFT");
  });

  test("should select all, deselect one, and delete only the selected one", async ({ page }) => {
    // 0. 행이 2개 나타날 때까지 대기
    const rows = page.locator('section:visible tbody tr');
    await expect(rows).toHaveCount(2, { timeout: 15000 });

    // 1. 전체 선택
    await page.getByRole("checkbox", { name: "Select all stocks" }).click({ force: true });
    
    // 2. 모든 행이 체크되었는지 먼저 확인
    const rowCheckboxes = page.locator('section:visible tbody [role="checkbox"]');
    await expect(rowCheckboxes.first()).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    
    // 3. MSFT만 해제 (행 내부의 체크박스 영역을 직접 클릭)
    const msftRow = page.getByRole("row", { name: /MSFT/i });
    const msftCheckbox = msftRow.locator('[role="checkbox"]');
    await msftCheckbox.scrollIntoViewIfNeeded();
    await msftCheckbox.click({ force: true });
    
    // 4. 'Delete' 버튼 확인
    const deleteBtn = page.getByRole("button", { name: /^Delete$/i });
    await deleteBtn.scrollIntoViewIfNeeded();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click({ force: true });

    // 5. 삭제 확정
    const confirmBtn = page.getByRole("button", { name: /^삭제$/ });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click({ force: true });

    // 6. AAPL은 사라지고 MSFT는 남아있어야 함
    await expect(page.locator('section:visible tbody')).not.toContainText("AAPL");
    await expect(page.locator('section:visible tbody')).toContainText("MSFT");
  });

  test("should show category selection dialog when clicking Add to Portfolio", async ({ page }) => {
    // [REQ-PRT-02.1]
    // 1. AAPL 선택
    await page.getByRole("row", { name: /AAPL/i }).locator('[role="checkbox"]').click({ force: true });
    
    // 2. 'Add to Portfolio' 버튼 클릭 (멀티 선택 시 노출되어야 함)
    const addBtn = page.getByRole("button", { name: /Add to Portfolio/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click({ force: true });
    
    // 3. 카테고리 선택 팝업 노출 확인
    await expect(page.getByText("Select Category")).toBeVisible();
    const fixedIncomeBtn = page.getByRole("button", { name: "Fixed Income" });
    await expect(fixedIncomeBtn).toBeVisible();
    
    // 4. Fixed Income 선택 및 이관
    await fixedIncomeBtn.click({ force: true });
    
    // 5. Portfolio 탭으로 자동 이동 확인 (또는 수동 이동 후 확인)
    await page.getByRole("button", { name: "Portfolio", exact: true }).click();
    
    // 6. Fixed Income 섹션에 AAPL이 있는지 확인 (해당 헤더 아래의 테이블 내용 검증)
    const fixedSection = page.locator('div:has(h3:text("Fixed Income"))').filter({ has: page.locator('table') });
    await expect(fixedSection).toContainText("AAPL");
  });
});
