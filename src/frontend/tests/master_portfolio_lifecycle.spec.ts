import { test, expect } from '@playwright/test';

test.describe('Master Portfolio Full Lifecycle E2E [REQ-PRT-08, 09]', () => {
  test('should create, activate and verify master strategy in retirement tab', async ({ page }) => {
    // 1. Portfolio 탭으로 이동
    await page.goto('http://localhost:5173');
    await page.click('button:has-text("Portfolio")');
    
    // 2. Manage & Compare 서브 탭 클릭 및 대기
    const manageTabBtn = page.locator('button:has-text("Manage & Compare")');
    await manageTabBtn.click();
    
    // 로딩 텍스트가 사라질 때까지 대기
    await expect(page.locator('text=Synchronizing Data...')).not.toBeVisible({ timeout: 15000 });
    
    // 마스터 전략 입력 필드가 나타날 때까지 대기
    const nameInput = page.getByTestId('master-strategy-name-input');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    
    // 3. 마스터 전략 생성
    const strategyName = `E2E Strategy ${Math.floor(Math.random() * 1000)}`;
    await nameInput.fill(strategyName);
    
    // 포트폴리오 선택 (옵션이 있으면 선택)
    const corpSelect = page.locator('select').first();
    if (await corpSelect.count() > 0) {
      const optionsCount = await corpSelect.locator('option').count();
      if (optionsCount > 1) await corpSelect.selectOption({ index: 1 });
    }
    
    await page.getByTestId('save-master-strategy-btn').click();
    
    // 4. 리스트에 생성되었는지 확인 및 활성화
    const strategyCard = page.locator(`div:has-text("${strategyName}")`).first();
    await expect(strategyCard).toBeVisible();
    
    // 활성화 버튼 클릭 (CheckSquare 아이콘 버튼)
    const activateBtn = strategyCard.locator('button[title="전략 활성화"]');
    if (await activateBtn.isVisible()) {
      await activateBtn.click();
      // Active 배지 확인
      await expect(strategyCard.locator('div:has-text("Active")')).toBeVisible();
    }
    
    // 5. Retirement 탭으로 이동하여 배지 검증
    await page.click('button:has-text("Retirement")');
    
    // 시뮬레이션 로딩 대기
    await page.waitForSelector('h3:has-text("Step 1. Set the Basis")');
    
    // 상단 배지에 마스터 전략명이 포함되어 있는지 확인
    const strategyBadge = page.locator('div:has-text("Strategy:")');
    await expect(strategyBadge).toBeVisible();
    await expect(strategyBadge).toContainText(strategyName);
    
    console.log(`Successfully verified Master Strategy: ${strategyName}`);
  });
});
