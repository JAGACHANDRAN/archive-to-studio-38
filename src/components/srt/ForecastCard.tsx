import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { calculateReplenishment, PLANNING_LABEL } from "@/lib/forecast";
import { canDo, hasRole, locationAccessError, type LocationLookup } from "@/lib/rbac";
import { useLedgerMutation } from "@/lib/mutations";
import type { Delivery, MonthlyDist, ShopStock } from "@/lib/data";
import { shopForecastInputs } from "@/lib/summary";
import { fmtKg } from "@/lib/format";

export function ForecastCard({ shop, monthly, deliveries, lookup }: { shop: ShopStock; monthly: MonthlyDist[]; deliveries: Delivery[]; lookup: LocationLookup }) {
  const { actor } = useAuth();
  const inputs = shopForecastInputs(shop, monthly, deliveries);
  const run = useLedgerMutation<{ _shop_id: string }>("run_forecast");
  if (!inputs.recent.length) return <p className="text-xs text-muted-foreground">Not enough distribution history to forecast.</p>;
  const f = calculateReplenishment(inputs.recent, shop.expected_stock_kg, inputs.plannedIncoming);
  const canSave = hasRole(actor, canDo.runForecast) && !locationAccessError(actor, "shop", shop.id, lookup);
  return (
    <div className="space-y-3 text-xs">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Row label={`Predicted demand (${f.lookbackMonthsUsed}-mo avg)`} value={fmtKg(f.predictedDemandKg)} />
        <Row label="Safety buffer (10%)" value={fmtKg(f.safetyBufferKg)} />
        <Row label="Usable stock" value={fmtKg(f.usableStockKg)} />
        <Row label="Planned incoming" value={fmtKg(f.plannedIncomingKg)} />
      </dl>
      <div className="rounded-lg bg-primary-soft p-3">
        <p className="text-[11px] font-semibold text-primary">Recommended replenishment</p>
        <p className="text-xl font-extrabold text-foreground tabular">{fmtKg(f.recommendedReplenishmentKg)}</p>
        <p className="mt-1 text-[10px] italic text-muted-foreground">{PLANNING_LABEL}</p>
      </div>
      {canSave && (
        <Button size="sm" variant="outline" onClick={() => run.mutate({ _shop_id: shop.id })} disabled={run.isPending}>
          {run.isPending ? "Saving…" : "Save forecast run"}
        </Button>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="font-bold tabular">{value}</dd>
    </div>
  );
}
