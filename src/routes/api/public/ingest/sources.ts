import { createFileRoute } from "@tanstack/react-router";
import { publicClient } from "@/lib/ingest-api";

export const Route = createFileRoute("/api/public/ingest/sources")({
  server: {
    handlers: {
      GET: async () => {
        const db = publicClient();
        const [settings, count, last] = await Promise.all([
          db.from("data_source_settings").select("source_name, is_active"),
          db.from("transactions").select("id", { count: "exact", head: true }),
          db.from("transactions").select("timestamp").order("timestamp", { ascending: false }).limit(1),
        ]);
        if (settings.error) return Response.json({ detail: "Could not load sources." }, { status: 500 });
        return Response.json({
          active_source: settings.data.find((s) => s.is_active)?.source_name ?? "simulator",
          available_sources: ["simulator", "sensor", "ml_camera"],
          last_ingest_timestamp: last.data?.[0]?.timestamp ?? null,
          total_transactions_ingested: count.count ?? 0,
          simulator_running: false,
        });
      },
    },
  },
});
