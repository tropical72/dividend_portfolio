import { test, expect } from '@playwright/test';

test.describe('Settings Comprehensive Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('text=Strategy Settings');
    await page.waitForSelector('text=Strategy Center');
  });

  test('New Feature: Simulation Duration should be editable', async ({ page }) => {
    const durationInput = page.getByTestId('input-group-duration').locator('input');
    await durationInput.fill('50');
    await durationInput.blur();
    expect(await durationInput.inputValue()).toBe('50');
  });

  test('New Feature: Yield Multipliers should be editable in Advanced section', async ({ page }) => {
    // Advanced 섹션 펼치기
    await page.getByTestId('advanced-settings-toggle').click();
    
    const equityMult = page.getByTestId('input-group-equity-mult').locator('input');
    await equityMult.fill('150'); // 1.5배 (UI에서는 100을 곱해서 표시)
    await equityMult.blur();
    expect(await equityMult.inputValue()).toBe('150');
  });

  test('Layout: Elements should not overlap after expansion', async ({ page }) => {
    await page.click('text=Add Event');
    const amountLabel = page.locator('label:text("Amount")').last();
    const yearLabel = page.locator('label:text("Year")').last();
    const amountBox = await amountLabel.boundingBox();
    const yearBox = await yearLabel.boundingBox();
    if (amountBox && yearBox) {
      expect(amountBox.x + amountBox.width).toBeLessThan(yearBox.x);
    }
  });
});
