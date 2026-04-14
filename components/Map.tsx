'use client';

// Interactive Leaflet map component (must be imported with next/dynamic + ssr:false)
// Leaflet uses browser-only APIs (window, document) so it cannot run on the server.
import { useEffect, useRef } from 'react';
import type { LatLngExpression } from 'leaflet';
import { MapContainer, Polyline, Rectangle, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Waypoint } from '@/lib/types';
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

/** Create a numbered colored marker icon for a waypoint */
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

/** Inner component that handles map clicks and center-change events.
 *  Callbacks are stored in refs so that useMapEvents always calls the latest
 *  version of the handler even if Leaflet bound the listener only once on mount.
 */
function MapEventHandler({ onMapClick, onCenterChange }: EventHandlerProps) {
  // Keep a ref to the latest callbacks to avoid stale closures in Leaflet listeners
  const onMapClickRef = useRef(onMapClick);
  const onCenterChangeRef = useRef(onCenterChange);

  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onCenterChangeRef.current = onCenterChange; }, [onCenterChange]);

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

/**
 * Tile layers switcher + static compass.
 * Must be a child of MapContainer so useMap() can access the map instance.
 * All tile layers are managed exclusively by Leaflet (not React) to avoid
 * conflicts between react-leaflet's TileLayer and L.control.layers().
 */
function LayersControl() {
  const map = useMap();

  useEffect(() => {
    // ── Tile layers ────────────────────────────────────────────────────────────
    const osm = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
    );
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri' },
    );
    const topo = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri' },
    );

    osm.addTo(map); // OSM is the default layer

    const layersControl = L.control.layers(
      { '🗺 Mapa': osm, '🛰 Satelit': satellite, '🏔 Terén': topo },
      {},
      { position: 'topright' },
    ).addTo(map);

    // ── Static compass — Leaflet map never rotates, north is always up ─────────
    // Double-click resets the view to the center of Czech Republic at zoom 8.
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
        // Prevent single click from propagating to map (would add a waypoint)
        L.DomEvent.on(div, 'click', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'dblclick', (e) => {
          L.DomEvent.stopPropagation(e);
          // Collect bounds from all markers currently on the map
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
            map.setView([49.8, 15.5], 8); // fallback: centre of Czech Republic
          }
        });
        return div;
      },
    });
    const compass = new CompassClass();
    compass.addTo(map);

    // Cleanup: remove explicit DomEvent listener, then controls and layers
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
  /** Whether waypoint markers can be dragged (only in waypoints mode) */
  draggableMarkers: boolean;
  /** Cursor style hint — 'crosshair' when selecting a point on the map */
  crosshairCursor?: boolean;
  /** Called on every map click */
  onMapClick: (lat: number, lng: number) => void;
  /** Called after drag ends on a marker */
  onUpdateWaypoint: (id: string, lat: number, lng: number) => void;
  /** Called when the map viewport moves — provides the new center */
  onCenterChange: (lat: number, lng: number) => void;
  /** Optional rectangle to draw (grid area selection) — [[swLat,swLng],[neLat,neLng]] */
  gridRect: [[number, number], [number, number]] | null;
  /** Optional facade line — [[aLat,aLng],[bLat,bLng]] */
  facadeLine: [[number, number], [number, number]] | null;
  /** Optional building polygon for 360° facade mode — 4 corners [[lat,lng],...] */
  buildingPolygon: [[number, number], [number, number], [number, number], [number, number]] | null;
  /** When set, the map smoothly flies to these coordinates at the given zoom level */
  flyToTarget: { lat: number; lng: number; zoom: number } | null;
  /** Whether to show CTR/TRA airspace zones on the map */
  showAirspace: boolean;
  /** Whether to show NP/CHKO protected areas on the map */
  showProtectedAreas: boolean;
  /** Whether to show NPR/NPP/PR/PP small nature reserves on the map */
  showSmallReserves: boolean;
  /** Whether to show water reservoirs and protection zones on the map */
  showWaterSources: boolean;
  /** Whether to show railway buffer zones on the map */
  showRailways: boolean;
  /** Whether to show road and highway protection zones on the map */
  showRoads: boolean;
  /** Whether to show power line and substation protection zones on the map */
  showPowerlines: boolean;
}

