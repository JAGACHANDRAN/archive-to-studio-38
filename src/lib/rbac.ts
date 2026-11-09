// Mirrors the database's location-scoping rules so the UI can show the same
// "Access Denied" message the original app returned (the database still enforces it on every write).
export type AppRole =
  | "state_admin"
  | "district_officer"
  | "godown_manager"
  | "shop_manager"
  | "stock_inspector"
  | "data_entry_officer";

export interface Actor {
  username: string;
  fullName: string;
  role: AppRole;
  districtId: number | null;
  godownId: string | null;
  shopId: string | null;
}

export interface LocationLookup {
  shops: { id: string; district_id: number; godown_id: string }[];
  godowns: { id: string; district_id: number }[];
}

export type LocationType = "district" | "godown" | "shop";

export const ROLE_LABELS: Record<AppRole, string> = {
  state_admin: "State Admin",
  district_officer: "District Officer",
  godown_manager: "Godown Manager",
  shop_manager: "Shop Manager",
  stock_inspector: "Stock Inspector",
  data_entry_officer: "Data Entry Officer",
};

/** Returns null when access is allowed, otherwise the denial message. */
export function locationAccessError(
  actor: Actor | null,
  type: LocationType,
  id: string | number,
  lookup: LocationLookup,
  action = "access",
): string | null {
  if (!actor) return null; // guests see the public dashboard, as in the original app
  const locId = String(id);
  switch (actor.role) {
    case "state_admin":
    case "stock_inspector":
      return null;
    case "shop_manager":
      if (type !== "shop" || locId !== actor.shopId) {
        return `Access Denied: Shop Manager '${actor.username}' is assigned to shop '${actor.shopId}' and cannot ${action} ${type} '${locId}'.`;
      }
      return null;
    case "godown_manager": {
      if (type === "godown") {
        return locId === actor.godownId
          ? null
          : `Access Denied: Godown Manager '${actor.username}' is assigned to '${actor.godownId}' and cannot ${action} godown '${locId}'.`;
      }
      if (type === "shop") {
        const shop = lookup.shops.find((s) => s.id === locId);
        return shop && shop.godown_id === actor.godownId
          ? null
          : `Access Denied: Shop '${locId}' is not linked to godown '${actor.godownId}'.`;
      }
      return `Access Denied: Godown Manager cannot ${action} district-level records.`;
    }
    case "district_officer":
    case "data_entry_officer": {
      if (actor.districtId == null) return null;
      if (type === "district") {
        return Number(locId) === actor.districtId
          ? null
          : `Access Denied: assigned to District ${actor.districtId} and cannot ${action} District ${locId}.`;
      }
      if (type === "godown") {
        const g = lookup.godowns.find((x) => x.id === locId);
        return g && g.district_id === actor.districtId
          ? null
          : `Access Denied: Godown '${locId}' does not belong to District ${actor.districtId}.`;
      }
      const s = lookup.shops.find((x) => x.id === locId);
      return s && s.district_id === actor.districtId
        ? null
        : `Access Denied: Shop '${locId}' does not belong to District ${actor.districtId}.`;
    }
  }
}

export const canDo = {
  receipt: ["state_admin", "godown_manager"],
  dispatch: ["state_admin", "godown_manager"],
  confirmDelivery: ["state_admin", "shop_manager", "godown_manager"],
  distribution: ["state_admin", "shop_manager", "data_entry_officer"],
  adjustment: ["state_admin", "district_officer", "godown_manager", "shop_manager"],
  measurement: ["state_admin", "stock_inspector"],
  scanAlerts: ["state_admin", "district_officer", "stock_inspector"],
  actOnAlert: ["state_admin", "district_officer", "godown_manager", "shop_manager", "stock_inspector", "data_entry_officer"],
  runForecast: ["state_admin", "district_officer", "shop_manager"],
  simulate: ["state_admin", "data_entry_officer"],
  activateSource: ["state_admin"],
} satisfies Record<string, AppRole[]>;

export function hasRole(actor: Actor | null, allowed: readonly AppRole[]) {
  return !!actor && allowed.includes(actor.role);
}

/** Landing page after sign-in, matching the original redirects. */
export function homeFor(actor: Actor): string {
  if (actor.role === "shop_manager" && actor.shopId) return `/shops/${actor.shopId}`;
  if (actor.role === "godown_manager" && actor.godownId) return `/godowns/${actor.godownId}`;
  if (actor.role === "district_officer" && actor.districtId) return `/districts/${actor.districtId}`;
  return "/";
}
