import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { District, GodownStock, ShopStock } from "@/lib/data";
import { fmtKg } from "@/lib/format";

const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

let geoCache: Promise<GeoJSON.FeatureCollection> | null = null;
const loadGeo = () => (geoCache ??= fetch("/data/tamil_nadu_contiguous.json").then((r) => r.json()));

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const STATUS_VAR = { NORMAL: "--success", LOW: "--warning", CRITICAL: "--danger" } as const;

export interface MapDistrict {
  district: District;
  status: "NORMAL" | "LOW" | "CRITICAL";
  totalStockKg: number;
  shopsCount: number;
  godownsCount: number;
}

/** Statewide choropleth: districts in the demo dataset are coloured by shop stock status. */
export function StateMap({ items, onSelect }: { items: MapDistrict[]; onSelect: (districtId: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const geo = await loadGeo();
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { center: [11.0, 78.65], zoom: 7, minZoom: 6, maxZoom: 12, attributionControl: false });
      L.tileLayer(TILE_URL, { maxZoom: 16, opacity: 0.85 }).addTo(map);
      const byName = new Map(items.map((i) => [i.district.name.toLowerCase(), i]));
      const border = cssVar("--card");
      const empty = cssVar("--map-empty");
      const hover = cssVar("--foreground");
      const layer = L.geoJSON(geo, {
        style: (f) => {
          const item = byName.get(String(f?.properties?.name ?? "").toLowerCase());
          return { fillColor: item ? cssVar(STATUS_VAR[item.status]) : empty, weight: 1.5, color: border, opacity: 1, fillOpacity: item ? 0.85 : 0.55 };
        },
        onEachFeature: (f, lyr) => {
          const name = String(f.properties?.name ?? "District");
          const item = byName.get(name.toLowerCase());
          lyr.bindTooltip(
            item
              ? `<div class="map-tooltip" style="padding:4px 6px"><strong>${name}</strong><div style="font-size:11px;margin-top:2px">${fmtKg(item.totalStockKg)} · ${item.godownsCount} godowns · ${item.shopsCount} shops</div><div style="font-size:10px;margin-top:2px;opacity:.7">Click to open district</div></div>`
              : `<div class="map-tooltip" style="padding:4px 6px"><strong>${name}</strong><div style="font-size:11px;margin-top:2px;opacity:.7">Not part of the demo dataset</div></div>`,
            { sticky: true, opacity: 0.95 },
          );
          if (item) {
            lyr.on({
              mouseover: (e) => { e.target.setStyle({ weight: 2.8, color: hover, fillOpacity: 0.95 }); e.target.bringToFront(); },
              mouseout: (e) => layer.resetStyle(e.target),
              click: () => selectRef.current(item.district.id),
            });
          }
        },
      }).addTo(map);
      try { map.fitBounds(layer.getBounds(), { padding: [15, 15], maxZoom: 7.2 }); } catch { /* ignore */ }
      for (const i of items) {
        const icon = L.divIcon({ className: "leaflet-district-label", html: `<span>${i.district.name}</span>`, iconSize: [100, 20], iconAnchor: [50, 10] });
        L.marker([i.district.lat, i.district.lng], { icon, interactive: false }).addTo(map);
      }
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [items]);

  return <div ref={ref} className="h-full w-full" />;
}

/** District map: highlights the selected district; godown and shop pins appear when zoomed in. */
export function DistrictMap({ district, godowns, shops }: { district: District; godowns: GodownStock[]; shops: ShopStock[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const geo = await loadGeo();
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { center: [district.lat, district.lng], zoom: 9, minZoom: 6, maxZoom: 14, attributionControl: false });
      L.tileLayer(TILE_URL, { maxZoom: 16, opacity: 0.85 }).addTo(map);
      const primary = cssVar("--primary");
      const empty = cssVar("--map-empty");
      const border = cssVar("--card");
      const isSel = (f?: GeoJSON.Feature) => String(f?.properties?.["name"] ?? "").toLowerCase() === district.name.toLowerCase();
      L.geoJSON(geo, {
        style: (f) => {
          const sel = isSel(f);
          return { fillColor: sel ? primary : empty, weight: sel ? 2 : 1, color: sel ? primary : border, opacity: 1, fillOpacity: sel ? 0.35 : 0.45 };
        },
      }).addTo(map);
      const selected = L.geoJSON({ ...geo, features: geo.features.filter((f: GeoJSON.Feature) => isSel(f)) });
      const pins = [...godowns, ...shops].filter((x) => x.lat != null && x.lng != null).map((x) => [x.lat as number, x.lng as number] as [number, number]);
      try {
        const bounds = selected.getBounds();
        for (const p of pins) bounds.extend(p);
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      } catch { /* keep default view */ }
      L.marker([district.lat, district.lng], {
        icon: L.divIcon({ className: "", html: `<div class="map-callout">${district.name}</div>`, iconSize: [80, 22], iconAnchor: [40, 34] }),
        interactive: false,
      }).addTo(map);
      for (const g of godowns) {
        if (g.lat == null || g.lng == null) continue;
        L.marker([g.lat, g.lng], { icon: L.divIcon({ className: "", html: `<div class="map-pin map-pin-godown"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }) })
          .bindPopup(`<strong>${g.name}</strong><br/>${g.id} · ${fmtKg(g.expected_stock_kg)}<br/><a href="/godowns/${g.id}">Open godown →</a>`)
          .addTo(map);
      }
      for (const s of shops) {
        if (s.lat == null || s.lng == null) continue;
        L.marker([s.lat, s.lng], { icon: L.divIcon({ className: "", html: `<div class="map-pin map-pin-${s.status.toLowerCase()}"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }) })
          .bindPopup(`<strong>${s.name}</strong><br/>${s.id} · ${fmtKg(s.expected_stock_kg)}<br/><a href="/shops/${s.id}">Open shop →</a>`)
          .addTo(map);
      }
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [district, godowns, shops]);
  return <div ref={ref} className="h-full w-full" />;
}
