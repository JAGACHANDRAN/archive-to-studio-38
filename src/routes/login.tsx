import { useState, type FormEvent } from "react";
import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, EyeOff, Lock, User, Warehouse, ShieldCheck, ReceiptText, ChevronDown, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureDemoAccount } from "@/lib/auth.functions";
import { DEMO_PASSWORD, DEMO_PERSONAS } from "@/lib/demo-accounts";
import { homeFor, ROLE_LABELS, type Actor, type AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiceMark } from "@/components/srt/AppShell";
import { TnNetworkOutline } from "@/components/srt/maps";
import heroImg from "@/assets/login-hero.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Smart Ration Tracker" },
      { name: "description", content: "Sign in to the IoT-based stock monitoring and inventory management system for Tamil Nadu's public distribution supply chain." },
      { property: "og:title", content: "Login — Smart Ration Tracker" },
      { property: "og:description", content: "Real-time stock visibility, efficient supply chain and transparent distribution for Tamil Nadu PDS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

const FEATURES = [
  { icon: Warehouse, title: "Real-time", sub: "Stock Visibility" },
  { icon: ShieldCheck, title: "Efficient", sub: "Supply Chain" },
  { icon: ReceiptText, title: "Transparent", sub: "Distribution" },
];

const fieldCls =
  "h-12 w-full rounded-lg border border-input bg-card pl-11 pr-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

function LoginPage() {
  const navigate = useNavigate();
  const resolveDemo = useServerFn(ensureDemoAccount);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const goHome = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role, district_id, godown_id, shop_id").eq("user_id", userId).maybeSingle();
    if (!data) return navigate({ to: "/" });
    const actor: Actor = { username: "", fullName: "", role: data.role as AppRole, districtId: data.district_id, godownId: data.godown_id, shopId: data.shop_id };
    window.location.assign(homeFor(actor));
  };

  const signIn = async (id: string, pw: string) => {
    setBusy(true);
    try {
      let email = id.trim();
      if (!email.includes("@")) {
        const res = await resolveDemo({ data: { username: email.toLowerCase() } });
        if (!res.ok) throw new Error(res.message);
        email = res.email;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw new Error(error.message === "Invalid login credentials" ? "Incorrect username or password." : error.message);
      toast.success("Signed in");
      await goHome(data.user.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const signUp = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email: identifier.trim(), password, options: { emailRedirectTo: window.location.origin } });
      if (error) throw new Error(error.message);
      toast.success("Check your inbox to confirm your email, then log in.");
      setMode("signin");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-up failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "signin") void signIn(identifier, password);
    else void signUp();
  };

  return (
    <div className="grid min-h-screen bg-card lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-primary-soft lg:flex lg:flex-col">
        <img src={heroImg} alt="Rice sacks beside a digital weighing scale with an IoT sensor" width={1024} height={1280} className="absolute inset-0 h-full w-full object-cover object-bottom" />
        <div className="absolute inset-0 bg-gradient-to-b from-card/90 via-card/40 to-transparent" />
        <div className="relative z-10 flex flex-1 flex-col px-10 pt-10 xl:px-14 xl:pt-12">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-header text-sidebar-ring shadow-float">
              <RiceMark size={30} />
            </div>
            <div>
              <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-header xl:text-[34px]">Smart Ration Tracker</h1>
              <p className="mt-1 max-w-md text-[13px] font-medium leading-snug text-header/80">
                IoT-Based Stock Monitoring and Inventory Management System for the Public Distribution Supply Chain
              </p>
            </div>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold italic text-header/75">
            <span>Better Visibility</span><span className="not-italic text-header/30">|</span>
            <span>Accurate Stock</span><span className="not-italic text-header/30">|</span>
            <span>Transparent Distribution</span>
          </p>
          <div className="mt-8 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-6">
            <ul className="space-y-5">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-card text-header shadow-card">
                    <f.icon className="size-5" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[13px] font-bold text-header">{f.title}</span>
                    <span className="block text-[12px] text-header/75">{f.sub}</span>
                  </span>
                </li>
              ))}
            </ul>
            <ClientOnly fallback={<div className="h-[300px]" />}>
              <TnNetworkOutline className="ml-auto h-[300px] w-auto max-w-full drop-shadow-lg xl:h-[340px]" />
            </ClientOnly>
          </div>
        </div>
        <div className="relative z-10 mt-auto">
          <svg viewBox="0 0 600 40" preserveAspectRatio="none" className="block h-8 w-full fill-header" aria-hidden><path d="M0 40V22C120 2 260 0 380 14S560 30 600 18V40Z" /></svg>
          <div className="bg-header px-10 py-4 text-[12px] font-medium text-header-foreground/85 xl:px-14">
            Smart Ration Tracker <span className="mx-2 text-header-foreground/40">|</span> Tamil Nadu
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-11 items-center justify-center rounded-xl bg-header text-sidebar-ring"><RiceMark /></div>
            <div className="leading-tight">
              <p className="text-lg font-extrabold text-header">Smart Ration Tracker</p>
              <p className="text-[11px] text-muted-foreground">Tamil Nadu Public Distribution System</p>
            </div>
          </div>

          <h2 className="text-[34px] font-extrabold leading-tight tracking-tight text-header">{mode === "signin" ? "Welcome Back!" : "Create account"}</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">{mode === "signin" ? "Login to access the Smart Ration Tracker" : "New accounts can view dashboards until an administrator assigns a role."}</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="relative block">
              <span className="sr-only">{mode === "signin" ? "Username or email" : "Email"}</span>
              {mode === "signin" ? <User className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" /> : <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />}
              <input
                className={fieldCls}
                type={mode === "signup" ? "email" : "text"}
                required
                autoComplete="username"
                placeholder={mode === "signin" ? "Username" : "Email address"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </label>
            <label className="relative block">
              <span className="sr-only">Password</span>
              <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <input
                className={fieldCls}
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </label>
            <Button type="submit" className="h-12 w-full text-[15px] font-semibold shadow-primary" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Login" : "Create account"}
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-[13px]">
            {mode === "signin" && (
              <button type="button" onClick={() => setForgotOpen(true)} className="font-semibold text-primary hover:underline">Forgot Password?</button>
            )}
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setIdentifier(""); setPassword(""); }} className="text-muted-foreground hover:text-foreground">
              {mode === "signin" ? "New staff member? Create an account" : "Already have an account? Login"}
            </button>
          </div>

          {mode === "signin" && (
            <div className="mt-6 rounded-xl border border-border bg-muted/50">
              <button type="button" onClick={() => setDemoOpen((v) => !v)} aria-expanded={demoOpen} className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-foreground">
                Try a demo account
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", demoOpen && "rotate-180")} />
              </button>
              {demoOpen && (
                <div className="border-t border-border px-3 pb-3 pt-2">
                  <p className="px-1 pb-2 text-[11px] text-muted-foreground">One click signs in. Each role only sees and edits its assigned location.</p>
                  <ul className="grid gap-1.5">
                    {DEMO_PERSONAS.map((p) => (
                      <li key={p.username}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => { setIdentifier(p.username); setPassword(DEMO_PASSWORD); void signIn(p.username, DEMO_PASSWORD); }}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-semibold text-foreground">{p.fullName}</span>
                            <span className="block truncate text-[10.5px] text-muted-foreground">{p.username} · {p.scope}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-bold text-info">{ROLE_LABELS[p.role]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 border-t border-border pt-5">
            <p className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
              <ShieldCheck className="size-4 text-header" /> Secure Access <span className="text-border">|</span> Government Use Only
            </p>
            <p className="mt-2 text-center text-[10.5px] text-muted-foreground">Demo Dataset — Not Official Government Data · <Link to="/" className="font-semibold text-primary hover:underline">View dashboard</Link></p>
          </div>
        </div>
      </section>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} initial={identifier.includes("@") ? identifier : ""} />
    </div>
  );
}

function ForgotPasswordDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (v: boolean) => void; initial: string }) {
  const [email, setEmail] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSent(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            {sent ? "If an account exists for that email, a reset link is on its way. Open it on this device to choose a new password." : "Enter the email address on your account and we'll send you a reset link. Demo usernames don't have a mailbox."}
          </DialogDescription>
        </DialogHeader>
        {!sent && (
          <form onSubmit={submit} className="space-y-3">
            <label className="relative block">
              <span className="sr-only">Email</span>
              <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <input className={fieldCls} type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
