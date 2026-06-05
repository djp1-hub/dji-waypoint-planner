'use client';

// Interactive Leaflet map component (must be imported with next/dynamic + ssr:false)
// Leaflet uses browser-only APIs (window, document) so it cannot run on the server.

import { useEffect, useRef } from 'react';
import type { LatLngExpression } from 'leaflet';
import {
  MapContainer,
  Polyline,
  Rectangle,
  Polygon,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Waypoint } from '@/lib/types';
import type { DataRegion } from '@/lib/dataRegion';

import AirspaceLayer from './AirspaceLayer';
import ProtectedAreasLayer from './ProtectedAreasLayer';
import SmallReservesLayer from './SmallReservesLayer';
import WaterSourcesLayer from './WaterSourcesLayer';
import RailwayLayer from './RailwayLayer';
import RoadLayer from './RoadLayer';
import PowerlineLayer from './PowerlineLayer';

// Fix Leaflet's default icon URLs broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createNumberedIcon(index: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      background: #3b82f6;
      color: white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      cursor: grab;
    ">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface EventHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
  onCenterChange: (lat: number, lng: number) => void;
}

function MapEventHandler({ onMapClick, onCenterChange }: EventHandlerProps) {
  const onMapClickRef = useRef(onMapClick);
  const onCenterChangeRef = useRef(onCenterChange);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useMapEvents({
    click(e) {
      onMapClickRef.current(e.latlng.lat, e.latlng.lng);
    },

    moveend(e) {
      const center = e.target.getCenter();
      onCenterChangeRef.current(center.lat, center.lng);
    },
  });

  return null;
}

