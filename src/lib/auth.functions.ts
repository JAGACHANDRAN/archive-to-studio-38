import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEMO_PASSWORD } from "./demo-accounts";

// Public: resolves one of the six original demo usernames to its sign-in email and makes sure the
// demo account exists. It can only ever create those six predefined accounts.
export const ensureDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string }) =>
    z.object({ username: z.string().trim().min(3).max(40).regex(/^[a-z0-9_]+$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: account, error } = await supabaseAdmin
      .from("demo_accounts")
      .select("legacy_user_id, email")
      .eq("username", data.username)
      .maybeSingle();
    if (error) throw new Error("Could not look up that account.");
    if (!account) return { ok: false as const, message: "Unknown username. Use your email address instead." };

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("legacy_user_id", account.legacy_user_id)
      .maybeSingle();
    if (!existing) {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (createError && !/already/i.test(createError.message)) {
        console.error("demo account provisioning failed:", createError.message);
        throw new Error("Could not prepare the demo account.");
      }
    }
    return { ok: true as const, email: account.email };
  });
