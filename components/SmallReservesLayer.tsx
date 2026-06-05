'use client';

// Small nature reserves overlay — loads pre-fetched GeoJSON from
// /data/small-reserves-cz.json and renders colored polygons on the map.
// NPR/NPP = dark green, PR/PP = light green.
// Must be a child of MapContainer (useMapLayer calls useMap internally).

import { smallReserveColor, smallReserveFillOpacity } from '@/lib/smallReserves';
import { DataRegion, dataFileUrl } from '@/lib/dataRegion';
import { useMapLayer } from '@/hooks/useMapLayer';

interface SmallReservesLayerProps {
  active: boolean;
  dataRegion: DataRegion;
}

export default function SmallReservesLayer({ active, dataRegion }: SmallReservesLayerProps) {
  useMapLayer({
    active,
    fetchUrl: dataFileUrl('small-reserves', dataRegion),

    // Data is already a valid GeoJSON FeatureCollection — pass through directly
    parseData: (rawData) => rawData as GeoJSON.FeatureCollection,

    styleFeature: (feature) => {
      const type  = (feature.properties?.type as string) ?? '';
      const color = smallReserveColor(type);
      return {
        color,
        weight: 1.5,
        opacity: 0.85,
        fillColor: color,
        fillOpacity: smallReserveFillOpacity(type),
      };
    },

    tooltipHtml: (props) =>
      `<strong>${props.name}</strong><br/><span>${props.type}</span><br/><em>${props.restriction}</em>`,

    hoverFillOpacity: 0.5,
  });

  return null;
}
