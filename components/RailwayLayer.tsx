'use client';

// Railway overlay — loads pre-fetched LineString GeoJSON from
// /data/railways-cz.json and renders colored polylines on the map.
// main tier (rail/light_rail/narrow_gauge) = thick red line (60 m buffer zone)
// tram tier = thinner orange line (30 m buffer zone)
//
// The layer shows WHERE railways are. Collision detection (60/30 m point-to-line
// distance check) runs separately in lib/collisionDetection.ts.
// Must be a child of MapContainer (useMapLayer calls useMap internally).

import { railwayColor, railwayWeight } from '@/lib/railway';
import { DataRegion, dataFileUrl } from '@/lib/dataRegion';
import { useMapLayer } from '@/hooks/useMapLayer';

interface RailwayLayerProps {
  active: boolean;
  dataRegion: DataRegion;
}

export default function RailwayLayer({ active, dataRegion }: RailwayLayerProps) {
  useMapLayer({
    active,
    fetchUrl: dataFileUrl('railways', dataRegion),

    // Data is already a valid GeoJSON FeatureCollection — pass through directly
    parseData: (rawData) => rawData as GeoJSON.FeatureCollection,

    // LineString features use color + weight; fillOpacity is ignored by Leaflet for lines
    styleFeature: (feature) => {
      const tier   = (feature.properties?.tier as string) ?? 'main';
      const color  = railwayColor(tier);
      const weight = railwayWeight(tier);
      return { color, weight, opacity: 0.85 };
    },

    tooltipHtml: (props) => {
      const icon = props.tier === 'main' ? '🚂' : '🚋';
      return `<strong>${props.name}</strong><br/><span>${icon} Buffer ${props.bufferM} m from track axis</span><br/><em>${props.restriction}</em>`;
    },

    // For polylines, hoverFillOpacity is ignored — increase weight on hover instead
    hoverFillOpacity: 0.85,
  });

  return null;
}
