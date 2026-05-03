import { expect, test } from "@playwright/test";

import {
  captureBackendState,
  restoreBackendState,
  type BackendTestState,
} from "./helpers/backendState";
import { acquireE2ELock, releaseE2ELock } from "./helpers/e2eLock";

function extractYears(text: string): number {
  const match = text.match(/\d+/);
  if (!match) {
    throw new Error(`Unable to parse survival years from: ${text}`);
  }
  return Number(match[0]);
}

test.describe("National Pension Graph Regression", () => {
  let originalState: BackendTestState;

  test.beforeEach(async ({ request }) => {
    test.setTimeout(60000);
    await acquireE2ELock();
    originalState = await captureBackendState(request);

    const seededState = JSON.parse(JSON.stringify(originalState)) as Record<
      string,
      unknown
    >;

    seededState.settings = {
      ...(seededState.settings || {}),
      ui_language: "ko",
      appreciation_rates: {
        cash_sgov: 0,
        bond_buffer: 0,
        high_income: 0,
        dividend_stocks: 0,
        growth_stocks: 0,
      },
    };

    seededState.portfolios = [
      {
        id: "test-corp-zero",
        name: "Test Corp Zero",
        account_type: "Corporate",
        total_capital: 0,
        currency: "KRW",
        items: [
          {
            symbol: "T-CASH",
            name: "Test Corp Cash",
            category: "SGOV Buffer",
            weight: 100,
            dividend_yield: 0,
            price: 1,
            last_div_amount: 0,
            payment_months: [],
          },
        ],
      },
      {
        id: "test-pen-zero",
        name: "Test Pension Zero",
        account_type: "Pension",
        total_capital: 13000,
        currency: "KRW",
        items: [
          {
            symbol: "T-PEN-CASH",
            name: "Test Pension Cash",
            category: "SGOV Buffer",
            weight: 100,
            dividend_yield: 0,
            price: 1,
            last_div_amount: 0,
            payment_months: [],
          },
        ],
      },
    ];

    seededState.master_portfolios = [
      {
        id: "test-master-zero",
        name: "Test Master Zero",
        corp_id: "test-corp-zero",
        pension_id: "test-pen-zero",
        is_active: true,
      },
    ];

    seededState.retirement_config = {
      ...(seededState.retirement_config || {}),
      active_assumption_id: "v1",
      assumptions: {
        v1: {
          name: "Standard Profile",
          expected_return: 0,
          expected_growth: 0,
          inflation_rate: 0,
          master_return: 0,
          master_inflation: 0,
        },
        conservative: {
          name: "Conservative Profile",
          expected_return: 0,
          expected_growth: 0,
          inflation_rate: 0,
          master_return: 0,
          master_inflation: 0,
        },
      },
      user_profile: {
        birth_year: 1961,
        birth_month: 1,
        private_pension_start_age: 0,
        national_pension_start_age: 70,
      },
      simulation_params: {
        target_monthly_cashflow: 1000,
        inflation_rate: 0,
        expected_market_growth: 0,
        simulation_start_year: 2026,
        simulation_start_month: 1,
        national_pension_amount: 0,
        simulation_years: 2,
      },
      corp_params: {
        initial_investment: 0,
        capital_stock: 0,
        initial_shareholder_loan: 0,
        monthly_salary: 0,
        monthly_fixed_cost: 0,
        employee_count: 0,
      },
      pension_params: {
        initial_investment: 13000,
        severance_reserve: 0,
        other_reserve: 0,
        monthly_withdrawal_target: 1000,
      },
      tax_and_insurance: {
        point_unit_price: 208.4,
        ltc_rate: 0.1295,
        corp_tax_threshold: 200000000,
        corp_tax_low_rate: 0.1,
        corp_tax_high_rate: 0.2,
        pension_rate: 0.045,
        health_rate: 0.03545,
        employment_rate: 0.009,
        income_tax_estimate_rate: 0.15,
      },
    };

    await restoreBackendState(request, seededState);
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

  test("should update retirement result after national pension settings change", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-retirement").click();

    await expect(page.getByTestId("retirement-tab-content")).toBeVisible();
    await expect(page.getByTestId("retirement-projection-chart")).toBeVisible();

    const baselineYears = extractYears(
      await page.getByTestId("survival-years").innerText(),
    );
    expect(baselineYears).toBe(1);

    await page.getByTestId("nav-strategy-settings").click();
    await expect(page.getByTestId("settings-title")).toBeVisible();

    const nationalPensionAgeInput = page
      .getByTestId("input-group-national-pension-start-age")
      .locator("input");
    await nationalPensionAgeInput.fill("65");

    const nationalPensionAmountInput = page
      .getByTestId("input-group-national-pension-amount")
      .locator("input");
    await nationalPensionAmountInput.fill("1000");

    await page.getByTestId("apply-settings-button").click();
    await expect(
      page.getByText(
        /모든 전략 설정이 저장되었습니다.|All strategy settings were saved./,
      ),
    ).toBeVisible();

    await page.getByTestId("nav-retirement").click();
    await expect(page.getByTestId("retirement-tab-content")).toBeVisible();
    await expect(page.getByTestId("retirement-projection-chart")).toBeVisible();

    const updatedYears = extractYears(
      await page.getByTestId("survival-years").innerText(),
    );
    expect(updatedYears).toBe(2);
  });
});
