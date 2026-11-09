// Tamil Nadu district names used by the state map (37 boundaries; Mayiladuthurai is still drawn inside Nagapattinam).
export interface TnDistrict { name: string; slug: string }

export const TN_DISTRICTS: TnDistrict[] = [
  { name: "Ariyalur", slug: "ariyalur" },
  { name: "Chengalpattu", slug: "chengalpattu" },
  { name: "Chennai", slug: "chennai" },
  { name: "Coimbatore", slug: "coimbatore" },
  { name: "Cuddalore", slug: "cuddalore" },
  { name: "Dharmapuri", slug: "dharmapuri" },
  { name: "Dindigul", slug: "dindigul" },
  { name: "Erode", slug: "erode" },
  { name: "Kallakurichi", slug: "kallakurichi" },
  { name: "Kanchipuram", slug: "kanchipuram" },
  { name: "Kanyakumari", slug: "kanyakumari" },
  { name: "Karur", slug: "karur" },
  { name: "Krishnagiri", slug: "krishnagiri" },
  { name: "Madurai", slug: "madurai" },
  { name: "Nagapattinam", slug: "nagapattinam" },
  { name: "Namakkal", slug: "namakkal" },
  { name: "Nilgiris", slug: "nilgiris" },
  { name: "Perambalur", slug: "perambalur" },
  { name: "Pudukkottai", slug: "pudukkottai" },
  { name: "Ramanathapuram", slug: "ramanathapuram" },
  { name: "Ranipet", slug: "ranipet" },
  { name: "Salem", slug: "salem" },
  { name: "Sivaganga", slug: "sivaganga" },
  { name: "Tenkasi", slug: "tenkasi" },
  { name: "Thanjavur", slug: "thanjavur" },
  { name: "Theni", slug: "theni" },
  { name: "Tiruvallur", slug: "tiruvallur" },
  { name: "Tiruvarur", slug: "tiruvarur" },
  { name: "Thoothukudi", slug: "thoothukudi" },
  { name: "Tiruchirappalli", slug: "tiruchirappalli" },
  { name: "Tirunelveli", slug: "tirunelveli" },
  { name: "Tirupathur", slug: "tirupathur" },
  { name: "Tiruppur", slug: "tiruppur" },
  { name: "Tiruvannamalai", slug: "tiruvannamalai" },
  { name: "Vellore", slug: "vellore" },
  { name: "Viluppuram", slug: "viluppuram" },
  { name: "Virudhunagar", slug: "virudhunagar" },
];

/** URL-safe slug for a district name ("Tiruchirappalli" → "tiruchirappalli"). */
export const districtSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Resolve a /districts/$districtId param (slug, or a legacy numeric id) to a map district. */
export function findTnDistrict(param: string, dbDistricts: { id: number; name: string }[]): TnDistrict | undefined {
  const key = /^\d+$/.test(param) ? dbDistricts.find((d) => String(d.id) === param)?.name : param;
  if (!key) return undefined;
  const slug = districtSlug(key);
  return TN_DISTRICTS.find((d) => d.slug === slug);
}
