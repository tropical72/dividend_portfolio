import { test, expect } from "@playwright/test";

test.describe("Retirement Tab UX", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    // 직접 접속 (기본 탭이 retirement이므로 버튼 클릭 생략 가능 여부 확인)
    await page.goto("http://localhost:5173", { waitUntil: 'networkidle' });
  });

  test("should display simulation result chart and metrics", async ({ page }) => {
    // 컨텐츠가 보일 때까지 대기
    const content = page.locator('[data-testid="retirement-tab-content"]');
    await expect(content).toBeVisible({ timeout: 20000 });

    // 주요 텍스트 확인
    await expect(page.locator('text=은퇴할 수 있습니다')).toBeVisible();
  });

  test("should allow editing assumptions and resetting", async ({ page }) => {
    // 인풋 필드가 보일 때까지 대기
    const returnInput = page.locator('input[data-testid^="return-"]').first();
    await returnInput.waitFor({ state: 'visible', timeout: 15000 });
    
    const originalValue = await returnInput.inputValue();
    
    // 값 수정
    await returnInput.fill("12.0");
    await returnInput.press("Enter");
    
    // 리셋 버튼 확인
    const resetButton = page.locator('button:has-text("Reset")').first();
    await expect(resetButton).toBeVisible();
    
    // 리셋 클릭
    await resetButton.click();
    expect(await returnInput.inputValue()).toBe(originalValue);
  });
});
