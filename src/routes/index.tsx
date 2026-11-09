import { monthSearch } from "@/lib/search";
import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Package, Warehouse, Store, Truck, HandCoins, AlertTriangle, Users, Bell } from "lucide-react";
import { useCore, ensureCore } from "@/lib/core";
import { availableMonths, latestMonth, stateSummary } from "@/lib/summary";
import { fmtDate, fmtInt, fmtKg, monthLabel } from "@/lib/format";
import { DataTable, KpiCard, PageHeader, PageLoading, Panel, RouteError, StatusBadge, Td, Th, Trend } from "@/components/srt/primitives";
import { MonthSelect } from "@/components/srt/MonthSelect";
import { DistributionBar, StockDonut, TrendLine } from "@/components/srt/charts";
import { StateMap } from "@/components/srt/maps";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => monthSearch.parse(s),
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "State Overview — Smart Ration Tracker" },
      { name: "description", content: "Statewide rice stock, distribution, deliveries and alerts across Tamil Nadu's godowns and fair price shops." },
      { property: "og:title", content: "State Overview — Smart Ration Tracker" },
      { property: "og:description", content: "Statewide rice stock, distribution and alerts for Tamil Nadu PDS (demo dataset)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: StateOverview,
});

function StateOverview() {
  const core = useCore();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const months = availableMonths(core.monthly);
  const month = search.month && months.includes(search.month) ? search.month : latestMonth(core.monthly);
  const s = useMemo(() => stateSummary(core, month), [core, month]);
  const mapItems = useMemo(
    () => s.districts.map((d) => ({ district: d.district, status: d.status, totalStockKg: d.totalStockKg, shopsCount: d.shopsCount, godownsCount: d.godownsCount })),
    [s],
  );
  const openAlerts = core.alerts.filter((a) => a.status !== "RESOLVED").slice(0, 6);
  const recentDeliveries = core.deliveries.slice(0, 6);
  const shopName = (id: string) => core.shops.find((x) => x.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Tamil Nadu State Overview"
        subtitle={`Rice stock across ${s.godownsCount} godowns and ${s.shopsCount} fair price shops · ${monthLabel(month)}`}
        actions={<MonthSelect months={months} value={month} onChange={(m) => navigate({ search: { month: m } })} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard icon={Package} label="Total Rice Stock" value={fmtInt(s.totalStockKg)} unit="kg" hint="Godowns + shops (ledger)" />
        <KpiCard icon={Warehouse} label="Godown Stock" value={fmtInt(s.godownStockKg)} unit="kg" hint={`${s.godownsCount} godowns`} tone="info" />
        <KpiCard icon={Store} label="Shop Stock" value={fmtInt(s.shopStockKg)} unit="kg" hint={`${s.shopsCount} shops`} tone="teal" />
        <KpiCard icon={Truck} label="Received This Month" value={fmtInt(s.receivedKg)} unit="kg" hint={<Trend pct={s.receivedMoMPct} />} tone="violet" />
        <KpiCard icon={HandCoins} label="Distributed" value={fmtInt(s.distributedKg)} unit="kg" hint={<Trend pct={s.distributedMoMPct} />} tone="success" />
        <KpiCard icon={Users} label="Beneficiary Cards" value={fmtInt(s.beneficiaries)} hint={`${fmtInt(s.householdsServed)} households served`} tone="primary" />
        <KpiCard icon={AlertTriangle} label="Attention Flags" value={fmtInt(s.attentionFlags)} hint={`${s.status.low} low · ${s.status.critical} critical · ${s.discrepancies} discrepancy`} tone="warning" valueTone={s.attentionFlags ? "danger" : undefined} />
        <KpiCard icon={Bell} label="Open Alerts" value={fmtInt(s.openAlerts)} hint={`${s.delayed} delayed · ${s.pending} pending deliveries`} tone="danger" valueTone={s.openAlerts ? "danger" : undefined} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel
          title="District Stock Status"
          action={
            <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
              <Legend tone="bg-success" label="Normal" />
              <Legend tone="bg-warning" label="Low" />
              <Legend tone="bg-danger" label="Critical" />
              <Legend tone="bg-map-empty" label="No demo data" />
            </div>
          }
          bodyClassName="h-[460px] overflow-hidden rounded-lg border border-border"
        >
          <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
            <StateMap items={mapItems} onSelect={(id) => navigate({ to: "/districts/$districtId", params: { districtId: String(id) } })} />
          </ClientOnly>
        </Panel>

        <div className="grid gap-4">
          <Panel title={`Distribution by District · ${monthLabel(month)}`} bodyClassName="h-[200px]">
            <DistributionBar data={s.districts.map((d) => ({ name: d.district.name, kg: d.distributedKg }))} />
          </Panel>
          <Panel title="Shop Stock Health">
            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <StockDonut normal={s.status.normal} low={s.status.low} critical={s.status.critical} centerLabel="Shops" centerValue={fmtInt(s.shopsCount)} />
              <ul className="space-y-2.5 text-xs">
                <HealthRow tone="bg-success" label="Normal" count={s.status.normal} pct={s.status.normalPct} />
                <HealthRow tone="bg-warning" label="Low Stock (< 20% of avg)" count={s.status.low} pct={s.status.lowPct} />
                <HealthRow tone="bg-danger" label="Critical (< 10% of avg)" count={s.status.critical} pct={s.status.criticalPct} />
              </ul>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="District Summary" action={<Link to="/districts" className="text-xs font-semibold text-primary hover:underline">All districts →</Link>}>
          <DataTable
            head={<><Th>District</Th><Th className="text-right">Godown kg</Th><Th className="text-right">Shop kg</Th><Th className="text-right">Distributed</Th><Th className="text-center">Shops (N/L/C)</Th><Th className="text-right">Alerts</Th><Th>Status</Th></>}
          >
            {s.districts.map((d) => (
              <tr key={d.district.id} className="hover:bg-muted/60">
                <Td><Link to="/districts/$districtId" params={{ districtId: String(d.district.id) }} className="font-semibold text-primary hover:underline">{d.district.name}</Link></Td>
                <Td className="text-right">{fmtInt(d.godownStockKg)}</Td>
                <Td className="text-right">{fmtInt(d.shopStockKg)}</Td>
                <Td className="text-right">{fmtInt(d.distributedKg)}</Td>
                <Td className="text-center">{d.normal}/{d.low}/{d.critical}</Td>
                <Td className="text-right">{d.openAlerts}</Td>
                <Td><StatusBadge status={d.status} /></Td>
              </tr>
            ))}
          </DataTable>
        </Panel>
        <Panel title="Statewide Distribution Trend">
          <TrendLine data={s.trend} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Open Alerts" action={<Link to="/alerts" className="text-xs font-semibold text-primary hover:underline">View all →</Link>}>
          <ul className="divide-y divide-border">
            {openAlerts.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{a.alert_type.replace(/_/g, " ")} · {a.location_id}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{a.explanation}</p>
                </div>
                <StatusBadge status={a.severity} />
              </li>
            ))}
            {!openAlerts.length && <li className="py-6 text-center text-xs text-muted-foreground">No open alerts.</li>}
          </ul>
        </Panel>
        <Panel title="Recent Deliveries" action={<Link to="/transactions" className="text-xs font-semibold text-primary hover:underline">Stock movements →</Link>}>
          <DataTable head={<><Th>ID</Th><Th>Route</Th><Th className="text-right">Qty kg</Th><Th>Expected</Th><Th>Status</Th></>}>
            {recentDeliveries.map((d) => (
              <tr key={d.id}>
                <Td className="font-mono text-[11px]">{d.id}</Td>
                <Td><span className="text-muted-foreground">{d.from_godown_id} →</span> {shopName(d.to_shop_id)}</Td>
                <Td className="text-right">{fmtKg(d.dispatched_qty_kg).replace(" kg", "")}</Td>
                <Td>{fmtDate(d.expected_delivery_date)}</Td>
                <Td><StatusBadge status={d.status} /></Td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`size-2.5 rounded-sm ${tone}`} />
      {label}
    </span>
  );
}

function HealthRow({ tone, label, count, pct }: { tone: string; label: string; count: number; pct: number }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-foreground/80"><span className={`size-2.5 rounded-full ${tone}`} />{label}</span>
      <span className="font-bold tabular">{count} <span className="font-normal text-muted-foreground">({pct}%)</span></span>
    </li>
  );
}
