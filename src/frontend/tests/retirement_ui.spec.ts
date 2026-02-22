import { test, expect } from "@playwright/test";

test.describe("Retirement Tab UX", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);

    // 1. 백엔드 응답 모킹 (API 의존성 제거)
    await page.route("**/api/retirement/config", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            active_assumption_id: "v1",
            assumptions: {
              v1: { name: "Standard", expected_return: 0.0485, inflation_rate: 0.025 },
              conservative: { name: "Conservative", expected_return: 0.035, inflation_rate: 0.035 }
            }
          }
        })
      });
    });

    await page.route("**/api/retirement/simulate", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            summary: { total_survival_years: 45 },
            monthly_data: Array.from({ length: 360 }, (_, i) => ({
              month: i + 1,
              corp_balance: 1600000000,
              pension_balance: 600000000,
              total_net_worth: 2200000000,
              target_cashflow: 9000000
            }))
          }
        })
      });
    });

    await page.goto("http://localhost:5173");
    
    // 은퇴 탭 컨텐츠가 나타날 때까지 대기
    const content = page.getByTestId("retirement-tab-content");
    await expect(content).toBeVisible({ timeout: 30000 });
  });

  test("should display simulation result chart and metrics", async ({ page }) => {
    // 1. 지속 가능 연수 텍스트 확인 (모킹된 45년)
    await expect(page.getByText("45")).toBeVisible();
    
    // 2. 차트 영역이 존재하는지 확인
    const chart = page.locator(".recharts-responsive-container");
    await expect(chart).toBeVisible();
    
    // 3. 심리적 안도감 메시지 확인
    await expect(page.getByText(/은퇴할 수 있습니다/i)).toBeVisible();
  });

  test("should allow running stress test scenarios", async ({ page }) => {
    const bearBtn = page.getByRole("button", { name: /Bear Market/i });
    await expect(bearBtn).toBeVisible();
    
    // Bear Market 클릭
    await bearBtn.click();
    
    // 헤더 메시지가 변경되는지 확인
    await expect(page.getByText(/혹독한 시나리오/i)).toBeVisible();
    
    // 차트가 여전히 렌더링되고 있는지 확인
    const chart = page.locator(".recharts-responsive-container");
    await expect(chart).toBeVisible();
  });
});
