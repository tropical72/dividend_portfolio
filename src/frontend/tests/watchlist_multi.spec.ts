import { test, expect } from "@playwright/test";

test.describe("Watchlist - Multi-selection and Bulk Delete", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    
    // 테스트용 데이터 추가
    const input = page.locator('input[placeholder*="Ticker"]');
    await input.fill("AAPL");
    await page.keyboard.press("Enter");
    await input.fill("MSFT");
    await page.keyboard.press("Enter");
    
    // 추가될 때까지 대기
    await expect(page.getByText("AAPL")).toBeVisible();
    await expect(page.getByText("MSFT")).toBeVisible();
  });

  test("should select all and delete both stocks", async ({ page }) => {
    // 1. 헤더 체크박스(전체 선택) 클릭
    const selectAllHeader = page.locator('thead input[type="checkbox"]');
    await selectAllHeader.click();

    // 2. 모든 행이 체크되었는지 확인
    const rowCheckboxes = page.locator('tbody input[type="checkbox"]');
    const count = await rowCheckboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(rowCheckboxes.nth(i)).toBeChecked();
    }

    // 3. 'Delete Selected (2)' 버튼 노출 확인 및 클릭
    const deleteBtn = page.getByRole("button", { name: /Delete \(2\)/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // 4. 삭제 확인 모달의 '삭제' 버튼 클릭
    const confirmBtn = page.getByRole("button", { name: /^삭제$/ });
    await confirmBtn.click();

    // 5. 테이블이 비어있는지 확인
    await expect(page.getByText("AAPL")).not.toBeVisible();
    await expect(page.getByText("MSFT")).not.toBeVisible();
    await expect(page.getByText("No stocks added yet")).toBeVisible();
  });
});
