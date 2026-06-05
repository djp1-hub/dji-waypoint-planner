'use client';

// Road overlay — loads pre-fetched LineString GeoJSON from /data/roads-cz.json
// and renders colored polylines on the map.
//
// MOTORWAY/EXPRESSWAY — thick amber line (50 m buffer zone)
// PRIMARY             — amber line (50 m buffer zone)
// SECONDARY           — thin light amber line (15 m buffer zone)
//
// The layer shows WHERE roads are. Collision detection (50/15 m point-to-line
// distance check) runs separately in lib/collisionDetection.ts.
// Must be a child of MapContainer (useMapLayer calls useMap internally).

import { roadColor, roadWeight } from '@/lib/road';
import { DataRegion, dataFileUrl } from '@/lib/dataRegion';
import { useMapLayer } from '@/hooks/useMapLayer';

interface RoadLayerProps {
  active: boolean;
  dataRegion: DataRegion;
}

export default function RoadLayer({ active, dataRegion }: RoadLayerProps) {
  useMapLayer({
    active,
    fetchUrl: dataFileUrl('roads', dataRegion),

    // Data is already a valid GeoJSON FeatureCollection — pass through directly
    parseData: (rawData) => rawData as GeoJSON.FeatureCollection,

    // LineString features use color + weight; fillOpacity is ignored by Leaflet for lines
    styleFeature: (feature) => {
      const roadClass = (feature.properties?.roadClass as string) ?? 'PRIMARY';
      return {
        color:   roadColor(roadClass),
        weight:  roadWeight(roadClass),
        opacity: 0.85,
      };
    },

    tooltipHtml: (props) => {
      const roadClass = props.roadClass as string;
      const ref       = (props.ref as string) || '';
      const bufferM   = props.bufferM as number;

      const classLabel: Record<string, string> = {
        MOTORWAY:   'Dálnice',
        EXPRESSWAY: 'Rychlostní silnice',
        PRIMARY:    'Silnice I. třídy',
        SECONDARY:  'Silnice II. třídy',
      };
      const label = classLabel[roadClass] ?? roadClass;
      const title = ref ? `${label} ${ref}` : label;

      return `<strong>🛣️ ${title}</strong><br/><span>Ochranné pásmo ${bufferM} m od osy</span><br/><em>${props.restriction}</em>`;
    },

    // For polylines, hoverFillOpacity is ignored — weight changes on hover via Leaflet default
    hoverFillOpacity: 0.85,
  });

  return null;
}
