import { test, expect } from "@playwright/test";

test.describe("Watchlist - Multi-selection and Bulk Delete", () => {
  test.beforeEach(async ({ page }) => {
    const seedWatchlist = [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 150,
        currency: "USD",
        dividend_yield: 0.5,
        one_yr_return: 10,
        ex_div_date: "2025-01-01",
        last_div_amount: 0.2,
        last_div_yield: 0.1,
        past_avg_monthly_div: 5,
        dividend_frequency: "Quarterly",
        payment_months: [2, 5, 8, 11],
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        price: 400,
        currency: "USD",
        dividend_yield: 0.8,
        one_yr_return: 12,
        ex_div_date: "2025-01-01",
        last_div_amount: 0.75,
        last_div_yield: 0.2,
        past_avg_monthly_div: 8,
        dividend_frequency: "Quarterly",
        payment_months: [3, 6, 9, 12],
      },
    ];

    await page.route("http://localhost:8000/api/watchlist", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: seedWatchlist }),
      });
    });

    await page.route(
      /http:\/\/localhost:8000\/api\/watchlist\/.+/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "삭제됨" }),
        });
      },
    );

    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-watchlist").click();

    await expect(page.locator("section:visible tbody")).toContainText("AAPL", {
      timeout: 15000,
    });
    await expect(page.locator("section:visible tbody")).toContainText("MSFT", {
      timeout: 15000,
    });
  });

  test("should select all and delete both stocks", async ({ page }) => {
    // 1. 전체 선택 클릭 전, 행이 2개 나타날 때까지 확실히 대기
    const rows = page.locator("section:visible tbody tr");
    await expect(rows).toHaveCount(2, { timeout: 15000 });

    // 2. 헤더 체크박스(전체 선택) 클릭
    const selectAllHeader = page.getByRole("checkbox", {
      name: "Select all stocks",
    });
    await selectAllHeader.click({ force: true });

    // 3. 모든 행이 체크되었는지 확인
    const rowCheckboxes = page.locator(
      'section:visible tbody [role="checkbox"]',
    );
    await expect(rowCheckboxes.first()).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 10000 },
    );
    const count = await rowCheckboxes.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rowCheckboxes.nth(i)).toHaveAttribute(
        "aria-checked",
        "true",
      );
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
    await expect(page.locator("section:visible tbody")).not.toContainText(
      "AAPL",
    );
    await expect(page.locator("section:visible tbody")).not.toContainText(
      "MSFT",
    );
  });

  test("should select all, deselect one, and delete only the selected one", async ({
    page,
  }) => {
    // 0. 행이 2개 나타날 때까지 대기
    const rows = page.locator("section:visible tbody tr");
    await expect(rows).toHaveCount(2, { timeout: 15000 });

    // 1. 전체 선택
    await page
      .getByRole("checkbox", { name: "Select all stocks" })
      .click({ force: true });

    // 2. 모든 행이 체크되었는지 먼저 확인
    const rowCheckboxes = page.locator(
      'section:visible tbody [role="checkbox"]',
    );
    await expect(rowCheckboxes.first()).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 10000 },
    );

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
    await expect(page.locator("section:visible tbody")).not.toContainText(
      "AAPL",
    );
    await expect(page.locator("section:visible tbody")).toContainText("MSFT");
  });

  test("should show category selection dialog when clicking Add to Portfolio", async ({
    page,
  }) => {
    // [REQ-PRT-02.1]
    // 1. AAPL 선택
    await page
      .getByRole("row", { name: /AAPL/i })
      .locator('[role="checkbox"]')
      .click({ force: true });

    // 2. 'Add to Portfolio' 버튼 클릭 (멀티 선택 시 노출되어야 함)
    const addBtn = page.getByRole("button", { name: /Add to Portfolio/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click({ force: true });

    // 3. 카테고리 선택 팝업 노출 확인
    await expect(page.getByText("Select Category")).toBeVisible();
    const sgovBtn = page.getByRole("button", { name: /SGOV Buffer/i });
    await expect(sgovBtn).toBeVisible();

    // 4. SGOV Buffer 선택 및 이관
    await sgovBtn.click({ force: true });

    // 5. Portfolio 탭으로 자동 이동 확인 (또는 수동 이동 후 확인)
    await page.getByTestId("nav-portfolio-manager").click();

    // 6. SGOV Buffer 섹션에 AAPL이 있는지 확인
    await expect(
      page.getByRole("heading", { name: "SGOV Buffer" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "AAPL", exact: true }).first(),
    ).toBeVisible();
  });
});
