import { monthSearch } from "@/lib/search";
import { useMemo } from "react";
import { ClientOnly, createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Package, Warehouse, Store, HandCoins, Bell, Truck, MapPinned, Info } from "lucide-react";
import { ensureCore, useCore } from "@/lib/core";
import { districtSummaries, latestMonth, availableMonths } from "@/lib/summary";
import { fmtInt, fmtPct, monthLabel } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { locationAccessError } from "@/lib/rbac";
import { AccessDenied, DataTable, KpiCard, NotFoundBlock, PageHeader, PageLoading, Panel, RouteError, StatusBadge, Td, Th } from "@/components/srt/primitives";
import { MonthSelect } from "@/components/srt/MonthSelect";
import { TnMap, type MapPin } from "@/components/srt/maps";
import { TN_DISTRICTS, districtSlug, findTnDistrict } from "@/lib/tn-districts";
import { StockDonut, TrendLine } from "@/components/srt/charts";
import { DeliveriesTable, ReconciliationTable } from "@/components/srt/tables";
import { districtsQuery } from "@/lib/data";

export const Route = createFileRoute("/districts/$districtId")({
  validateSearch: (s: Record<string, unknown>) => monthSearch.parse(s),
  loader: async ({ context, params }) => {
    await ensureCore(context.queryClient);
    const districts = await context.queryClient.ensureQueryData(districtsQuery());
    const d = findTnDistrict(params.districtId, districts);
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
  const tn = findTnDistrict(districtId, core.districts);
  const db = tn ? core.districts.find((d) => districtSlug(d.name) === tn.slug) : undefined;
  const id = db?.id ?? -1;
  const summary = useMemo(() => districtSummaries(core, month).find((d) => d.district.id === id), [core, month, id]);
  const godowns = useMemo(() => core.godowns.filter((g) => g.district_id === id), [core.godowns, id]);
  const shops = useMemo(() => core.shops.filter((s) => s.district_id === id), [core.shops, id]);
  const pins = useMemo<MapPin[]>(
    () => [
      ...godowns.filter((g) => g.lat != null && g.lng != null).map((g) => ({ id: g.id, lng: g.lng as number, lat: g.lat as number, kind: "godown" as const, label: g.name })),
      ...shops.filter((x) => x.lat != null && x.lng != null).map((x) => ({ id: x.id, lng: x.lng as number, lat: x.lat as number, kind: "shop" as const, status: x.status, label: x.name })),
    ],
    [godowns, shops],
  );
  if (!tn) return <NotFoundBlock what="District" />;
  if (!summary) return <MapOnlyDistrict name={tn.name} slug={tn.slug} withData={core.districts.map((d) => d.name)} />;
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

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          title={`${summary.district.name} District Map`}
          action={<span className="text-[11px] text-muted-foreground">{godowns.length} godowns · {shops.length} shops</span>}
          bodyClassName="relative h-[480px] overflow-hidden rounded-lg border border-border bg-gradient-to-b from-primary-soft/60 to-card"
        >
          <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
            <TnMap
              ariaLabel={`Map of ${summary.district.name} district with godowns and fair price shops`}
              focusSlug={tn.slug}
              toneFor={(slug) => (slug === tn.slug ? "focus" : "dim")}
              pins={pins}
              aspect={0.85}
              onSelect={(slug) => slug !== tn.slug && navigate({ to: "/districts/$districtId", params: { districtId: slug } })}
              onPinSelect={(p) => (p.kind === "godown" ? navigate({ to: "/godowns/$godownId", params: { godownId: p.id } }) : navigate({ to: "/shops/$shopId", params: { shopId: p.id } }))}
              tooltipFor={(slug, name) => (slug === tn.slug ? <strong>{name}</strong> : <span><strong>{name}</strong><span className="block text-[10px] text-primary">Click to open →</span></span>)}
              pinTooltip={(p) => {
                const g = p.kind === "godown" ? godowns.find((x) => x.id === p.id) : undefined;
                const sh = p.kind === "shop" ? shops.find((x) => x.id === p.id) : undefined;
                return (
                  <div>
                    <strong className="text-[12.5px]">{p.label}</strong>
                    <p className="font-mono text-[10px] text-muted-foreground">{p.id}</p>
                    <p className="mt-1 text-[11px]">{fmtInt(g?.expected_stock_kg ?? sh?.expected_stock_kg ?? 0)} kg in stock</p>
                    {sh && <div className="mt-1"><StatusBadge status={sh.status} /></div>}
                    <p className="mt-1 text-[10px] font-semibold text-primary">Click to open →</p>
                  </div>
                );
              }}
            />
          </ClientOnly>
          <ul className="pointer-events-none absolute left-3 top-3 space-y-1.5 rounded-lg border border-border bg-card/95 p-2.5 shadow-card">
            <li className="flex items-center gap-2 text-[11px] font-semibold"><span className="size-3 rounded-[3px] bg-primary" /> Godown</li>
            <li className="flex items-center gap-2 text-[11px] font-semibold"><span className="size-3 rounded-full bg-success" /> Shop · Normal</li>
            <li className="flex items-center gap-2 text-[11px] font-semibold"><span className="size-3 rounded-full bg-warning" /> Shop · Low</li>
            <li className="flex items-center gap-2 text-[11px] font-semibold"><span className="size-3 rounded-full bg-danger" /> Shop · Critical</li>
          </ul>
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

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Recent Deliveries"><DeliveriesTable deliveries={deliveries} /></Panel>
        <Panel title="Physical Inspections"><ReconciliationTable rows={recon} /></Panel>
      </div>
    </div>
  );
}

function MapOnlyDistrict({ name, slug, withData }: { name: string; slug: string; withData: string[] }) {
  const navigate = useNavigate();
  const others = TN_DISTRICTS.filter((d) => withData.some((n) => districtSlug(n) === d.slug));
  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title={`${name} District`}
        subtitle="District boundary · no godowns or fair price shops in the demo dataset yet"
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Districts", to: "/districts" }, { label: name }]}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title={`${name} District Map`} bodyClassName="h-[520px] overflow-hidden rounded-lg border border-border bg-gradient-to-b from-primary-soft/60 to-card">
          <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
            <TnMap
              ariaLabel={`Map of ${name} district`}
              focusSlug={slug}
              toneFor={(s) => (s === slug ? "focus" : "dim")}
              aspect={0.85}
              onSelect={(s) => s !== slug && navigate({ to: "/districts/$districtId", params: { districtId: s } })}
              tooltipFor={(s, n) => (s === slug ? <strong>{n}</strong> : <span><strong>{n}</strong><span className="block text-[10px] text-primary">Click to open →</span></span>)}
            />
          </ClientOnly>
        </Panel>
        <div className="grid min-w-0 grid-cols-1 content-start gap-4">
          <Panel>
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><MapPinned className="size-5" /></span>
              <div>
                <h2 className="text-base font-bold text-header">No stock records for {name} yet</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  The demo dataset covers {others.length} districts. Once godowns and fair price shops in {name} are added, their stock, deliveries and alerts will appear here on this map.
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Districts with live stock data">
            <ul className="grid grid-cols-2 gap-2">
              {others.map((d) => (
                <li key={d.slug}>
                  <Link to="/districts/$districtId" params={{ districtId: d.slug }} className="block rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-primary hover:bg-primary-soft hover:text-primary">{d.name}</Link>
                </li>
              ))}
            </ul>
          </Panel>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Info className="size-3.5 text-primary" /> Click a neighbouring district on the map to open it.</p>
        </div>
      </div>
    </div>
  );
}
