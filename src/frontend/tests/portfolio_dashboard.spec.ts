import { test, expect } from "@playwright/test";

import {
  captureBackendState,
  restoreBackendState,
  type BackendTestState,
} from "./helpers/backendState";
import { acquireE2ELock, releaseE2ELock } from "./helpers/e2eLock";

test.describe("Portfolio Dashboard - List & Detail", () => {
  let uniqueName: string;
  let originalState: BackendTestState;

  test.beforeEach(async ({ page, request }) => {
    test.setTimeout(60000);
    await acquireE2ELock();
    uniqueName = `Test Portfolio ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    originalState = await captureBackendState(request);

    // 브라우저 로그 캡처
    page.on("console", (msg) => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on("pageerror", (err) => console.log(`BROWSER ERROR: ${err.message}`));

    // 테스트용 샘플 데이터 생성 (API 직접 호출)
    await page.request.post("http://127.0.0.1:8000/api/portfolios", {
      data: {
        name: uniqueName,
        account_type: "Corporate",
        total_capital: 50000,
        currency: "USD",
        items: [
          {
            symbol: "AAPL",
            name: "Apple",
            category: "Growth Engine",
            weight: 60,
            price: 150,
            dividend_yield: 0.5,
            last_div_amount: 0.2,
            payment_months: [2, 5, 8, 11],
          },
          {
            symbol: "O",
            name: "Realty Income",
            category: "SGOV Buffer",
            weight: 40,
            price: 60,
            dividend_yield: 5.5,
            last_div_amount: 0.25,
            payment_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          },
        ],
      },
    });

    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Portfolio 탭으로 이동
    const portfolioNavBtn = page.getByTestId("nav-portfolio-manager");
    await portfolioNavBtn.waitFor({ state: "visible", timeout: 30000 });
    await portfolioNavBtn.click({ force: true });

    // Manage & Compare 서브 탭 클릭
    const manageTabBtn = page.getByRole("button", {
      name: /Manage & Compare/i,
    });
    await manageTabBtn.waitFor({ state: "visible", timeout: 10000 });
    await manageTabBtn.click({ force: true });
  });

  test.afterEach(async ({ request }) => {
    try {
      if (originalState) {
        await restoreBackendState(request, originalState);
      }
    } finally {
      await releaseE2ELock();
    }
  });

  test("should display a list of saved portfolios", async ({ page }) => {
    // 대시보드 섹션이 존재하는지 확인
    await expect(page.getByText(/Saved Portfolios/i)).toBeVisible();

    const portfolioCards = page
      .locator(".portfolio-card")
      .filter({ hasText: uniqueName })
      .first();
    await expect(portfolioCards).toBeVisible();

    // 계좌 유형 배지 확인
    await expect(portfolioCards.getByText(/Corporate/i)).toBeVisible();
  });

  test("should expand accordion to show details when clicked", async ({
    page,
  }) => {
    // 특정 이름을 가진 카드 찾기
    const testCard = page
      .locator(".portfolio-card")
      .filter({ hasText: uniqueName })
      .first();
    await testCard.click();

    // 세부 정보(자산 구성 등)가 나타나는지 확인
    await expect(testCard.locator(".portfolio-details")).toBeVisible();

    // 요구사항 4번: 종목별 연/월 수익 표시 확인
    await expect(testCard.getByText("Annual (USD)").first()).toBeVisible();
    await expect(testCard.getByText("Annual (KRW)").first()).toBeVisible();
    await expect(testCard.getByText("Monthly (USD)").first()).toBeVisible();
    await expect(testCard.getByText("Monthly (KRW)").first()).toBeVisible();
  });

  test("should load portfolio into designer when Load button is clicked", async ({
    page,
  }) => {
    // 1. 특정 이름을 가진 카드 찾기 및 확장
    const testCard = page
      .locator(".portfolio-card")
      .filter({ hasText: uniqueName })
      .first();
    await testCard.click();

    // 2. Load 버튼 클릭
    const loadBtn = testCard.getByRole("button", {
      name: /Load into Designer/i,
    });
    await loadBtn.click();

    // 3. Designer 탭으로 자동 전환되었는지 확인
    await expect(page.getByText(/Design Mode/i)).toBeVisible();

    // 4. 입력 폼에 포트폴리오 이름이 채워졌는지 확인
    const nameInput = page.getByPlaceholder(/포트폴리오 이름을 입력하세요/i);
    await expect(nameInput).toHaveValue(uniqueName);
  });

  test("should display comparison chart when multiple portfolios are selected", async ({
    page,
  }) => {
    // 1. 체크박스 선택
    const testCard = page
      .locator(".portfolio-card")
      .filter({ hasText: uniqueName })
      .first();
    const checkbox = testCard.locator("button[role='checkbox']");
    await checkbox.click();

    // 2. 상단에 차트 영역이 나타나는지 확인
    await expect(page.getByText(/Monthly Dividend Comparison/i)).toBeVisible();
  });

  test("should update all portfolio figures when global capital is changed", async ({
    page,
  }) => {
    // 1. 전역 투자금 입력란 확인
    const globalUsdInput = page.getByPlaceholder(/Global USD Capital/i);
    const globalKrwInput = page.getByPlaceholder(/Global KRW Capital/i);
    await expect(globalUsdInput).toBeVisible();
    await expect(globalKrwInput).toBeVisible();

    // 2. USD 투자금 변경 및 KRW 동기화 확인
    await globalUsdInput.fill("100000");
    await expect(page.getByText(/USD 100,000/i).first()).toBeVisible();

    // 3. KRW 투자금 변경 시 USD 입력값도 다시 계산되는지 확인
    await globalKrwInput.fill("142550000");
    const usdValue = await globalUsdInput.inputValue();
    expect(usdValue).not.toBe("100,000");
  });

  test("should match chart currency with simulator input", async ({ page }) => {
    // 1. 체크박스 선택하여 차트 활성화
    const testCard = page
      .locator(".portfolio-card")
      .filter({ hasText: uniqueName })
      .first();
    await testCard.locator("button[role='checkbox']").click();

    // 2. 기본 USD 차트 확인
    await expect(page.getByText(/Monthly Dividend Comparison/i)).toBeVisible();
    await expect(page.locator("body")).toContainText("$");

    // 3. KRW 입력 시 화면의 통화 표기가 원화 기준으로 바뀌는지 확인
    const globalKrwInput = page.getByPlaceholder(/Global KRW Capital/i);
    await globalKrwInput.fill("1000000");
    await expect(page.locator("body")).toContainText("₩");
  });
});
