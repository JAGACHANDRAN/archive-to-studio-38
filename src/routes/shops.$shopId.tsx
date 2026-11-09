import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Store, Users, HandCoins, Truck, Gauge } from "lucide-react";
import { ensureCore, useCore } from "@/lib/core";
import { shopStockQuery } from "@/lib/data";
import { fmtInt } from "@/lib/format";
import { availableMonths } from "@/lib/summary";
import { useAuth } from "@/hooks/use-auth";
import { locationAccessError } from "@/lib/rbac";
import { AccessDenied, KpiCard, NotFoundBlock, PageHeader, PageLoading, Panel, RouteError, StatusBadge } from "@/components/srt/primitives";
import { AdjustmentForm, ConfirmDeliveryForm, DistributionForm, MeasurementForm } from "@/components/srt/forms";
import { DeliveriesTable, MovementsTable, ReconciliationTable } from "@/components/srt/tables";
import { MonthlyBars } from "@/components/srt/charts";
import { ForecastCard } from "@/components/srt/ForecastCard";

export const Route = createFileRoute("/shops/$shopId")({
  loader: async ({ context, params }) => {
    await ensureCore(context.queryClient);
    const s = (await context.queryClient.ensureQueryData(shopStockQuery())).find((x) => x.id === params.shopId);
    if (!s) throw notFound();
    return { name: s.name };
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${loaderData?.name ?? params.shopId} — Smart Ration Tracker` },
      { name: "description", content: `Stock, deliveries, distribution and replenishment plan for fair price shop ${params.shopId} (demo dataset).` },
      { property: "og:title", content: `${loaderData?.name ?? params.shopId} — Smart Ration Tracker` },
      { property: "og:description", content: `Fair price shop ${params.shopId} stock and replenishment plan.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  notFoundComponent: () => <NotFoundBlock what="Shop" />,
  component: ShopPage,
});

function ShopPage() {
  const { shopId } = Route.useParams();
  const core = useCore();
  const { actor } = useAuth();
  const s = core.shops.find((x) => x.id === shopId);
  if (!s) return <NotFoundBlock what="Shop" />;
  const denied = locationAccessError(actor, "shop", s.id, core, "view");
  if (denied) return <AccessDenied message={denied} />;
  const district = core.districts.find((d) => d.id === s.district_id);
  const deliveries = core.deliveries.filter((d) => d.to_shop_id === s.id);
  const pending = deliveries.filter((d) => d.status === "PENDING" || d.status === "DELAYED");
  const months = availableMonths(core.monthly);
  const history = months.map((m) => ({ month: m, kg: core.monthly.find((x) => x.shop_id === s.id && x.month_year === m)?.distributed_qty_kg ?? 0 }));
  const recon = core.reconciliation.filter((r) => r.location_type === "shop" && r.location_id === s.id);
  const lastMonth = history[history.length - 1]?.kg ?? 0;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title={s.name}
        subtitle={`${s.id} · supplied by ${s.godown_id} · ${district?.name ?? ""} district`}
        crumbs={[
          { label: "Dashboard", to: "/" },
          ...(district ? [{ label: district.name, to: "/districts/$districtId", params: { districtId: String(district.id) } }] : []),
          { label: s.godown_id, to: "/godowns/$godownId", params: { godownId: s.godown_id } },
          { label: s.id },
        ]}
        actions={<StatusBadge status={s.status} className="px-3 py-1 text-xs" />}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard icon={Store} label="Current Stock" value={fmtInt(s.expected_stock_kg)} unit="kg" hint={`Opening ${fmtInt(s.opening_stock_kg)} kg`} valueTone={s.status === "CRITICAL" ? "danger" : undefined} />
        <KpiCard icon={Gauge} label="Avg Monthly Distribution" value={fmtInt(s.avg_monthly_dist_kg)} unit="kg" hint={`Low < ${fmtInt(s.low_stock_threshold_kg)} · Critical < ${fmtInt(s.critical_threshold_kg)}`} tone="info" />
        <KpiCard icon={HandCoins} label="Last Month Distributed" value={fmtInt(lastMonth)} unit="kg" tone="success" />
        <KpiCard icon={Users} label="Beneficiary Cards" value={fmtInt(s.card_count)} hint={`${fmtInt(s.beneficiaries_count)} beneficiaries`} tone="violet" />
        <KpiCard icon={Truck} label="Incoming" value={fmtInt(pending.reduce((a, d) => a + d.dispatched_qty_kg, 0))} unit="kg" hint={`${pending.length} pending/delayed`} tone="teal" />
      </div>

      {pending.length > 0 && (
        <Panel title="Deliveries Awaiting Receipt" className="mt-4">
          <DeliveriesTable deliveries={pending} actions={(d) => <ConfirmDeliveryForm delivery={d} lookup={core} />} />
        </Panel>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <Panel title="Replenishment Plan"><ForecastCard shop={s} monthly={core.monthly} deliveries={core.deliveries} lookup={core} /></Panel>
        <Panel title="Record Distribution"><DistributionForm shopId={s.id} lookup={core} available={s.expected_stock_kg} /></Panel>
        <Panel title="Stock Adjustment"><AdjustmentForm type="shop" id={s.id} lookup={core} /></Panel>
        <Panel title="Physical Inspection"><MeasurementForm type="shop" id={s.id} lookup={core} /></Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Monthly Distribution"><MonthlyBars data={history} /></Panel>
        <Panel title="Stock Ledger"><MovementsTable type="shop" id={s.id} /></Panel>
      </div>
      <Panel title="Delivery History" className="mt-4"><div className="max-h-[420px] overflow-y-auto"><DeliveriesTable deliveries={deliveries} /></div></Panel>
      <Panel title="Physical Inspections" className="mt-4"><ReconciliationTable rows={recon} /></Panel>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Need the godown view? <Link to="/godowns/$godownId" params={{ godownId: s.godown_id }} className="font-semibold text-primary hover:underline">Open {s.godown_id}</Link>
      </p>
    </div>
  );
}
