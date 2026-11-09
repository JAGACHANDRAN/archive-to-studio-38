import { predictionsSearch } from "@/lib/search";
import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, PackagePlus, Store } from "lucide-react";
import { ensureCore, useCore } from "@/lib/core";
import { backtest, calculateReplenishment, PLANNING_LABEL } from "@/lib/forecast";
import { availableMonths, shopForecastInputs } from "@/lib/summary";
import { predictionsQuery } from "@/lib/data";
import { fmtDateTime, fmtInt, fmtNum2, monthLabel } from "@/lib/format";
import { DataTable, Empty, KpiCard, PageHeader, PageLoading, Panel, RouteError, StatusBadge, Td, Th } from "@/components/srt/primitives";

export const Route = createFileRoute("/predictions")({
  validateSearch: (s: Record<string, unknown>) => predictionsSearch.parse(s),
  loader: ({ context }) => ensureCore(context.queryClient),
  head: () => ({
    meta: [
      { title: "Replenishment Predictions — Smart Ration Tracker" },
      { name: "description", content: "Moving-average demand forecast, safety buffer and recommended replenishment for every fair price shop." },
      { property: "og:title", content: "Replenishment Predictions — Smart Ration Tracker" },
      { property: "og:description", content: "Shop-level rice demand forecasts and replenishment recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: PredictionsPage,
});

function PredictionsPage() {
  const core = useCore();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/predictions" });
  const { data: saved = [] } = useQuery(predictionsQuery());
  const months = availableMonths(core.monthly);
  const target = months[months.length - 1] ?? "";
  const bt = useMemo(() => backtest(core.monthly, target, 4), [core.monthly, target]);
  const plans = useMemo(
    () =>
      core.shops.flatMap((s) => {
        const inp = shopForecastInputs(s, core.monthly, core.deliveries);
        if (!inp.recent.length) return [];
        return [{ shop: s, f: calculateReplenishment(inp.recent, s.expected_stock_kg, inp.plannedIncoming) }];
      }),
    [core],
  );
  const visible = plans.filter((p) => (!search.district || p.shop.district_id === search.district) && (!search.needOnly || p.f.recommendedReplenishmentKg > 0));
  const totalNeed = visible.reduce((a, p) => a + p.f.recommendedReplenishmentKg, 0);
  const sel = "h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold shadow-card outline-none focus:border-primary";

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader title="Replenishment Predictions" subtitle={PLANNING_LABEL} crumbs={[{ label: "Dashboard", to: "/" }, { label: "Predictions" }]} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={PackagePlus} label="Total Recommended" value={fmtInt(totalNeed)} unit="kg" hint={`${visible.filter((p) => p.f.recommendedReplenishmentKg > 0).length} shops need stock`} />
        <KpiCard icon={Store} label="Shops Forecast" value={visible.length} hint="4-month moving average" tone="teal" />
        <KpiCard icon={Target} label="Back-test MAE" value={fmtInt(bt.mae)} unit="kg" hint={`${bt.shopsEvaluated} shops · ${monthLabel(target)}`} tone="info" />
        <KpiCard icon={TrendingUp} label="Back-test MAPE" value={`${fmtNum2(bt.mape)}%`} hint="Mean absolute % error" tone="violet" />
      </div>
      <Panel
        className="mt-4"
        title="Shop Recommendations"
        action={
          <div className="flex items-center gap-2">
            <select className={sel} value={search.district ?? ""} onChange={(e) => navigate({ search: (p) => ({ ...p, district: Number(e.target.value) || undefined }) })}>
              <option value="">All districts</option>
              {core.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <input type="checkbox" checked={!!search.needOnly} onChange={(e) => navigate({ search: (p) => ({ ...p, needOnly: e.target.checked }) })} /> Needs stock only
            </label>
          </div>
        }
      >
        <div className="max-h-[560px] overflow-y-auto">
          <DataTable head={<><Th>Shop</Th><Th>Status</Th><Th className="text-right">Predicted demand</Th><Th className="text-right">Buffer</Th><Th className="text-right">Usable stock</Th><Th className="text-right">Incoming</Th><Th className="text-right">Recommended</Th></>}>
            {visible.map(({ shop, f }) => (
              <tr key={shop.id}>
                <Td><Link to="/shops/$shopId" params={{ shopId: shop.id }} className="font-semibold text-primary hover:underline">{shop.name}</Link><div className="font-mono text-[10px] text-muted-foreground">{shop.id}</div></Td>
                <Td><StatusBadge status={shop.status} /></Td>
                <Td className="text-right">{fmtInt(f.predictedDemandKg)}</Td>
                <Td className="text-right">{fmtInt(f.safetyBufferKg)}</Td>
                <Td className="text-right">{fmtInt(f.usableStockKg)}</Td>
                <Td className="text-right">{fmtInt(f.plannedIncomingKg)}</Td>
                <Td className="text-right text-sm font-extrabold">{f.recommendedReplenishmentKg > 0 ? fmtInt(f.recommendedReplenishmentKg) : <span className="text-xs font-semibold text-success">Sufficient</span>}</Td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Panel>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title={`Back-test · forecast ${monthLabel(target)} from prior 4 months`}>
          <div className="max-h-[360px] overflow-y-auto">
            <DataTable head={<><Th>Shop</Th><Th className="text-right">Predicted</Th><Th className="text-right">Actual</Th><Th className="text-right">Abs error</Th><Th className="text-right">% error</Th></>}>
              {bt.results.map((r) => (
                <tr key={r.shopId}><Td className="font-mono text-[11px]">{r.shopId}</Td><Td className="text-right">{fmtInt(r.predicted)}</Td><Td className="text-right">{fmtInt(r.actual)}</Td><Td className="text-right">{fmtInt(r.absError)}</Td><Td className="text-right">{fmtNum2(r.pctError)}%</Td></tr>
              ))}
            </DataTable>
          </div>
        </Panel>
        <Panel title="Saved Forecast Runs">
          {saved.length ? (
            <DataTable head={<><Th>When</Th><Th>Shop</Th><Th className="text-right">Demand</Th><Th className="text-right">Recommended</Th><Th>By</Th></>}>
              {saved.map((p) => (
                <tr key={p.id}><Td className="whitespace-nowrap">{fmtDateTime(p.run_date)}</Td><Td className="font-mono text-[11px]">{p.shop_id}</Td><Td className="text-right">{fmtInt(p.predicted_demand_kg)}</Td><Td className="text-right font-bold">{fmtInt(p.recommended_replenishment_kg)}</Td><Td className="text-muted-foreground">{p.created_by ?? "—"}</Td></tr>
              ))}
            </DataTable>
          ) : (
            <Empty>No saved runs yet. Open a shop and choose “Save forecast run”.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}
