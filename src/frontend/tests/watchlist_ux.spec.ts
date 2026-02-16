import { test, expect } from "@playwright/test";

/**
 * 관심종목 추가 UX 테스트
 * [TEST-WCH-2.2.1] 로딩 상태 및 알림 메시지를 검증합니다.
 */
test.describe("Watchlist UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("종목 추가 중 로딩 상태 표시 확인", async ({ page }) => {
    // API 호출 지연 시뮬레이션 [GS-TEST-03.4]
    await page.route("**/api/watchlist", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 지연
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            data: { symbol: "MSFT", name: "Microsoft", price: 400 },
          }),
        });
      }
    });

    const input = page.getByPlaceholder(/ticker/i);
    const addButton = page.getByRole("button", { name: /add/i });

    await input.fill("MSFT");
    await addButton.click();

    // 1. "Adding..." 텍스트로 변경되었는지 확인
    await expect(addButton).toHaveText("Adding...");
    // 2. 버튼이 비활성화되었는지 확인
    await expect(addButton).toBeDisabled();
  });

  test("종목 추가 성공/실패 시 메시지 표시 확인", async ({ page }) => {
    // 실패 시나리오 Mocking
    await page.route("**/api/watchlist", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: false,
            message: "이미 등록된 종목입니다.",
          }),
        });
      }
    });

    const input = page.getByPlaceholder(/ticker/i);
    const addButton = page.getByRole("button", { name: /add/i });

    await input.fill("AAPL");
    await addButton.click();

    // 실패 메시지가 화면에 나타나는지 확인 (Toast 또는 Alert 대안)
    // 현재는 window.alert를 사용 중이므로 이를 감지하거나 UI 기반 메시지로 변경 필요
    // 여기서는 UI 기반 메시지가 나타날 것으로 기대하고 작성 (구현 예정)
    const errorMsg = page.locator("text=이미 등록된 종목입니다.");
    await expect(errorMsg).toBeVisible();
  });
});
