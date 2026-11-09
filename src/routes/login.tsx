import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureDemoAccount } from "@/lib/auth.functions";
import { DEMO_PASSWORD, DEMO_PERSONAS } from "@/lib/demo-accounts";
import { homeFor, ROLE_LABELS, type Actor, type AppRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Smart Ration Tracker" },
      { name: "description", content: "Sign in to record receipts, dispatches, distribution and inspections for your assigned location." },
      { property: "og:title", content: "Sign in — Smart Ration Tracker" },
      { property: "og:description", content: "Role-based access for Tamil Nadu PDS stock operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

const inputCls = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function LoginPage() {
  const navigate = useNavigate();
  const resolveDemo = useServerFn(ensureDemoAccount);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("admin_tn");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy] = useState(false);

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
      if (error) throw new Error(error.message === "Invalid login credentials" ? "Incorrect username/email or password." : error.message);
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
      toast.success("Check your inbox to confirm your email, then sign in.");
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
    <div className="mx-auto grid max-w-5xl gap-6 py-6 lg:grid-cols-[1fr_1.1fr]">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-xl font-extrabold text-foreground">{mode === "signin" ? "Sign in" : "Create an account"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "signin" ? "Use a demo username (e.g. admin_tn) or your email address." : "New accounts can browse dashboards; an administrator assigns operational roles."}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">{mode === "signin" ? "Username or email" : "Email"}</span>
            <input className={inputCls} type={mode === "signup" ? "email" : "text"} required autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Password</span>
            <input className={inputCls} type="password" required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setIdentifier(""); setPassword(""); }} className="mt-4 text-xs font-semibold text-primary hover:underline">
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-sm font-bold text-foreground">Demo accounts</h2>
        <p className="mt-1 text-xs text-muted-foreground">One click signs in with the shared demo password <code className="rounded bg-muted px-1 font-mono">{DEMO_PASSWORD}</code>. Each role only sees and edits its assigned location.</p>
        <ul className="mt-4 space-y-2">
          {DEMO_PERSONAS.map((p) => (
            <li key={p.username}>
              <button
                disabled={busy}
                onClick={() => { setIdentifier(p.username); setPassword(DEMO_PASSWORD); void signIn(p.username, DEMO_PASSWORD); }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{p.fullName}</span>
                  <span className="block text-[11px] text-muted-foreground">{p.username} · {p.scope}</span>
                </span>
                <span className="shrink-0 rounded-full bg-info-soft px-2.5 py-1 text-[10px] font-bold text-info">{ROLE_LABELS[p.role]}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
