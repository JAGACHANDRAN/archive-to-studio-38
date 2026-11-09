// Port of the original background simulator's purchase generator: random shop (biased toward a
// few "rapid drain" shops), commodity mix 60% rice / 15% sugar / 10% wheat / 10% toor dal / 5% palm oil.
export interface SimShop { id: string; district_id: number }

const COMMODITIES = [
  { id: 1, code: "RICE", weight: 0.6 },
  { id: 2, code: "WHEAT", weight: 0.1 },
  { id: 3, code: "SUGAR", weight: 0.15 },
  { id: 4, code: "TOOR_DAL", weight: 0.1 },
  { id: 5, code: "PALM_OIL", weight: 0.05 },
] as const;

function pick<T>(xs: readonly T[], rnd: () => number): T {
  return xs[Math.min(xs.length - 1, Math.floor(rnd() * xs.length))] as T;
}

export function pickRapidDrain(shops: SimShop[], count = 3, rnd = Math.random) {
  const pool = shops.map((s) => s.id);
  const out: string[] = [];
  while (pool.length && out.length < count) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0] as string);
  return out;
}

export function simulatePurchase(shops: SimShop[], rapidDrain: string[], rnd = Math.random) {
  if (!shops.length) return null;
  let shop: SimShop = pick(shops, rnd);
  if (rapidDrain.length && rnd() < 0.35) {
    const id = pick(rapidDrain, rnd);
    shop = shops.find((s) => s.id === id) ?? shop;
  }
  let r = rnd();
  let code: string = COMMODITIES[0].code;
  let itemId: number = COMMODITIES[0].id;
  for (const c of COMMODITIES) {
    if (r < c.weight) { code = c.code; itemId = c.id; break; }
    r -= c.weight;
  }
  let qty = 1;
  let bags = 1;
  if (code === "RICE") { qty = pick([5, 10, 15, 20], rnd); bags = Math.max(1, Math.floor(qty / 5)); }
  else if (code === "WHEAT") qty = pick([2, 5], rnd);
  else if (code === "SUGAR") qty = pick([1, 2], rnd);
  if (rapidDrain.includes(shop.id) && code === "RICE") { qty = Math.min(35, qty * 1.5); bags = Math.max(1, Math.floor(qty / 5)); }
  const card = `TN-${String(shop.district_id).padStart(2, "0")}-${1000000 + Math.floor(rnd() * 9000000)}`;
  return { _shop_id: shop.id, _item_id: itemId, _qty_kg: qty, _bags: bags, _card_no: card, _source: "simulator" };
}
