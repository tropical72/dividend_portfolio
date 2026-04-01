import { test, expect } from '@playwright/test';

test.describe('Settings Tooltip Regression Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('text=Strategy Settings');
    await page.waitForSelector('text=Strategy Center', { timeout: 15000 });
  });

  test('Yield Multiplier tooltips should contain default values', async ({ page }) => {
    // Advanced 섹션 펼치기
    await page.getByTestId('advanced-settings-toggle').click();

    // 1. Equity Mult 툴팁 확인
    const equityGroup = page.getByTestId('input-group-equity-mult');
    await equityGroup.getByTestId('tooltip-icon').hover();
    await expect(page.locator('text=기본값: 1.2')).toBeVisible();

    // 2. Debt Mult 툴팁 확인
    const debtGroup = page.getByTestId('input-group-debt-mult');
    await debtGroup.getByTestId('tooltip-icon').hover();
    await expect(page.locator('text=기본값: 0.6')).toBeVisible();
  });

  test('Right-side tooltips should be aligned correctly', async ({ page }) => {
    await page.getByTestId('advanced-settings-toggle').click();
    
    const debtGroup = page.getByTestId('input-group-debt-mult');
    const tooltip = debtGroup.locator('.absolute'); // 툴팁 박스
    
    // 우측 정렬 클래스가 포함되어 있는지 확인
    await expect(tooltip).toHaveClass(/right-0/);
  });
});
