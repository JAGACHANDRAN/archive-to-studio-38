import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { tnGeoQuery, type TnFeatureProps } from "@/lib/tn-geo";

export type MapTone = "normal" | "low" | "critical" | "focus" | "base" | "dim";

export interface MapPin {
  id: string;
  lng: number;
  lat: number;
  kind: "godown" | "shop" | "hq";
  status?: "NORMAL" | "LOW" | "CRITICAL";
  label: string;
}

const TONE_FILL: Record<Exclude<MapTone, "base">, string> = {
  normal: "fill-success/70",
  low: "fill-warning/75",
  critical: "fill-danger/70",
  focus: "fill-primary/20",
  dim: "fill-map-2/70",
};
const BASE_FILLS = ["fill-map-1", "fill-map-2", "fill-map-3", "fill-map-4"];
const PIN_FILL = { NORMAL: "fill-success", LOW: "fill-warning", CRITICAL: "fill-danger" } as const;

interface TnMapProps {
  ariaLabel: string;
  toneFor: (slug: string) => MapTone;
  /** Fit the view to one district (district page). */
  focusSlug?: string | undefined;
  /** Districts to label in bold (e.g. ones with demo data). */
  emphasize?: Set<string> | undefined;
  pins?: MapPin[] | undefined;
  onSelect?: ((slug: string) => void) | undefined;
  onPinSelect?: ((pin: MapPin) => void) | undefined;
  tooltipFor?: ((slug: string, name: string) => ReactNode) | undefined;
  pinTooltip?: ((pin: MapPin) => ReactNode) | undefined;
  /** viewBox height ÷ width. */
  aspect?: number | undefined;
  showCompass?: boolean | undefined;
  className?: string | undefined;
}

const W = 600;

