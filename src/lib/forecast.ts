export const PLANNING_LABEL = "Planning recommendation, not an official allocation.";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** max(0, predicted demand + buffer - usable stock - planned incoming), predicted = mean of the last N months. */
export function calculateReplenishment(demands: number[], usableStock: number, plannedIncoming = 0, bufferPct = 10) {
  if (!demands.length) throw new Error("Historical distribution demands list cannot be empty");
  const predicted = r2(demands.reduce((a, b) => a + b, 0) / demands.length);
  const buffer = r2(predicted * (bufferPct / 100));
  const recommended = Math.max(0, r2(predicted + buffer - usableStock - plannedIncoming));
  return {
    lookbackMonthsUsed: demands.length,
    predictedDemandKg: predicted,
    safetyBufferKg: buffer,
    usableStockKg: r2(usableStock),
    plannedIncomingKg: r2(plannedIncoming),
    grossRequirementKg: r2(predicted + buffer),
    recommendedReplenishmentKg: recommended,
    label: PLANNING_LABEL,
  };
}

export interface MonthlyRow {
  shop_id: string;
  month_year: string;
  distributed_qty_kg: number;
}

/** Back-test: forecast target month from the N months before it; returns MAE and MAPE. */
export function backtest(rows: MonthlyRow[], targetMonth: string, lookback = 4) {
  const byShop = new Map<string, MonthlyRow[]>();
  for (const r of rows) {
    const list = byShop.get(r.shop_id) ?? [];
    list.push(r);
    byShop.set(r.shop_id, list);
  }
  const results: { shopId: string; predicted: number; actual: number; absError: number; pctError: number }[] = [];
  for (const [shopId, list] of [...byShop.entries()].sort()) {
    const actual = list.find((r) => r.month_year === targetMonth);
    if (!actual) continue;
    const prior = list
      .filter((r) => r.month_year < targetMonth)
      .sort((a, b) => b.month_year.localeCompare(a.month_year))
      .slice(0, lookback);
    if (prior.length < lookback) continue;
    const predicted = r2(prior.reduce((a, b) => a + Number(b.distributed_qty_kg), 0) / prior.length);
    const act = Number(actual.distributed_qty_kg);
    const absError = r2(Math.abs(predicted - act));
    results.push({ shopId, predicted, actual: act, absError, pctError: act > 0 ? r2((absError / act) * 100) : 0 });
  }
  const mae = results.length ? r2(results.reduce((a, b) => a + b.absError, 0) / results.length) : 0;
  const mape = results.length ? r2(results.reduce((a, b) => a + b.pctError, 0) / results.length) : 0;
  return { targetMonth, lookback, shopsEvaluated: results.length, mae, mape, results };
}
