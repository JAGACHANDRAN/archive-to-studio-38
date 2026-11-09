import { shopsSearch } from "@/lib/search";
import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ensureCore, useCore } from "@/lib/core";
import { fmtInt } from "@/lib/format";
import { DataTable, PageHeader, PageLoading, Panel, RouteError, StatusBadge, Td, Th } from "@/components/srt/primitives";

const STATUSES = ["ALL", "NORMAL", "LOW", "CRITICAL"] as const;

export const Route = createFileRoute("/shops/")({
  validateSearch: (s: Record<string, unknown>) => shopsSearch.parse(s),
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "Fair Price Shops — Smart Ration Tracker" },
      { name: "description", content: "Stock status, beneficiaries and monthly averages for every fair price shop in the demo dataset." },
      { property: "og:title", content: "Fair Price Shops — Smart Ration Tracker" },
      { property: "og:description", content: "Fair price shop stock status for Tamil Nadu PDS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: ShopsPage,
});

function ShopsPage() {
  const core = useCore();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shops/" });
  const status = search.status ?? "ALL";
  const q = search.q ?? "";
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return core.shops.filter(
      (s) =>
        (status === "ALL" || s.status === status) &&
        (!search.district || s.district_id === search.district) &&
        (!term || s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term)),
    );
  }, [core.shops, search.district, status, q]);
  const dName = (id: number) => core.districts.find((d) => d.id === id)?.name ?? "—";
  const sel = "h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold shadow-card outline-none focus:border-primary";

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader title="Fair Price Shops" subtitle={`${rows.length} of ${core.shops.length} shops`} crumbs={[{ label: "Dashboard", to: "/" }, { label: "Fair Price Shops" }]} />
      <Panel>
        <div className="mb-3 flex flex-wrap gap-2">
          <input className={`${sel} w-56 font-normal`} placeholder="Filter by name or ID" value={q} onChange={(e) => navigate({ search: (p) => ({ ...p, q: e.target.value }), replace: true })} />
          <select className={sel} value={search.district ?? ""} onChange={(e) => navigate({ search: (p) => ({ ...p, district: e.target.value ? Number(e.target.value) : undefined }) })}>
            <option value="">All districts</option>
            {core.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {STATUSES.map((st) => (
              <button key={st} onClick={() => navigate({ search: (p) => ({ ...p, status: st }) })} className={`px-3 py-1.5 text-xs font-semibold ${status === st ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <DataTable head={<><Th>Shop</Th><Th>District</Th><Th>Godown</Th><Th className="text-right">Beneficiaries</Th><Th className="text-right">Stock kg</Th><Th className="text-right">Avg monthly</Th><Th className="text-right">Low / Critical at</Th><Th>Status</Th></>}>
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-muted/60">
              <Td><Link to="/shops/$shopId" params={{ shopId: s.id }} className="font-semibold text-primary hover:underline">{s.name}</Link><div className="font-mono text-[10px] text-muted-foreground">{s.id}</div></Td>
              <Td>{dName(s.district_id)}</Td>
              <Td className="font-mono text-[11px]">{s.godown_id}</Td>
              <Td className="text-right">{fmtInt(s.beneficiaries_count)}</Td>
              <Td className="text-right font-bold">{fmtInt(s.expected_stock_kg)}</Td>
              <Td className="text-right">{fmtInt(s.avg_monthly_dist_kg)}</Td>
              <Td className="text-right text-muted-foreground">{fmtInt(s.low_stock_threshold_kg)} / {fmtInt(s.critical_threshold_kg)}</Td>
              <Td><StatusBadge status={s.status} /></Td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
