import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, MapPin, Warehouse, Store, ArrowLeftRight, FileText, TrendingUp, Bell, Settings,
  Radio, Menu, ChevronLeft, Search, Info, LogIn, LogOut, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { TN_DISTRICTS, districtSlug } from "@/lib/tn-districts";
import { alertsQuery, districtsQuery, godownStockQuery, shopStockQuery } from "@/lib/data";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/districts", label: "Districts", icon: MapPin },
  { to: "/godowns", label: "Godowns", icon: Warehouse },
  { to: "/shops", label: "Fair Price Shops", icon: Store },
  { to: "/transactions", label: "Stock Movements", icon: ArrowLeftRight },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/predictions", label: "Predictions", icon: TrendingUp },
  { to: "/alerts", label: "Alerts", icon: Bell, badge: true },
  { to: "/live", label: "Live Feed", icon: Radio },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function RiceMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 22 16 8" />
      <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.95l-1.53 1.52" />
      <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.95L9 15" />
      <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.95L13 11" />
      <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
      <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.95 0L5 19" />
      <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.95 0L9 15" />
      <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.95 0L13 11" />
    </svg>
  );
}

function useOpenAlerts() {
  const { data } = useQuery(alertsQuery());
  // Counts appear after hydration so server and browser render the same first frame.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? (data?.filter((a) => a.status === "OPEN").length ?? 0) : 0;
}

