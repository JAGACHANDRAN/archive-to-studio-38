import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { num } from "./format";

// ---------- Row types (numbers normalised) ----------
export interface District { id: number; code: string; name: string; headquarters: string; lat: number; lng: number; zone: string | null }
export interface GodownStock {
  id: string; code: string; name: string; district_id: number; capacity_kg: number; opening_stock_kg: number;
  lat: number | null; lng: number | null; receipts_kg: number; dispatches_kg: number; adjustments_kg: number;
  expected_stock_kg: number; utilization_pct: number;
}
export type StockStatus = "NORMAL" | "LOW" | "CRITICAL";
export interface ShopStock {
  id: string; code: string; name: string; district_id: number; godown_id: string; beneficiaries_count: number; card_count: number;
  opening_stock_kg: number; lat: number | null; lng: number | null; confirmed_deliveries_kg: number; distributions_kg: number;
  adjustments_kg: number; expected_stock_kg: number; avg_monthly_dist_kg: number; low_stock_threshold_kg: number;
  critical_threshold_kg: number; status: StockStatus;
}
export interface Delivery {
  id: string; dispatch_movement_id: string; from_godown_id: string; to_shop_id: string; dispatched_date: string;
  expected_delivery_date: string; status: "PENDING" | "DELIVERED" | "DELAYED" | "RECEIVED_WITH_DIFFERENCE";
  dispatched_qty_kg: number; received_qty_kg: number; received_date: string | null; notes: string | null;
}
export interface MonthlyDist { id: number; shop_id: string; month_year: string; distributed_qty_kg: number; beneficiary_households_served: number }
export interface Reconciliation {
  measurement_id: string; location_type: "godown" | "shop"; location_id: string; location_label: string; district_id: number | null;
  measured_date: string; measured_stock_kg: number; expected_stock_kg: number; difference_kg: number; difference_pct: number;
  discrepancy_detected: boolean; status_label: string; inspector_name: string; remarks: string | null;
}
export interface Alert {
  id: string; location_type: string; location_id: string; alert_type: string; severity: string; timestamp: string;
  explanation: string; assigned_role: string; status: "OPEN" | "UNDER_VERIFICATION" | "RESOLVED"; verification_notes: string | null; resolution_date: string | null;
}
export interface AuditLog { id: number; username: string; action: string; entity_type: string; entity_id: string; details: string; timestamp: string }
export interface Movement { id: string; location_type: string; location_id: string; movement_type: string; quantity_kg: number; timestamp: string; reference_id: string | null; created_by: string }
export interface Prediction {
  id: number; shop_id: string; run_date: string; method: string; lookback_months: number; predicted_demand_kg: number; safety_buffer_kg: number;
  usable_stock_kg: number; planned_incoming_kg: number; recommended_replenishment_kg: number; created_by: string | null;
}
export interface PosTransaction { id: string; shop_id: string; item_id: number; qty_kg: number; bags: number; card_no: string; source: string; timestamp: string }
export interface ReportRow {
  shop_id: string; shop_name: string; district_id: number; district_name: string; district_code: string; godown_id: string;
  beneficiaries_count: number; opening_stock_kg: number; received_kg: number; distributed_kg: number; prev_distributed_kg: number;
  mom_diff_kg: number; mom_pct: number; closing_stock_kg: number; status: StockStatus;
}

const NUMERIC_KEYS = new Set([
  "capacity_kg", "opening_stock_kg", "receipts_kg", "dispatches_kg", "adjustments_kg", "expected_stock_kg", "utilization_pct",
  "confirmed_deliveries_kg", "distributions_kg", "avg_monthly_dist_kg", "low_stock_threshold_kg", "critical_threshold_kg",
  "dispatched_qty_kg", "received_qty_kg", "distributed_qty_kg", "measured_stock_kg", "difference_kg", "difference_pct",
  "quantity_kg", "predicted_demand_kg", "safety_buffer_kg", "usable_stock_kg", "planned_incoming_kg", "recommended_replenishment_kg",
  "qty_kg", "received_kg", "distributed_kg", "prev_distributed_kg", "mom_diff_kg", "mom_pct", "closing_stock_kg", "lat", "lng",
]);

function normalise<T>(rows: unknown[] | null): T[] {
  return (rows ?? []).map((row) => {
    const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
    for (const k of Object.keys(out)) if (NUMERIC_KEYS.has(k) && out[k] != null) out[k] = num(out[k]);
    return out as T;
  });
}

