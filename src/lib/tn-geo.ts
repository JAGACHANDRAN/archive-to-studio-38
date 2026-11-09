import { queryOptions } from "@tanstack/react-query";
import type { FeatureCollection, MultiPolygon } from "geojson";

export interface TnFeatureProps {
  name: string;
  slug: string;
  /** [lng, lat] label anchor inside the district's largest polygon. */
  label: [number, number];
}
export type TnGeo = FeatureCollection<MultiPolygon, TnFeatureProps>;

/** Tamil Nadu district boundaries, loaded once in the browser and cached for the session. */
export const tnGeoQuery = () =>
  queryOptions({
    queryKey: ["tn-geo"],
    queryFn: async (): Promise<TnGeo> => {
      const res = await fetch("/data/tamil_nadu_districts.geojson");
      if (!res.ok) throw new Error("Could not load the Tamil Nadu map");
      return (await res.json()) as TnGeo;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
