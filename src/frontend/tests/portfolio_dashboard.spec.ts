import { test, expect } from "@playwright/test";

test.describe("Portfolio Dashboard - List & Detail", () => {
  test.beforeEach(async ({ page }) => {
    // 테스트용 샘플 데이터 생성 (API 직접 호출)
    await page.request.post("http://127.0.0.1:8000/api/portfolios", {
      data: {
        name: "Test Portfolio Dashboard",
        total_capital: 50000,
        currency: "USD",
        items: [
          { symbol: "AAPL", name: "Apple", category: "Growth", weight: 60, price: 150, dividend_yield: 0.5, last_div_amount: 0.2, payment_months: [2,5,8,11] },
          { symbol: "O", name: "Realty Income", category: "Fixed", weight: 40, price: 60, dividend_yield: 5.5, last_div_amount: 0.25, payment_months: [1,2,3,4,5,6,7,8,9,10,11,12] }
        ]
      }
    });

    await page.goto("http://localhost:5173");
    
    // Portfolio 탭으로 이동
    const portfolioNavBtn = page.getByTestId("nav-portfolio");
    await portfolioNavBtn.click();
    
    // Manage & Compare 서브 탭 클릭
    const manageTabBtn = page.getByRole("button", { name: /Manage & Compare/i });
    await manageTabBtn.click();
  });

  test("should display a list of saved portfolios", async ({ page }) => {
    // 대시보드 섹션이 존재하는지 확인 (구현 예정)
    await expect(page.getByText(/Saved Portfolios/i)).toBeVisible();
    
    // 최소한 하나 이상의 포트폴리오 카드가 있는지 확인 (백엔드에 이미 데이터가 있다고 가정)
    const portfolioCards = page.locator(".portfolio-card");
    await expect(portfolioCards.first()).toBeVisible();
  });

  test("should expand accordion to show details when clicked", async ({ page }) => {
    const firstCard = page.locator(".portfolio-card").first();
    await firstCard.click();
    
    // 세부 정보(자산 구성 등)가 나타나는지 확인
    await expect(page.locator(".portfolio-details").first()).toBeVisible();
    await expect(page.getByText(/Asset Allocation/i).first()).toBeVisible();
  });
});