export default function MapView({
  waypoints,
  draggableMarkers,
  crosshairCursor,
  onMapClick,
  onUpdateWaypoint,
  onCenterChange,
  gridRect,
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
}: MapProps) {
  const markersRef = useRef<Record<string, L.Marker>>({});
  const mapRef = useRef<L.Map | null>(null);
  // Ref to the latest onUpdateWaypoint — prevents stale closures in marker dragend handlers.
  // Markers are created once; without this ref they would capture the initial callback version.
  const onUpdateWaypointRef = useRef(onUpdateWaypoint);
  useEffect(() => { onUpdateWaypointRef.current = onUpdateWaypoint; }, [onUpdateWaypoint]);

  // Toggle crosshair cursor by swapping Leaflet CSS classes on the map container.
  // Leaflet adds 'leaflet-grab' by default which overrides any inline cursor style,
  // so we must remove it and add 'leaflet-crosshair' instead.
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current.getContainer();
    if (crosshairCursor) {
      container.classList.remove('leaflet-grab');
      container.classList.add('leaflet-crosshair');
    } else {
      container.classList.remove('leaflet-crosshair');
      container.classList.add('leaflet-grab');
    }
  }, [crosshairCursor]);

  // Fly to a location when flyToTarget changes (triggered by address search)
  useEffect(() => {
    if (!mapRef.current || !flyToTarget) return;
    const target: LatLngExpression = [flyToTarget.lat, flyToTarget.lng];
    mapRef.current.flyTo(target, flyToTarget.zoom, { animate: true, duration: 1 });
  }, [flyToTarget]);

  // Sync markers whenever waypoints or draggable flag changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const currentIds = new Set(waypoints.map((wp) => wp.id));

    // Remove stale markers
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!currentIds.has(id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    });

    // Add or update each waypoint marker
    waypoints.forEach((wp, index) => {
      const existing = markersRef.current[wp.id];
      const icon = createNumberedIcon(index);

      if (existing) {
        existing.setLatLng([wp.lat, wp.lng]);
        existing.setIcon(icon);
        // Update draggable — Leaflet requires remove/re-add to toggle draggable
        if (existing.dragging) {
          draggableMarkers ? existing.dragging.enable() : existing.dragging.disable();
        }
      } else {
        const marker = L.marker([wp.lat, wp.lng], { icon, draggable: draggableMarkers });
        marker.addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onUpdateWaypointRef.current(wp.id, pos.lat, pos.lng);
        });
        markersRef.current[wp.id] = marker;
      }
    });
  }, [waypoints, draggableMarkers, onUpdateWaypoint]);

  const polylinePositions = waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]);

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
      {/* LayersControl manages all tile layers imperatively via useMap().
          No <TileLayer> in JSX — avoids conflicts with L.control.layers(). */}
      <LayersControl />
      <MapEventHandler onMapClick={onMapClick} onCenterChange={onCenterChange} />

      {/* Airspace overlay — renders only when showAirspace is true */}
      <AirspaceLayer active={showAirspace} />

      {/* Protected areas overlay — NP (green) and CHKO (blue) */}
      <ProtectedAreasLayer active={showProtectedAreas} />

      {/* Small nature reserves overlay — NPR/NPP (dark green), PR/PP (light green) */}
      <SmallReservesLayer active={showSmallReserves} />

      {/* Water sources overlay — drinking (dark blue), general reservoir (light blue) */}
      <WaterSourcesLayer active={showWaterSources} />

      {/* Railway buffer overlay — main rail (red 60 m), tram (orange 30 m) */}
      <RailwayLayer active={showRailways} />

      {/* Road overlay — motorway/primary amber 50 m, secondary light amber 15 m */}
      <RoadLayer active={showRoads} />

      {/* Power line overlay — voltage-based colors, substations as yellow polygons */}
      <PowerlineLayer active={showPowerlines} />

      {/* Waypoint connection line */}
      {polylinePositions.length > 1 && (
        <Polyline positions={polylinePositions} color="#3b82f6" weight={2} opacity={0.8} />
      )}

      {/* Grid area rectangle */}
      {gridRect && (
        <Rectangle
          bounds={gridRect}
          pathOptions={{ color: '#f59e0b', weight: 2, fillOpacity: 0.1, fillColor: '#f59e0b' }}
        />
      )}

      {/* Facade line between point A and B */}
      {facadeLine && (
        <Polyline
          positions={facadeLine}
          pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '6 4' }}
        />
      )}

      {/* Building polygon for 360° facade mode */}
      {buildingPolygon && (
        <Polygon
          positions={buildingPolygon}
          pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '6 4', fillOpacity: 0.08, fillColor: '#f59e0b' }}
        />
      )}
    </MapContainer>
  );
}
