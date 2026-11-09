<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Stock balances are always derived from `stock_movements` (views `v_godown_stock` / `v_shop_stock`); never store or edit a balance directly — the ledger is the source of truth.
- All writes go through security-definer database functions that check role and location scope; the client-side `src/lib/rbac.ts` mirror only shapes the UI, so keep both in sync.
- Pure business calculations (forecast, report, summaries, simulator) live in `src/lib/*.ts` with unit tests in `src/test/` so rules are testable without the database.
- Leaflet is imported dynamically inside effects and rendered behind `<ClientOnly>` because it touches `window` during SSR.
- External device ingestion uses `/api/public/ingest/*` server routes guarded by the `INGEST_API_KEY` header check; they call the same database functions with the service role.
