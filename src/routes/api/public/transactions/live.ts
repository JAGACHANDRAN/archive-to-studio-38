import { createFileRoute } from "@tanstack/react-router";
import { publicClient } from "@/lib/ingest-api";

// Public read-only feed (the same rows the dashboard shows to guests).
export const Route = createFileRoute("/api/public/transactions/live")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
        const shopId = url.searchParams.get("shop_id");
        let q = publicClient().from("transactions").select("id, shop_id, item_id, qty_kg, bags, card_no, source, timestamp").order("timestamp", { ascending: false }).limit(limit);
        if (shopId && /^[A-Z0-9-]{1,20}$/.test(shopId)) q = q.eq("shop_id", shopId);
        const { data, error } = await q;
        if (error) return Response.json({ detail: "Could not load transactions." }, { status: 500 });
        return Response.json({ count: data.length, transactions: data });
      },
    },
  },
});
