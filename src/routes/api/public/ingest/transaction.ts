import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorStatus, verifyIngestKey } from "@/lib/ingest-api";
import { compact } from "@/lib/format";

const Body = z.object({
  shop_id: z.string().min(1).max(20),
  item_id: z.number().int().min(1).max(5).default(1),
  qty_kg: z.number().positive().max(10_000),
  bags: z.number().int().min(1).max(1000).default(1),
  card_no: z.string().min(4).max(40),
  source: z.enum(["simulator", "sensor", "ml_camera"]).default("simulator"),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

export const Route = createFileRoute("/api/public/ingest/transaction")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await verifyIngestKey(request);
        if (denied) return denied;
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ detail: parsed.error.flatten() }, { status: 422 });
        const p = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("ingest_transaction", compact({
          _shop_id: p.shop_id, _qty_kg: p.qty_kg, _card_no: p.card_no, _item_id: p.item_id, _bags: p.bags, _source: p.source, _ts: p.timestamp,
        }));
        if (error) return Response.json({ detail: error.message }, { status: errorStatus(error.message) });
        return Response.json(data, { status: 201 });
      },
    },
  },
});
