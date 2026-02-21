import { test, expect } from "@playwright/test";

test.describe("Portfolio Dashboard - List & Detail", () => {
  let uniqueName: string;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    uniqueName = `Test Portfolio ${Date.now()}`;
    
    // 브라우저 로그 캡처
    page.on("console", msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on("pageerror", err => console.log(`BROWSER ERROR: ${err.message}`));

    // 테스트용 샘플 데이터 생성 (API 직접 호출)
    await page.request.post("http://127.0.0.1:8000/api/portfolios", {
      data: {
        name: uniqueName,
        total_capital: 50000,
        currency: "USD",
        items: [
          { symbol: "AAPL", name: "Apple", category: "Growth", weight: 60, price: 150, dividend_yield: 0.5, last_div_amount: 0.2, payment_months: [2,5,8,11] },
          { symbol: "O", name: "Realty Income", category: "Fixed", weight: 40, price: 60, dividend_yield: 5.5, last_div_amount: 0.25, payment_months: [1,2,3,4,5,6,7,8,9,10,11,12] }
        ]
      }
    });

    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
    
    // Portfolio 탭으로 이동
    const portfolioNavBtn = page.getByTestId("nav-portfolio");
    await portfolioNavBtn.waitFor({ state: "visible", timeout: 30000 });
    await portfolioNavBtn.click({ force: true });
    
    // Manage & Compare 서브 탭 클릭
    const manageTabBtn = page.getByRole("button", { name: /Manage & Compare/i });
    await manageTabBtn.waitFor({ state: "visible", timeout: 10000 });
    await manageTabBtn.click({ force: true });
  });

  test("should display a list of saved portfolios", async ({ page }) => {
    // 대시보드 섹션이 존재하는지 확인
    await expect(page.getByText(/Saved Portfolios/i)).toBeVisible();
    
    const portfolioCards = page.locator(".portfolio-card").filter({ hasText: uniqueName });
    await expect(portfolioCards).toBeVisible();
  });

  test("should expand accordion to show details when clicked", async ({ page }) => {
    // 특정 이름을 가진 카드 찾기
    const testCard = page.locator(".portfolio-card").filter({ hasText: uniqueName });
    await testCard.click();
    
    // 세부 정보(자산 구성 등)가 나타나는지 확인
    await expect(testCard.locator(".portfolio-details")).toBeVisible();
    await expect(testCard.getByText(/Asset Allocation/i)).toBeVisible();
  });

  test("should load portfolio into designer when Load button is clicked", async ({ page }) => {
    // 1. 특정 이름을 가진 카드 찾기 및 확장
    const testCard = page.locator(".portfolio-card").filter({ hasText: uniqueName });
    await testCard.click();
    
    // 2. Load 버튼 클릭
    const loadBtn = testCard.getByRole("button", { name: /Load into Designer/i });
    await loadBtn.click();
    
    // 3. Designer 탭으로 자동 전환되었는지 확인
    await expect(page.getByText(/Design Mode/i)).toBeVisible();
    
    // 4. 입력 폼에 포트폴리오 이름이 채워졌는지 확인
    const nameInput = page.getByPlaceholder(/포트폴리오 이름을 입력하세요/i);
    await expect(nameInput).toHaveValue(uniqueName);
  });
});
