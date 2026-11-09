import { monthSearch } from "@/lib/search";
import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Package, Warehouse, Store, Truck, HandCoins, Bell, Info, ArrowRight } from "lucide-react";
import { useCore, ensureCore } from "@/lib/core";
import { availableMonths, latestMonth, stateSummary, type DistrictSummary } from "@/lib/summary";
import { fmtDate, fmtInt, fmtKg, monthLabel } from "@/lib/format";
import { districtSlug } from "@/lib/tn-districts";
import { cn } from "@/lib/utils";
import { DataTable, KpiCard, PageHeader, PageLoading, Panel, RouteError, StatusBadge, Td, Th, Trend } from "@/components/srt/primitives";
import { MonthSelect } from "@/components/srt/MonthSelect";
import { DistributionBar, StockDonut, TrendLine } from "@/components/srt/charts";
import { MapLegendDot, TnMap, type MapPin, type MapTone } from "@/components/srt/maps";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => monthSearch.parse(s),
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "Tamil Nadu State Overview — Smart Ration Tracker" },
      { name: "description", content: "Real-time rice stock, movement and distribution across Tamil Nadu's districts, godowns and fair price shops." },
      { property: "og:title", content: "Tamil Nadu State Overview — Smart Ration Tracker" },
      { property: "og:description", content: "Statewide rice stock, distribution and alerts for Tamil Nadu PDS (demo dataset)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: StateOverview,
});

const STATUS_TONE = { NORMAL: "normal", LOW: "low", CRITICAL: "critical" } as const;

