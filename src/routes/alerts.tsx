import { alertsSearch } from "@/lib/search";
import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { ensureCore, useCore } from "@/lib/core";
import { fmtDateTime } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { canDo, hasRole, locationAccessError, ROLE_LABELS, type AppRole } from "@/lib/rbac";
import { useLedgerMutation } from "@/lib/mutations";
import type { Alert } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Empty, PageHeader, PageLoading, Panel, RouteError, SignInHint, StatusBadge } from "@/components/srt/primitives";

const STATUSES = ["ACTIVE", "OPEN", "UNDER_VERIFICATION", "RESOLVED", "ALL"] as const;
// Allowed transitions, as in the original alert workflow.
const NEXT: Record<Alert["status"], Alert["status"][]> = { OPEN: ["UNDER_VERIFICATION", "RESOLVED"], UNDER_VERIFICATION: ["RESOLVED", "OPEN"], RESOLVED: ["OPEN"] };

export const Route = createFileRoute("/alerts")({
  validateSearch: (s: Record<string, unknown>) => alertsSearch.parse(s),
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "Alerts — Smart Ration Tracker" },
      { name: "description", content: "Low stock, delayed delivery, discrepancy and missing-data alerts with a verification workflow." },
      { property: "og:title", content: "Alerts — Smart Ration Tracker" },
      { property: "og:description", content: "PDS stock and delivery alerts with verification workflow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: AlertsPage,
});

function locationLink(a: Alert) {
  if (a.location_type === "shop") return <Link to="/shops/$shopId" params={{ shopId: a.location_id }} className="font-semibold text-primary hover:underline">{a.location_id}</Link>;
  if (a.location_type === "godown") return <Link to="/godowns/$godownId" params={{ godownId: a.location_id }} className="font-semibold text-primary hover:underline">{a.location_id}</Link>;
  return <span className="font-semibold">{a.location_id}</span>;
}

function AlertsPage() {
  const core = useCore();
  const { actor, session } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/alerts" });
  const scan = useLedgerMutation<Record<string, never>>("scan_alerts");
  const view = search.status ?? "ACTIVE";
  const rows = useMemo(
    () => core.alerts.filter((a) => (view === "ALL" ? true : view === "ACTIVE" ? a.status !== "RESOLVED" : a.status === view)),
    [core.alerts, view],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of core.alerts.filter((x) => x.status !== "RESOLVED")) c[a.alert_type] = (c[a.alert_type] ?? 0) + 1;
    return c;
  }, [core.alerts]);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Alerts"
        subtitle="Generated from ledger rules: low/critical stock, delayed deliveries, inspection discrepancies and missing data"
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Alerts" }]}
        actions={hasRole(actor, canDo.scanAlerts) ? (
          <Button size="sm" onClick={() => scan.mutate({})} disabled={scan.isPending}><RefreshCw className="size-3.5" />{scan.isPending ? "Scanning…" : "Run alert scan"}</Button>
        ) : null}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(counts).map(([k, v]) => (
          <span key={k} className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold shadow-card">{k.replace(/_/g, " ")} · {v}</span>
        ))}
      </div>
      <div className="mb-3 flex overflow-hidden rounded-lg border border-border bg-card w-fit">
        {STATUSES.map((st) => (
          <button key={st} onClick={() => navigate({ search: { status: st } })} className={`px-3 py-1.5 text-xs font-semibold ${view === st ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            {st === "ACTIVE" ? "Active" : st === "ALL" ? "All" : st.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>
      {!session && <div className="mb-3"><SignInHint what="Sign in to verify or resolve alerts assigned to your role." /></div>}
      <div className="space-y-3">
        {rows.map((a) => <AlertCard key={a.id} alert={a} lookup={core} actorRole={actor?.role} />)}
        {!rows.length && <Panel><Empty>No alerts in this view.</Empty></Panel>}
      </div>
    </div>
  );
}

function AlertCard({ alert: a, lookup, actorRole }: { alert: Alert; lookup: ReturnType<typeof useCore>; actorRole?: AppRole | undefined }) {
  const { actor } = useAuth();
  const [notes, setNotes] = useState("");
  const update = useLedgerMutation<{ _alert_id: string; _new_status: string; _notes: string }>("update_alert_status", { onDone: () => setNotes("") });
  const allowed = actorRole && hasRole(actor, canDo.actOnAlert) && !locationAccessError(actor, a.location_type as "shop" | "godown", a.location_id, lookup, "update alerts for");
  return (
    <Panel>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={a.severity} />
            <span className="text-sm font-bold text-foreground">{a.alert_type.replace(/_/g, " ")}</span>
            <span className="text-xs text-muted-foreground">· {a.location_type}</span> {locationLink(a)}
            <span className="font-mono text-[10px] text-muted-foreground">{a.id}</span>
          </div>
          <p className="mt-1.5 text-xs text-foreground/80">{a.explanation}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Raised {fmtDateTime(a.timestamp)} · assigned to {ROLE_LABELS[a.assigned_role as AppRole] ?? a.assigned_role}{a.resolution_date ? ` · resolved ${fmtDateTime(a.resolution_date)}` : ""}</p>
          {a.verification_notes && <p className="mt-1.5 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">Notes: {a.verification_notes}</p>}
        </div>
        <StatusBadge status={a.status} />
      </div>
      {allowed && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Verification notes (required)" className="h-8 min-w-[240px] flex-1 rounded-lg border border-input bg-card px-3 text-xs outline-none focus:border-primary" />
          {NEXT[a.status].map((st) => (
            <Button key={st} size="sm" variant={st === "RESOLVED" ? "default" : "outline"} disabled={update.isPending || notes.trim().length < 3} onClick={() => update.mutate({ _alert_id: a.id, _new_status: st, _notes: notes.trim() })}>
              {st === "UNDER_VERIFICATION" ? "Start verification" : st === "RESOLVED" ? "Resolve" : "Reopen"}
            </Button>
          ))}
        </div>
      )}
    </Panel>
  );
}
