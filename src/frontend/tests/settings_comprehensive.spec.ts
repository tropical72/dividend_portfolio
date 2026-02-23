import { test, expect } from '@playwright/test';

test.describe('Settings Comprehensive Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('text=Strategy Settings');
    await page.waitForSelector('text=Strategy Center');
  });

  test('Layout: Cashflow fields should be spacious and not overlap', async ({ page }) => {
    await page.click('text=Add Event');
    
    // Amount와 Year 라벨이 포함된 텍스트를 기준으로 인풋 그룹 찾기
    const amountLabel = page.locator('label:text("Amount")').last();
    const yearLabel = page.locator('label:text("Year")').last();
    
    const amountBox = await amountLabel.boundingBox();
    const yearBox = await yearLabel.boundingBox();
    
    if (amountBox && yearBox) {
      // 겹침 확인
      expect(amountBox.x + amountBox.width).toBeLessThan(yearBox.x);
    }
  });

  test('Features: Units and Tooltips must be present', async ({ page }) => {
    // 1. 단위(Unit) 가시성 확인 (정밀 타겟팅)
    const birthYearGroup = page.getByTestId('input-group-birth-year');
    await expect(birthYearGroup.locator('span:text("Year")')).toBeVisible();

    const capitalGroup = page.getByTestId('input-group-initial-capital');
    await expect(capitalGroup.locator('span:text("KRW")')).toBeVisible();

    // 2. 툴팁 아이콘 확인
    const birthYearIcon = birthYearGroup.getByTestId('tooltip-icon');
    await expect(birthYearIcon).toBeVisible();
  });

  test('UI: Advanced Engine section should be collapsed by default', async ({ page }) => {
    const toggle = page.getByTestId('advanced-settings-toggle');
    // 초기에는 열림 아이콘이 아니어야 함 (ChevronDown 상태)
    await expect(page.getByTestId('advanced-settings-content')).not.toBeVisible();

    await toggle.click();
    await expect(page.getByTestId('advanced-settings-content')).toBeVisible();
  });

  test('Validation: Amount should handle large numbers correctly', async ({ page }) => {
    await page.click('text=Add Event');
    const amountInput = page.locator('div:has-text("Amount") >> input[type="text"]').last();
    
    await amountInput.fill('1000000000'); // 10억
    await amountInput.blur();
    
    // 숫자로 파싱하여 10억이 맞는지 확인 (브라우저 포맷팅 이슈 우회)
    await expect(async () => {
      const val = await amountInput.inputValue();
      const numericVal = parseFloat(val.replace(/,/g, ""));
      expect(numericVal).toBe(1000000000);
    }).toPass();
  });
});
