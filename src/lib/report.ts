import type { ReportRow } from "./data";

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface DistrictReportRow {
  district_id: number;
  district_code: string;
  district_name: string;
  shops_count: number;
  total_received_kg: number;
  total_distributed_kg: number;
  prev_distributed_kg: number;
  mom_diff_kg: number;
  mom_pct: number;
  closing_stock_kg: number;
}

export function districtReport(rows: ReportRow[]): DistrictReportRow[] {
  const map = new Map<number, DistrictReportRow>();
  for (const r of rows) {
    const d = map.get(r.district_id) ?? {
      district_id: r.district_id, district_code: r.district_code, district_name: r.district_name, shops_count: 0,
      total_received_kg: 0, total_distributed_kg: 0, prev_distributed_kg: 0, mom_diff_kg: 0, mom_pct: 0, closing_stock_kg: 0,
    };
    d.shops_count += 1;
    d.total_received_kg = r2(d.total_received_kg + r.received_kg);
    d.total_distributed_kg = r2(d.total_distributed_kg + r.distributed_kg);
    d.prev_distributed_kg = r2(d.prev_distributed_kg + r.prev_distributed_kg);
    d.closing_stock_kg = r2(d.closing_stock_kg + r.closing_stock_kg);
    map.set(r.district_id, d);
  }
  return [...map.values()]
    .map((d) => {
      const diff = r2(d.total_distributed_kg - d.prev_distributed_kg);
      return { ...d, mom_diff_kg: diff, mom_pct: d.prev_distributed_kg > 0 ? r2((diff / d.prev_distributed_kg) * 100) : 0 };
    })
    .sort((a, b) => a.district_id - b.district_id);
}

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (xs: unknown[]) => xs.map(cell).join(",");

/** Same two-section CSV layout as the original monthly report export. */
export function reportCsv(month: string, rows: ReportRow[], generatedAt = new Date()) {
  const out: string[] = [];
  out.push(line(["# DEMO DATASET — NOT OFFICIAL GOVERNMENT DATA"]));
  out.push(line(["# Tamil Nadu Public Distribution System - Monthly Rice Stock & Distribution Report"]));
  out.push(line([`# Report Month: ${month}`, `Generated: ${generatedAt.toISOString().slice(0, 19).replace("T", " ")} UTC`]));
  out.push("");
  out.push(line(["=== DISTRICT SUMMARY COMPARISON ==="]));
  out.push(line(["District Code", "District Name", "Shops Count", "Received (kg)", "Distributed (kg)", "Previous Month Distributed (kg)", "MoM Change (kg)", "MoM Change (%)", "Closing Stock (kg)"]));
  for (const d of districtReport(rows)) {
    out.push(line([d.district_code, d.district_name, d.shops_count, d.total_received_kg, d.total_distributed_kg, d.prev_distributed_kg, d.mom_diff_kg, d.mom_pct, d.closing_stock_kg]));
  }
  out.push("");
  out.push(line(["=== FAIR-PRICE SHOP DETAILED REPORT ==="]));
  out.push(line(["Shop ID", "Shop Name", "District", "Linked Godown", "Beneficiaries", "Opening Stock (kg)", "Received (kg)", "Distributed (kg)", "Prev Month Distributed (kg)", "MoM Change (kg)", "MoM Change (%)", "Closing Stock (kg)", "Stock Status"]));
  for (const s of rows) {
    out.push(line([s.shop_id, s.shop_name, s.district_name, s.godown_id, s.beneficiaries_count, s.opening_stock_kg, s.received_kg, s.distributed_kg, s.prev_distributed_kg, s.mom_diff_kg, s.mom_pct, s.closing_stock_kg, s.status]));
  }
  return out.join("\r\n") + "\r\n";
}
