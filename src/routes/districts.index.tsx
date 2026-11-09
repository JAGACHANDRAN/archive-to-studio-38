import { useMemo } from "react";
import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { ensureCore, useCore } from "@/lib/core";
import { districtSummaries, latestMonth } from "@/lib/summary";
import { fmtInt, monthLabel } from "@/lib/format";
import { TN_DISTRICTS, districtSlug } from "@/lib/tn-districts";
import { cn } from "@/lib/utils";
import { PageHeader, PageLoading, Panel, RouteError, StatusBadge } from "@/components/srt/primitives";
import { MapLegendDot, TnMap, type MapTone } from "@/components/srt/maps";

export const Route = createFileRoute("/districts/")({
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "Districts of Tamil Nadu — Smart Ration Tracker" },
      { name: "description", content: "Interactive map of all Tamil Nadu districts with rice stock, shop health and distribution (demo dataset)." },
      { property: "og:title", content: "Districts of Tamil Nadu — Smart Ration Tracker" },
      { property: "og:description", content: "Open any Tamil Nadu district to see its map, godowns and fair price shops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: DistrictsPage,
});

const STATUS_TONE = { NORMAL: "normal", LOW: "low", CRITICAL: "critical" } as const;

function DistrictsPage() {
  const core = useCore();
  const navigate = useNavigate();
  const month = latestMonth(core.monthly);
  const rows = useMemo(() => districtSummaries(core, month), [core, month]);
  const bySlug = useMemo(() => new Map(rows.map((d) => [districtSlug(d.district.name), d])), [rows]);
  const emphasize = useMemo(() => new Set(bySlug.keys()), [bySlug]);
  const toneFor = (slug: string): MapTone => {
    const d = bySlug.get(slug);
    return d ? STATUS_TONE[d.status] : "base";
  };
  const open = (slug: string) => navigate({ to: "/districts/$districtId", params: { districtId: slug } });

  return (
    <div className="mx-auto max-w-[1520px]">
      <PageHeader
        title="Districts"
        subtitle={`${TN_DISTRICTS.length} districts on the map · ${rows.length} with demo stock data · distribution for ${monthLabel(month)}`}
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Districts" }]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel title="Tamil Nadu District Map" bodyClassName="flex flex-col gap-3">
          <div className="h-[560px] rounded-lg bg-gradient-to-b from-primary-soft/60 to-card">
            <ClientOnly fallback={<div className="h-full w-full animate-pulse rounded-lg bg-muted" />}>
              <TnMap
                ariaLabel="Map of all Tamil Nadu districts"
                toneFor={toneFor}
                emphasize={emphasize}
                showCompass
                aspect={1.15}
                onSelect={open}
                tooltipFor={(slug, name) => {
                  const d = bySlug.get(slug);
                  return (
                    <div>
                      <strong className="text-[13px]">{name}</strong>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{d ? `${fmtInt(d.totalStockKg)} kg · ${d.shopsCount} shops` : "Map only — no demo data"}</p>
                      <p className="mt-1 text-[10px] font-semibold text-primary">Click to open →</p>
                    </div>
                  );
                }}
              />
            </ClientOnly>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul className="flex flex-wrap gap-4">
              <MapLegendDot className="bg-success" label="Normal" />
              <MapLegendDot className="bg-warning" label="Low stock" />
              <MapLegendDot className="bg-danger" label="Critical" />
              <MapLegendDot className="bg-map-2" label="No demo data" />
            </ul>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Info className="size-3.5 text-primary" /> Click a district to open its map</p>
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((d) => (
              <Link key={d.district.id} to="/districts/$districtId" params={{ districtId: districtSlug(d.district.name) }} className="group">
                <Panel className="h-full transition-shadow group-hover:shadow-float">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{d.district.code} · {d.district.zone ?? "—"}</p>
                      <h2 className="mt-0.5 truncate text-lg font-extrabold text-header group-hover:text-primary">{d.district.name}</h2>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <Stat label="Stock" value={`${fmtInt(d.totalStockKg)} kg`} />
                    <Stat label="Distributed" value={`${fmtInt(d.distributedKg)} kg`} />
                    <Stat label="Alerts" value={fmtInt(d.openAlerts)} />
                    <Stat label="Godowns" value={fmtInt(d.godownsCount)} />
                    <Stat label="Shops" value={fmtInt(d.shopsCount)} />
                    <Stat label="Low / crit." value={`${d.low} / ${d.critical}`} />
                  </dl>
                </Panel>
              </Link>
            ))}
          </div>

          <Panel title="All Tamil Nadu districts">
            <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {TN_DISTRICTS.map((d) => {
                const s = bySlug.get(d.slug);
                return (
                  <li key={d.slug}>
                    <Link
                      to="/districts/$districtId"
                      params={{ districtId: d.slug }}
                      className={cn(
                        "group flex items-center justify-between gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary",
                        s ? "border-primary/30 font-bold text-header" : "border-border font-medium text-foreground/80",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className={cn("size-2 shrink-0 rounded-full", s ? (s.status === "CRITICAL" ? "bg-danger" : s.status === "LOW" ? "bg-warning" : "bg-success") : "bg-map-4")} />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <ArrowRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="truncate font-bold text-foreground tabular">{value}</dd>
    </div>
  );
}
