import type { AppRole } from "./rbac";

// Demo personas carried over from the original app's one-click sign-in panel.
// Shared demo password shown on the sign-in screen. The original "demo123" is rejected by the
// leaked-password check, so the demo accounts use this stronger one instead.
export const DEMO_PASSWORD = "TNpds-Demo-Ledger-2026";

export interface DemoPersona {
  username: string;
  fullName: string;
  role: AppRole;
  scope: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  { username: "admin_tn", fullName: "Dr. K. Ramanathan (IAS)", role: "state_admin", scope: "All Tamil Nadu" },
  { username: "officer_chennai", fullName: "S. Meenakshi (DRO Chennai)", role: "district_officer", scope: "Chennai district" },
  { username: "mgr_gdn001", fullName: "V. Soundararajan (Godown Mgr)", role: "godown_manager", scope: "Godown GDN-001" },
  { username: "mgr_fps0001", fullName: "M. Murugan (Shop In-charge)", role: "shop_manager", scope: "Shop FPS-0001" },
  { username: "inspector_tn", fullName: "A. Jayakumar (Senior Inspector)", role: "stock_inspector", scope: "State audit & inspection" },
  { username: "data_entry_tn", fullName: "P. Priya (Data Entry Executive)", role: "data_entry_officer", scope: "Chennai data operations" },
];
