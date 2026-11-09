import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ShieldAlert, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockStatus } from "@/lib/data";

export function Panel({ title, action, children, className, bodyClassName }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 shadow-card sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-bold text-foreground">{title}</h3>}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

const TONES = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger-foreground",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  teal: "bg-teal-soft text-teal",
} as const;
export type Tone = keyof typeof TONES;

export function KpiCard({ icon: Icon, label, value, unit, hint, tone = "primary", valueTone }: { icon: ComponentType<{ className?: string }>; label: string; value: ReactNode; unit?: string | undefined; hint?: ReactNode; tone?: Tone | undefined; valueTone?: "danger" | undefined }) {
  return (
    <div className="flex min-h-[118px] flex-col justify-between rounded-xl border border-border bg-card p-3.5 shadow-card transition-shadow hover:shadow-float">
      <div className="flex items-center gap-2.5">
        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="size-4" />
        </div>
        <span className="truncate text-[11px] font-semibold text-muted-foreground">{label}</span>
      </div>
      <div>
        <div className={cn("my-1 truncate text-[17px] font-extrabold leading-snug tabular", valueTone === "danger" ? "text-danger" : "text-foreground")}>
          {value} {unit && <span className="text-[11px] font-normal text-muted-foreground">{unit}</span>}
        </div>
        {hint && <div className="truncate text-[10px] font-medium text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

export function Trend({ pct, suffix = "vs. last month" }: { pct: number; suffix?: string }) {
  const up = pct >= 0;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className={cn("font-bold", up ? "text-success" : "text-danger")}>{up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%</span>
      <span className="font-normal text-muted-foreground">{suffix}</span>
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  NORMAL: "bg-success-soft text-success-foreground border-success/30",
  LOW: "bg-warning-soft text-warning-foreground border-warning/40",
  CRITICAL: "bg-danger-soft text-danger-foreground border-danger/30",
  DELIVERED: "bg-success-soft text-success-foreground border-success/30",
  PENDING: "bg-info-soft text-info border-info/30",
  DELAYED: "bg-danger-soft text-danger-foreground border-danger/30",
  RECEIVED_WITH_DIFFERENCE: "bg-warning-soft text-warning-foreground border-warning/40",
  OPEN: "bg-danger-soft text-danger-foreground border-danger/30",
  UNDER_VERIFICATION: "bg-warning-soft text-warning-foreground border-warning/40",
  RESOLVED: "bg-success-soft text-success-foreground border-success/30",
  HIGH: "bg-danger-soft text-danger-foreground border-danger/30",
  MEDIUM: "bg-warning-soft text-warning-foreground border-warning/40",
};
const STATUS_TEXT: Record<string, string> = { NORMAL: "Normal", LOW: "Low Stock", CRITICAL: "Critical", RECEIVED_WITH_DIFFERENCE: "Received w/ Difference", UNDER_VERIFICATION: "Under Verification" };

export function StatusBadge({ status, className }: { status: StockStatus | string; className?: string }) {
  const label = STATUS_TEXT[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLES[status] ?? "border-border bg-muted text-muted-foreground", className)}>
      {label}
    </span>
  );
}

export function PageHeader({ title, subtitle, crumbs, actions }: { title: string; subtitle?: string; crumbs?: { label: string; to?: string; params?: Record<string, string> }[]; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs font-medium text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" />}
                {c.to ? (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <Link to={c.to as any} params={c.params as any} className="hover:text-primary">{c.label}</Link>
                ) : (
                  <span className="font-semibold text-foreground/80">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AccessDenied({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-xl border border-danger/30 bg-danger-soft p-6 text-center">
      <ShieldAlert className="mx-auto size-10 text-danger" />
      <h2 className="mt-3 text-lg font-bold text-danger-foreground">403 · Forbidden</h2>
      <p className="mt-2 text-sm text-danger-foreground">{message}</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Back to dashboard</Link>
    </div>
  );
}

export function SignInHint({ what }: { what: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/60 p-3 text-xs text-muted-foreground">
      <span>{what}</span>
      <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
        <LogIn className="size-3.5" /> Sign in
      </Link>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-xs text-muted-foreground">{children}</div>;
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5 align-top", className)}>{children}</td>;
}

export function DataTable({ head, children, className }: { head: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border">{head}</tr>
        </thead>
        <tbody className="divide-y divide-border font-medium text-foreground/85 tabular">{children}</tbody>
      </table>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function RouteError({ error }: { error: unknown }) {
  return (
    <div role="alert" className="mx-auto mt-10 max-w-xl rounded-xl border border-danger/30 bg-danger-soft p-6 text-sm text-danger-foreground">
      <p className="font-bold">This page didn't load.</p>
      <p className="mt-1">{error instanceof Error ? error.message : String(error)}</p>
    </div>
  );
}

export function NotFoundBlock({ what }: { what: string }) {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-card p-6 text-center">
      <p className="text-lg font-bold">{what} not found</p>
      <Link to="/" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Back to dashboard</Link>
    </div>
  );
}
