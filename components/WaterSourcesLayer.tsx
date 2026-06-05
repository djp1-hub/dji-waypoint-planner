'use client';

// Water sources overlay — loads pre-fetched GeoJSON from
// /data/water-sources-cz.json and renders colored polygons on the map.
// drinking tier = dark blue, general tier = light blue.
// Must be a child of MapContainer (useMapLayer calls useMap internally).

import { waterSourceColor, waterSourceFillOpacity } from '@/lib/waterSources';
import { DataRegion, dataFileUrl } from '@/lib/dataRegion';
import { useMapLayer } from '@/hooks/useMapLayer';

interface WaterSourcesLayerProps {
  active: boolean;
  dataRegion: DataRegion;
}

export default function WaterSourcesLayer({ active, dataRegion }: WaterSourcesLayerProps) {
  useMapLayer({
    active,
    fetchUrl: dataFileUrl('water-sources', dataRegion),

    // Data is already a valid GeoJSON FeatureCollection — pass through directly
    parseData: (rawData) => rawData as GeoJSON.FeatureCollection,

    styleFeature: (feature) => {
      const tier  = (feature.properties?.tier as string) ?? 'general';
      const color = waterSourceColor(tier);
      return {
        color,
        weight: 1.5,
        opacity: 0.85,
        fillColor: color,
        fillOpacity: waterSourceFillOpacity(tier),
      };
    },

    tooltipHtml: (props) =>
      `<strong>${props.name}</strong><br/><span>${props.tier === 'drinking' ? '💧 Pitná voda' : '🌊 Vodní nádrž'}</span><br/><em>${props.restriction}</em>`,

    hoverFillOpacity: 0.5,
  });

  return null;
}
