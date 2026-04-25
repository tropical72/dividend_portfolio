import { test, expect } from "@playwright/test";

test.describe("Master Portfolio Full Lifecycle E2E [REQ-PRT-08, 09]", () => {
  test.describe.configure({ mode: "serial" });

  test("should create, activate and verify master strategy in retirement tab", async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "Master strategy lifecycle is verified on desktop layout.",
    );

    // 1. Portfolio 탭으로 이동
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    const portfolioNavBtn = page.getByTestId("nav-asset-setup");
    await portfolioNavBtn.waitFor({ state: "visible", timeout: 30000 });
    await portfolioNavBtn.click({ force: true });

    // 2. Manage & Compare 서브 탭 클릭 및 대기
    const manageTabBtn = page.getByTestId("portfolio-subtab-dashboard");
    await manageTabBtn.waitFor({ state: "visible", timeout: 15000 });
    await manageTabBtn.click({ force: true });

    // 로딩 텍스트가 사라질 때까지 대기
    await expect(page.getByText(/Synchronizing Data\.\.\./i)).not.toBeVisible({
      timeout: 15000,
    });

    // 마스터 전략 입력 필드가 나타날 때까지 대기
    const nameInput = page.getByTestId("master-strategy-name-input");
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    // 3. 마스터 전략 생성
    const strategyName = `E2E Strategy ${Math.floor(Math.random() * 1000)}`;
    await nameInput.fill(strategyName);

    // 포트폴리오 선택 (옵션이 있으면 선택)
    const corpSelect = page.locator("select").first();
    if ((await corpSelect.count()) > 0) {
      const optionsCount = await corpSelect.locator("option").count();
      if (optionsCount > 1) await corpSelect.selectOption({ index: 1 });
    }

    const saveStrategyBtn = page.getByTestId("save-master-strategy-btn");
    await saveStrategyBtn.scrollIntoViewIfNeeded();
    if (isMobile) {
      await saveStrategyBtn.dispatchEvent("click");
    } else {
      await saveStrategyBtn.click({ force: true });
    }

    // 4. 리스트에 생성되었는지 확인 및 활성화
    const strategyCard = page
      .locator(`h4:text-is("${strategyName}")`)
      .first()
      .locator("xpath=ancestor::div[contains(@class,'group')][1]");
    await expect(strategyCard).toBeVisible();

    // 활성화 버튼 클릭 (CheckSquare 아이콘 버튼)
    const activateBtn = strategyCard
      .locator("[data-testid^='activate-master-']")
      .first();
    if (await activateBtn.isVisible()) {
      await activateBtn.scrollIntoViewIfNeeded();
      if (isMobile) {
        await activateBtn.dispatchEvent("click");
      } else {
        await activateBtn.click({ force: true });
      }
    }

    // 5. Retirement 탭으로 이동하여 배지 검증
    const retirementNavBtn = page.getByTestId("nav-retirement");
    await retirementNavBtn.waitFor({ state: "visible", timeout: 15000 });
    await retirementNavBtn.click({ force: true });

    // 시뮬레이션 로딩 대기
    await page.getByTestId("retirement-tab-content").waitFor({
      state: "visible",
      timeout: 20000,
    });

    // 상단 배지에 마스터 전략명이 포함되어 있는지 확인
    const strategyBadge = page.locator("body").getByText(strategyName).first();
    await expect(strategyBadge).toBeVisible();
    await expect(strategyBadge).toContainText(strategyName);

    console.log(`Successfully verified Master Strategy: ${strategyName}`);
  });
});
