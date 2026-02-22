import { test, expect } from "@playwright/test";

test.describe("Final Regression Check", () => {
  test("should reflect inflation impact on survival years using ID-based selection", async ({ page }) => {
    await page.goto("http://localhost:5173");
    
    // 1. 초기 렌더링 및 명칭 확인
    await expect(page.getByText("Standard Profile")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Step 2. The Verdict & Proof")).toBeVisible();
    
    // 2. 현재 생존 연수 기록 (초기값 30년 예상)
    const initialYearsText = await page.getByTestId("survival-years").innerText();
    console.log(`Initial Survival Years: ${initialYearsText}`);
    
    // 3. 인플레이션 50% 주입 (v1 프로필 대상)
    const inflationInput = page.getByTestId("inflation-v1");
    await inflationInput.clear();
    await inflationInput.fill("50.0");
    await inflationInput.press("Enter");
    
    // 4. 재시뮬레이션 대기 및 결과 검증
    // 인플레이션 50%면 자산이 급격히 고갈되어 생존 연수가 짧아져야 함 (6년 예상)
    await expect(page.getByTestId("survival-years")).not.toHaveText(initialYearsText, { timeout: 20000 });
    const finalYearsText = await page.getByTestId("survival-years").innerText();
    console.log(`Final Survival Years after 50% Inflation: ${finalYearsText}`);
    
    const finalYearsNum = parseInt(finalYearsText);
    expect(finalYearsNum).toBeLessThan(30);
  });
});