function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const openAlerts = useOpenAlerts();
  return (
    <aside className={cn("sticky top-[60px] z-30 hidden h-[calc(100vh-60px)] shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground transition-all duration-300 md:flex", open ? "w-[236px]" : "w-[72px]")}>
      <nav className="overflow-y-auto p-3">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = "exact" in item && item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  title={!open ? item.label : undefined}
                  className={cn(
                    "relative flex w-full items-center rounded-lg py-2.5 text-[13.5px] font-medium transition-all",
                    open ? "gap-3 px-3.5" : "justify-center",
                    active ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-primary" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  {open && <span className="flex-1 truncate text-left">{item.label}</span>}
                  {"badge" in item && openAlerts > 0 && (
                    <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-primary-foreground", !open && "absolute right-1.5 top-1 h-4 min-w-4 text-[9px]")}>{openAlerts}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-3">
        {open ? (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-sidebar-accent-foreground"><Info className="size-3.5 shrink-0 text-warning" /> Demo Dataset</p>
            <p className="mt-0.5 text-[10px] leading-snug text-sidebar-muted">Not Official Government Data</p>
          </div>
        ) : (
          <button onClick={onToggle} title="Demo Dataset — Not Official Government Data · Expand menu" className="mx-auto flex size-10 items-center justify-center rounded-lg text-warning hover:bg-sidebar-accent">
            <Info className="size-[18px]" />
          </button>
        )}
      </div>
    </aside>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const { data: districts = [] } = useQuery(districtsQuery());
  const { data: godowns = [] } = useQuery(godownStockQuery());
  const { data: shops = [] } = useQuery(shopStockQuery());
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const match = (...xs: string[]) => xs.some((x) => x.toLowerCase().includes(term));
    return [
      ...TN_DISTRICTS.filter((d) => match(d.name)).map((d) => ({ kind: "DISTRICT", label: d.name, code: districts.find((x) => districtSlug(x.name) === d.slug)?.code ?? "No demo data", go: () => navigate({ to: "/districts/$districtId", params: { districtId: d.slug } }) })),
      ...godowns.filter((g) => match(g.name, g.id)).map((g) => ({ kind: "GODOWN", label: g.name, code: g.id, go: () => navigate({ to: "/godowns/$godownId", params: { godownId: g.id } }) })),
      ...shops.filter((s) => match(s.name, s.id)).map((s) => ({ kind: "SHOP", label: s.name, code: s.id, go: () => navigate({ to: "/shops/$shopId", params: { shopId: s.id } }) })),
    ].slice(0, 10);
  }, [q, districts, godowns, shops, navigate]);

  return (
    <div className="relative w-full max-w-[340px]">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-header-foreground/60" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search district, godown or shop..."
        aria-label="Search district, godown or shop"
        className="h-9 w-full rounded-full border border-header-foreground/15 bg-header-foreground/10 pl-9 pr-4 text-xs text-header-foreground outline-none transition-all placeholder:text-header-foreground/55 focus:border-primary focus:bg-card focus:text-foreground focus:placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
      />
      {focused && q.trim() && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover shadow-float">
          {results.length ? (
            results.map((r) => (
              <button key={r.kind + r.code} onMouseDown={() => { r.go(); setQ(""); }} className="flex w-full items-center justify-between border-b border-border px-4 py-2.5 text-left text-xs last:border-0 hover:bg-muted">
                <span className="flex items-center gap-2">
                  <span className="rounded bg-info-soft px-1.5 py-0.5 text-[10px] font-bold text-info">{r.kind}</span>
                  <strong className="text-[13px] text-foreground">{r.label}</strong>
                </span>
                <span className="text-muted-foreground">{r.code}</span>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground">No matches for "{q}"</div>
          )}
        </div>
      )}
    </div>
  );
}

function Header({ onToggle, sidebarOpen }: { onToggle: () => void; sidebarOpen: boolean }) {
  const { actor, session, signOut } = useAuth();
  const openAlerts = useOpenAlerts();
  const navigate = useNavigate();
  const name = actor?.fullName ?? session?.user.email ?? "";
  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center gap-3 bg-header pr-3 text-header-foreground shadow-float sm:pr-5">
      <div className={cn("flex h-full shrink-0 items-center gap-2 pl-3 sm:pl-4 md:transition-all md:duration-300", sidebarOpen ? "md:w-[236px]" : "md:w-[72px]")}>
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-header-foreground/10 text-sidebar-ring">
            <RiceMark />
          </div>
          <div className={cn("min-w-0 leading-tight", !sidebarOpen && "md:hidden")}>
            <p className="truncate text-[14px] font-bold tracking-tight">Smart Ration Tracker</p>
            <p className="mt-0.5 truncate text-[9.5px] text-header-foreground/60">Tamil Nadu Public Distribution System</p>
          </div>
        </Link>
      </div>
      <button onClick={onToggle} title={sidebarOpen ? "Collapse menu" : "Expand menu"} className="hidden rounded-lg p-2 text-header-foreground/70 hover:bg-header-foreground/10 hover:text-header-foreground md:flex">
        {sidebarOpen ? <ChevronLeft className="size-[18px]" /> : <Menu className="size-[18px]" />}
      </button>
      <div className="hidden min-w-0 flex-1 sm:block">
        <GlobalSearch />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <Link to="/alerts" className="relative rounded-full p-2 text-header-foreground/80 hover:bg-header-foreground/10 hover:text-header-foreground" aria-label="Alerts">
          <Bell className="size-[19px]" />
          {openAlerts > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-header bg-danger px-0.5 text-[9px] font-bold text-primary-foreground">{openAlerts}</span>
          )}
        </Link>
        {session ? (
          <div className="flex items-center gap-2 border-l border-header-foreground/15 pl-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
              {name ? name.charAt(0).toUpperCase() : <User className="size-4" />}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="max-w-[170px] truncate text-xs font-semibold">{name}</p>
              <p className="text-[10px] text-header-foreground/60">
                {actor ? `${ROLE_LABELS[actor.role]}${actor.shopId ? ` · ${actor.shopId}` : actor.godownId ? ` · ${actor.godownId}` : ""}` : "Viewer"}
              </p>
            </div>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/login", replace: true }); }}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-2 text-header-foreground/70 hover:bg-header-foreground/10 hover:text-header-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-primary hover:opacity-90">
            <LogIn className="size-3.5" /> Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-sidebar-border bg-sidebar px-2 py-2 md:hidden">
      {NAV.map((item) => {
        const active = "exact" in item && item.exact ? path === item.to : path.startsWith(item.to);
        return (
          <Link key={item.to} to={item.to} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium", active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-muted")}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header onToggle={() => setOpen((o) => !o)} sidebarOpen={open} />
      <div className="flex items-center justify-center gap-1.5 border-b border-warning/40 bg-notice px-4 py-1 text-center text-[11px] font-semibold text-notice-foreground md:hidden">
        <Info className="size-3.5 shrink-0" />
        <span>Demo Dataset — Not Official Government Data</span>
      </div>
      <MobileNav />
      <div className="flex flex-1">
        <Sidebar open={open} onToggle={() => setOpen((o) => !o)} />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
