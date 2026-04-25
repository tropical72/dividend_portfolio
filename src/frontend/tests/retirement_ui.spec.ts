import { test, expect } from "@playwright/test";

test.describe("Retirement Tab UX", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    // 직접 접속 (기본 탭이 retirement이므로 버튼 클릭 생략 가능 여부 확인)
    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  });

  test("should display simulation result chart and metrics", async ({
    page,
  }) => {
    // 컨텐츠가 보일 때까지 대기
    const content = page.locator('[data-testid="retirement-tab-content"]');
    await expect(content).toBeVisible({ timeout: 20000 });

    // 주요 텍스트 확인
    await expect(page.locator("text=은퇴할 수 있습니다")).toBeVisible();
  });

  test("should display portfolio badges with name and yield", async ({
    page,
  }) => {
    // 1. 은퇴 탭 로딩 완료 대기
    const content = page.locator('[data-testid="retirement-tab-content"]');
    await expect(content).toBeVisible({ timeout: 20000 });

    // 2. 법인/연금 포트폴리오 카드가 이름과 수익률 정보를 표시하는지 확인
    const corpCard = page.getByTestId("active-strategy-corp-card");
    const pensionCard = page.getByTestId("active-strategy-pension-card");

    await expect(corpCard).toBeVisible();
    await expect(pensionCard).toBeVisible();
    await expect(corpCard).not.toContainText(/없음|None/);
    await expect(corpCard).toContainText(/%/);
    await expect(pensionCard).toContainText(/%/);
  });

  test("should allow editing assumptions and resetting", async ({ page }) => {
    // 인풋 필드가 보일 때까지 대기
    const returnInput = page.getByTestId("return-conservative");
    await returnInput.waitFor({ state: "visible", timeout: 15000 });

    // 값 수정
    await returnInput.fill("12.0");
    await returnInput.press("Enter");

    // 리셋 버튼 확인
    const resetButton = page
      .locator('button:has-text("Reset"), button:has-text("복구")')
      .first();
    await expect(resetButton).toBeVisible();

    // 리셋 클릭
    await resetButton.click();
    expect(await returnInput.inputValue()).not.toBe("12.0");
  });
});
