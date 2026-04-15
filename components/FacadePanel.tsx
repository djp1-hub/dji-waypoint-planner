'use client';

// Facade scan mission generator panel.
// Modes:
//   "Jedna strana"      — drone flies lawn-mower passes along one facade (A→B)
//   "Celá budova 360°"  — user places 4 corners via normal map clicks; drone scans all 4 sides
import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import { METERS_PER_DEG_LAT, generateId } from '@/lib/panelUtils';

interface FacadeParams {
  distance: number;    // distance from facade in meters
  startHeight: number;
  endHeight: number;
  overlap: number;     // % vertical and horizontal overlap
  speed: number;
  gimbalPitch: number; // degrees, 0 = horizontal, negative = slightly down
}

interface FacadePoints {
  a: { lat: number; lng: number };
  b: { lat: number; lng: number };
}

interface FacadePanelProps {
  // Single side
  facadePoints: FacadePoints | null;
  drawStep: 'idle' | 'a' | 'b';
  onStartDraw: () => void;
  // Mode (lifted to page.tsx so map click behavior can change)
  mode: 'single' | '360';
  onModeChange: (mode: 'single' | '360') => void;
  // Waypoints array — used as building corners in 360° mode
  waypoints: Waypoint[];
  onGenerate: (waypoints: Waypoint[]) => void;
}

/** Calculate straight-line distance between two lat/lng points in meters */
function calcDistanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((a.lat * Math.PI) / 180);
  const dn = (b.lat - a.lat) * METERS_PER_DEG_LAT;
  const de = (b.lng - a.lng) * mPerDegLng;
  return Math.sqrt(dn * dn + de * de);
}

/**
 * Compute geometry for a single facade side.
 * Returns unit vectors, perpendicular offset in degrees, and the
 * fixed heading angle the drone nose should point toward the facade.
 */
function computeSideVectors(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
  distance: number
) {
  const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((p1.lat * Math.PI) / 180);
  const dx = (p2.lng - p1.lng) * mPerDegLng;         // East component of facade
  const dy = (p2.lat - p1.lat) * METERS_PER_DEG_LAT; // North component of facade
  const facadeLen = Math.sqrt(dx * dx + dy * dy);
  if (facadeLen < 1) return null;

  const ux = dx / facadeLen; // unit vector along facade (East)
  const uy = dy / facadeLen; // unit vector along facade (North)

  // Perpendicular unit vector — left-hand side of p1→p2 (drone hovers here)
  const px = -uy; // East component
  const py = ux;  // North component

  // Offset in degrees: push drone away from the facade wall
  const offsetLat = (py * distance) / METERS_PER_DEG_LAT;
  const offsetLng = (px * distance) / mPerDegLng;

  // Drone nose faces toward the facade = opposite of perp direction = (uy, -ux) in (E, N)
  // DJI heading: 0 = North, 90 = East (clockwise) → atan2(East, North)
  const headingAngle = ((Math.atan2(uy, -ux) * 180) / Math.PI + 360) % 360;

  return { mPerDegLng, facadeLen, ux, uy, offsetLat, offsetLng, headingAngle };
}

