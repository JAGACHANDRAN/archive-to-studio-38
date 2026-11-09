import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { canDo, hasRole, locationAccessError, ROLE_LABELS, type AppRole, type LocationLookup, type LocationType } from "@/lib/rbac";
import { useLedgerMutation } from "@/lib/mutations";
import type { Delivery, ShopStock } from "@/lib/data";
import { fmtKg } from "@/lib/format";
import { SignInHint } from "./primitives";

const inputCls = "h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Decides whether the current user may run an action on a location, mirroring the database's rules. */
function useGate(allowed: readonly AppRole[], type: LocationType, id: string, lookup: LocationLookup, action: string) {
  const { actor, session } = useAuth();
  if (!session) return { ok: false as const, node: <SignInHint what={`Sign in with a ${allowed.map((r) => ROLE_LABELS[r]).join(" / ")} account to ${action}.`} /> };
  if (!hasRole(actor, allowed)) {
    return { ok: false as const, node: <p className="rounded-lg bg-muted p-3 text-[11px] text-muted-foreground">Your role ({actor ? ROLE_LABELS[actor.role] : "Viewer"}) cannot {action}. Allowed: {allowed.map((r) => ROLE_LABELS[r]).join(", ")}.</p> };
  }
  const denied = locationAccessError(actor, type, id, lookup, action);
  if (denied) return { ok: false as const, node: <p className="rounded-lg bg-danger-soft p-3 text-[11px] font-medium text-danger-foreground">{denied}</p> };
  return { ok: true as const, node: null };
}

function positive(v: string) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function ReceiptForm({ godownId, lookup }: { godownId: string; lookup: LocationLookup }) {
  const gate = useGate(canDo.receipt, "godown", godownId, lookup, "record receipts");
  const [qty, setQty] = useState("");
  const [ref, setRef] = useState("");
  const m = useLedgerMutation<{ _godown_id: string; _quantity_kg: number; _reference_id?: string | undefined }>("record_receipt", { onDone: () => { setQty(""); setRef(""); } });
  if (!gate.ok) return gate.node;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = positive(qty);
    if (!q) return;
    m.mutate({ _godown_id: godownId, _quantity_kg: q, _reference_id: ref.trim() || undefined });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Quantity received (kg)"><input className={inputCls} type="number" min="0.01" step="0.01" required value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Reference (truck / invoice no.)"><input className={inputCls} maxLength={60} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Optional" /></Field>
      <Button type="submit" size="sm" disabled={m.isPending}>{m.isPending ? "Saving…" : "Record receipt"}</Button>
    </form>
  );
}

export function DispatchForm({ godownId, shops, lookup, available }: { godownId: string; shops: ShopStock[]; lookup: LocationLookup; available: number }) {
  const gate = useGate(canDo.dispatch, "godown", godownId, lookup, "dispatch stock");
  const [shopId, setShopId] = useState(shops[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const m = useLedgerMutation<{ _godown_id: string; _shop_id: string; _quantity_kg: number; _expected_delivery_date?: string | undefined; _notes?: string | undefined }>("create_dispatch", { onDone: () => { setQty(""); setNotes(""); } });
  if (!gate.ok) return gate.node;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = positive(qty);
    if (!q || !shopId) return;
    m.mutate({ _godown_id: godownId, _shop_id: shopId, _quantity_kg: q, _expected_delivery_date: date ? new Date(date + "T00:00:00Z").toISOString() : undefined, _notes: notes.trim() || undefined });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Destination shop">
        <select className={inputCls} value={shopId} onChange={(e) => setShopId(e.target.value)}>
          {shops.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}
        </select>
      </Field>
      <Field label={`Quantity (kg) · available ${fmtKg(available)}`}><input className={inputCls} type="number" min="0.01" step="0.01" required value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Expected delivery date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Notes"><input className={inputCls} maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
      <Button type="submit" size="sm" disabled={m.isPending}>{m.isPending ? "Dispatching…" : "Create dispatch"}</Button>
    </form>
  );
}

export function ConfirmDeliveryForm({ delivery, lookup }: { delivery: Delivery; lookup: LocationLookup }) {
  const gate = useGate(canDo.confirmDelivery, "shop", delivery.to_shop_id, lookup, "confirm deliveries");
  const [qty, setQty] = useState(String(delivery.dispatched_qty_kg));
  const [notes, setNotes] = useState("");
  const m = useLedgerMutation<{ _delivery_id: string; _received_qty_kg: number; _notes?: string | undefined }>("confirm_delivery");
  if (!gate.ok) return gate.node;
  const q = Number(qty);
  const differs = Number.isFinite(q) && Math.abs(q - delivery.dispatched_qty_kg) > 0.001;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(q) || q < 0) return;
    if (differs && !notes.trim()) return;
    m.mutate({ _delivery_id: delivery.id, _received_qty_kg: q, _notes: notes.trim() || undefined });
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <Field label="Received kg"><input className={`${inputCls} w-28`} type="number" min="0" step="0.01" required value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label={differs ? "Reason for difference (required)" : "Notes"}><input className={`${inputCls} w-52`} maxLength={200} required={differs} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Button type="submit" size="sm" disabled={m.isPending}>{m.isPending ? "Confirming…" : "Confirm receipt"}</Button>
    </form>
  );
}

