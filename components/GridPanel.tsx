'use client';

// Grid (lawn-mower) mission generator panel
// User draws a rectangular area on the map, then generates a survey flight path.
import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import { METERS_PER_DEG_LAT, generateId } from '@/lib/panelUtils';

/** Convert lat/lng to local N/E meters relative to a center point */
function toMeters(lat: number, lng: number, cLat: number, cLng: number, mPerDegLng: number) {
  return {
    n: (lat - cLat) * METERS_PER_DEG_LAT,
    e: (lng - cLng) * mPerDegLng,
  };
}

/** Convert local N/E meters back to lat/lng */
function fromMeters(n: number, e: number, cLat: number, cLng: number, mPerDegLng: number) {
  return {
    lat: cLat + n / METERS_PER_DEG_LAT,
    lng: cLng + e / mPerDegLng,
  };
}

/** Rotate a (n, e) vector by angle radians */
function rotate(n: number, e: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { n: n * cos - e * sin, e: n * sin + e * cos };
}

interface GridParams {
  height: number;
  overlap: number;
  direction: number; // degrees, 0 = N-S lines
  speed: number;
}

interface GridPanelProps {
  /** Currently selected grid area corners (normalized: sw has lower lat/lng) */
  gridCorners: { sw: [number, number]; ne: [number, number] } | null;
  /** Which draw step the user is on */
  drawStep: 'idle' | 'sw' | 'ne';
  onStartDraw: () => void;
  onGenerate: (waypoints: Waypoint[]) => void;
}