function LayersControl() {
  const map = useMap();

  useEffect(() => {
    const osm = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    );

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri' },
    );

    const topo = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri' },
    );

    osm.addTo(map);

    const layersControl = L.control
      .layers(
        {
          '🗺 Mapa': osm,
          '🛰 Satelit': satellite,
          '🏔 Terén': topo,
        },
        {},
        { position: 'topright' },
      )
      .addTo(map);

    const CompassClass = L.Control.extend({
      options: { position: 'bottomright' },

      onAdd() {
        const div = L.DomUtil.create('div');

        div.style.cssText = 'background:transparent;';
        div.style.cursor = 'pointer';
        div.title = 'Dvojklik pro reset pohledu na misi';

        div.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
          <circle cx="22" cy="22" r="20" fill="#1a1a2e" stroke="#555" stroke-width="1.5"/>
          <polygon points="22,4 26,22 22,18 18,22" fill="#ef4444"/>
          <polygon points="22,40 26,22 22,26 18,22" fill="white" opacity="0.6"/>
          <text x="22" y="12" text-anchor="middle" fill="white" font-size="8" font-weight="bold">N</text>
          <text x="22" y="38" text-anchor="middle" fill="white" font-size="7" opacity="0.6">S</text>
          <text x="9"  y="26" text-anchor="middle" fill="white" font-size="7" opacity="0.6">W</text>
          <text x="35" y="26" text-anchor="middle" fill="white" font-size="7" opacity="0.6">E</text>
        </svg>
        <div style="text-align:center;color:#aaa;font-size:9px;margin-top:2px;">2× reset</div>`;

        L.DomEvent.on(div, 'click', L.DomEvent.stopPropagation);

        L.DomEvent.on(div, 'dblclick', (e) => {
          L.DomEvent.stopPropagation(e);

          const bounds = L.latLngBounds([]);
          let markerCount = 0;

          map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              bounds.extend(layer.getLatLng());
              markerCount++;
            }
          });

          if (bounds.isValid() && markerCount > 0) {
            map.fitBounds(bounds, { padding: [80, 80], maxZoom: 17 });
          } else {
            map.setView([49.8, 15.5], 8);
          }
        });

        return div;
      },
    });

    const compass = new CompassClass();
    compass.addTo(map);

    return () => {
      const container = compass.getContainer();

      if (container) {
        L.DomEvent.off(container, 'click', L.DomEvent.stopPropagation);
      }

      layersControl.remove();
      compass.remove();
      osm.remove();
    };
  }, [map]);

  return null;
}

interface MapProps {
  waypoints: Waypoint[];
  draggableMarkers: boolean;
  crosshairCursor?: boolean;

  onMapClick: (lat: number, lng: number) => void;
  onUpdateWaypoint: (id: string, lat: number, lng: number) => void;
  onCenterChange: (lat: number, lng: number) => void;

  gridRect: [[number, number], [number, number]] | null;

  polygonPoints: { lat: number; lng: number }[];
  polygonDrawActive: boolean;

  facadeLine: [[number, number], [number, number]] | null;
  buildingPolygon:
    | [[number, number], [number, number], [number, number], [number, number]]
    | null;

  flyToTarget: { lat: number; lng: number; zoom: number } | null;

  showAirspace: boolean;
  showProtectedAreas: boolean;
  showSmallReserves: boolean;
  showWaterSources: boolean;
  showRailways: boolean;
  showRoads: boolean;
  showPowerlines: boolean;

  dataRegion: DataRegion;
}

export default function MapView({
  waypoints,
  draggableMarkers,
  crosshairCursor,
  onMapClick,
  onUpdateWaypoint,
  onCenterChange,
  gridRect,
  polygonPoints,
  polygonDrawActive,
  facadeLine,
  buildingPolygon,
  flyToTarget,
  showAirspace,
  showProtectedAreas,
  showSmallReserves,
  showWaterSources,
  showRailways,
  showRoads,
  showPowerlines,
  dataRegion,
}: MapProps) {
  const markersRef = useRef<Record<string, L.Marker>>({});
  const mapRef = useRef<L.Map | null>(null);
  const onUpdateWaypointRef = useRef(onUpdateWaypoint);

  useEffect(() => {
    onUpdateWaypointRef.current = onUpdateWaypoint;
  }, [onUpdateWaypoint]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const container = mapRef.current.getContainer();

    if (crosshairCursor) {
      container.classList.remove('leaflet-grab');
      container.classList.add('leaflet-crosshair');
    } else {
      container.classList.remove('leaflet-crosshair');
      container.classList.add('leaflet-grab');
    }
  }, [crosshairCursor]);

  useEffect(() => {
    if (!mapRef.current || !flyToTarget) {
      return;
    }

    const target: LatLngExpression = [flyToTarget.lat, flyToTarget.lng];

    mapRef.current.flyTo(target, flyToTarget.zoom, {
      animate: true,
      duration: 1,
    });
  }, [flyToTarget]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const currentIds = new Set(waypoints.map((wp) => wp.id));

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!currentIds.has(id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    });

    waypoints.forEach((wp, index) => {
      const existing = markersRef.current[wp.id];
      const icon = createNumberedIcon(index);

      if (existing) {
        existing.setLatLng([wp.lat, wp.lng]);
        existing.setIcon(icon);

        if (existing.dragging) {
          if (draggableMarkers) {
            existing.dragging.enable();
          } else {
            existing.dragging.disable();
          }
        }

        return;
      }

      const marker = L.marker([wp.lat, wp.lng], {
        icon,
        draggable: draggableMarkers,
      });

      marker.addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onUpdateWaypointRef.current(wp.id, pos.lat, pos.lng);
      });

      markersRef.current[wp.id] = marker;
    });
  }, [waypoints, draggableMarkers]);

  const polylinePositions = waypoints.map(
    (wp) => [wp.lat, wp.lng] as [number, number],
  );

  const polygonPositions = polygonPoints.map(
    (p) => [p.lat, p.lng] as [number, number],
  );

  return (
    <MapContainer
      center={[50.08, 14.42]}
      zoom={13}
      style={{
        height: '100%',
        width: '100%',
      }}
      ref={mapRef}
    >
      <LayersControl />

      <MapEventHandler
        onMapClick={onMapClick}
        onCenterChange={onCenterChange}
      />

      <AirspaceLayer
        key={`airspace-${dataRegion}`}
        active={showAirspace}
        dataRegion={dataRegion}
      />

      <ProtectedAreasLayer
        key={`protected-areas-${dataRegion}`}
        active={showProtectedAreas}
        dataRegion={dataRegion}
      />

      <SmallReservesLayer
        key={`small-reserves-${dataRegion}`}
        active={showSmallReserves}
        dataRegion={dataRegion}
      />

      <WaterSourcesLayer
        key={`water-sources-${dataRegion}`}
        active={showWaterSources}
        dataRegion={dataRegion}
      />

      <RailwayLayer
        key={`railways-${dataRegion}`}
        active={showRailways}
        dataRegion={dataRegion}
      />

      <RoadLayer
        key={`roads-${dataRegion}`}
        active={showRoads}
        dataRegion={dataRegion}
      />

      <PowerlineLayer
        key={`powerlines-${dataRegion}`}
        active={showPowerlines}
        dataRegion={dataRegion}
      />

      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          color="#3b82f6"
          weight={2}
          opacity={0.8}
        />
      )}

      {gridRect && (
        <Rectangle
          bounds={gridRect}
          pathOptions={{
            color: '#f59e0b',
            weight: 2,
            fillOpacity: 0.1,
            fillColor: '#f59e0b',
          }}
        />
      )}

      {polygonPositions.length >= 2 && (
        <Polyline
          positions={polygonPositions}
          pathOptions={{
            color: '#22c55e',
            weight: 2,
            dashArray: polygonDrawActive ? '6 4' : undefined,
          }}
        />
      )}

      {polygonPositions.length >= 3 && (
        <Polygon
          positions={polygonPositions}
          pathOptions={{
            color: '#22c55e',
            weight: 2,
            fillOpacity: 0.08,
            fillColor: '#22c55e',
          }}
        />
      )}

      {facadeLine && (
        <Polyline
          positions={facadeLine}
          pathOptions={{
            color: '#f59e0b',
            weight: 3,
            dashArray: '6 4',
          }}
        />
      )}

      {buildingPolygon && (
        <Polygon
          positions={buildingPolygon}
          pathOptions={{
            color: '#f59e0b',
            weight: 2,
            dashArray: '6 4',
            fillOpacity: 0.08,
            fillColor: '#f59e0b',
          }}
        />
      )}
    </MapContainer>
  );
}