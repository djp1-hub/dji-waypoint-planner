'use client';

// 3D Mission Preview — renders the waypoint route in true 3D using CesiumJS.
// Loaded in a new browser tab; reads mission data from localStorage.
//
// Cesium is loaded via CDN <script> tag (not npm dynamic import) to avoid
// Next.js bundling issues with the large CesiumJS package on Vercel.

import { useEffect, useRef, useState } from 'react';
import { Waypoint } from '@/lib/types';
import { useTranslation } from '@/lib/languageContext';

// Declare window.Cesium loaded from CDN — avoids repeated casts throughout the file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { Cesium: any } }

// ── Constants ─────────────────────────────────────────────────────────────────

// Tokens read from environment variables — never hardcode here.
const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN ?? '';
const ION_ENABLED = Boolean(CESIUM_TOKEN.trim());

// Bump this string when upgrading CesiumJS.
const CESIUM_VERSION = '1.115';
const CESIUM_CDN =
  `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the geographic centroid of a waypoint array */
function centroid(waypoints: Waypoint[]): { lng: number; lat: number } {
  const lng = waypoints.reduce((s, wp) => s + wp.lng, 0) / waypoints.length;
  const lat = waypoints.reduce((s, wp) => s + wp.lat, 0) / waypoints.length;
  return { lng, lat };
}

/**
 * Injects Cesium CSS + JS from CDN and resolves when window.Cesium is ready.
 * Skips injection if Cesium is already present (idempotent).
 */
function loadCesiumScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cesium) {
      resolve();
      return;
    }

    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${CESIUM_CDN}/Widgets/widgets.css`;
    document.head.appendChild(link);

    // JS
    const script = document.createElement('script');
    script.src = `${CESIUM_CDN}/Cesium.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cesium from CDN.'));
    document.head.appendChild(script);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Preview3DPage() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sphereRef = useRef<any>(null);
  const tilesetRef = useRef<any>(null);        // OSM Buildings tileset
  // Ref to camera.changed handler so it can be removed in cleanup (prevents stale setHeading calls)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraChangedHandlerRef = useRef<any>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string>(t('preview.loadingCesium'));
  const [mapReady, setMapReady] = useState(false);
  const [buildingsVisible, setBuildingsVisible] = useState(true);
  const [buildingsReady, setBuildingsReady] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  // heading: current camera heading in degrees (0 = north), drives the rotating compass
  const [heading, setHeading] = useState(0);
  const [missionMeta, setMissionMeta] = useState<{
    count: number;
    timestamp: number;
    center: { lng: number; lat: number };
    avgDisplayHeight: number;
  } | null>(null);

  // ── Single effect: read data + init Cesium ────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewer: any = null;
    let disposed = false;

    (async () => {
      try {
        // 1. Load Cesium from CDN via script tag
        setLoading(t('preview.loadingCesium'));
        await loadCesiumScript();
        if (disposed) return;
        const Cesium = window.Cesium;

        Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;

        // 2. Read mission from localStorage
        const raw = localStorage.getItem('preview3d-mission');
        if (!raw) {
          setLoadError(t('preview.noMission'));
          return;
        }

        let wps: Waypoint[];
        let timestamp: number;
        try {
          const parsed = JSON.parse(raw) as {
            waypoints: Waypoint[];
            missionType: string;
            timestamp: number;
          };
          if (!parsed.waypoints?.length) {
            setLoadError(t('preview.emptyMission'));
            return;
          }
          if (parsed.waypoints.some(wp => !Number.isFinite(wp.lat) || !Number.isFinite(wp.lng) || Math.abs(wp.lat) > 90 || Math.abs(wp.lng) > 180 || (wp.height != null && !Number.isFinite(wp.height)))) throw new Error('Invalid mission coordinates');
          wps = parsed.waypoints;
          timestamp = parsed.timestamp;
        } catch {
          setLoadError(t('preview.loadFailed'));
          return;
        }

        const center = centroid(wps);
        setMissionMeta({ count: wps.length, timestamp, center, avgDisplayHeight: 0 });

        // Start with explicit token-free imagery and ellipsoid terrain.
        // Ion failures must never prevent the globe and route from rendering.
        let terrainProvider = new Cesium.EllipsoidTerrainProvider();
        if (ION_ENABLED) {
          try {
            terrainProvider = await Cesium.createWorldTerrainAsync();
          } catch {
            setWarnings(prev => [...prev, 'Terrain unavailable — flat globe']);
          }
        }
        if (disposed) return;
        let groundElevs: number[] = wps.map(() => 0);
        if (terrainProvider.availability) {
          try {
            const samples = await Cesium.sampleTerrainMostDetailed(terrainProvider,
              wps.map(wp => Cesium.Cartographic.fromDegrees(wp.lng, wp.lat)));
            groundElevs = samples.map((p: { height: number }) => Number.isFinite(p.height) ? p.height : 0);
          } catch {
            console.warn('[preview-3d] Terrain sampling unavailable');
          }
        }
        if (disposed) return;
        viewer = new Cesium.Viewer(containerRef.current!, {
          terrainProvider,
          baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/',
          })),
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
        });

        viewerRef.current = viewer;

        viewer.scene.globe.show = true;
        viewer.imageryLayers.get(0).imageryProvider.errorEvent.addEventListener(() => {
          if (!disposed) setWarnings(prev => prev.includes('Map tiles unavailable') ? prev : [...prev, 'Map tiles unavailable']);
        });

        // Style Cesium credit container — must remain visible per Cesium ToS
        const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
        creditContainer.style.fontSize = '10px';
        creditContainer.style.opacity = '0.6';

        // Optional buildings load in the background; the mission stays usable.
        if (ION_ENABLED) void Cesium.createOsmBuildingsAsync().then((tileset: any) => {
          if (disposed) { tileset.destroy(); return; }
          viewer.scene.primitives.add(tileset);
          tilesetRef.current = tileset;
          setBuildingsReady(true);
        }).catch(() => {
          if (!disposed) setWarnings(prev => [...prev, '3D buildings unavailable']);
        });

        // 6. Build absolute positions: ground elevation + AGL waypoint height.
        // For visualization only — KMZ export uses the original heights unchanged.
        // Preserve the mission heights in the preview.

        const positions = wps.map((wp: Waypoint, i: number) => {
          const aglHeight = (wp.height ?? 50);
          return Cesium.Cartesian3.fromDegrees(
            wp.lng,
            wp.lat,
            (groundElevs[i] ?? 0) + aglHeight,
          );
        });
        const avgDisplayHeight = Math.round(
          wps.reduce((s, wp) => s + (wp.height ?? 50), 0) / wps.length,
        );
        // Update meta with the computed display height
        setMissionMeta(prev => prev ? { ...prev, avgDisplayHeight } : prev);

        // 7. Waypoint route as a glowing polyline in the air
        viewer.entities.add({
          polyline: {
            positions,
            width: 4,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.fromCssColorString('#f97316'),
            }),
            clampToGround: false, // fly in the air, not on terrain
          },
        });

        // 8. Waypoint markers: orange point + numbered label at flight altitude
        wps.forEach((wp: Waypoint, i: number) => {
          viewer.entities.add({
            position: positions[i],
            point: {
              pixelSize: 16,
              color: Cesium.Color.fromCssColorString('#f97316'),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.NONE,
            },
            label: {
              text: String(i + 1),
              font: '16px bold sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -16),
              heightReference: Cesium.HeightReference.NONE,
            },
          });
        });

        // Frame the entire route in world coordinates, including terrain height.
        sphereRef.current = Cesium.BoundingSphere.fromPoints(positions);
        viewer.camera.viewBoundingSphere(sphereRef.current,
          new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), Math.max(400, sphereRef.current.radius * 3)));
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

        // Rotating compass: update heading state whenever camera orientation changes.
        // heading = 0 means camera points north; rotating right increases heading.
        // The SVG compass rotates by -heading so north always points up on screen.
        // Store the handler in a ref so it can be removed in the cleanup function.
        cameraChangedHandlerRef.current = () => {
          const h = Cesium.Math.toDegrees(viewer.camera.heading);
          setHeading(h);
        };
        viewer.camera.changed.addEventListener(cameraChangedHandlerRef.current);

        setMapReady(true);

      } catch (err) {
        if (disposed) return;
        console.error('[preview-3d] Initialization failed');
        setLoadError(t('preview.loadFailed'));
      }
    })();

    return () => {
      disposed = true;
      // Remove camera listener before destroying the viewer to prevent
      // setHeading calls on an already-unmounted component.
      if (viewerRef.current?.camera?.changed && cameraChangedHandlerRef.current) {
        viewerRef.current.camera.changed.removeEventListener(cameraChangedHandlerRef.current);
        cameraChangedHandlerRef.current = null;
      }
      viewerRef.current?.destroy();
      viewerRef.current = null;
      tilesetRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle OSM Buildings ─────────────────────────────────────────────────
  function handleToggleBuildings() {
    if (!tilesetRef.current) return;
    const next = !buildingsVisible;
    tilesetRef.current.show = next;
    setBuildingsVisible(next);
  }

  // ── Camera helpers — window.Cesium is available after CDN script loads ────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getCesium(): any {
    return window.Cesium;
  }

  function frameMission(pitch: number) {
    if (!viewerRef.current || !sphereRef.current) return;
    const Cesium = getCesium();
    viewerRef.current.camera.flyToBoundingSphere(sphereRef.current, {
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(pitch), Math.max(400, sphereRef.current.radius * 3)),
      duration: 1,
    });
  }
  function handleResetView() { frameMission(-45); }
  function handleSideView() { frameMission(-30); }
  function handleBirdView() { frameMission(-90); }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 24px' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>🔭</p>
          <p style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>{t('preview.title')}</p>
          <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6 }}>{loadError}</p>
          <button
            onClick={() => window.close()}
            style={{ marginTop: 24, padding: '8px 16px', background: '#1a1d27', border: '1px solid #4b5563', color: '#d1d5db', fontSize: 14, borderRadius: 6, cursor: 'pointer' }}
          >
            {t('preview.close')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0f1117' }}>

      {/* Cesium container — must fill full viewport */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Loading overlay — shows step-by-step progress */}
      {!mapReady && (
        <div style={{ position: 'absolute', inset: 0, background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>{loading}</p>
        </div>
      )}

      {warnings.length > 0 && <div role="status" style={{ position: 'absolute', bottom: 60, left: 16, zIndex: 20, color: '#fbbf24', background: '#1a1d27', padding: 8, fontSize: 12 }}>{warnings.join(' · ')}</div>}

      {/* ── Top-left controls ── */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => window.close()}
          className="px-3 py-1.5 bg-[#1a1d27]/90 backdrop-blur border border-gray-600 text-gray-300 text-xs rounded hover:border-blue-500 hover:text-white transition-colors"
        >
          {t('preview.backToMap')}
        </button>

        {missionMeta && (
          <div className="px-3 py-2 bg-[#1a1d27]/90 backdrop-blur border border-gray-700 rounded text-xs text-gray-400 leading-relaxed">
            <div className="text-white font-medium mb-0.5">{t('preview.missionTitle')}</div>
            <div>{missionMeta.count} {t('preview.waypoints')}</div>
            {missionMeta.avgDisplayHeight > 0 && (
              <div className="text-gray-500 text-[10px] mt-0.5">
                {t('preview.displayHeight')}: {missionMeta.avgDisplayHeight} m AGL
              </div>
            )}
            <div className="text-gray-600 text-[10px] mt-1">
              {new Date(missionMeta.timestamp).toLocaleTimeString('cs-CZ', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Top-right controls ── */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
        <div className="flex gap-1">
          <button
            onClick={handleResetView}
            className="px-3 py-1.5 bg-[#1a1d27]/90 backdrop-blur border border-gray-600 text-gray-300 text-xs rounded hover:border-blue-500 hover:text-white transition-colors"
          >
            Resetovat pohled
          </button>
          <button
            onClick={handleSideView}
            className="px-3 py-1.5 bg-[#1a1d27]/90 backdrop-blur border border-gray-600 text-gray-300 text-xs rounded hover:border-blue-500 hover:text-white transition-colors"
          >
            {t('preview.sideView')}
          </button>
          <button
            onClick={handleBirdView}
            className="px-3 py-1.5 bg-[#1a1d27]/90 backdrop-blur border border-gray-600 text-gray-300 text-xs rounded hover:border-blue-500 hover:text-white transition-colors"
          >
            {t('preview.birdView')}
          </button>
        </div>
        <div className="flex gap-1">
          <button
            disabled={!buildingsReady}
            onClick={handleToggleBuildings}
            className={`px-3 py-1.5 backdrop-blur border text-xs rounded transition-colors ${
              buildingsVisible
                ? 'bg-blue-600/80 border-blue-500 text-white'
                : 'bg-[#1a1d27]/90 border-gray-600 text-gray-400 hover:border-gray-400'
            }`}
          >
            🏢 Budovy
          </button>
        </div>
      </div>

      {/* ── Rotating compass — mirrors camera heading, north always at top when heading=0 ── */}
      {/* Double-click resets camera bearing to north (heading=0) with smooth animation.   */}
      {mapReady && (
        <div
          title={t('preview.compassTitle')}
          style={{
            position: 'absolute',
            bottom: 70,
            right: 16,
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            cursor: 'pointer',
          }}
          onDoubleClick={() => {
            if (!viewerRef.current) return;
            const camera = viewerRef.current.camera;
            viewerRef.current.camera.flyTo({
              destination: camera.positionWC,
              orientation: {
                heading: 0.0, // north
                pitch: camera.pitch,
                roll: 0.0,
              },
              duration: 0.8,
            });
          }}
        >
          <div
            style={{
              transform: `rotate(${-heading}deg)`,
              transition: 'transform 0.1s linear',
            }}
          >
            <svg width="52" height="52" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
              <circle cx="22" cy="22" r="20" fill="#1a1d27" fillOpacity="0.9" stroke="#4b5563" strokeWidth="1.5"/>
              <polygon points="22,4 26,22 22,18 18,22" fill="#ef4444"/>
              <polygon points="22,40 26,22 22,26 18,22" fill="white" opacity="0.6"/>
              <text x="22" y="12" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">N</text>
              <text x="22" y="38" textAnchor="middle" fill="white" fontSize="7" opacity="0.6">S</text>
              <text x="9"  y="26" textAnchor="middle" fill="white" fontSize="7" opacity="0.6">W</text>
              <text x="35" y="26" textAnchor="middle" fill="white" fontSize="7" opacity="0.6">E</text>
            </svg>
          </div>
          <div style={{
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 9,
            marginTop: 2,
            userSelect: 'none',
            pointerEvents: 'none',
          }}>
            2× ↑N
          </div>
        </div>
      )}

      {/* ── Bottom legend ── */}
      {mapReady && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="px-4 py-2 bg-[#1a1d27]/90 backdrop-blur border border-gray-700 rounded-full flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-orange-500 inline-block rounded" />
              Trasa
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
              Waypoint
            </span>
            <span className="text-gray-600">{t('preview.controls')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
