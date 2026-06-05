'use client';

import { protectedAreaColor, protectedAreaFillOpacity } from '@/lib/protectedAreas';
import { DataRegion, dataFileUrl } from '@/lib/dataRegion';
import { useMapLayer } from '@/hooks/useMapLayer';


interface ProtectedAreasLayerProps {
  active: boolean;
  dataRegion: DataRegion;
}

export default function ProtectedAreasLayer({
  active,
  dataRegion,
}: ProtectedAreasLayerProps) {
  useMapLayer({
    active,
    fetchUrl: dataFileUrl('protected-areas', dataRegion),

    parseData: (rawData) => rawData as GeoJSON.FeatureCollection,

    styleFeature: (feature) => {
      const type = (feature.properties?.type as string) ?? '';
      const color = protectedAreaColor(type);

      return {
        color,
        weight: 1.5,
        opacity: 0.85,
        fillColor: color,
        fillOpacity: protectedAreaFillOpacity(type),
      };
    },

    tooltipHtml: (props) =>
      `<strong>${props.name}</strong><br/><span>${props.type}</span><br/><em>${props.restriction}</em>`,

    hoverFillOpacity: 0.45,
  });

  return null;
}