import { z } from "zod";

// URL search params. Every key is optional (with bad values dropped) so plain links need no search object;
// pages apply their own defaults.
const month = z.string().regex(/^\d{4}-\d{2}$/).optional().catch(undefined);
const districtId = z.coerce.number().int().positive().optional().catch(undefined);

export const monthSearch = z.object({ month });
export const reportSearch = z.object({ month, district: districtId });
export const shopsSearch = z.object({
  status: z.enum(["ALL", "NORMAL", "LOW", "CRITICAL"]).optional().catch(undefined),
  district: districtId,
  q: z.string().max(60).optional().catch(undefined),
});
export const deliveriesSearch = z.object({
  status: z.enum(["ALL", "PENDING", "DELAYED", "DELIVERED", "RECEIVED_WITH_DIFFERENCE"]).optional().catch(undefined),
  limit: z.coerce.number().int().min(50).max(1000).optional().catch(undefined),
});
export const alertsSearch = z.object({
  status: z.enum(["ACTIVE", "OPEN", "UNDER_VERIFICATION", "RESOLVED", "ALL"]).optional().catch(undefined),
});
export const predictionsSearch = z.object({
  district: districtId,
  needOnly: z.preprocess((v) => v === true || v === "true", z.boolean()).optional().catch(undefined),
});
