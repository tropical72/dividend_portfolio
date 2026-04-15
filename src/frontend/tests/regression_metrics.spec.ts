import { test, expect } from '@playwright/test';

test.describe('Yield-Centric Metrics (DY + PA) Regression', () => {
  test.beforeEach(async ({ page }) => {
    // 8000번 포트(Backend)와 5173번 포트(Frontend)가 실행 중이라고 가정
    await page.goto('http://localhost:5173/');
  });

  test('Settings: Price Appreciation (PA) update and save', async ({ page }) => {
    // Strategy Settings 탭으로 이동
    const navBtn = page.locator('[data-testid="nav-strategy-settings"]');
    await navBtn.waitFor({ state: 'visible' });
    await navBtn.click();
    
    // 입력 필드 찾기
    const paInput = page.getByTestId('price-appreciation-input');
    await paInput.waitFor({ state: 'visible' });
    
    // 값 변경 (기존 값 지우고 5.7 입력)
    await paInput.fill('5.7');
    
    // 저장 버튼 클릭
    const saveBtn = page.locator('button:has-text("Apply All Changes")');
    await saveBtn.click();
    
    // 저장 완료 메시지 대기
    await page.waitForSelector('text=모든 전략 설정이 저장되었습니다.');
    
    // 페이지 새로고침
    await page.reload();
    
    // 다시 Settings 탭으로 이동
    await page.locator('[data-testid="nav-strategy-settings"]').click();
    
    // 값이 5.7로 유지되는지 확인
    const updatedValue = await page.getByTestId('price-appreciation-input').inputValue();
    expect(updatedValue).toBe('5.7');
  });

  test('Portfolio: DY and TR (Growth) are clearly separated', async ({ page }) => {
    // Portfolio Manager 탭으로 이동
    const navBtn = page.locator('[data-testid="nav-portfolio-manager"]');
    await navBtn.waitFor({ state: 'visible' });
    await navBtn.click();
    
    // Designer 하위 탭(기본)에서 결과 요약 섹션 확인
    const yieldLabel = page.locator('span:has-text("Expected Yield")');
    const trLabel = page.locator('span:has-text("Expected TR (Growth)")');
    
    await expect(yieldLabel).toBeVisible();
    await expect(trLabel).toBeVisible();
    
    // TR 값이 Yield 값보다 큰지 확인 (PA가 양수일 때)
    const yieldValueText = await page.locator('span:has-text("Expected Yield") + span').innerText();
    const trValueText = await page.locator('span:has-text("Expected TR (Growth)") + span').innerText();
    
    const yieldVal = parseFloat(yieldValueText.replace('%', ''));
    const trVal = parseFloat(trValueText.replace('%', ''));
    
    // TR = Yield + PA
    if (yieldVal > 0) {
        expect(trVal).toBeGreaterThan(yieldVal);
    }
  });

  test('Retirement: Yield/Growth/TR badges are visible in strategy bar', async ({ page }) => {
    // Retirement 탭으로 이동
    const navBtn = page.locator('[data-testid="nav-retirement"]');
    await navBtn.waitFor({ state: 'visible' });
    await navBtn.click();
    
    // 시뮬레이션 데이터가 로드될 때까지 대기
    await page.waitForSelector('text=Active Strategy', { timeout: 15000 });
    
    // 전략 바 내부의 상세 배지 확인
    const yieldBadge = page.locator('span:has-text("Yield")').first();
    const growthBadge = page.locator('span:has-text("Growth")').first();
    const trBadge = page.locator('span:has-text("TR")').first();
    
    await expect(yieldBadge).toBeVisible();
    await expect(growthBadge).toBeVisible();
    await expect(trBadge).toBeVisible();
  });
});
