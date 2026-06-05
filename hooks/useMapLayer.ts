'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface UseMapLayerOptions {
  active: boolean;
  fetchUrl: string;
  parseData: (rawData: unknown) => GeoJSON.FeatureCollection;
  styleFeature: (feature: GeoJSON.Feature) => L.PathOptions;
  tooltipHtml?: (props: Record<string, unknown>) => string;
  hoverFillOpacity?: number;
}

export function useMapLayer({
  active,
  fetchUrl,
  parseData,
  styleFeature,
  tooltipHtml,
  hoverFillOpacity = 0.45,
}: UseMapLayerOptions) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearLayer = () => {
      if (layerRef.current) {
        layerRef.current.removeFrom(map);
        layerRef.current = null;
      }
    };

    // Важно: при любом изменении active/fetchUrl сначала убрать старый слой.
    clearLayer();

    if (!active) {
      return () => {
        cancelled = true;
        clearLayer();
      };
    }

    async function loadAndRender() {
      try {
        const res = await fetch(fetchUrl);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const rawData: unknown = await res.json();

        if (cancelled) {
          return;
        }

        const geoJson = parseData(rawData);

        const layer = L.geoJSON(geoJson, {
          style: (feature) => {
            if (!feature) {
              return {};
            }

            return styleFeature(feature as GeoJSON.Feature);
          },

          onEachFeature: (feature, leafletLayer) => {
            const props = (feature.properties ?? {}) as Record<string, unknown>;

            if (tooltipHtml) {
              leafletLayer.bindTooltip(tooltipHtml(props), {
                sticky: true,
                direction: 'top',
                opacity: 0.95,
              });
            }

            leafletLayer.on({
              mouseover: (event) => {
                const target = event.target as L.Path;

                target.setStyle({
                  fillOpacity: hoverFillOpacity,
                });

                target.bringToFront();
              },

              mouseout: (event) => {
                const target = event.target as L.Path;
                const originalStyle = styleFeature(feature as GeoJSON.Feature);

                target.setStyle(originalStyle);
              },
            });
          },
        });

        if (cancelled) {
          layer.remove();
          return;
        }

        layer.addTo(map);
        layerRef.current = layer;
      } catch (error) {
        clearLayer();
        console.error(`[useMapLayer] Failed to load ${fetchUrl}:`, error);
      }
    }

    loadAndRender();

    return () => {
      cancelled = true;
      clearLayer();
    };
  }, [
    map,
    active,
    fetchUrl,
    parseData,
    styleFeature,
    tooltipHtml,
    hoverFillOpacity,
  ]);
}