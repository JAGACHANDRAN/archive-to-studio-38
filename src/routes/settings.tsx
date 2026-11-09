import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { canDo, ROLE_LABELS, type AppRole } from "@/lib/rbac";
import { PLANNING_LABEL } from "@/lib/forecast";
import { PageHeader, Panel } from "@/components/srt/primitives";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Smart Ration Tracker" },
      { name: "description", content: "Business rules, role permissions and ingestion API reference for Smart Ration Tracker." },
      { property: "og:title", content: "Settings — Smart Ration Tracker" },
      { property: "og:description", content: "Business rules, roles and ingestion API reference." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const RULES = [
  ["Low stock", "Shop stock below 20% of its average monthly distribution"],
  ["Critical stock", "Shop stock below 10% of its average monthly distribution"],
  ["Inspection discrepancy", "Measured stock differs from the ledger by more than 2%"],
  ["Delayed delivery", "Undelivered more than 1 day after the expected date"],
  ["Forecast", "4-month moving average + 10% safety buffer − usable stock − planned incoming"],
  ["Stock balances", "Always derived from the movement ledger; never edited directly"],
  ["Deliveries", "Dispatch lowers godown stock immediately; shop stock rises only on confirmed receipt"],
];

const ACTIONS: [keyof typeof canDo, string][] = [
  ["receipt", "Record godown receipts"],
  ["dispatch", "Dispatch to shops"],
  ["confirmDelivery", "Confirm delivery receipt"],
  ["distribution", "Record distribution"],
  ["adjustment", "Stock adjustments"],
  ["measurement", "Physical inspections"],
  ["scanAlerts", "Run alert scan"],
  ["runForecast", "Save forecast runs"],
  ["simulate", "Run simulator / ingest"],
  ["activateSource", "Switch data source"],
];
const ROLES = Object.keys(ROLE_LABELS) as AppRole[];

function SettingsPage() {
  const { actor, session } = useAuth();
  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Settings" subtitle="Rules, permissions and integrations" crumbs={[{ label: "Dashboard", to: "/" }, { label: "Settings" }]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Your Account">
          {session ? (
            <dl className="space-y-1.5 text-xs">
              <div><dt className="inline font-semibold text-muted-foreground">Signed in as: </dt><dd className="inline">{session.user.email}</dd></div>
              <div><dt className="inline font-semibold text-muted-foreground">Role: </dt><dd className="inline">{actor ? ROLE_LABELS[actor.role] : "Viewer (no operational role)"}</dd></div>
              {actor?.districtId && <div><dt className="inline font-semibold text-muted-foreground">District: </dt><dd className="inline">{actor.districtId}</dd></div>}
              {actor?.godownId && <div><dt className="inline font-semibold text-muted-foreground">Godown: </dt><dd className="inline">{actor.godownId}</dd></div>}
              {actor?.shopId && <div><dt className="inline font-semibold text-muted-foreground">Shop: </dt><dd className="inline">{actor.shopId}</dd></div>}
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">You're browsing as a guest. <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to make changes.</p>
          )}
        </Panel>
        <Panel title="Business Rules">
          <ul className="space-y-2 text-xs">
            {RULES.map(([k, v]) => (
              <li key={k}><span className="font-semibold text-foreground">{k}:</span> <span className="text-muted-foreground">{v}</span></li>
            ))}
            <li className="italic text-muted-foreground">{PLANNING_LABEL}</li>
          </ul>
        </Panel>
      </div>
      <Panel title="Role Permissions" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-[10px] uppercase text-muted-foreground">Action</th>
                {ROLES.map((r) => <th key={r} className="px-2 py-2 text-center text-[10px] uppercase text-muted-foreground">{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ACTIONS.map(([key, label]) => (
                <tr key={key}>
                  <td className="px-2 py-2 font-medium">{label}</td>
                  {ROLES.map((r) => <td key={r} className="px-2 py-2 text-center">{(canDo[key] as readonly AppRole[]).includes(r) ? <span className="font-bold text-success">✓</span> : <span className="text-muted-foreground/50">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Every action is also limited to the user's assigned district, godown or shop, and every change is written to the audit trail.</p>
      </Panel>
      <Panel title="Ingestion API (weighing scales, camera ML, external simulators)" className="mt-4">
        <div className="space-y-3 text-xs text-foreground/85">
          <p>Devices send readings with the header <code className="rounded bg-muted px-1 font-mono">X-Ingest-Key</code> set to the ingestion key held by the administrator.</p>
          <pre className="overflow-x-auto rounded-lg bg-sidebar p-3 font-mono text-[11px] text-sidebar-accent-foreground">{`POST /api/public/ingest/transaction
{ "shop_id": "FPS-0001", "item_id": 1, "qty_kg": 10, "bags": 2,
  "card_no": "TN-01-1234567", "source": "sensor" }

POST /api/public/ingest/stock
{ "location_type": "shop", "location_id": "FPS-0001", "item_id": 1,
  "qty_kg": 820.5, "source": "ml_camera" }

GET  /api/public/transactions/live?limit=50&shop_id=FPS-0001
GET  /api/public/ingest/sources`}</pre>
        </div>
      </Panel>
    </div>
  );
}
