import { createFileRoute, Link } from "@tanstack/react-router";
import { ensureCore, useCore } from "@/lib/core";
import { fmtInt, fmtPct } from "@/lib/format";
import { DataTable, PageHeader, PageLoading, Panel, RouteError, Td, Th } from "@/components/srt/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/godowns/")({
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "Godowns — Smart Ration Tracker" },
      { name: "description", content: "Capacity, ledger stock and utilisation for every rice godown in the Tamil Nadu demo dataset." },
      { property: "og:title", content: "Godowns — Smart Ration Tracker" },
      { property: "og:description", content: "Rice godown capacity and stock for Tamil Nadu PDS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: GodownsPage,
});

function GodownsPage() {
  const core = useCore();
  const dName = (id: number) => core.districts.find((d) => d.id === id)?.name ?? "—";
  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader title="Godowns" subtitle={`${core.godowns.length} storage godowns · stock derived from the movement ledger`} crumbs={[{ label: "Dashboard", to: "/" }, { label: "Godowns" }]} />
      <Panel>
        <DataTable head={<><Th>Godown</Th><Th>District</Th><Th className="text-right">Capacity</Th><Th className="text-right">Opening</Th><Th className="text-right">Receipts</Th><Th className="text-right">Dispatches</Th><Th className="text-right">Adjust.</Th><Th className="text-right">Expected</Th><Th className="w-40">Utilisation</Th></>}>
          {core.godowns.map((g) => (
            <tr key={g.id} className="hover:bg-muted/60">
              <Td><Link to="/godowns/$godownId" params={{ godownId: g.id }} className="font-semibold text-primary hover:underline">{g.name}</Link><div className="font-mono text-[10px] text-muted-foreground">{g.id}</div></Td>
              <Td>{dName(g.district_id)}</Td>
              <Td className="text-right">{fmtInt(g.capacity_kg)}</Td>
              <Td className="text-right">{fmtInt(g.opening_stock_kg)}</Td>
              <Td className="text-right text-success">+{fmtInt(g.receipts_kg)}</Td>
              <Td className="text-right text-danger">−{fmtInt(Math.abs(g.dispatches_kg))}</Td>
              <Td className="text-right">{fmtInt(g.adjustments_kg)}</Td>
              <Td className="text-right font-bold">{fmtInt(g.expected_stock_kg)}</Td>
              <Td><UtilBar pct={g.utilization_pct} /></Td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}

function UtilBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", pct > 90 ? "bg-danger" : pct > 75 ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <span className="w-12 text-right text-[11px]">{fmtPct(pct)}</span>
    </div>
  );
}
