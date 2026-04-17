import { test, expect } from "@playwright/test";

test.describe("Portfolio Tab UX and Visibility", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
    await page.getByTestId("nav-asset-setup").click();
  });

  test("should display sub-tabs with enhanced readability", async ({
    page,
  }) => {
    const designerBtn = page.getByTestId("portfolio-subtab-design");
    const manageBtn = page.getByTestId("portfolio-subtab-manage");

    await expect(designerBtn).toBeVisible();
    await expect(manageBtn).toBeVisible();

    // 폰트 크기 및 패딩 검증 (가독성 강화 확인)
    // tailwind 클래스 text-sm 이상 적용되었는지 확인 (class에 text-sm 혹은 그 이상이 포함되어야 함)
    // 또는 computed style 확인
    const designerClass = await designerBtn.getAttribute("class");
    expect(designerClass).toContain("text-sm");

    // 버튼 자체의 크기가 충분한지 확인 (가독성/클릭 영역)
    const box = await designerBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(40); // 충분한 터치/클릭 영역 확보
  });

  test("should display Corporate instead of Personal with enhanced contrast", async ({
    page,
  }) => {
    // 기존 Personal 텍스트가 없고 Corporate가 보여야 함
    await expect(page.locator('button:has-text("Personal")')).toHaveCount(0);

    const corpBtn = page.getByTestId("portfolio-account-corporate");
    const pensionBtn = page.getByTestId("portfolio-account-pension");

    await expect(corpBtn).toBeVisible();
    await expect(pensionBtn).toBeVisible();

    // 폰트 크기가 기존 10px에서 커졌는지 확인
    const corpClass = await corpBtn.getAttribute("class");
    expect(corpClass).toContain("text-sm");

    // 높이가 충분히 커졌는지 (가독성 및 클릭 영역 강화)
    const box = await corpBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(36);
  });
});
