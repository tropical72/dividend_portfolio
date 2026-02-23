import { test, expect } from '@playwright/test';

test.describe('Settings Layout Integrity', () => {
  test('Cashflow Event fields should not overlap', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('text=Strategy Settings');
    await page.waitForSelector('text=Strategy Center');
    
    // 이벤트 추가
    await page.click('text=Add Event');
    
    // Amount와 Year 입력 필드 찾기
    const amountGroup = page.locator('div:has-text("Amount")').last();
    const yearGroup = page.locator('div:has-text("Year")').last();
    
    // 좌표 및 크기 가져오기
    const amountBox = await amountGroup.boundingBox();
    const yearBox = await yearGroup.boundingBox();
    
    if (amountBox && yearBox) {
      // Amount의 오른쪽 끝 좌표가 Year의 왼쪽 시작 좌표보다 작아야 함 (겹치지 않음)
      // 약간의 gap(간격)이 있어야 정상
      console.log(`Amount X: ${amountBox.x}, Width: ${amountBox.width}`);
      console.log(`Year X: ${yearBox.x}`);
      
      const amountRightEdge = amountBox.x + amountBox.width;
      expect(amountRightEdge).toBeLessThan(yearBox.x);
    }
  });
});