async function all<T>(table: string, select = "*", order?: { column: string; ascending?: boolean }): Promise<T[]> {
  const pageSize = 1000;
  const rows: unknown[] = [];
  for (let from = 0; ; from += pageSize) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from(table as any) as any).select(select).range(from, from + pageSize - 1);
    if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return normalise<T>(rows);
}

// ---------- Query options ----------
export const qk = {
  districts: ["districts"] as const,
  godownStock: ["godown-stock"] as const,
  shopStock: ["shop-stock"] as const,
  deliveries: ["deliveries"] as const,
  monthly: ["monthly"] as const,
  reconciliation: ["reconciliation"] as const,
  alerts: ["alerts"] as const,
  audit: ["audit"] as const,
  receipts: ["receipts"] as const,
  movements: (type: string, id: string) => ["movements", type, id] as const,
  predictions: (shopId?: string) => ["predictions", shopId ?? "all"] as const,
  report: (month: string) => ["report", month] as const,
  transactions: ["pos-transactions"] as const,
  sources: ["data-sources"] as const,
};

// Everything that a write can change — invalidate after any mutation.
export const LEDGER_KEYS = [qk.godownStock, qk.shopStock, qk.deliveries, qk.monthly, qk.reconciliation, qk.alerts, qk.audit, qk.receipts, ["movements"], ["predictions"], ["report"], qk.transactions, qk.sources];

export const districtsQuery = () => queryOptions({ queryKey: qk.districts, queryFn: () => all<District>("districts", "*", { column: "id" }), staleTime: 5 * 60_000 });
export const godownStockQuery = () => queryOptions({ queryKey: qk.godownStock, queryFn: () => all<GodownStock>("v_godown_stock", "*", { column: "id" }) });
export const shopStockQuery = () => queryOptions({ queryKey: qk.shopStock, queryFn: () => all<ShopStock>("v_shop_stock", "*", { column: "id" }) });
export const deliveriesQuery = () => queryOptions({ queryKey: qk.deliveries, queryFn: () => all<Delivery>("deliveries", "*", { column: "dispatched_date", ascending: false }) });
export const monthlyQuery = () => queryOptions({ queryKey: qk.monthly, queryFn: () => all<MonthlyDist>("monthly_distribution", "id,shop_id,month_year,distributed_qty_kg,beneficiary_households_served", { column: "month_year" }) });
export const reconciliationQuery = () => queryOptions({ queryKey: qk.reconciliation, queryFn: () => all<Reconciliation>("v_measurement_reconciliation", "*", { column: "measured_date", ascending: false }) });
export const alertsQuery = () => queryOptions({ queryKey: qk.alerts, queryFn: () => all<Alert>("alerts", "*", { column: "timestamp", ascending: false }) });
export const receiptsQuery = () =>
  queryOptions({
    queryKey: qk.receipts,
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_movements").select("*").eq("location_type", "godown").eq("movement_type", "RECEIPT").order("timestamp", { ascending: false });
      if (error) throw new Error(error.message);
      return normalise<Movement>(data);
    },
  });
export const auditQuery = (limit = 20) =>
  queryOptions({
    queryKey: [...qk.audit, limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as AuditLog[];
    },
  });
export const movementsQuery = (type: "godown" | "shop", id: string) =>
  queryOptions({
    queryKey: qk.movements(type, id),
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_movements").select("*").eq("location_type", type).eq("location_id", id).order("timestamp", { ascending: false }).limit(200);
      if (error) throw new Error(error.message);
      return normalise<Movement>(data);
    },
  });
export const predictionsQuery = (shopId?: string) =>
  queryOptions({
    queryKey: qk.predictions(shopId),
    queryFn: async () => {
      let q = supabase.from("predictions").select("*").order("created_at", { ascending: false }).limit(50);
      if (shopId) q = q.eq("shop_id", shopId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return normalise<Prediction>(data);
    },
  });
export const reportQuery = (month: string) =>
  queryOptions({
    queryKey: qk.report(month),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("monthly_report_rows", { _month: month });
      if (error) throw new Error(error.message);
      return normalise<ReportRow>(data as unknown[]);
    },
  });
export const transactionsQuery = () =>
  queryOptions({
    queryKey: qk.transactions,
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").order("timestamp", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return normalise<PosTransaction>(data);
    },
  });
export const sourcesQuery = () =>
  queryOptions({
    queryKey: qk.sources,
    queryFn: async () => {
      const { data, error } = await supabase.from("data_source_settings").select("*").order("id");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
