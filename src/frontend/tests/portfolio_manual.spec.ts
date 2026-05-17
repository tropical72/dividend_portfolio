import { test, expect } from "@playwright/test";

test.describe("Portfolio Manual Add", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    const portfolioNavBtn = page.getByTestId("nav-asset-setup");
    await portfolioNavBtn.waitFor({ state: "visible", timeout: 30000 });
    await portfolioNavBtn.click({ force: true });
  });

  test("should open manual add modal and add a stock", async ({ page }) => {
    // 1. Corporate 기본 카테고리인 SGOV Buffer 섹션의 Add Manually 버튼 클릭
    const addBtn = page
      .locator("div:has(h3:text('SGOV Buffer'))")
      .getByRole("button", { name: /Add Manually|직접 추가/i })
      .first();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });

    // 2. 모달이 뜨는지 확인
    const modal = page.getByTestId("manual-add-modal");
    await expect(modal).toBeVisible();

    // 3. 폼 입력 (모달 내부 필드 지목)
    await modal.getByPlaceholder(/e.g. AAPL/i).fill("TEST");
    await modal.getByPlaceholder(/e.g. Apple Inc./i).fill("Manual Test Stock");
    await modal.getByTestId("manual-weight-input").fill("10");

    // 4. 추가 버튼 클릭
    await modal.getByRole("button", { name: /Add Asset|자산 추가/i }).click();

    // 5. 테이블에 추가되었는지 확인
    await expect(
      page.getByRole("cell", { name: "TEST", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Manual Test Stock" }).first(),
    ).toBeVisible();
  });

  test("should convert SGOV buffer months into allocation weight", async ({
    page,
  }) => {
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/KRW Amount|KRW 금액/i).fill("115000000");

    const addBtn = page
      .locator("div:has(h3:text('SGOV Buffer'))")
      .getByRole("button", { name: /Add Manually|직접 추가/i })
      .first();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });

    const modal = page.getByTestId("manual-add-modal");
    await modal.getByPlaceholder(/e.g. AAPL/i).fill("SGOV");
    await modal.getByPlaceholder(/e.g. Apple Inc./i).fill("SGOV ETF");
    await modal.getByTestId("manual-runway-months-input").fill("3");

    await expect(modal.getByTestId("manual-weight-input")).toHaveValue("30");

    await modal.getByRole("button", { name: /Add Asset|자산 추가/i }).click();

    const sgovRow = page.getByRole("row").filter({ hasText: "SGOV" }).first();
    await expect(sgovRow.getByTestId("portfolio-weight-input")).toHaveValue(
      "30",
    );
  });

  test("should allow clearing and retyping weight and integer months", async ({
    page,
  }) => {
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/KRW Amount|KRW 금액/i).fill("115000000");

    const addBtn = page
      .locator("div:has(h3:text('SGOV Buffer'))")
      .getByRole("button", { name: /Add Manually|직접 추가/i })
      .first();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });

    const modal = page.getByTestId("manual-add-modal");
    const weightInput = modal.getByTestId("manual-weight-input");
    const monthsInput = modal.getByTestId("manual-runway-months-input");

    await weightInput.fill("12.345");
    await expect(weightInput).toHaveValue("12.345");
    await weightInput.fill("");
    await expect(weightInput).toHaveValue("");

    await monthsInput.fill("12.7");
    await expect(monthsInput).toHaveValue("127");
    await monthsInput.fill("");
    await expect(monthsInput).toHaveValue("");
    await monthsInput.fill("12");
    await expect(monthsInput).toHaveValue("12");

    await modal.getByPlaceholder(/e.g. AAPL/i).fill("SGOV");
    await modal.getByPlaceholder(/e.g. Apple Inc./i).fill("SGOV ETF");
    await modal.getByRole("button", { name: /Add Asset|자산 추가/i }).click();

    const sgovRow = page.getByRole("row").filter({ hasText: "SGOV" }).first();
    const rowWeightInput = sgovRow.getByTestId("portfolio-weight-input");
    const rowMonthsInput = sgovRow.getByTestId("portfolio-runway-months-input");

    await rowWeightInput.fill("");
    await expect(rowWeightInput).toHaveValue("");
    await rowWeightInput.fill("12.345");
    await expect(rowWeightInput).toHaveValue("12.345");

    await rowMonthsInput.fill("");
    await expect(rowMonthsInput).toHaveValue("");
    await rowMonthsInput.fill("12.7");
    await expect(rowMonthsInput).toHaveValue("127");
  });

  test("should display integer weight when months are entered", async ({
    page,
  }) => {
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/KRW Amount|KRW 금액/i).fill("120000000");

    const addBtn = page
      .locator("div:has(h3:text('SGOV Buffer'))")
      .getByRole("button", { name: /Add Manually|직접 추가/i })
      .first();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });

    const modal = page.getByTestId("manual-add-modal");
    await modal.getByPlaceholder(/e.g. AAPL/i).fill("SGOV");
    await modal.getByPlaceholder(/e.g. Apple Inc./i).fill("SGOV ETF");
    await modal.getByTestId("manual-runway-months-input").fill("1");

    await expect(modal.getByTestId("manual-weight-input")).toHaveValue("10");

    await modal.getByRole("button", { name: /Add Asset|자산 추가/i }).click();

    const sgovRow = page.getByRole("row").filter({ hasText: "SGOV" }).first();
    const rowMonthsInput = sgovRow.getByTestId("portfolio-runway-months-input");
    await rowMonthsInput.fill("2");
    await expect(sgovRow.getByTestId("portfolio-weight-input")).toHaveValue(
      "19",
    );
  });
});
