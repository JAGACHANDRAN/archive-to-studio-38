import { deliveriesSearch } from "@/lib/search";
import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ensureCore, useCore } from "@/lib/core";
import { PageHeader, PageLoading, Panel, RouteError } from "@/components/srt/primitives";
import { AuditList, DeliveriesTable, ReconciliationTable } from "@/components/srt/tables";

const STATUSES = ["ALL", "PENDING", "DELAYED", "DELIVERED", "RECEIVED_WITH_DIFFERENCE"] as const;

export const Route = createFileRoute("/transactions")({
  validateSearch: (s: Record<string, unknown>) => deliveriesSearch.parse(s),
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "Stock Movements — Smart Ration Tracker" },
      { name: "description", content: "Godown-to-shop deliveries, physical inspections and the audit trail for every stock change." },
      { property: "og:title", content: "Stock Movements — Smart Ration Tracker" },
      { property: "og:description", content: "Deliveries, inspections and audit trail for Tamil Nadu PDS stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: TransactionsPage,
});

function TransactionsPage() {
  const core = useCore();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/transactions" });
  const status = search.status ?? "ALL";
  const limit = search.limit ?? 100;
  const filtered = useMemo(() => core.deliveries.filter((d) => status === "ALL" || d.status === status), [core.deliveries, status]);
  const shopName = (id: string) => core.shops.find((s) => s.id === id)?.name ?? id;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, s === "ALL" ? core.deliveries.length : core.deliveries.filter((d) => d.status === s).length]));

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader title="Stock Movements" subtitle="Dispatch lowers godown stock immediately; shop stock rises only when the shop confirms receipt" crumbs={[{ label: "Dashboard", to: "/" }, { label: "Stock Movements" }]} />
      <Panel
        title={`Deliveries (${filtered.length})`}
        action={
          <div className="flex flex-wrap overflow-hidden rounded-lg border border-border">
            {STATUSES.map((st) => (
              <button key={st} onClick={() => navigate({ search: (p) => ({ ...p, status: st }) })} className={`px-2.5 py-1 text-[11px] font-semibold ${status === st ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                {st === "ALL" ? "All" : st === "RECEIVED_WITH_DIFFERENCE" ? "With difference" : st.charAt(0) + st.slice(1).toLowerCase()} · {counts[st]}
              </button>
            ))}
          </div>
        }
      >
        <DeliveriesTable deliveries={filtered.slice(0, limit)} shopName={shopName} />
        {filtered.length > limit && (
          <button onClick={() => navigate({ search: (p) => ({ ...p, limit: (p.limit ?? 100) + 100 }) })} className="mt-3 w-full rounded-lg border border-border py-2 text-xs font-semibold text-primary hover:bg-muted">
            Show more ({filtered.length - limit} remaining)
          </button>
        )}
      </Panel>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Physical Inspections vs Ledger"><ReconciliationTable rows={core.reconciliation} /></Panel>
        <Panel title="Audit Trail"><AuditList limit={25} /></Panel>
      </div>
    </div>
  );
}
