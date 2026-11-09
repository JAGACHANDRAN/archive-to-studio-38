import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ensureCore, useCore } from "@/lib/core";
import { districtSummaries, latestMonth } from "@/lib/summary";
import { fmtInt, monthLabel } from "@/lib/format";
import { PageHeader, PageLoading, Panel, RouteError, StatusBadge } from "@/components/srt/primitives";

export const Route = createFileRoute("/districts/")({
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "Districts — Smart Ration Tracker" },
      { name: "description", content: "District-wise rice stock, shop health and distribution across Tamil Nadu (demo dataset)." },
      { property: "og:title", content: "Districts — Smart Ration Tracker" },
      { property: "og:description", content: "District-wise rice stock and shop health in Tamil Nadu PDS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: DistrictsPage,
});

function DistrictsPage() {
  const core = useCore();
  const month = latestMonth(core.monthly);
  const rows = useMemo(() => districtSummaries(core, month), [core, month]);
  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader title="Districts" subtitle={`${rows.length} districts in the demo dataset · distribution for ${monthLabel(month)}`} crumbs={[{ label: "Dashboard", to: "/" }, { label: "Districts" }]} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((d) => (
          <Link key={d.district.id} to="/districts/$districtId" params={{ districtId: String(d.district.id) }} className="group">
            <Panel className="h-full transition-shadow group-hover:shadow-float">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{d.district.code} · {d.district.zone ?? "—"} zone</p>
                  <h2 className="mt-0.5 text-lg font-extrabold text-foreground group-hover:text-primary">{d.district.name}</h2>
                  <p className="text-[11px] text-muted-foreground">HQ: {d.district.headquarters}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <Stat label="Total stock" value={`${fmtInt(d.totalStockKg)} kg`} />
                <Stat label="Distributed" value={`${fmtInt(d.distributedKg)} kg`} />
                <Stat label="Open alerts" value={fmtInt(d.openAlerts)} />
                <Stat label="Godowns" value={fmtInt(d.godownsCount)} />
                <Stat label="Shops" value={fmtInt(d.shopsCount)} />
                <Stat label="Low / critical" value={`${d.low} / ${d.critical}`} />
              </dl>
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="font-bold text-foreground tabular">{value}</dd>
    </div>
  );
}
