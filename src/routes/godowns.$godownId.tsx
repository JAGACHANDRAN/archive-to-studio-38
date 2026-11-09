import { districtSlug } from "@/lib/tn-districts";
import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Warehouse, Truck, ArrowUpRight, Gauge, Store } from "lucide-react";
import { ensureCore, useCore } from "@/lib/core";
import { godownStockQuery } from "@/lib/data";
import { fmtInt, fmtPct } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { locationAccessError } from "@/lib/rbac";
import { AccessDenied, DataTable, KpiCard, NotFoundBlock, PageHeader, PageLoading, Panel, RouteError, StatusBadge, Td, Th } from "@/components/srt/primitives";
import { AdjustmentForm, DispatchForm, MeasurementForm, ReceiptForm } from "@/components/srt/forms";
import { DeliveriesTable, MovementsTable, ReconciliationTable } from "@/components/srt/tables";

export const Route = createFileRoute("/godowns/$godownId")({
  loader: async ({ context, params }) => {
    await ensureCore(context.queryClient);
    const g = (await context.queryClient.ensureQueryData(godownStockQuery())).find((x) => x.id === params.godownId);
    if (!g) throw notFound();
    return { name: g.name };
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${loaderData?.name ?? params.godownId} — Smart Ration Tracker` },
      { name: "description", content: `Stock ledger, dispatches and inspections for godown ${params.godownId} (demo dataset).` },
      { property: "og:title", content: `${loaderData?.name ?? params.godownId} — Smart Ration Tracker` },
      { property: "og:description", content: `Rice stock ledger for godown ${params.godownId}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  notFoundComponent: () => <NotFoundBlock what="Godown" />,
  component: GodownPage,
});

function GodownPage() {
  const { godownId } = Route.useParams();
  const core = useCore();
  const { actor } = useAuth();
  const g = core.godowns.find((x) => x.id === godownId);
  const shops = useMemo(() => core.shops.filter((s) => s.godown_id === godownId), [core.shops, godownId]);
  if (!g) return <NotFoundBlock what="Godown" />;
  const denied = locationAccessError(actor, "godown", g.id, core, "view");
  if (denied) return <AccessDenied message={denied} />;
  const district = core.districts.find((d) => d.id === g.district_id);
  const deliveries = core.deliveries.filter((d) => d.from_godown_id === g.id);
  const inTransit = deliveries.filter((d) => d.status === "PENDING" || d.status === "DELAYED");
  const recon = core.reconciliation.filter((r) => r.location_type === "godown" && r.location_id === g.id);
  const shopName = (id: string) => core.shops.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title={g.name}
        subtitle={`${g.id} · ${district?.name ?? ""} district`}
        crumbs={[{ label: "Dashboard", to: "/" }, ...(district ? [{ label: district.name, to: "/districts/$districtId", params: { districtId: districtSlug(district.name) } }] : []), { label: g.id }]}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard icon={Warehouse} label="Expected Stock" value={fmtInt(g.expected_stock_kg)} unit="kg" hint={`Opening ${fmtInt(g.opening_stock_kg)} kg`} />
        <KpiCard icon={Gauge} label="Utilisation" value={fmtPct(g.utilization_pct)} hint={`Capacity ${fmtInt(g.capacity_kg)} kg`} tone="info" />
        <KpiCard icon={Truck} label="Total Receipts" value={fmtInt(g.receipts_kg)} unit="kg" tone="violet" />
        <KpiCard icon={ArrowUpRight} label="Total Dispatched" value={fmtInt(Math.abs(g.dispatches_kg))} unit="kg" hint={`${inTransit.length} in transit`} tone="teal" />
        <KpiCard icon={Store} label="Shops Served" value={shops.length} tone="success" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <Panel title="Record Receipt"><ReceiptForm godownId={g.id} lookup={core} /></Panel>
        <Panel title="Dispatch to Shop"><DispatchForm godownId={g.id} shops={shops} lookup={core} available={g.expected_stock_kg} /></Panel>
        <Panel title="Stock Adjustment"><AdjustmentForm type="godown" id={g.id} lookup={core} /></Panel>
        <Panel title="Physical Inspection"><MeasurementForm type="godown" id={g.id} lookup={core} /></Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Linked Shops">
          <DataTable head={<><Th>Shop</Th><Th className="text-right">Stock kg</Th><Th className="text-right">Avg monthly</Th><Th>Status</Th></>}>
            {shops.map((s) => (
              <tr key={s.id}>
                <Td><Link to="/shops/$shopId" params={{ shopId: s.id }} className="font-semibold text-primary hover:underline">{s.name}</Link> <span className="font-mono text-[10px] text-muted-foreground">{s.id}</span></Td>
                <Td className="text-right">{fmtInt(s.expected_stock_kg)}</Td>
                <Td className="text-right">{fmtInt(s.avg_monthly_dist_kg)}</Td>
                <Td><StatusBadge status={s.status} /></Td>
              </tr>
            ))}
          </DataTable>
        </Panel>
        <Panel title="Stock Ledger"><MovementsTable type="godown" id={g.id} /></Panel>
      </div>
      <Panel title="Dispatches" className="mt-4"><div className="max-h-[420px] overflow-y-auto"><DeliveriesTable deliveries={deliveries.slice(0, 60)} shopName={shopName} /></div></Panel>
      <Panel title="Physical Inspections" className="mt-4"><ReconciliationTable rows={recon} /></Panel>
    </div>
  );
}
