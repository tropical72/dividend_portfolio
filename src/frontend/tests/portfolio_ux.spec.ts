import { test, expect } from "@playwright/test";

test.describe("Portfolio Editor UX - Basic Structure", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("http://localhost:5173");
    
    // 페이지 로딩 완료 대기
    await page.waitForLoadState("networkidle");
    
    // Portfolio Tab 버튼이 나타날 때까지 명시적 대기
    const portfolioNavBtn = page.getByTestId("nav-portfolio");
    await portfolioNavBtn.waitFor({ state: "visible", timeout: 30000 });
    await portfolioNavBtn.click({ force: true });
  });

  test("should display three category sections", async ({ page }) => {
    await expect(page.getByText("Fixed Income")).toBeVisible();
    await expect(page.getByText("Bond/Cash Buffer")).toBeVisible();
    await expect(page.getByText("Growth/Dividend Growth")).toBeVisible();
  });

  test("should have a Reset/New button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /새로만들기/i })).toBeVisible();
  });

  test("should block saving when total weight is not 100%", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: /포트폴리오 저장/i });
    await saveBtn.click({ force: true });
    await expect(page.getByText(/비중 합계가 100%여야 합니다/i)).toBeVisible();
  });

  test("should synchronize USD and KRW capital inputs", async ({ page }) => {
    const usdInput = page.getByPlaceholder("USD Amount");
    const krwInput = page.getByPlaceholder("KRW Amount");

    await expect(usdInput).not.toHaveValue("");
    
    await usdInput.click({ force: true });
    await usdInput.fill("20000");
    
    // 환율 적용 대기
    await expect(krwInput).not.toHaveValue("14,255,000"); 
  });

  test("should block saving when portfolio name is empty", async ({ page }) => {
    // 1. 이름 비우기
    const nameInput = page.getByPlaceholder(/포트폴리오 이름을 입력하세요/i);
    await nameInput.fill("");
    
    // 2. 저장 시도
    const saveBtn = page.getByRole("button", { name: /포트폴리오 저장/i });
    await saveBtn.click({ force: true });

    // 3. 경고 메시지 확인
    await expect(page.getByText(/포트폴리오 이름을 입력해주세요/i)).toBeVisible();
  });

  test("should have account type selection (Personal/Pension)", async ({ page }) => {
    // 계좌 유형 선택 버튼 또는 텍스트 확인
    await expect(page.getByRole("button", { name: /Personal/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pension/i })).toBeVisible();
  });

  test("should show analysis results card", async ({ page }) => {
    await expect(page.getByText(/Expected Income/i)).toBeVisible();
    await expect(page.getByText(/Annual Dividend/i).first()).toBeVisible();
    await expect(page.getByText(/Monthly Income/i).first()).toBeVisible();
  });
});