export default function GridPanel({ gridCorners, drawStep, onStartDraw, onGenerate }: GridPanelProps) {
  const [params, setParams] = useState<GridParams>({
    height: 60,
    overlap: 70,
    direction: 0,
    speed: 5,
  });

  function set(key: keyof GridParams, value: number) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  /** Estimate stats for the current grid */
  function getStats() {
    if (!gridCorners) return null;
    const [swLat, swLng] = gridCorners.sw;
    const [neLat, neLng] = gridCorners.ne;
    const cLat = (swLat + neLat) / 2;
    const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((cLat * Math.PI) / 180);
    const widthM = Math.abs(neLng - swLng) * mPerDegLng;
    const heightM = Math.abs(neLat - swLat) * METERS_PER_DEG_LAT;
    const swath = params.height * 1.4;
    const rowSpacing = swath * (1 - params.overlap / 100);
    const numRows = Math.max(1, Math.ceil(widthM / rowSpacing));
    const distanceM = numRows * heightM + (numRows - 1) * rowSpacing;
    const photos = numRows * Math.ceil(heightM / (swath * (1 - params.overlap / 100)));
    const timeMin = distanceM / (params.speed * 60);
    // Each row generates exactly 2 waypoints (start + end)
    const waypointCount = numRows * 2;
    return { numRows, photos, distanceM: Math.round(distanceM), timeMin: timeMin.toFixed(1), waypointCount };
  }

  function handleGenerate() {
    if (!gridCorners) return;
    const currentStats = getStats();
    if (currentStats && currentStats.waypointCount > 200) return;
    const [swLat, swLng] = gridCorners.sw;
    const [neLat, neLng] = gridCorners.ne;

    // Normalize corners so sw < ne
    const minLat = Math.min(swLat, neLat);
    const maxLat = Math.max(swLat, neLat);
    const minLng = Math.min(swLng, neLng);
    const maxLng = Math.max(swLng, neLng);

    const cLat = (minLat + maxLat) / 2;
    const cLng = (minLng + maxLng) / 2;
    const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((cLat * Math.PI) / 180);

    // Convert corners to local meters
    const sw = toMeters(minLat, minLng, cLat, cLng, mPerDegLng);
    const ne = toMeters(maxLat, maxLng, cLat, cLng, mPerDegLng);

    // Rotation angle: direction° from north (N-S lines = 0°, E-W lines = 90°)
    const theta = (params.direction * Math.PI) / 180;

    // Rotate corners to align with the desired flight line direction
    const swR = rotate(sw.n, sw.e, -theta);
    const neR = rotate(ne.n, ne.e, -theta);

    const minN = Math.min(swR.n, neR.n);
    const maxN = Math.max(swR.n, neR.n);
    const minE = Math.min(swR.e, neR.e);
    const maxE = Math.max(swR.e, neR.e);

    const swath = params.height * 1.4;
    const rowSpacing = swath * (1 - params.overlap / 100);

    const waypoints: Waypoint[] = [];
    let rowIdx = 0;
    let wpCount = 0;

    for (let e = minE; e <= maxE + rowSpacing * 0.5; e += rowSpacing) {
      // Lawn-mower: alternate direction each row
      const goNorth = rowIdx % 2 === 0;
      const startN = goNorth ? minN : maxN;
      const endN = goNorth ? maxN : minN;

      // Rotate each endpoint back, then convert to lat/lng
      const startRot = rotate(startN, e, theta);
      const endRot = rotate(endN, e, theta);

      const startPos = fromMeters(startRot.n, startRot.e, cLat, cLng, mPerDegLng);
      const endPos = fromMeters(endRot.n, endRot.e, cLat, cLng, mPerDegLng);

      waypoints.push({ id: generateId('grid', wpCount++), lat: startPos.lat, lng: startPos.lng, height: params.height, speed: params.speed, waitTime: 0, cameraAction: 'photo' });
      waypoints.push({ id: generateId('grid', wpCount++), lat: endPos.lat, lng: endPos.lng, height: params.height, speed: params.speed, waitTime: 0, cameraAction: 'photo' });

      rowIdx++;
    }

    onGenerate(waypoints);
  }

  const stats = getStats();

  return (
    <div className="flex flex-col gap-3">
      {/* Draw area button */}
      <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700">
        <p className="text-gray-500 text-xs mb-2">Oblast snimani</p>
        {gridCorners ? (
          <p className="text-gray-300 text-xs font-mono leading-relaxed">
            JZ: {gridCorners.sw[0].toFixed(4)}, {gridCorners.sw[1].toFixed(4)}<br />
            SV: {gridCorners.ne[0].toFixed(4)}, {gridCorners.ne[1].toFixed(4)}
          </p>
        ) : (
          <p className="text-gray-600 text-xs">Zatim nevybrano</p>
        )}
        <button
          onClick={onStartDraw}
          className={`mt-2 w-full py-1.5 text-xs rounded border transition-colors ${
            drawStep !== 'idle'
              ? 'bg-amber-700 border-amber-600 text-white'
              : 'bg-[#1a1d27] border-gray-600 text-gray-300 hover:border-blue-500'
          }`}
        >
          {drawStep === 'idle' ? 'Kreslit oblast' : drawStep === 'sw' ? 'Klikni na 1. roh...' : 'Klikni na 2. roh...'}
        </button>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Výška letu (m)</label>
          <input type="number" value={params.height} min={10} max={500}
            onChange={(e) => set('height', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Překryv (%)</label>
          <input type="number" value={params.overlap} min={30} max={90}
            onChange={(e) => set('overlap', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Směr řad (°)</label>
          <input type="number" value={params.direction} min={0} max={359}
            onChange={(e) => set('direction', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Rychlost (m/s)</label>
          <input type="number" value={params.speed} min={1} max={15} step={0.5}
            onChange={(e) => set('speed', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      {/* Stats */}
      {stats && gridCorners && (() => {
        const wpColor = stats.waypointCount > 200
          ? 'text-red-400'
          : stats.waypointCount > 150
          ? 'text-yellow-400'
          : 'text-green-400';
        return (
          <>
            <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700 text-xs text-gray-400 grid grid-cols-2 gap-1">
              <span>Řady: <span className="text-white">{stats.numRows}</span></span>
              <span>Fotky: <span className="text-white">~{stats.photos}</span></span>
              <span>Trasa: <span className="text-white">{(stats.distanceM / 1000).toFixed(2)} km</span></span>
              <span>Čas: <span className="text-white">~{stats.timeMin} min</span></span>
              <span className="col-span-2">Waypointy: <span className={wpColor}>{stats.waypointCount} / 200</span></span>
            </div>
            {stats.waypointCount > 200 && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 text-xs text-red-400">
                Překročen limit 200 waypointů. Sniž překryv nebo zmenši oblast.
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

      <button
        onClick={handleGenerate}
        disabled={!gridCorners || drawStep !== 'idle'}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generovat grid
      </button>
    </div>
  );
}
