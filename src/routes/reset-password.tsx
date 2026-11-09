import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RiceMark } from "@/components/srt/AppShell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Smart Ration Tracker" },
      { name: "description", content: "Choose a new password for your Smart Ration Tracker account." },
      { property: "og:title", content: "Set a new password — Smart Ration Tracker" },
      { property: "og:description", content: "Password reset for Smart Ration Tracker staff accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const fieldCls = "h-12 w-full rounded-lg border border-input bg-card pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => setReady((r) => r || !!s.session));
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) {
      toast.error("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card p-8 shadow-float">
        <div className="flex size-11 items-center justify-center rounded-xl bg-header text-sidebar-ring"><RiceMark /></div>
        <h1 className="mt-5 text-2xl font-extrabold text-header">Set a new password</h1>
        {ready === false || ready === null ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {ready === null ? "Checking your reset link…" : "This page works from the reset link in your email."}{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Back to login</Link>
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {[{ v: pw, set: setPw, ph: "New password" }, { v: pw2, set: setPw2, ph: "Confirm new password" }].map((f) => (
              <label key={f.ph} className="relative block">
                <span className="sr-only">{f.ph}</span>
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <input className={fieldCls} type="password" required minLength={8} autoComplete="new-password" placeholder={f.ph} value={f.v} onChange={(e) => f.set(e.target.value)} />
              </label>
            ))}
            <Button type="submit" className="h-12 w-full" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
