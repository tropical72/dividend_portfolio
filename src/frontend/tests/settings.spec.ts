import { test, expect } from "@playwright/test";

test.describe("Settings Tab - API Key Management", () => {
  test.beforeEach(async ({ page }) => {
    // 앱 접속
    await page.goto("http://localhost:5173");
  });

  test("should switch to settings tab and save API keys", async ({ page }) => {
    // 1. Settings 탭으로 이동
    const settingsBtn = page.getByRole("button", { name: /Settings/i });
    await settingsBtn.click();

    // 2. 설정 화면 제목 확인
    await expect(page.getByText("API Key Settings")).toBeVisible();

    // 3. API 키 입력
    const dartInput = page.locator('input[placeholder*="OpenDart"]');
    const testKey = "test-dart-key-12345";
    await dartInput.fill(testKey);

    // 4. 저장 버튼 클릭
    const saveBtn = page.getByRole("button", { name: /Save Settings/i });
    await saveBtn.click();

    // 5. 성공 메시지 확인 (Toast/Alert)
    await expect(page.getByText("설정이 성공적으로 저장되었습니다.")).toBeVisible();

    // 6. 페이지 새로고침 후 값이 유지되는지 확인 (선택 사항이나 권장됨)
    await page.reload();
    await settingsBtn.click();
    await expect(dartInput).toHaveValue(testKey);
  });
});