function StateOverview() {
  const core = useCore();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const months = availableMonths(core.monthly);
  const month = search.month && months.includes(search.month) ? search.month : latestMonth(core.monthly);
  const s = useMemo(() => stateSummary(core, month), [core, month]);
  const bySlug = useMemo(() => new Map(s.districts.map((d) => [districtSlug(d.district.name), d])), [s]);
  const pins = useMemo<MapPin[]>(() => s.districts.map((d) => ({ id: `hq-${d.district.id}`, lng: d.district.lng, lat: d.district.lat, kind: "hq", label: d.district.headquarters })), [s]);
  const emphasize = useMemo(() => new Set(bySlug.keys()), [bySlug]);
  const toneFor = (slug: string): MapTone => {
    const d = bySlug.get(slug);
    return d ? STATUS_TONE[d.status] : "base";
  };
  const districtCounts = { normal: s.districts.filter((d) => d.status === "NORMAL").length, low: s.districts.filter((d) => d.status === "LOW").length, critical: s.districts.filter((d) => d.status === "CRITICAL").length };
  const openAlerts = core.alerts.filter((a) => a.status !== "RESOLVED").slice(0, 5);
  const recentDeliveries = core.deliveries.slice(0, 6);
  const shopName = (id: string) => core.shops.find((x) => x.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-[1520px]">
      <PageHeader
        title="Tamil Nadu State Overview"
        subtitle="Real-time stock status, movement and distribution across all districts"
        actions={<MonthSelect months={months} value={month} onChange={(m) => navigate({ search: { month: m } })} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard icon={Package} label="Total Rice Stock" value={fmtInt(s.totalStockKg)} unit="kg" hint={`${fmtInt(s.godownStockKg)} kg in godowns`} tone="primary" />
        <KpiCard icon={Warehouse} label="Godowns" value={fmtInt(s.godownsCount)} hint="Across Tamil Nadu" tone="success" />
        <KpiCard icon={Store} label="Fair Price Shops" value={fmtInt(s.shopsCount)} hint={`${fmtInt(s.beneficiaries)} beneficiary cards`} tone="violet" />
        <KpiCard icon={Truck} label="Rice Received (This Month)" value={fmtInt(s.receivedKg)} unit="kg" hint={<Trend pct={s.receivedMoMPct} />} tone="info" />
        <KpiCard icon={HandCoins} label="Rice Distributed (This Month)" value={fmtInt(s.distributedKg)} unit="kg" hint={<Trend pct={s.distributedMoMPct} />} tone="warning" />
        <KpiCard icon={Bell} label="Alerts" value={fmtInt(s.openAlerts)} hint={s.openAlerts ? "Requires attention" : "All clear"} tone="danger" valueTone={s.openAlerts ? "danger" : undefined} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* Map */}
        <Panel title="Tamil Nadu Stock Map" className="xl:row-span-2" bodyClassName="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_168px]">
            <div className="h-[460px] rounded-lg bg-gradient-to-b from-primary-soft/60 to-card sm:h-[540px]">
              <ClientOnly fallback={<div className="h-full w-full animate-pulse rounded-lg bg-muted" />}>
                <TnMap
                  ariaLabel="Map of Tamil Nadu districts coloured by stock status"
                  toneFor={toneFor}
                  emphasize={emphasize}
                  pins={pins}
                  showCompass
                  aspect={1.18}
                  onSelect={(slug) => navigate({ to: "/districts/$districtId", params: { districtId: slug } })}
                  tooltipFor={(slug, name) => <DistrictTip name={name} d={bySlug.get(slug)} />}
                />
              </ClientOnly>
            </div>
            <div className="grid content-start gap-3 sm:grid-cols-1">
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2.5 text-xs font-bold text-header">Stock Level</p>
                <ul className="space-y-2.5">
                  <MapLegendDot className="bg-success" label={`Normal · ${districtCounts.normal}`} hint="Shops at ≥ 20% of avg" />
                  <MapLegendDot className="bg-warning" label={`Low Stock · ${districtCounts.low}`} hint="A shop below 20% of avg" />
                  <MapLegendDot className="bg-danger" label={`Critical · ${districtCounts.critical}`} hint="A shop below 10% of avg" />
                  <MapLegendDot className="bg-map-2" label="No demo data" hint="Map only" />
                </ul>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2.5 text-xs font-bold text-header">State Totals</p>
                <ul className="space-y-2">
                  <TotalRow icon={Package} label="Total Stock" value={`${fmtInt(s.totalStockKg)} kg`} />
                  <TotalRow icon={Warehouse} label="Godowns" value={fmtInt(s.godownsCount)} />
                  <TotalRow icon={Store} label="Fair Price Shops" value={fmtInt(s.shopsCount)} />
                </ul>
              </div>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="size-3.5 shrink-0 text-primary" /> Click any district to open its map. Drag to pan; pinch or Ctrl + scroll to zoom.
          </p>
        </Panel>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Panel title={<>Rice Distribution by District <span className="font-medium text-muted-foreground">({monthLabel(month)})</span></>} bodyClassName="h-[240px]">
            <DistributionBar data={s.districts.map((d) => ({ name: d.district.name.replace("Tiruchirappalli", "Trichy"), kg: d.distributedKg }))} />
          </Panel>
          <Panel title="Shop Stock Status">
            <div className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-3 md:grid-cols-1 lg:grid-cols-[130px_minmax(0,1fr)]">
              <StockDonut normal={s.status.normal} low={s.status.low} critical={s.status.critical} centerLabel="Shops" centerValue={fmtInt(s.shopsCount)} size={140} />
              <ul className="space-y-3 text-xs">
                <HealthRow tone="bg-success" label="Normal" count={s.status.normal} pct={s.status.normalPct} />
                <HealthRow tone="bg-warning" label="Low Stock" count={s.status.low} pct={s.status.lowPct} />
                <HealthRow tone="bg-danger" label="Critical" count={s.status.critical} pct={s.status.criticalPct} />
              </ul>
            </div>
          </Panel>
        </div>

        {/* District table */}
        <Panel
          title="District-wise Stock Summary"
          action={<Link to="/districts" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">View All Districts <ArrowRight className="size-3.5" /></Link>}
        >
          <DataTable
            head={<><Th>District</Th><Th className="text-right">Godowns</Th><Th className="text-right">Fair Price Shops</Th><Th className="text-right">Available Stock (kg)</Th><Th className="text-right">Distributed This Month (kg)</Th><Th className="text-center">Alerts</Th></>}
          >
            {s.districts.map((d) => (
              <tr key={d.district.id} className="hover:bg-muted/60">
                <Td>
                  <Link to="/districts/$districtId" params={{ districtId: districtSlug(d.district.name) }} className="flex items-center gap-2 font-semibold text-primary hover:underline">
                    <span className={cn("size-2 rounded-full", d.status === "CRITICAL" ? "bg-danger" : d.status === "LOW" ? "bg-warning" : "bg-success")} />
                    {d.district.name}
                  </Link>
                </Td>
                <Td className="text-right">{d.godownsCount}</Td>
                <Td className="text-right">{d.shopsCount}</Td>
                <Td className="text-right">{fmtInt(d.totalStockKg)}</Td>
                <Td className="text-right">{fmtInt(d.distributedKg)}</Td>
                <Td className="text-center">
                  <span className={cn("inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-[11px] font-bold", d.openAlerts ? "bg-danger text-primary-foreground" : "bg-success-soft text-success-foreground")}>{d.openAlerts}</span>
                </Td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Statewide Distribution Trend">
          <TrendLine data={s.trend} />
        </Panel>
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
          <DataTable head={<><Th>Route</Th><Th className="text-right">Qty kg</Th><Th>Expected</Th><Th>Status</Th></>}>
            {recentDeliveries.map((d) => (
              <tr key={d.id}>
                <Td><span className="text-muted-foreground">{d.from_godown_id} →</span> {shopName(d.to_shop_id)}</Td>
                <Td className="text-right">{fmtKg(d.dispatched_qty_kg).replace(" kg", "")}</Td>
                <Td className="whitespace-nowrap">{fmtDate(d.expected_delivery_date)}</Td>
                <Td><StatusBadge status={d.status} /></Td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">Demo Dataset — Not Official Government Data</p>
    </div>
  );
}

function DistrictTip({ name, d }: { name: string; d: DistrictSummary | undefined }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <strong className="text-[13px] text-foreground">{name}</strong>
        {d && <StatusBadge status={d.status} />}
      </div>
      {d ? (
        <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
          <p><b className="text-foreground">{fmtKg(d.totalStockKg)}</b> available</p>
          <p>{d.godownsCount} godowns · {d.shopsCount} shops · {d.openAlerts} alerts</p>
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">Not part of the demo dataset yet</p>
      )}
      <p className="mt-1.5 text-[10px] font-semibold text-primary">Click to open district map →</p>
    </div>
  );
}

function TotalRow({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="size-4" /></span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[10px] text-muted-foreground">{label}</span>
        <span className="block truncate text-[13px] font-extrabold text-header tabular">{value}</span>
      </span>
    </li>
  );
}

function HealthRow({ tone, label, count, pct }: { tone: string; label: string; count: number; pct: number }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-foreground/80"><span className={`size-2.5 rounded-full ${tone}`} />{label}</span>
      <span className="font-bold tabular">{pct}% <span className="font-normal text-muted-foreground">({count})</span></span>
    </li>
  );
}
