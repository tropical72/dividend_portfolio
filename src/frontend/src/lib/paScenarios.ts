import type {
  AppreciationRateScenarios,
  AppreciationRateSet,
  AppSettings,
  PaScenarioKey,
} from "../types";

export const DEFAULT_PA_SCENARIO: PaScenarioKey = "base";

export const DEFAULT_APPRECIATION_RATE_SCENARIOS: AppreciationRateScenarios = {
  conservative: {
    cash_sgov: 0.0,
    bond_buffer: -0.8,
    high_income: 0.5,
    dividend_stocks: 5.5,
    growth_stocks: 6.5,
  },
  base: {
    cash_sgov: 0.0,
    bond_buffer: -0.2,
    high_income: 1.5,
    dividend_stocks: 6.5,
    growth_stocks: 7.5,
  },
  optimistic: {
    cash_sgov: 0.0,
    bond_buffer: 0.6,
    high_income: 2.5,
    dividend_stocks: 8.0,
    growth_stocks: 9.0,
  },
};

type LegacyRateSet = Partial<AppreciationRateSet> & {
  fixed_income?: number;
};

export function normalizePaScenarioKey(
  candidate?: string | null,
): PaScenarioKey {
  if (
    candidate === "conservative" ||
    candidate === "base" ||
    candidate === "optimistic"
  ) {
    return candidate;
  }
  return DEFAULT_PA_SCENARIO;
}

function normalizeRateSet(
  rateSet: LegacyRateSet | undefined | null,
  defaults: AppreciationRateSet,
): AppreciationRateSet {
  const legacyFixedIncome =
    typeof rateSet?.fixed_income === "number"
      ? rateSet.fixed_income
      : undefined;
  return {
    ...defaults,
    ...(legacyFixedIncome === undefined
      ? {}
      : {
          bond_buffer: legacyFixedIncome,
          high_income: legacyFixedIncome,
        }),
    ...(rateSet?.cash_sgov === undefined
      ? {}
      : { cash_sgov: rateSet.cash_sgov }),
    ...(rateSet?.bond_buffer === undefined
      ? {}
      : { bond_buffer: rateSet.bond_buffer }),
    ...(rateSet?.high_income === undefined
      ? {}
      : { high_income: rateSet.high_income }),
    ...(rateSet?.dividend_stocks === undefined
      ? {}
      : { dividend_stocks: rateSet.dividend_stocks }),
    ...(rateSet?.growth_stocks === undefined
      ? {}
      : { growth_stocks: rateSet.growth_stocks }),
  };
}

export function normalizeAppreciationScenarios(
  rates?: AppSettings["appreciation_rates"] | LegacyRateSet | null,
): AppreciationRateScenarios {
  if (
    rates &&
    typeof rates === "object" &&
    ("conservative" in rates || "base" in rates || "optimistic" in rates)
  ) {
    const scenarioRates = rates as AppSettings["appreciation_rates"];
    return {
      conservative: normalizeRateSet(
        scenarioRates?.conservative,
        DEFAULT_APPRECIATION_RATE_SCENARIOS.conservative,
      ),
      base: normalizeRateSet(
        scenarioRates?.base,
        DEFAULT_APPRECIATION_RATE_SCENARIOS.base,
      ),
      optimistic: normalizeRateSet(
        scenarioRates?.optimistic,
        DEFAULT_APPRECIATION_RATE_SCENARIOS.optimistic,
      ),
    };
  }

  return {
    ...DEFAULT_APPRECIATION_RATE_SCENARIOS,
    base: normalizeRateSet(
      (rates as LegacyRateSet | undefined) || undefined,
      DEFAULT_APPRECIATION_RATE_SCENARIOS.base,
    ),
  };
}

export function getScenarioRates(
  settings: Pick<AppSettings, "appreciation_rates"> | null | undefined,
  scenario: PaScenarioKey,
): AppreciationRateSet {
  return normalizeAppreciationScenarios(settings?.appreciation_rates)[scenario];
}
