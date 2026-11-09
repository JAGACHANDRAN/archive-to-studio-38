const nf0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const fmtInt = (v: unknown) => nf0.format(num(v));
export const fmtKg = (v: unknown) => `${nf0.format(num(v))} kg`;
export const fmtKg2 = (v: unknown) => `${nf2.format(num(v))} kg`;
export const fmtNum2 = (v: unknown) => nf2.format(num(v));
export const fmtPct = (v: unknown, digits = 1) => `${num(v).toFixed(digits)}%`;
export const fmtSigned = (v: unknown, unit = "kg") => {
  const n = num(v);
  return `${n > 0 ? "+" : ""}${nf2.format(n)} ${unit}`;
};

export function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}
export function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}
export function shortMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
}
export function prevMonth(month: string) {
  const [y = 1970, m = 1] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function monthBounds(month: string) {
  const [y = 1970, m = 1] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)).toISOString(), end: new Date(Date.UTC(y, m, 1)).toISOString() };
}

export function rpcErrorMessage(err: unknown) {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: string }).message);
  return "Something went wrong.";
}

/** Drops undefined keys (for strict optional-property typing on API calls). */
export function compact<T extends Record<string, unknown>>(o: T) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> };
}
