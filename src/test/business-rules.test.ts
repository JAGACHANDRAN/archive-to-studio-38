import { describe, expect, it } from "vitest";
import { backtest, calculateReplenishment } from "@/lib/forecast";
import { districtReport, reportCsv } from "@/lib/report";
import { locationAccessError, type Actor } from "@/lib/rbac";
import type { ReportRow } from "@/lib/data";

describe("replenishment forecast", () => {
  it("is the 4-month average plus 10% buffer minus usable stock and incoming", () => {
    const f = calculateReplenishment([1000, 1200, 1100, 900], 300, 200);
    expect(f.predictedDemandKg).toBe(1050);
    expect(f.safetyBufferKg).toBe(105);
    expect(f.recommendedReplenishmentKg).toBe(655);
  });

  it("never recommends a negative quantity", () => {
    expect(calculateReplenishment([100, 100], 5000).recommendedReplenishmentKg).toBe(0);
  });

  it("back-tests against the target month using only prior months", () => {
    const rows = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"].map((m, i) => ({ shop_id: "FPS-1", month_year: m, distributed_qty_kg: i === 4 ? 150 : 100 }));
    const bt = backtest(rows, "2026-05", 4);
    expect(bt.mae).toBe(50);
    expect(bt.mape).toBe(33.33);
  });
});

describe("location scoping", () => {
  const lookup = { shops: [{ id: "FPS-0001", district_id: 1, godown_id: "GDN-001" }, { id: "FPS-0020", district_id: 2, godown_id: "GDN-003" }], godowns: [{ id: "GDN-001", district_id: 1 }, { id: "GDN-003", district_id: 2 }] };
  const shopMgr: Actor = { username: "mgr_fps0001", fullName: "", role: "shop_manager", districtId: 1, godownId: "GDN-001", shopId: "FPS-0001" };
  const godownMgr: Actor = { username: "mgr_gdn001", fullName: "", role: "godown_manager", districtId: 1, godownId: "GDN-001", shopId: null };
  const officer: Actor = { username: "officer_chennai", fullName: "", role: "district_officer", districtId: 1, godownId: null, shopId: null };

  it("limits a shop manager to their own shop", () => {
    expect(locationAccessError(shopMgr, "shop", "FPS-0001", lookup)).toBeNull();
    expect(locationAccessError(shopMgr, "shop", "FPS-0020", lookup)).toMatch(/Access Denied/);
  });
  it("limits a godown manager to shops linked to their godown", () => {
    expect(locationAccessError(godownMgr, "shop", "FPS-0001", lookup)).toBeNull();
    expect(locationAccessError(godownMgr, "shop", "FPS-0020", lookup)).toMatch(/not linked/);
  });
  it("limits a district officer to their district", () => {
    expect(locationAccessError(officer, "godown", "GDN-001", lookup)).toBeNull();
    expect(locationAccessError(officer, "godown", "GDN-003", lookup)).toMatch(/does not belong/);
  });
});

describe("monthly report", () => {
  const row = (shop: string, district: number, dist: number, prev: number): ReportRow => ({
    shop_id: shop, shop_name: shop, district_id: district, district_name: `D${district}`, district_code: `C${district}`, godown_id: "G",
    beneficiaries_count: 10, opening_stock_kg: 0, received_kg: 50, distributed_kg: dist, prev_distributed_kg: prev, mom_diff_kg: dist - prev,
    mom_pct: 0, closing_stock_kg: 20, status: "NORMAL",
  });
  it("aggregates month-over-month change per district", () => {
    const [d] = districtReport([row("A", 1, 120, 100), row("B", 1, 80, 100)]);
    expect(d?.total_distributed_kg).toBe(200);
    expect(d?.mom_diff_kg).toBe(0);
    expect(d?.shops_count).toBe(2);
  });
  it("exports both CSV sections under the demo-data notice", () => {
    const csv = reportCsv("2026-10", [row("A", 1, 120, 100)], new Date("2026-11-01T00:00:00Z"));
    expect(csv.split("\r\n")[0]).toBe("# DEMO DATASET — NOT OFFICIAL GOVERNMENT DATA");
    expect(csv).toContain("=== DISTRICT SUMMARY COMPARISON ===");
    expect(csv).toContain("=== FAIR-PRICE SHOP DETAILED REPORT ===");
  });
});
