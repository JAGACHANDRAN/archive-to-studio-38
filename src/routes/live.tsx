import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Zap, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureCore, useCore } from "@/lib/core";
import { LEDGER_KEYS, sourcesQuery, transactionsQuery } from "@/lib/data";
import { fmtDateTime, rpcErrorMessage } from "@/lib/format";
import { pickRapidDrain, simulatePurchase } from "@/lib/simulator";
import { useAuth } from "@/hooks/use-auth";
import { canDo, hasRole } from "@/lib/rbac";
import { useLedgerMutation } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { DataTable, Empty, PageHeader, PageLoading, Panel, RouteError, SignInHint, Td, Th } from "@/components/srt/primitives";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COMMODITY = ["", "Rice", "Wheat", "Sugar", "Toor Dal", "Palm Oil"];

export const Route = createFileRoute("/live")({
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "Live Feed — Smart Ration Tracker" },
      { name: "description", content: "Real-time point-of-sale transactions from the simulator, weighing scales or camera detection." },
      { property: "og:title", content: "Live Feed — Smart Ration Tracker" },
      { property: "og:description", content: "Live ration shop transactions and data source status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: LivePage,
});

function LivePage() {
  const core = useCore();
  const { actor, session } = useAuth();
  const qc = useQueryClient();
  const { data: txns = [] } = useQuery({ ...transactionsQuery(), refetchInterval: 4000 });
  const { data: sources = [] } = useQuery(sourcesQuery());
  const [running, setRunning] = useState(false);
  const [interval, setIntervalSec] = useState(2);
  const [ticks, setTicks] = useState(0);
  const rapid = useRef<string[]>([]);
  const canSim = hasRole(actor, canDo.simulate);
  const activate = useLedgerMutation<{ _source_name: string }>("activate_data_source");

  const tick = async () => {
    const args = simulatePurchase(core.shops, rapid.current);
    if (!args) return;
    const { data, error } = await supabase.rpc("ingest_transaction", args);
    if (error) {
      setRunning(false);
      toast.error(rpcErrorMessage(error));
      return;
    }
    setTicks((t) => t + 1);
    const res = data as { alert_triggered?: { id: string } | null };
    if (res?.alert_triggered) toast.warning(`Low stock alert raised for ${args._shop_id}`);
    for (const key of LEDGER_KEYS) qc.invalidateQueries({ queryKey: key as readonly unknown[] });
  };

  useEffect(() => {
    if (!running) return;
    if (!rapid.current.length) rapid.current = pickRapidDrain(core.shops);
    const id = window.setInterval(() => void tick(), Math.max(0.5, interval) * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, interval]);

  const active = sources.find((s) => s.is_active)?.source_name ?? "simulator";
  const shopName = (id: string) => core.shops.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader title="Live Feed" subtitle="Point-of-sale transactions decrement shop stock and append to the ledger as they arrive" crumbs={[{ label: "Dashboard", to: "/" }, { label: "Live Feed" }]} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Live Simulator">
          {!session ? (
            <SignInHint what="Sign in as State Admin or Data Entry Officer to run the simulator." />
          ) : !canSim ? (
            <p className="text-xs text-muted-foreground">Only State Admin and Data Entry Officer accounts can run the simulator.</p>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", running ? "animate-pulse bg-success" : "bg-muted-foreground/40")} />
                <span className="font-semibold">{running ? `Running · ${ticks} transactions` : "Stopped"}</span>
              </div>
              <label className="flex items-center gap-2">
                Every
                <input type="number" min={0.5} max={30} step={0.5} value={interval} onChange={(e) => setIntervalSec(Number(e.target.value) || 2)} className="h-8 w-16 rounded-lg border border-input bg-card px-2" /> seconds
              </label>
              <div className="flex flex-wrap gap-2">
                {running ? (
                  <Button size="sm" variant="outline" onClick={() => setRunning(false)}><Square className="size-3.5" />Stop</Button>
                ) : (
                  <Button size="sm" onClick={() => { setTicks(0); setRunning(true); }}><Play className="size-3.5" />Start</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => void tick()} disabled={running}><Zap className="size-3.5" />Single tick</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Runs while this page is open. 35% of purchases target a few "rapid drain" shops to exercise low-stock alerts.</p>
            </div>
          )}
        </Panel>
        <Panel title="Data Sources">
          <ul className="space-y-2 text-xs">
            {(["simulator", "sensor", "ml_camera"] as const).map((name) => (
              <li key={name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="flex items-center gap-2 font-semibold"><Radio className={cn("size-3.5", active === name ? "text-success" : "text-muted-foreground")} />{name === "ml_camera" ? "Camera ML" : name === "sensor" ? "Weighing sensor" : "Simulator"}</span>
                {active === name ? (
                  <span className="text-[11px] font-bold text-success">Active</span>
                ) : hasRole(actor, canDo.activateSource) ? (
                  <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={activate.isPending} onClick={() => activate.mutate({ _source_name: name })}>Activate</Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Inactive</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">External devices post to the ingestion API — see <Link to="/settings" className="font-semibold text-primary hover:underline">Settings</Link>.</p>
        </Panel>
        <Panel title="Feed Summary">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-[10px] font-semibold text-muted-foreground">Recent transactions</dt><dd className="text-lg font-extrabold tabular">{txns.length}</dd></div>
            <div><dt className="text-[10px] font-semibold text-muted-foreground">Last received</dt><dd className="font-bold">{txns[0] ? fmtDateTime(txns[0].timestamp) : "—"}</dd></div>
            <div><dt className="text-[10px] font-semibold text-muted-foreground">Active source</dt><dd className="font-bold">{active}</dd></div>
            <div><dt className="text-[10px] font-semibold text-muted-foreground">Open alerts</dt><dd className="font-bold">{core.alerts.filter((a) => a.status === "OPEN").length}</dd></div>
          </dl>
        </Panel>
      </div>
      <Panel title="Latest Transactions" className="mt-4" action={<span className="text-[10px] text-muted-foreground">Refreshes every 4 s</span>}>
        {txns.length ? (
          <DataTable head={<><Th>When</Th><Th>Txn</Th><Th>Shop</Th><Th>Item</Th><Th className="text-right">Qty</Th><Th className="text-right">Bags</Th><Th>Card</Th><Th>Source</Th></>}>
            {txns.map((t) => (
              <tr key={t.id}>
                <Td className="whitespace-nowrap">{fmtDateTime(t.timestamp)}</Td>
                <Td className="font-mono text-[11px]">{t.id}</Td>
                <Td><Link to="/shops/$shopId" params={{ shopId: t.shop_id }} className="text-primary hover:underline">{shopName(t.shop_id)}</Link></Td>
                <Td>{COMMODITY[t.item_id] ?? t.item_id}</Td>
                <Td className="text-right">{t.qty_kg}</Td>
                <Td className="text-right">{t.bags}</Td>
                <Td className="font-mono text-[11px]">{t.card_no}</Td>
                <Td className="text-muted-foreground">{t.source}</Td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <Empty>No live transactions yet. Start the simulator or connect a device.</Empty>
        )}
      </Panel>
    </div>
  );
}
