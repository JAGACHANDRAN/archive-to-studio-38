import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LEDGER_KEYS } from "./data";
import { rpcErrorMessage } from "./format";

type RpcName =
  | "record_receipt" | "create_dispatch" | "confirm_delivery" | "record_distribution" | "record_adjustment"
  | "record_measurement" | "scan_alerts" | "update_alert_status" | "run_forecast" | "ingest_transaction"
  | "ingest_stock" | "activate_data_source";

/** Calls a ledger write function as the signed-in user, toasts the result, and refreshes ledger data. */
export function useLedgerMutation<A extends Record<string, unknown>>(fn: RpcName, opts?: { silent?: boolean; onDone?: (res: Record<string, unknown>) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: A) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc(fn as any, args as any);
      if (error) throw new Error(rpcErrorMessage(error));
      return (data ?? {}) as Record<string, unknown>;
    },
    onSuccess: (res) => {
      for (const key of LEDGER_KEYS) qc.invalidateQueries({ queryKey: key as readonly unknown[] });
      if (!opts?.silent) toast.success(String(res["message"] ?? "Saved"));
      opts?.onDone?.(res);
    },
    onError: (e) => {
      if (!opts?.silent) toast.error(rpcErrorMessage(e));
    },
  });
}
