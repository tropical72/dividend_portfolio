import { test, expect } from '@playwright/test';

/**
 * 기초 UI 동작 테스트
 * 앱 기동 및 기본적인 탭 전환 기능을 검증합니다.
 */
test.describe('Initial UI Flow', () => {
  
  test('앱 기동 및 타이틀 확인', async ({ page }) => {
    // 1. 메인 페이지 접속 및 네트워크 안정화 대기
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // 2. 제목이 올바르게 렌더링되는지 확인 (명시적 상태 대기) [GS-TEST-03.2]
    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText('Dividend Portfolio');
  });

  test('탭 전환 동작 확인', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // 1. Portfolio 탭 버튼 대기 및 클릭
    const portfolioBtn = page.getByRole('button', { name: 'Portfolio' });
    await expect(portfolioBtn).toBeVisible();
    await portfolioBtn.click();
    
    // 2. 메인 영역 제목이 변경되었는지 확인
    const mainTitle = page.locator('main h2');
    await expect(mainTitle).toContainText('Portfolio');

    // 3. 다시 Watchlist 탭으로 복귀
    await page.getByRole('button', { name: 'Watchlist' }).click();
    await expect(mainTitle).toContainText('Watchlist');
  });
});
