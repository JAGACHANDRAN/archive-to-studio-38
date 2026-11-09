import { useSuspenseQueries, type QueryClient } from "@tanstack/react-query";
import {
  alertsQuery, deliveriesQuery, districtsQuery, godownStockQuery, monthlyQuery, receiptsQuery, reconciliationQuery, shopStockQuery,
} from "./data";

const coreQueries = () => [
  districtsQuery(), godownStockQuery(), shopStockQuery(), monthlyQuery(), deliveriesQuery(), reconciliationQuery(), alertsQuery(), receiptsQuery(),
] as const;

/** Prime the shared ledger data used by most pages. */
export function ensureCore(queryClient: QueryClient) {
  return Promise.all(coreQueries().map((q) => queryClient.ensureQueryData(q as never)));
}

export function useCore() {
  const [d, g, s, m, del, rec, al, rc] = useSuspenseQueries({ queries: coreQueries() as never }) as unknown as [
    { data: Awaited<ReturnType<NonNullable<ReturnType<typeof districtsQuery>["queryFn"]>>> },
    { data: Awaited<ReturnType<NonNullable<ReturnType<typeof godownStockQuery>["queryFn"]>>> },
    { data: Awaited<ReturnType<NonNullable<ReturnType<typeof shopStockQuery>["queryFn"]>>> },
    { data: Awaited<ReturnType<NonNullable<ReturnType<typeof monthlyQuery>["queryFn"]>>> },
    { data: Awaited<ReturnType<NonNullable<ReturnType<typeof deliveriesQuery>["queryFn"]>>> },
    { data: Awaited<ReturnType<NonNullable<ReturnType<typeof reconciliationQuery>["queryFn"]>>> },
    { data: Awaited<ReturnType<NonNullable<ReturnType<typeof alertsQuery>["queryFn"]>>> },
    { data: Awaited<ReturnType<NonNullable<ReturnType<typeof receiptsQuery>["queryFn"]>>> },
  ];
  return {
    districts: d.data,
    godowns: g.data,
    shops: s.data,
    monthly: m.data,
    deliveries: del.data,
    reconciliation: rec.data,
    alerts: al.data,
    receipts: rc.data,
  };
}
