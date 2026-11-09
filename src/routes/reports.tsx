import { reportSearch } from "@/lib/search";
import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { monthlyQuery, reportQuery } from "@/lib/data";
import { districtReport, reportCsv } from "@/lib/report";
import { availableMonths, latestMonth } from "@/lib/summary";
import { fmtInt, fmtNum2, monthLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DataTable, PageHeader, PageLoading, Panel, RouteError, StatusBadge, Td, Th } from "@/components/srt/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  validateSearch: (s: Record<string, unknown>) => reportSearch.parse(s),
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: async ({ context, deps }) => {
    const monthly = await context.queryClient.ensureQueryData(monthlyQuery());
    const month = deps.month ?? latestMonth(monthly);
    await context.queryClient.ensureQueryData(reportQuery(month));
  },
  head: () => ({
    meta: [
      { title: "Monthly Reports — Smart Ration Tracker" },
      { name: "description", content: "Monthly rice receipts, distribution and closing stock by district and shop, with CSV export." },
      { property: "og:title", content: "Monthly Reports — Smart Ration Tracker" },
      { property: "og:description", content: "Monthly PDS rice stock and distribution report with CSV export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: ReportsPage,
});

function ReportsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/reports" });
  const { data: monthly } = useSuspenseQuery(monthlyQuery());
  const months = availableMonths(monthly);
  const month = search.month && months.includes(search.month) ? search.month : latestMonth(monthly);
  const { data: rows } = useSuspenseQuery(reportQuery(month));
  const districts = useMemo(() => districtReport(rows), [rows]);
  const shopRows = rows.filter((r) => !search.district || r.district_id === search.district);

  const download = () => {
    const blob = new Blob([reportCsv(month, rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `monthly_pds_report_${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const sel = "h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold shadow-card outline-none focus:border-primary";
  const tot = districts.reduce((a, d) => ({ r: a.r + d.total_received_kg, d: a.d + d.total_distributed_kg, c: a.c + d.closing_stock_kg }), { r: 0, d: 0, c: 0 });

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Monthly Report"
        subtitle={`${monthLabel(month)} · ${rows.length} shops · Received ${fmtInt(tot.r)} kg · Distributed ${fmtInt(tot.d)} kg · Closing ${fmtInt(tot.c)} kg`}
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Reports" }]}
        actions={
          <>
            <select className={sel} value={month} onChange={(e) => navigate({ search: (p) => ({ ...p, month: e.target.value }) })} aria-label="Report month">
              {[...months].reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <Button size="sm" onClick={download}><Download className="size-3.5" />Export CSV</Button>
          </>
        }
      />
      <Panel title="District Summary Comparison">
        <DataTable head={<><Th>Code</Th><Th>District</Th><Th className="text-right">Shops</Th><Th className="text-right">Received</Th><Th className="text-right">Distributed</Th><Th className="text-right">Prev month</Th><Th className="text-right">MoM</Th><Th className="text-right">Closing stock</Th></>}>
          {districts.map((d) => (
            <tr key={d.district_id} className={cn("cursor-pointer hover:bg-muted/60", search.district === d.district_id && "bg-primary-soft")} onClick={() => navigate({ search: (p) => ({ ...p, district: p.district === d.district_id ? undefined : d.district_id }) })}>
              <Td className="font-mono text-[11px]">{d.district_code}</Td>
              <Td className="font-semibold">{d.district_name}</Td>
              <Td className="text-right">{d.shops_count}</Td>
              <Td className="text-right">{fmtInt(d.total_received_kg)}</Td>
              <Td className="text-right">{fmtInt(d.total_distributed_kg)}</Td>
              <Td className="text-right">{fmtInt(d.prev_distributed_kg)}</Td>
              <Td className={cn("text-right font-semibold", d.mom_diff_kg >= 0 ? "text-success" : "text-danger")}>{d.mom_diff_kg >= 0 ? "+" : ""}{fmtNum2(d.mom_pct)}%</Td>
              <Td className="text-right font-bold">{fmtInt(d.closing_stock_kg)}</Td>
            </tr>
          ))}
        </DataTable>
        <p className="mt-2 text-[10px] text-muted-foreground">Click a district to filter the shop table.</p>
      </Panel>
      <Panel title={`Fair Price Shop Detail${search.district ? ` · ${districts.find((d) => d.district_id === search.district)?.district_name ?? ""}` : ""}`} className="mt-4">
        <div className="max-h-[560px] overflow-y-auto">
          <DataTable head={<><Th>Shop</Th><Th>District</Th><Th>Godown</Th><Th className="text-right">Benef.</Th><Th className="text-right">Opening</Th><Th className="text-right">Received</Th><Th className="text-right">Distributed</Th><Th className="text-right">Prev</Th><Th className="text-right">MoM %</Th><Th className="text-right">Closing</Th><Th>Status</Th></>}>
            {shopRows.map((s) => (
              <tr key={s.shop_id}>
                <Td><span className="font-semibold">{s.shop_name}</span><div className="font-mono text-[10px] text-muted-foreground">{s.shop_id}</div></Td>
                <Td>{s.district_name}</Td>
                <Td className="font-mono text-[11px]">{s.godown_id}</Td>
                <Td className="text-right">{fmtInt(s.beneficiaries_count)}</Td>
                <Td className="text-right">{fmtInt(s.opening_stock_kg)}</Td>
                <Td className="text-right">{fmtInt(s.received_kg)}</Td>
                <Td className="text-right">{fmtInt(s.distributed_kg)}</Td>
                <Td className="text-right">{fmtInt(s.prev_distributed_kg)}</Td>
                <Td className={cn("text-right", s.mom_diff_kg >= 0 ? "text-success" : "text-danger")}>{fmtNum2(s.mom_pct)}</Td>
                <Td className="text-right font-bold">{fmtInt(s.closing_stock_kg)}</Td>
                <Td><StatusBadge status={s.status} /></Td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Panel>
    </div>
  );
}
