'use client';

// Power line overlay — loads pre-fetched GeoJSON from /data/powerlines-cz.json
// and renders colored lines (power=line) and polygon fills (power=substation).
//
// Voltage classes and colors:
//   EHV   > 400 kV  → violet (thick)     30 m buffer
//   HV400  220–400 kV → purple            20 m buffer
//   HV220  110–220 kV → pink              15 m buffer
//   HV110   35–110 kV → orange            12 m buffer
//   SUBSTATION        → yellow fill       20 m buffer
//
// Collision detection (distance check for lines, point-in-polygon for substations)
// runs separately in lib/collisionDetection.ts.
// Must be a child of MapContainer (useMapLayer calls useMap internally).

import { powerlineColor, powerlineWeight, substationFillColor } from '@/lib/powerline';
import { DataRegion, dataFileUrl } from '@/lib/dataRegion';
import { useMapLayer } from '@/hooks/useMapLayer';

interface PowerlineLayerProps {
  active: boolean;
  dataRegion: DataRegion;
}

export default function PowerlineLayer({ active, dataRegion }: PowerlineLayerProps) {
  useMapLayer({
    active,
    fetchUrl: dataFileUrl('powerlines', dataRegion),

    // Data is already a valid GeoJSON FeatureCollection — pass through directly
    parseData: (rawData) => rawData as GeoJSON.FeatureCollection,

    styleFeature: (feature) => {
      const props        = feature.properties ?? {};
      const voltClass    = (props.voltageClass as string) ?? 'HV110';
      const featureType  = (props.featureType  as string) ?? 'line';

      if (featureType === 'substation') {
        return {
          color:       substationFillColor(),
          fillColor:   substationFillColor(),
          weight:      1,
          opacity:     0.7,
          fillOpacity: 0.20,
        };
      }

      // LineString — use color + weight, no fill
      return {
        color:   powerlineColor(voltClass),
        weight:  powerlineWeight(voltClass),
        opacity: 0.85,
      };
    },

    tooltipHtml: (props) => {
      const featureType = props.featureType as string;
      const voltClass   = props.voltageClass as string;

      if (featureType === 'substation') {
        const name = (props.name as string) || 'Trafostanice';
        return `<strong>${name}</strong><br/><span>⚡ Electrical substation</span><br/><em>${props.restriction}</em>`;
      }

      const bufferM = props.bufferM as number;
      const voltLabel: Record<string, string> = {
        EHV:   '> 400 kV',
        HV400: '220–400 kV',
        HV220: '110–220 kV',
        HV110:  '35–110 kV',
      };
      const label = voltLabel[voltClass] ?? voltClass;
      return `<strong>⚡ Power line ${label}</strong><br/><span>Protection zone ${bufferM} m from axis</span><br/><em>${props.restriction}</em>`;
    },

    hoverFillOpacity: 0.35,
  });

  return null;
}
