import { test, expect } from '@playwright/test';

test.describe('Settings Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    // 1. 앱 접속 및 세팅 탭 이동
    await page.goto('http://localhost:5173');
    await page.click('button:has-text("Settings")');
    // 페이지 로딩 대기
    await page.waitForSelector('text=Strategy Center');
  });

  test('Month input should be restricted between 1 and 12', async ({ page }) => {
    // 1. User Profile의 Birth Month 테스트
    // 라벨 근처의 input을 찾도록 수정
    const birthMonthInput = page.locator('div:has-text("Birth Month") >> input').last();
    
    await birthMonthInput.fill('0');
    await birthMonthInput.blur();
    expect(await birthMonthInput.inputValue()).toBe('1');

    await birthMonthInput.fill('13');
    await birthMonthInput.blur();
    expect(await birthMonthInput.inputValue()).toBe('12');

    // 2. Cashflow Events의 Month 테스트
    await page.click('text=Add Event');
    
    // YEAR/MONTH 라벨 아래의 input을 찾음
    const eventMonthInput = page.locator('span:has-text("Month") + input').first();
    await eventMonthInput.fill('-5');
    await eventMonthInput.blur();
    expect(await eventMonthInput.inputValue()).toBe('1');

    await eventMonthInput.fill('99');
    await eventMonthInput.blur();
    expect(await eventMonthInput.inputValue()).toBe('12');
  });

  test('Amount input should handle commas correctly', async ({ page }) => {
    await page.click('text=Add Event');
    // 통화 선택 옆의 금액 입력칸
    const amountInput = page.locator('div.relative >> input[type="text"]').filter({ hasText: '' }).first();
    
    await amountInput.fill('1234567');
    await amountInput.blur();
    
    // 콤마가 자동으로 붙었는지 확인
    expect(await amountInput.inputValue()).toBe('1,234,567');
  });

  test('Currency selector should work and change prefix', async ({ page }) => {
    await page.click('text=Add Event');
    const currencySelect = page.locator('select').filter({ hasText: '$' }).first();
    
    await currencySelect.selectOption('KRW');
    expect(await currencySelect.inputValue()).toBe('KRW');
    
    await currencySelect.selectOption('USD');
    expect(await currencySelect.inputValue()).toBe('USD');
  });
});