export function DistributionForm({ shopId, lookup, available }: { shopId: string; lookup: LocationLookup; available: number }) {
  const gate = useGate(canDo.distribution, "shop", shopId, lookup, "record distribution");
  const [qty, setQty] = useState("");
  const [hh, setHh] = useState("");
  const [ref, setRef] = useState("");
  const m = useLedgerMutation<{ _shop_id: string; _quantity_kg: number; _beneficiary_households?: number | undefined; _reference_id?: string | undefined }>("record_distribution", { onDone: () => { setQty(""); setHh(""); setRef(""); } });
  if (!gate.ok) return gate.node;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = positive(qty);
    if (!q) return;
    m.mutate({ _shop_id: shopId, _quantity_kg: q, _beneficiary_households: hh ? Math.max(0, Math.floor(Number(hh))) : undefined, _reference_id: ref.trim() || undefined });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={`Quantity distributed (kg) · in stock ${fmtKg(available)}`}><input className={inputCls} type="number" min="0.01" step="0.01" required value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Households served"><input className={inputCls} type="number" min="0" step="1" value={hh} onChange={(e) => setHh(e.target.value)} placeholder="Optional" /></Field>
      <Field label="Reference"><input className={inputCls} maxLength={60} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Optional" /></Field>
      <Button type="submit" size="sm" disabled={m.isPending}>{m.isPending ? "Saving…" : "Record distribution"}</Button>
    </form>
  );
}

export function AdjustmentForm({ type, id, lookup }: { type: "godown" | "shop"; id: string; lookup: LocationLookup }) {
  const gate = useGate(canDo.adjustment, type, id, lookup, "record adjustments");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const m = useLedgerMutation<{ _location_type: string; _location_id: string; _quantity_kg: number; _reason: string }>("record_adjustment", { onDone: () => { setQty(""); setReason(""); } });
  if (!gate.ok) return gate.node;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = Number(qty);
    if (!Number.isFinite(q) || q === 0 || reason.trim().length < 3) return;
    m.mutate({ _location_type: type, _location_id: id, _quantity_kg: q, _reason: reason.trim() });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Adjustment (kg, negative to reduce)"><input className={inputCls} type="number" step="0.01" required value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Reason (required, audited)"><input className={inputCls} minLength={3} maxLength={200} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Spillage during unloading" /></Field>
      <Button type="submit" size="sm" variant="outline" disabled={m.isPending}>{m.isPending ? "Saving…" : "Record adjustment"}</Button>
    </form>
  );
}

export function MeasurementForm({ type, id, lookup }: { type: "godown" | "shop"; id: string; lookup: LocationLookup }) {
  const gate = useGate(canDo.measurement, type, id, lookup, "record inspections");
  const [qty, setQty] = useState("");
  const [remarks, setRemarks] = useState("");
  const m = useLedgerMutation<{ _location_type: string; _location_id: string; _measured_stock_kg: number; _remarks?: string | undefined }>("record_measurement", { onDone: () => { setQty(""); setRemarks(""); } });
  if (!gate.ok) return gate.node;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = Number(qty);
    if (!Number.isFinite(q) || q < 0) return;
    m.mutate({ _location_type: type, _location_id: id, _measured_stock_kg: q, _remarks: remarks.trim() || undefined });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Physically measured stock (kg)"><input className={inputCls} type="number" min="0" step="0.01" required value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Remarks"><input className={inputCls} maxLength={200} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" /></Field>
      <Button type="submit" size="sm" variant="outline" disabled={m.isPending}>{m.isPending ? "Saving…" : "Record inspection"}</Button>
    </form>
  );
}