/** Tamil Nadu district map drawn as SVG. Drag to pan, pinch or Ctrl+scroll to zoom. */
export function TnMap({
  ariaLabel, toneFor, focusSlug, emphasize, pins = [], onSelect, onPinSelect, tooltipFor, pinTooltip,
  aspect = 1.12, showCompass, className,
}: TnMapProps) {
  const { data: geo, isError } = useQuery(tnGeoQuery());
  const H = Math.round(W * aspect);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [hover, setHover] = useState<{ kind: "district"; slug: string; name: string; x: number; y: number } | { kind: "pin"; pin: MapPin; x: number; y: number } | null>(null);

  const drawn = useMemo(() => {
    if (!geo) return null;
    const focus = focusSlug ? geo.features.find((f) => f.properties.slug === focusSlug) : undefined;
    const pad = focus ? 36 : 14;
    const target: FeatureCollection<Geometry> = focus
      ? {
          type: "FeatureCollection",
          features: [
            focus as Feature<Geometry>,
            ...(pins.length ? [{ type: "Feature", properties: {}, geometry: { type: "MultiPoint", coordinates: pins.map((p) => [p.lng, p.lat]) } } as Feature<Geometry>] : []),
          ],
        }
      : (geo as FeatureCollection<Geometry>);
    const projection = geoMercator().fitExtent([[pad, pad], [W - pad, H - pad]], target);
    const path = geoPath(projection);
    const districts = geo.features.map((f, i) => {
      const p = f.properties as TnFeatureProps;
      const [lx, ly] = projection(p.label) ?? [0, 0];
      return { slug: p.slug, name: p.name, d: path(f) ?? "", lx, ly, area: path.area(f), idx: i };
    });
    const projectedPins = pins.map((p) => {
      const [x, y] = projection([p.lng, p.lat]) ?? [0, 0];
      return { ...p, x, y };
    });
    return { districts, projectedPins };
  }, [geo, focusSlug, pins, H]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !drawn) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .translateExtent([[-W * 0.25, -H * 0.25], [W * 1.25, H * 1.25]])
      // Plain scrolling keeps scrolling the page; pinch / Ctrl+scroll zooms the map.
      .filter((e: Event) => (e.type === "wheel" ? (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey : !(e as globalThis.MouseEvent).button))
      .on("zoom", (e: { transform: ZoomTransform }) => setT(e.transform));
    const sel = select(el);
    sel.call(z);
    zoomRef.current = z;
    return () => {
      sel.on(".zoom", null);
    };
  }, [drawn, H]);

  useEffect(() => {
    if (svgRef.current && zoomRef.current) zoomRef.current.transform(select(svgRef.current), zoomIdentity);
  }, [focusSlug]);

  const zoomBy = (k: number) => svgRef.current && zoomRef.current?.scaleBy(select(svgRef.current), k);
  const reset = () => svgRef.current && zoomRef.current?.transform(select(svgRef.current), zoomIdentity);

  const track = (e: MouseEvent, h: { kind: "district"; slug: string; name: string } | { kind: "pin"; pin: MapPin }) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    setHover({ ...h, x: e.clientX - r.left, y: e.clientY - r.top } as NonNullable<typeof hover>);
  };

  if (isError) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">The map could not be loaded.</div>;
  if (!drawn) return <div className="h-full w-full animate-pulse rounded-lg bg-muted" />;

  const k = t.k;
  const tip = hover
    ? hover.kind === "district"
      ? tooltipFor?.(hover.slug, hover.name) ?? <strong>{hover.name}</strong>
      : pinTooltip?.(hover.pin) ?? <strong>{hover.pin.label}</strong>
    : null;
  const wrapW = wrapRef.current?.clientWidth ?? 0;

  return (
    <div ref={wrapRef} className={cn("relative h-full w-full select-none overflow-hidden", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label={ariaLabel}
      >
        <g transform={t.toString()}>
          {drawn.districts.map((d) => {
            const tone = toneFor(d.slug);
            const isFocus = d.slug === focusSlug;
            const isHover = hover?.kind === "district" && hover.slug === d.slug;
            const fill = tone === "base" ? BASE_FILLS[d.idx % BASE_FILLS.length] : TONE_FILL[tone];
            return (
              <path
                key={d.slug}
                d={d.d}
                role={onSelect ? "link" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                aria-label={onSelect ? `Open ${d.name} district` : undefined}
                className={cn(
                  fill,
                  "outline-none transition-[fill-opacity,stroke] duration-150",
                  onSelect && "cursor-pointer",
                  isFocus ? "stroke-primary" : isHover ? "stroke-sidebar" : "stroke-card",
                  isHover && "brightness-95",
                  "focus-visible:stroke-primary",
                )}
                strokeWidth={isFocus ? 2.4 : isHover ? 2 : 1}
                vectorEffect="non-scaling-stroke"
                onMouseMove={(e) => track(e, { kind: "district", slug: d.slug, name: d.name })}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect?.(d.slug)}
                onKeyDown={(e) => {
                  if (onSelect && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect(d.slug);
                  }
                }}
              />
            );
          })}

          {/* District labels; tiny districts (Chennai) get a callout into the sea. */}
          <g className="pointer-events-none">
            {drawn.districts.map((d) => {
              const small = !focusSlug && d.area < 120;
              const strong = emphasize?.has(d.slug) || d.slug === focusSlug;
              const fs = (focusSlug ? (d.slug === focusSlug ? 15 : 10) : strong ? 9.5 : 8) / k;
              const tx = small ? d.lx + 30 / k : d.lx;
              return (
                <g key={d.slug}>
                  {small && <line x1={d.lx} y1={d.ly} x2={tx - 3 / k} y2={d.ly} className="stroke-foreground/60" strokeWidth={0.8 / k} />}
                  <text
                    x={tx}
                    y={d.ly}
                    dy="0.35em"
                    textAnchor={small ? "start" : "middle"}
                    fontSize={fs}
                    className={cn(
                      "stroke-card",
                      strong ? "fill-foreground font-bold" : "fill-foreground/70 font-medium",
                      focusSlug && d.slug !== focusSlug && "fill-muted-foreground",
                    )}
                    strokeWidth={2.4 / k}
                    strokeLinejoin="round"
                    style={{ paintOrder: "stroke" }}
                  >
                    {d.name}
                  </text>
                </g>
              );
            })}
          </g>

          {drawn.projectedPins.map((p) => {
            const common = {
              onMouseMove: (e: MouseEvent) => track(e, { kind: "pin", pin: p }),
              onMouseLeave: () => setHover(null),
              onClick: () => onPinSelect?.(p),
              className: cn(onPinSelect && "cursor-pointer"),
            };
            if (p.kind === "godown") {
              const s = 11 / k;
              return (
                <rect key={p.id} {...common} x={p.x - s / 2} y={p.y - s / 2} width={s} height={s} rx={2.5 / k} className={cn(common.className, "fill-primary stroke-card")} strokeWidth={1.8 / k} />
              );
            }
            if (p.kind === "hq") {
              return (
                <g key={p.id} className="pointer-events-none">
                  <circle cx={p.x} cy={p.y} r={4.2 / k} className="fill-sidebar stroke-card" strokeWidth={1.6 / k} />
                </g>
              );
            }
            return (
              <circle key={p.id} {...common} cx={p.x} cy={p.y} r={5 / k} className={cn(common.className, PIN_FILL[p.status ?? "NORMAL"], "stroke-card")} strokeWidth={1.6 / k} />
            );
          })}
        </g>
      </svg>

      {showCompass && (
        <div className="pointer-events-none absolute left-3 top-2 flex flex-col items-center text-foreground/80" aria-hidden>
          <span className="text-[11px] font-bold">N</span>
          <svg width="14" height="18" viewBox="0 0 14 18"><path d="M7 0 14 18 7 13 0 18Z" className="fill-foreground/80" /></svg>
        </div>
      )}

      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <button type="button" onClick={() => zoomBy(1.5)} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Zoom in"><Plus className="size-4" /></button>
        <button type="button" onClick={() => zoomBy(1 / 1.5)} className="border-y border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Zoom out"><Minus className="size-4" /></button>
        <button type="button" onClick={reset} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Reset view"><RotateCcw className="size-3.5" /></button>
      </div>

      {hover && tip && (
        <div
          className="pointer-events-none absolute z-10 min-w-[150px] max-w-[240px] rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-float"
          style={{
            left: Math.min(hover.x + 14, Math.max(0, wrapW - 250)),
            top: Math.max(4, hover.y - 12),
          }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}

export function MapLegendDot({ className, label, hint }: { className: string; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={cn("mt-0.5 size-3 shrink-0 rounded-full", className)} />
      <span className="leading-tight">
        <span className="block text-xs font-semibold text-foreground">{label}</span>
        {hint && <span className="block text-[10px] text-muted-foreground">{hint}</span>}
      </span>
    </li>
  );
}

/** Decorative Tamil Nadu outline with network nodes (login hero). */
export function TnNetworkOutline({ className }: { className?: string }) {
  const { data: geo } = useQuery(tnGeoQuery());
  const drawn = useMemo(() => {
    if (!geo) return null;
    const projection = geoMercator().fitExtent([[6, 6], [294, 334]], geo as FeatureCollection<Geometry>);
    const path = geoPath(projection);
    const nodes: [number, number][] = geo.features.map((f) => projection(f.properties.label) ?? [0, 0]);
    // Link each node to its two nearest neighbours for a simple network mesh.
    const links: [number, number, number, number][] = [];
    nodes.forEach((a, i) => {
      nodes
        .map((b, j) => ({ j, d: (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 }))
        .filter((x) => x.j > i)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2)
        .forEach(({ j }) => {
          const b = nodes[j];
          if (b) links.push([a[0], a[1], b[0], b[1]]);
        });
    });
    return { paths: geo.features.map((f) => path(f) ?? ""), nodes, links };
  }, [geo]);
  if (!drawn) return <div className={className} />;
  return (
    <svg viewBox="0 0 300 340" className={className} aria-hidden>
      <g className="fill-primary/25 stroke-card/80" strokeWidth={0.8}>
        {drawn.paths.map((d, i) => <path key={i} d={d} />)}
      </g>
      <g className="stroke-card" strokeWidth={0.7} opacity={0.75}>
        {drawn.links.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </g>
      <g className="fill-card">
        {drawn.nodes.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.2} />)}
      </g>
    </svg>
  );
}
