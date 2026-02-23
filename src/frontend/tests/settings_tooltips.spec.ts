import { test, expect } from '@playwright/test';

test.describe('Settings Tooltip & Regression Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('text=Strategy Settings');
    await page.waitForSelector('text=Strategy Center', { timeout: 15000 });
  });

  test('Tooltips should show correct description on hover', async ({ page }) => {
    // 1. Birth Year 툴팁 확인 (data-testid 사용)
    const birthYearGroup = page.getByTestId('input-group-birth-year');
    const infoIcon = birthYearGroup.getByTestId('tooltip-icon');
    
    await infoIcon.hover();
    
    const tooltipText = page.locator('text=시뮬레이션 시작 나이를 계산하기 위한 출생 연도');
    await expect(tooltipText).toBeVisible();
  });

  test('Advanced Engine tooltips should be accessible when expanded', async ({ page }) => {
    // 1. 섹션 펼치기
    await page.getByTestId('advanced-settings-toggle').click();
    
    // 2. Employee Count 툴팁 확인
    const employeeGroup = page.getByTestId('input-group-employee-count');
    await employeeGroup.getByTestId('tooltip-icon').hover();
    
    await expect(page.locator('text=법인에서 급여를 받는 직원 수')).toBeVisible();
  });
});
