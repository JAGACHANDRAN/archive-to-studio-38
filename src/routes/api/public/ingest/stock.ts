import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorStatus, verifyIngestKey } from "@/lib/ingest-api";
import { compact } from "@/lib/format";

const Body = z.object({
  location_type: z.enum(["godown", "shop"]),
  location_id: z.string().min(1).max(20),
  item_id: z.number().int().min(1).max(5).default(1),
  qty_kg: z.number().min(0).max(100_000_000),
  source: z.enum(["simulator", "sensor", "ml_camera"]).default("simulator"),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

export const Route = createFileRoute("/api/public/ingest/stock")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await verifyIngestKey(request);
        if (denied) return denied;
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ detail: parsed.error.flatten() }, { status: 422 });
        const p = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("ingest_stock", compact({
          _location_type: p.location_type, _location_id: p.location_id, _qty_kg: p.qty_kg, _item_id: p.item_id, _source: p.source, _ts: p.timestamp,
        }));
        if (error) return Response.json({ detail: error.message }, { status: errorStatus(error.message) });
        return Response.json(data);
      },
    },
  },
});
