import type { Alert, Delivery, District, GodownStock, MonthlyDist, Movement, Reconciliation, ShopStock } from "./data";
import { monthBounds, prevMonth } from "./format";

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = <T,>(xs: T[], f: (x: T) => number) => r2(xs.reduce((a, x) => a + f(x), 0));

export function availableMonths(monthly: MonthlyDist[]) {
  return [...new Set(monthly.map((m) => m.month_year))].sort();
}
export function latestMonth(monthly: MonthlyDist[]) {
  const ms = availableMonths(monthly);
  return ms[ms.length - 1] ?? "2026-10";
}

export interface SummaryInput {
  districts: District[];
  godowns: GodownStock[];
  shops: ShopStock[];
  monthly: MonthlyDist[];
  deliveries: Delivery[];
  reconciliation: Reconciliation[];
  alerts: Alert[];
  receipts: Movement[];
}

export interface DistrictSummary {
  district: District;
  godownsCount: number;
  shopsCount: number;
  godownStockKg: number;
  shopStockKg: number;
  totalStockKg: number;
  distributedKg: number;
  receivedKg: number;
  normal: number;
  low: number;
  critical: number;
  openAlerts: number;
  pendingDeliveries: number;
  status: "NORMAL" | "LOW" | "CRITICAL";
}

export function districtSummaries(input: SummaryInput, month: string): DistrictSummary[] {
  const { start, end } = monthBounds(month);
  return input.districts.map((d) => {
    const gs = input.godowns.filter((g) => g.district_id === d.id);
    const ss = input.shops.filter((s) => s.district_id === d.id);
    const shopIds = new Set(ss.map((s) => s.id));
    const locIds = new Set([...shopIds, ...gs.map((g) => g.id)]);
    const gIds = new Set(gs.map((g) => g.id));
    const normal = ss.filter((s) => s.status === "NORMAL").length;
    const low = ss.filter((s) => s.status === "LOW").length;
    const critical = ss.filter((s) => s.status === "CRITICAL").length;
    const godownStockKg = sum(gs, (g) => g.expected_stock_kg);
    const shopStockKg = sum(ss, (s) => s.expected_stock_kg);
    return {
      district: d,
      godownsCount: gs.length,
      shopsCount: ss.length,
      godownStockKg,
      shopStockKg,
      totalStockKg: r2(godownStockKg + shopStockKg),
      distributedKg: sum(input.monthly.filter((m) => m.month_year === month && shopIds.has(m.shop_id)), (m) => m.distributed_qty_kg),
      receivedKg: sum(input.receipts.filter((r) => gIds.has(r.location_id) && r.timestamp >= start && r.timestamp < end), (r) => r.quantity_kg),
      normal,
      low,
      critical,
      openAlerts: input.alerts.filter((a) => a.status !== "RESOLVED" && locIds.has(a.location_id)).length,
      pendingDeliveries: input.deliveries.filter((x) => shopIds.has(x.to_shop_id) && (x.status === "PENDING" || x.status === "DELAYED")).length,
      status: critical > 0 ? "CRITICAL" : low > 0 ? "LOW" : "NORMAL",
    };
  });
}

export function stateSummary(input: SummaryInput, month: string) {
  const districts = districtSummaries(input, month);
  const prev = prevMonth(month);
  const { start, end } = monthBounds(month);
  const pb = monthBounds(prev);
  const godownStockKg = sum(districts, (d) => d.godownStockKg);
  const shopStockKg = sum(districts, (d) => d.shopStockKg);
  const distributedKg = sum(districts, (d) => d.distributedKg);
  const prevDistributedKg = sum(input.monthly.filter((m) => m.month_year === prev), (m) => m.distributed_qty_kg);
  const receivedKg = sum(input.receipts.filter((r) => r.timestamp >= start && r.timestamp < end), (r) => r.quantity_kg);
  const prevReceivedKg = sum(input.receipts.filter((r) => r.timestamp >= pb.start && r.timestamp < pb.end), (r) => r.quantity_kg);
  const normal = sum(districts, (d) => d.normal);
  const low = sum(districts, (d) => d.low);
  const critical = sum(districts, (d) => d.critical);
  const totalShops = normal + low + critical || 1;
  const discrepancies = input.reconciliation.filter((r) => r.discrepancy_detected).length;
  const months = availableMonths(input.monthly);
  return {
    month,
    districts,
    godownStockKg,
    shopStockKg,
    totalStockKg: r2(godownStockKg + shopStockKg),
    distributedKg,
    prevDistributedKg,
    distributedMoMPct: prevDistributedKg > 0 ? r2(((distributedKg - prevDistributedKg) / prevDistributedKg) * 100) : 0,
    receivedKg,
    receivedMoMPct: prevReceivedKg > 0 ? r2(((receivedKg - prevReceivedKg) / prevReceivedKg) * 100) : 0,
    godownsCount: input.godowns.length,
    shopsCount: input.shops.length,
    beneficiaries: input.shops.reduce((a, s) => a + s.beneficiaries_count, 0),
    householdsServed: input.monthly.filter((m) => m.month_year === month).reduce((a, m) => a + m.beneficiary_households_served, 0),
    delayed: input.deliveries.filter((d) => d.status === "DELAYED").length,
    pending: input.deliveries.filter((d) => d.status === "PENDING").length,
    discrepancies,
    attentionFlags: low + critical + discrepancies,
    openAlerts: input.alerts.filter((a) => a.status === "OPEN").length,
    status: {
      normal,
      low,
      critical,
      normalPct: Math.round((normal / totalShops) * 100),
      lowPct: Math.round((low / totalShops) * 100),
      criticalPct: Math.round((critical / totalShops) * 100),
    },
    trend: months.map((m) => ({ month: m, kg: sum(input.monthly.filter((x) => x.month_year === m), (x) => x.distributed_qty_kg) })),
  };
}

export function shopForecastInputs(shop: ShopStock, monthly: MonthlyDist[], deliveries: Delivery[], lookback = 4) {
  const history = monthly.filter((m) => m.shop_id === shop.id).sort((a, b) => a.month_year.localeCompare(b.month_year));
  const recent = history.slice(-lookback).map((m) => m.distributed_qty_kg);
  const pending = deliveries.filter((d) => d.to_shop_id === shop.id && (d.status === "PENDING" || d.status === "DELAYED"));
  return { history, recent, pending, plannedIncoming: sum(pending, (d) => d.dispatched_qty_kg) };
}
