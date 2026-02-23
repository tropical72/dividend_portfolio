import { test, expect } from '@playwright/test';

test.describe('Settings Input Validation & Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('text=Strategy Settings');
    await page.waitForSelector('text=Strategy Center', { timeout: 15000 });
  });

  test('Input units should be visible', async ({ page }) => {
    // 1. Birth Year 옆에 'Year' 단위 확인
    await expect(page.locator('div:has-text("Birth Year") >> text=Year')).toBeVisible();
    // 2. Private Pension 옆에 'Age' 단위 확인
    await expect(page.locator('div:has-text("Private Pension") >> text=Age')).toBeVisible();
    // 3. Initial Capital 옆에 'KRW' 단위 확인
    await expect(page.locator('div:has-text("Initial Capital") >> text=KRW')).toBeVisible();
  });

  test('Advanced Engine section should be collapsible', async ({ page }) => {
    const toggle = page.getByTestId('advanced-settings-toggle');
    const content = page.getByTestId('advanced-settings-content');

    // 1. 초기 상태는 닫혀 있어야 함
    await expect(content).not.toBeVisible();

    // 2. 클릭하면 열려야 함
    await toggle.click();
    await expect(content).toBeVisible();

    // 3. 다시 클릭하면 닫혀야 함
    await toggle.click();
    await expect(content).not.toBeVisible();
  });

  test('Month input auto-correction works', async ({ page }) => {
    const birthMonthInput = page.locator('div:has-text("Birth Month") >> input').last();
    await birthMonthInput.fill('0');
    await birthMonthInput.blur();
    await expect(async () => {
      const val = await birthMonthInput.inputValue();
      expect(parseFloat(val)).toBe(1);
    }).toPass();
  });
});
