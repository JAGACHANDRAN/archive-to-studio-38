import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const enc = new TextEncoder();

/** Timing-safe check of the X-Ingest-Key header against the INGEST_API_KEY secret. */
export async function verifyIngestKey(request: Request): Promise<Response | null> {
  const expected = process.env["INGEST_API_KEY"];
  if (!expected) return Response.json({ detail: "Ingestion is not configured." }, { status: 503 });
  const given = request.headers.get("x-ingest-key") ?? "";
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = given.length === 0 ? 1 : 0;
  for (let i = 0; i < x.length; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0 ? null : Response.json({ detail: "Invalid or missing X-Ingest-Key." }, { status: 401 });
}

/** Read-only client for public data (RLS: public read policies). */
export function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export function errorStatus(message: string) {
  if (/not found/i.test(message)) return 404;
  return 400;
}
