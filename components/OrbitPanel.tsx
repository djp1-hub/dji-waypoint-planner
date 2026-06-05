'use client';

// Orbit (circular flight around a POI) mission generator panel
import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import { METERS_PER_DEG_LAT, generateId } from '@/lib/panelUtils';

// Points per full circle — more points = smoother circle
const POINTS_PER_CIRCLE = 16;

interface OrbitParams {
  radius: number;
  height: number;
  laps: number;
  speed: number;
  direction: 1 | -1; // 1 = CW, -1 = CCW
}

interface OrbitPanelProps {
  /** The selected Point of Interest (orbit center) */
  poi: { lat: number; lng: number } | null;
  /** Whether the user is currently in POI-select mode */
  isSelectingPoi: boolean;
  onSelectPoi: () => void;
  /** Called with the generated waypoints and the POI */
  onGenerate: (waypoints: Waypoint[], poi: { lat: number; lng: number }) => void;
}

export default function OrbitPanel({ poi, isSelectingPoi, onSelectPoi, onGenerate }: OrbitPanelProps) {
  const [params, setParams] = useState<OrbitParams>({
    radius: 30,
    height: 40,
    laps: 1,
    speed: 3,
    direction: 1,
  });

  function set(key: keyof OrbitParams, value: number | 1 | -1) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function handleGenerate() {
    if (!poi) return;
    const { radius, height, laps, speed, direction } = params;
    const totalPoints = Math.round(laps * POINTS_PER_CIRCLE) + 1; // +1 to close the circle

    const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((poi.lat * Math.PI) / 180);
    const waypoints: Waypoint[] = [];

    for (let i = 0; i < totalPoints; i++) {
      const angle = direction * i * ((2 * Math.PI) / POINTS_PER_CIRCLE);
      const latOffset = (radius * Math.cos(angle)) / METERS_PER_DEG_LAT;
      const lngOffset = (radius * Math.sin(angle)) / mPerDegLng;

      waypoints.push({
        id: generateId('orbit', i),
        lat: poi.lat + latOffset,
        lng: poi.lng + lngOffset,
        height,
        speed,
        waitTime: 0,
        cameraAction: 'none',
      });
    }

    onGenerate(waypoints, poi);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* POI selector */}
      <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700">
        <p className="text-gray-500 text-xs mb-2">Point of interest (POI) – orbit center</p>
        {poi ? (
          <p className="text-gray-300 text-xs font-mono">
            {poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}
          </p>
        ) : (
          <p className="text-gray-600 text-xs">Not selected yet</p>
        )}
        <button
          onClick={onSelectPoi}
          className={`mt-2 w-full py-1.5 text-xs rounded border transition-colors ${
            isSelectingPoi
              ? 'bg-amber-700 border-amber-600 text-white'
              : 'bg-[#1a1d27] border-gray-600 text-gray-300 hover:border-blue-500'
          }`}
        >
          {isSelectingPoi ? 'Click on the map...' : poi ? 'Change POI' : 'Select POI'}
        </button>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Radius (m)</label>
          <input type="number" value={params.radius} min={5} max={2000}
            onChange={(e) => set('radius', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Height (m)</label>
          <input type="number" value={params.height} min={5} max={500}
            onChange={(e) => set('height', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Number of laps</label>
          <input type="number" value={params.laps} min={1} max={20}
            onChange={(e) => set('laps', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Speed (m/s)</label>
          <input type="number" value={params.speed} min={1} max={15} step={0.5}
            onChange={(e) => set('speed', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      {/* Direction */}
      <div className="flex gap-2">
        <button onClick={() => set('direction', 1)}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
            params.direction === 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:text-white'
          }`}>CW (clockwise)</button>
        <button onClick={() => set('direction', -1)}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
            params.direction === -1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:text-white'
          }`}>CCW (proti)</button>
      </div>

      {/* Info: gimbal points at POI */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-3 py-2">
        <p className="text-blue-400 text-xs">Gimbal automaticky miri na POI (towardPOI v WPML)</p>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!poi}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generovat orbit
      </button>
    </div>
  );
}
