import { useQuery } from "@tanstack/react-query";
import { auditQuery, movementsQuery, type Delivery, type Reconciliation } from "@/lib/data";
import { fmtDate, fmtDateTime, fmtInt, fmtNum2, fmtSigned } from "@/lib/format";
import { DataTable, Empty, StatusBadge, Td, Th } from "./primitives";
import { cn } from "@/lib/utils";

const MOVE_TONE: Record<string, string> = {
  RECEIPT: "text-success",
  DELIVERY_IN: "text-success",
  CONFIRMED_DELIVERY: "text-success",
  DISPATCH: "text-danger",
  DISTRIBUTION: "text-danger",
  ADJUSTMENT: "text-warning-foreground",
};

const OUTFLOW = new Set(["DISPATCH", "DISTRIBUTION"]);

export function MovementsTable({ type, id }: { type: "godown" | "shop"; id: string }) {
  const { data = [], isLoading } = useQuery(movementsQuery(type, id));
  if (isLoading) return <Empty>Loading movements…</Empty>;
  if (!data.length) return <Empty>No stock movements yet.</Empty>;
  return (
    <div className="max-h-[420px] overflow-y-auto">
      <DataTable head={<><Th>When</Th><Th>Type</Th><Th className="text-right">Qty</Th><Th>Reference</Th><Th>By</Th></>}>
        {data.map((m) => (
          <tr key={m.id}>
            <Td className="whitespace-nowrap">{fmtDateTime(m.timestamp)}</Td>
            <Td className={cn("font-semibold", MOVE_TONE[m.movement_type])}>{m.movement_type.replace(/_/g, " ")}</Td>
            <Td className="text-right">{fmtSigned(OUTFLOW.has(m.movement_type) ? -Math.abs(m.quantity_kg) : m.movement_type === "ADJUSTMENT" ? m.quantity_kg : Math.abs(m.quantity_kg))}</Td>
            <Td className="font-mono text-[11px] text-muted-foreground">{m.reference_id ?? "—"}</Td>
            <Td className="text-muted-foreground">{m.created_by}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

export function DeliveriesTable({ deliveries, shopName, actions }: { deliveries: Delivery[]; shopName?: (id: string) => string; actions?: (d: Delivery) => React.ReactNode }) {
  if (!deliveries.length) return <Empty>No deliveries.</Empty>;
  return (
    <DataTable head={<><Th>ID</Th><Th>From → To</Th><Th className="text-right">Dispatched</Th><Th className="text-right">Received</Th><Th>Dispatched</Th><Th>Expected</Th><Th>Status</Th>{actions && <Th>Action</Th>}</>}>
      {deliveries.map((d) => (
        <tr key={d.id}>
          <Td className="font-mono text-[11px]">{d.id}</Td>
          <Td className="whitespace-nowrap"><span className="text-muted-foreground">{d.from_godown_id} →</span> {shopName ? shopName(d.to_shop_id) : d.to_shop_id}</Td>
          <Td className="text-right">{fmtInt(d.dispatched_qty_kg)}</Td>
          <Td className="text-right">{d.received_date ? fmtInt(d.received_qty_kg) : "—"}</Td>
          <Td className="whitespace-nowrap">{fmtDate(d.dispatched_date)}</Td>
          <Td className="whitespace-nowrap">{fmtDate(d.expected_delivery_date)}</Td>
          <Td><StatusBadge status={d.status} />{d.notes && <p className="mt-1 max-w-[200px] text-[10px] text-muted-foreground">{d.notes}</p>}</Td>
          {actions && <Td>{actions(d)}</Td>}
        </tr>
      ))}
    </DataTable>
  );
}

export function ReconciliationTable({ rows }: { rows: Reconciliation[] }) {
  if (!rows.length) return <Empty>No physical inspections recorded.</Empty>;
  return (
    <DataTable head={<><Th>Date</Th><Th>Location</Th><Th className="text-right">Measured</Th><Th className="text-right">Expected</Th><Th className="text-right">Diff</Th><Th>Result</Th><Th>Inspector</Th></>}>
      {rows.map((r) => (
        <tr key={r.measurement_id}>
          <Td className="whitespace-nowrap">{fmtDate(r.measured_date)}</Td>
          <Td>{r.location_label}</Td>
          <Td className="text-right">{fmtInt(r.measured_stock_kg)}</Td>
          <Td className="text-right">{fmtInt(r.expected_stock_kg)}</Td>
          <Td className={cn("text-right font-semibold", r.discrepancy_detected ? "text-danger" : "text-muted-foreground")}>{fmtSigned(r.difference_kg)} ({fmtNum2(r.difference_pct)}%)</Td>
          <Td><span className={cn("text-[11px] font-semibold", r.discrepancy_detected ? "text-danger" : "text-success")}>{r.status_label}</span></Td>
          <Td className="text-muted-foreground">{r.inspector_name}</Td>
        </tr>
      ))}
    </DataTable>
  );
}

export function AuditList({ limit = 15 }: { limit?: number }) {
  const { data = [] } = useQuery(auditQuery(limit));
  if (!data.length) return <Empty>No audit entries yet.</Empty>;
  return (
    <ul className="divide-y divide-border">
      {data.map((a) => (
        <li key={a.id} className="py-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="font-semibold text-foreground">{a.action.replace(/_/g, " ")} · {a.entity_type} {a.entity_id}</span>
            <span className="whitespace-nowrap text-[10px] text-muted-foreground">{fmtDateTime(a.timestamp)}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{a.username} — {a.details}</p>
        </li>
      ))}
    </ul>
  );
}
