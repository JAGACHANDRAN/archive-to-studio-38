import { monthSearch } from "@/lib/search";
import { useMemo } from "react";
import { ClientOnly, createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Package, Warehouse, Store, HandCoins, Bell, Truck } from "lucide-react";
import { ensureCore, useCore } from "@/lib/core";
import { districtSummaries, latestMonth, availableMonths } from "@/lib/summary";
import { fmtInt, fmtPct, monthLabel } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { locationAccessError } from "@/lib/rbac";
import { AccessDenied, DataTable, KpiCard, NotFoundBlock, PageHeader, PageLoading, Panel, RouteError, StatusBadge, Td, Th } from "@/components/srt/primitives";
import { MonthSelect } from "@/components/srt/MonthSelect";
import { DistrictMap } from "@/components/srt/maps";
import { StockDonut, TrendLine } from "@/components/srt/charts";
import { DeliveriesTable, ReconciliationTable } from "@/components/srt/tables";
import { districtsQuery } from "@/lib/data";

export const Route = createFileRoute("/districts/$districtId")({
  validateSearch: (s: Record<string, unknown>) => monthSearch.parse(s),
  loader: async ({ context, params }) => {
    await ensureCore(context.queryClient);
    const districts = await context.queryClient.ensureQueryData(districtsQuery());
    const d = districts.find((x) => String(x.id) === params.districtId);
    if (!d) throw notFound();
    return { name: d.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "District"} District — Smart Ration Tracker` },
      { name: "description", content: `Godowns, fair price shops, stock levels and deliveries in ${loaderData?.name ?? "this"} district (demo dataset).` },
      { property: "og:title", content: `${loaderData?.name ?? "District"} District — Smart Ration Tracker` },
      { property: "og:description", content: `Rice stock and delivery status for ${loaderData?.name ?? "this"} district.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  notFoundComponent: () => <NotFoundBlock what="District" />,
  component: DistrictPage,
});

function DistrictPage() {
  const { districtId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/districts/$districtId" });
  const core = useCore();
  const { actor } = useAuth();
  const months = availableMonths(core.monthly);
  const month = search.month && months.includes(search.month) ? search.month : latestMonth(core.monthly);
  const id = Number(districtId);
  const summary = useMemo(() => districtSummaries(core, month).find((d) => d.district.id === id), [core, month, id]);
  const godowns = useMemo(() => core.godowns.filter((g) => g.district_id === id), [core.godowns, id]);
  const shops = useMemo(() => core.shops.filter((s) => s.district_id === id), [core.shops, id]);
  if (!summary) return <NotFoundBlock what="District" />;
  const denied = locationAccessError(actor, "district", id, core, "view");
  if (denied) return <AccessDenied message={denied} />;

  const shopIds = new Set(shops.map((s) => s.id));
  const godownIds = new Set(godowns.map((g) => g.id));
  const deliveries = core.deliveries.filter((d) => shopIds.has(d.to_shop_id)).slice(0, 12);
  const recon = core.reconciliation.filter((r) => shopIds.has(r.location_id) || godownIds.has(r.location_id));
  const trend = months.map((m) => ({ month: m, kg: core.monthly.filter((x) => x.month_year === m && shopIds.has(x.shop_id)).reduce((a, x) => a + x.distributed_qty_kg, 0) }));
  const distByShop = new Map(core.monthly.filter((m) => m.month_year === month).map((m) => [m.shop_id, m.distributed_qty_kg]));

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title={`${summary.district.name} District`}
        subtitle={`${summary.district.code} · HQ ${summary.district.headquarters} · ${monthLabel(month)}`}
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Districts", to: "/districts" }, { label: summary.district.name }]}
        actions={<MonthSelect months={months} value={month} onChange={(m) => navigate({ search: { month: m } })} />}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Package} label="Total Stock" value={fmtInt(summary.totalStockKg)} unit="kg" />
        <KpiCard icon={Warehouse} label="Godown Stock" value={fmtInt(summary.godownStockKg)} unit="kg" hint={`${summary.godownsCount} godowns`} tone="info" />
        <KpiCard icon={Store} label="Shop Stock" value={fmtInt(summary.shopStockKg)} unit="kg" hint={`${summary.shopsCount} shops`} tone="teal" />
        <KpiCard icon={Truck} label="Received" value={fmtInt(summary.receivedKg)} unit="kg" hint="At district godowns" tone="violet" />
        <KpiCard icon={HandCoins} label="Distributed" value={fmtInt(summary.distributedKg)} unit="kg" tone="success" />
        <KpiCard icon={Bell} label="Open Alerts" value={fmtInt(summary.openAlerts)} hint={`${summary.pendingDeliveries} pending/delayed deliveries`} tone="danger" valueTone={summary.openAlerts ? "danger" : undefined} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Godowns & Shops Map" bodyClassName="h-[420px] overflow-hidden rounded-lg border border-border">
          <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
            <DistrictMap district={summary.district} godowns={godowns} shops={shops} />
          </ClientOnly>
        </Panel>
        <div className="grid gap-4">
          <Panel title="Shop Stock Health">
            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <StockDonut normal={summary.normal} low={summary.low} critical={summary.critical} centerLabel="Shops" centerValue={String(summary.shopsCount)} />
              <ul className="space-y-2 text-xs">
                <li className="flex justify-between"><span>Normal</span><b>{summary.normal}</b></li>
                <li className="flex justify-between"><span>Low stock</span><b>{summary.low}</b></li>
                <li className="flex justify-between"><span>Critical</span><b>{summary.critical}</b></li>
              </ul>
            </div>
          </Panel>
          <Panel title="Monthly Distribution Trend"><TrendLine data={trend} height={180} /></Panel>
        </div>
      </div>

      <Panel title="Godowns" className="mt-4">
        <DataTable head={<><Th>Godown</Th><Th className="text-right">Capacity</Th><Th className="text-right">Expected stock</Th><Th className="text-right">Utilisation</Th><Th className="text-right">Shops served</Th></>}>
          {godowns.map((g) => (
            <tr key={g.id} className="hover:bg-muted/60">
              <Td><Link to="/godowns/$godownId" params={{ godownId: g.id }} className="font-semibold text-primary hover:underline">{g.name}</Link><span className="ml-2 font-mono text-[10px] text-muted-foreground">{g.id}</span></Td>
              <Td className="text-right">{fmtInt(g.capacity_kg)}</Td>
              <Td className="text-right">{fmtInt(g.expected_stock_kg)}</Td>
              <Td className="text-right">{fmtPct(g.utilization_pct)}</Td>
              <Td className="text-right">{shops.filter((s) => s.godown_id === g.id).length}</Td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <Panel title="Fair Price Shops" className="mt-4">
        <DataTable head={<><Th>Shop</Th><Th>Godown</Th><Th className="text-right">Cards</Th><Th className="text-right">Stock kg</Th><Th className="text-right">Avg monthly</Th><Th className="text-right">Distributed</Th><Th>Status</Th></>}>
          {shops.map((s) => (
            <tr key={s.id} className="hover:bg-muted/60">
              <Td><Link to="/shops/$shopId" params={{ shopId: s.id }} className="font-semibold text-primary hover:underline">{s.name}</Link><span className="ml-2 font-mono text-[10px] text-muted-foreground">{s.id}</span></Td>
              <Td className="font-mono text-[11px]">{s.godown_id}</Td>
              <Td className="text-right">{fmtInt(s.card_count)}</Td>
              <Td className="text-right">{fmtInt(s.expected_stock_kg)}</Td>
              <Td className="text-right">{fmtInt(s.avg_monthly_dist_kg)}</Td>
              <Td className="text-right">{fmtInt(distByShop.get(s.id) ?? 0)}</Td>
              <Td><StatusBadge status={s.status} /></Td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Recent Deliveries"><DeliveriesTable deliveries={deliveries} /></Panel>
        <Panel title="Physical Inspections"><ReconciliationTable rows={recon} /></Panel>
      </div>
    </div>
  );
}