export default function FacadePanel({
  facadePoints,
  drawStep,
  onStartDraw,
  mode,
  onModeChange,
  waypoints,
  onGenerate,
}: FacadePanelProps) {
  const [params, setParams] = useState<FacadeParams>({
    distance: 8,
    startHeight: 5,
    endHeight: 30,
    overlap: 70,
    speed: 2,
    gimbalPitch: 0,
  });

  function set(key: keyof FacadeParams, value: number) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  // ── Single side ──────────────────────────────────────────────

  function getStats() {
    if (!facadePoints) return null;
    const { a, b } = facadePoints;
    const facadeWidthM = calcDistanceM(a, b);
    const swath = params.distance * 0.87; // Mini 4 Pro ~82° FOV
    const step = swath * (1 - params.overlap / 100);
    const numRows = Math.ceil((params.endHeight - params.startHeight) / step) + 1;
    const photosPerRow = Math.ceil(facadeWidthM / step) + 1;
    const waypointCount = numRows * photosPerRow;
    const totalDistanceM = Math.round(numRows * facadeWidthM + (numRows - 1) * step);
    return { facadeWidthM: Math.round(facadeWidthM), numRows, totalPhotos: waypointCount, totalDistanceM, waypointCount };
  }

  function handleGenerate() {
    if (!facadePoints) return;
    const currentStats = getStats();
    if (currentStats && currentStats.waypointCount > 200) return;

    const { a, b } = facadePoints;
    const { distance, startHeight, endHeight, overlap, speed, gimbalPitch } = params;
    const side = computeSideVectors(a, b, distance);
    if (!side) return;
    const { mPerDegLng, facadeLen, ux, uy, offsetLat, offsetLng } = side;

    const swath = distance * 0.87;
    const rowStep = swath * (1 - overlap / 100);
    const numRows = Math.ceil((endHeight - startHeight) / rowStep) + 1;
    const numPhotosPerRow = Math.ceil(facadeLen / rowStep) + 1;

    const result: Waypoint[] = [];
    let wpIdx = 0;

    for (let row = 0; row < numRows; row++) {
      const height = startHeight + row * rowStep;
      const goForward = row % 2 === 0; // even rows: A→B, odd rows: B→A

      for (let col = 0; col < numPhotosPerRow; col++) {
        const colIdx = goForward ? col : numPhotosPerRow - 1 - col;
        const t = numPhotosPerRow > 1 ? colIdx / (numPhotosPerRow - 1) : 0;
        const alongM = t * facadeLen;

        const lat = a.lat + (uy * alongM) / METERS_PER_DEG_LAT + offsetLat;
        const lng = a.lng + (ux * alongM) / mPerDegLng + offsetLng;

        result.push({
          id: generateId('facade', wpIdx++),
          lat, lng, height, speed,
          waitTime: 0, cameraAction: 'photo', gimbalPitch,
        });
      }
    }

    onGenerate(result);
  }

  // ── 360° mode ────────────────────────────────────────────────

  /** Stats summed across all 4 sides + transition waypoints */
  function getStats360(corners: { lat: number; lng: number }[]) {
    const { distance, startHeight, endHeight, overlap } = params;
    const swath = distance * 0.87;
    const step = swath * (1 - overlap / 100);

    let totalWaypoints = 0;
    let totalPhotos = 0;
    let totalDistanceM = 0;

    for (let i = 0; i < 4; i++) {
      const p1 = corners[i];
      const p2 = corners[(i + 1) % 4];
      const sideWidthM = calcDistanceM(p1, p2);
      const numRows = Math.ceil((endHeight - startHeight) / step) + 1;
      const photosPerRow = Math.ceil(sideWidthM / step) + 1;
      totalWaypoints += numRows * photosPerRow;
      totalPhotos += numRows * photosPerRow;
      totalDistanceM += numRows * sideWidthM + (numRows - 1) * step;
    }
    // 2 transition waypoints per inter-side corner × 3 corners (last side has no transition)
    totalWaypoints += 3 * 2;

    return { waypointCount: totalWaypoints, totalPhotos, totalDistanceM: Math.round(totalDistanceM) };
  }

  function handleGenerate360() {
    if (waypoints.length < 4) return;
    const corners = waypoints.slice(0, 4);
    const stats360 = getStats360(corners);
    if (stats360.waypointCount > 200) return;

    const { distance, startHeight, endHeight, overlap, speed, gimbalPitch } = params;
    const swath = distance * 0.87;
    const rowStep = swath * (1 - overlap / 100);

    // Precompute geometry for all 4 sides
    const sides = corners.map((p1, i) =>
      computeSideVectors(p1, corners[(i + 1) % 4], distance)
    );

    const result: Waypoint[] = [];
    let wpIdx = 0;

    for (let sideIdx = 0; sideIdx < 4; sideIdx++) {
      const sideData = sides[sideIdx];
      if (!sideData) continue;
      const p1 = corners[sideIdx];
      const cornerEnd = corners[(sideIdx + 1) % 4]; // shared corner at end of this side
      const { mPerDegLng, facadeLen, ux, uy, offsetLat, offsetLng, headingAngle } = sideData;

      const numRows = Math.ceil((endHeight - startHeight) / rowStep) + 1;
      const numPhotosPerRow = Math.ceil(facadeLen / rowStep) + 1;

      // Lawn-mower passes for this side
      for (let row = 0; row < numRows; row++) {
        const height = startHeight + row * rowStep;
        const goForward = row % 2 === 0;

        for (let col = 0; col < numPhotosPerRow; col++) {
          const colIdx = goForward ? col : numPhotosPerRow - 1 - col;
          const t = numPhotosPerRow > 1 ? colIdx / (numPhotosPerRow - 1) : 0;
          const alongM = t * facadeLen;

          const lat = p1.lat + (uy * alongM) / METERS_PER_DEG_LAT + offsetLat;
          const lng = p1.lng + (ux * alongM) / mPerDegLng + offsetLng;

          result.push({
            id: generateId('facade', wpIdx++),
            lat, lng, height, speed,
            waitTime: 0, cameraAction: 'photo',
            gimbalPitch, headingAngle,
          });
        }
      }

      // Transition waypoints between sides (skip after the last side)
      if (sideIdx < 3) {
        const nextSide = sides[sideIdx + 1];
        if (!nextSide) continue;

        const transitionHeight = startHeight + (numRows - 1) * rowStep;

        // WP1: diagonal point outside corner — cornerEnd + offsetCurrent + offsetNext
        result.push({
          id: generateId('facade', wpIdx++),
          lat: cornerEnd.lat + offsetLat + nextSide.offsetLat,
          lng: cornerEnd.lng + offsetLng + nextSide.offsetLng,
          height: transitionHeight,
          speed: 5,
          waitTime: 0,
          cameraAction: 'none',
          headingAngle,
        });

        // WP2: entry point for next side — cornerEnd + offsetNext only
        result.push({
          id: generateId('facade', wpIdx++),
          lat: cornerEnd.lat + nextSide.offsetLat,
          lng: cornerEnd.lng + nextSide.offsetLng,
          height: transitionHeight,
          speed: 5,
          waitTime: 0,
          cameraAction: 'none',
          headingAngle: nextSide.headingAngle,
        });
      }
    }

    onGenerate(result);
  }

  // ── Derived values ───────────────────────────────────────────

  const stats = getStats();
  const corners360 = waypoints.slice(0, 4);
  const stats360 = mode === '360' && waypoints.length >= 4 ? getStats360(corners360) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-[#0f1117] rounded-lg p-1 border border-gray-700">
        <button
          onClick={() => onModeChange('single')}
          className={`flex-1 py-1.5 text-xs rounded transition-colors ${
            mode === 'single' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Jedna strana
        </button>
        <button
          onClick={() => onModeChange('360')}
          className={`flex-1 py-1.5 text-xs rounded transition-colors ${
            mode === '360' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Celá budova 360°
        </button>
      </div>

      {/* Point selector — single side */}
      {mode === 'single' && (
        <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700">
          <p className="text-gray-500 text-xs mb-2">Fasada (bod A a bod B)</p>
          <div className="flex flex-col gap-1 text-xs font-mono">
            <span className="text-gray-500">
              A:{' '}
              {facadePoints
                ? <span className="text-gray-300">{facadePoints.a.lat.toFixed(5)}, {facadePoints.a.lng.toFixed(5)}</span>
                : <span className="text-gray-600">nevybran</span>
              }
            </span>
            <span className="text-gray-500">
              B:{' '}
              {facadePoints
                ? <span className="text-gray-300">{facadePoints.b.lat.toFixed(5)}, {facadePoints.b.lng.toFixed(5)}</span>
                : <span className="text-gray-600">nevybran</span>
              }
            </span>
          </div>
          <button
            onClick={onStartDraw}
            className={`mt-2 w-full py-1.5 text-xs rounded border transition-colors ${
              drawStep !== 'idle'
                ? 'bg-amber-700 border-amber-600 text-white'
                : 'bg-[#1a1d27] border-gray-600 text-gray-300 hover:border-blue-500'
            }`}
          >
            {drawStep === 'idle'
              ? (facadePoints ? 'Změnit fasádu' : 'Vybrat fasádu')
              : drawStep === 'a'
              ? 'Klikni na levý kraj (A)...'
              : 'Klikni na pravý kraj (B)...'}
          </button>
          {facadePoints && (
            <p className="mt-1 text-gray-600 text-xs">
              Pokud je náhled za budovou, zkus prohodit pořadí kliknutí A↔B.
            </p>
          )}
        </div>
      )}

      {/* Corner info — 360° mode */}
      {mode === '360' && (
        <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700">
          <p className="text-gray-500 text-xs mb-2">
            Rohy budovy: <span className="text-white">{Math.min(waypoints.length, 4)} / 4</span>
          </p>
          <p className="text-gray-600 text-xs leading-relaxed">
            Klikni 4 rohy budovy na mapě dokola (po nebo proti směru hodin). Body lze přesouvat tažením.
          </p>
          {waypoints.length > 4 && (
            <p className="mt-2 text-yellow-500 text-xs">
              Používám první 4 body jako rohy. Ostatní jsou ignorovány.
            </p>
          )}
        </div>
      )}

      {/* Parameters — shared by both modes */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Vzdálenost (m)</label>
          <input type="number" value={params.distance} min={2} max={100}
            onChange={(e) => set('distance', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Překryv (%)</label>
          <input type="number" value={params.overlap} min={30} max={90}
            onChange={(e) => set('overlap', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Výška startu (m)</label>
          <input type="number" value={params.startHeight} min={1} max={500}
            onChange={(e) => set('startHeight', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Výška konce (m)</label>
          <input type="number" value={params.endHeight} min={1} max={500}
            onChange={(e) => set('endHeight', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Rychlost (m/s)</label>
          <input type="number" value={params.speed} min={1} max={10} step={0.5}
            onChange={(e) => set('speed', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Gimbal (°)</label>
          <input type="number" value={params.gimbalPitch} min={-30} max={10}
            onChange={(e) => set('gimbalPitch', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      {/* Stats — single side */}
      {mode === 'single' && stats && facadePoints && (() => {
        const wpColor = stats.waypointCount > 200 ? 'text-red-400' : stats.waypointCount > 150 ? 'text-yellow-400' : 'text-green-400';
        return (
          <>
            <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700 text-xs text-gray-400 grid grid-cols-2 gap-1">
              <span>Šířka fasády: <span className="text-white">{stats.facadeWidthM} m</span></span>
              <span>Řady: <span className="text-white">{stats.numRows}</span></span>
              <span>Fotky: <span className="text-white">~{stats.totalPhotos}</span></span>
              <span>Trasa: <span className="text-white">{(stats.totalDistanceM / 1000).toFixed(2)} km</span></span>
              <span className="col-span-2">Waypointy: <span className={wpColor}>{stats.waypointCount} / 200</span></span>
            </div>
            {stats.waypointCount > 200 && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 text-xs text-red-400">
                Překročen limit 200 waypointů. Sniž překryv nebo změň rozsah výšek.
              </div>
            )}
            {stats.waypointCount > 150 && stats.waypointCount <= 200 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-2 text-xs text-yellow-400">
                Blížíš se limitu DJI Fly (200 waypointů).
              </div>
            )}
          </>
        );
      })()}

      {/* Stats — 360° mode */}
      {mode === '360' && stats360 && (() => {
        const wpColor = stats360.waypointCount > 200 ? 'text-red-400' : stats360.waypointCount > 150 ? 'text-yellow-400' : 'text-green-400';
        return (
          <>
            <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700 text-xs text-gray-400 grid grid-cols-2 gap-1">
              <span>Fotky: <span className="text-white">~{stats360.totalPhotos}</span></span>
              <span>Trasa: <span className="text-white">{(stats360.totalDistanceM / 1000).toFixed(2)} km</span></span>
              <span className="col-span-2">Waypointy: <span className={wpColor}>{stats360.waypointCount} / 200</span></span>
            </div>
            {stats360.waypointCount > 200 && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 text-xs text-red-400">
                Překročen limit 200 waypointů. Sniž překryv nebo změň rozsah výšek.
              </div>
            )}
            {stats360.waypointCount > 150 && stats360.waypointCount <= 200 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-2 text-xs text-yellow-400">
                Blížíš se limitu DJI Fly (200 waypointů).
              </div>
            )}
          </>
        );
      })()}

      {/* Generate button — single side */}
      {mode === 'single' && (
        <button
          onClick={handleGenerate}
          disabled={!facadePoints || drawStep !== 'idle' || (stats?.waypointCount ?? 0) > 200}
          className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Generovat fasadu
        </button>
      )}

      {/* Generate button — 360° */}
      {mode === '360' && (
        <button
          onClick={handleGenerate360}
          disabled={waypoints.length < 4 || (stats360?.waypointCount ?? 0) > 200}
          className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {waypoints.length < 4
            ? `Pridej ${4 - waypoints.length} ${4 - waypoints.length === 1 ? 'roh' : 'rohy'} budovy`
            : 'Generovat 360°'}
        </button>
      )}
    </div>
  );
}
