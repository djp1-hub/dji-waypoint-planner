'use client';

import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import {
  LatLng,
  PolygonGridParams,
  PolygonPhotoMode,
  estimatePolygonGridStats,
  generatePolygonGridWaypoints,
} from '@/lib/polygonGrid';

interface PolygonGridPanelProps {
  polygonPoints: LatLng[];
  polygonDrawActive: boolean;
  onStartDraw: () => void;
  onFinishDraw: () => void;
  onClearPolygon: () => void;
  onGenerate: (waypoints: Waypoint[]) => void;
}

export default function PolygonGridPanel({
  polygonPoints,
  polygonDrawActive,
  onStartDraw,
  onFinishDraw,
  onClearPolygon,
  onGenerate,
}: PolygonGridPanelProps) {
  const [params, setParams] = useState<PolygonGridParams>({
    height: 60,
    overlap: 70,
    direction: 0,
    speed: 5,
    gimbalPitch: -90,
    photoMode: 'waypoint',
    photoIntervalSec: 2,
    autoSpeedForInterval: true,
  });

  function setNumber(key: keyof PolygonGridParams, value: number) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function setPhotoMode(value: PolygonPhotoMode) {
    setParams((prev) => ({ ...prev, photoMode: value }));
  }

  const canGenerate = polygonPoints.length >= 3 && !polygonDrawActive;

  const stats = canGenerate
    ? estimatePolygonGridStats(polygonPoints, params)
    : null;

  function handleGenerate() {
    if (!canGenerate) {
      return;
    }

    const waypoints = generatePolygonGridWaypoints(polygonPoints, params);

    if (waypoints.length > 200) {
      return;
    }

    onGenerate(waypoints);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700">
        <p className="text-gray-500 text-xs mb-2">Polygon survey area</p>

        <p className="text-gray-300 text-xs">
          Points: <span className="text-white">{polygonPoints.length}</span>
        </p>

        {polygonDrawActive && (
          <p className="text-amber-400 text-xs mt-2">
            Click map to add polygon points. Finish when the boundary is complete.
          </p>
        )}

        <div className="flex gap-2 mt-3">
          <button
            onClick={onStartDraw}
            disabled={polygonDrawActive}
            className="flex-1 py-1.5 text-xs rounded border bg-[#1a1d27] border-gray-600 text-gray-300 hover:border-blue-500 disabled:opacity-50"
          >
            Draw polygon
          </button>

          <button
            onClick={onFinishDraw}
            disabled={!polygonDrawActive || polygonPoints.length < 3}
            className="flex-1 py-1.5 text-xs rounded border bg-[#1a1d27] border-gray-600 text-gray-300 hover:border-green-500 disabled:opacity-50"
          >
            Finish
          </button>
        </div>

        <button
          onClick={onClearPolygon}
          disabled={polygonPoints.length === 0}
          className="mt-2 w-full py-1.5 text-xs rounded border bg-[#1a1d27] border-gray-600 text-gray-300 hover:border-red-500 disabled:opacity-50"
        >
          Clear polygon
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Flight height (m)</label>
          <input
            type="number"
            value={params.height}
            min={10}
            max={500}
            onChange={(e) => setNumber('height', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Overlap (%)</label>
          <input
            type="number"
            value={params.overlap}
            min={30}
            max={90}
            onChange={(e) => setNumber('overlap', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Line direction (°)</label>
          <input
            type="number"
            value={params.direction}
            min={0}
            max={359}
            onChange={(e) => setNumber('direction', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Speed (m/s)</label>
          <input
            type="number"
            value={params.speed}
            min={1}
            max={15}
            step={0.5}
            disabled={params.photoMode === 'interval' && params.autoSpeedForInterval}
            onChange={(e) => setNumber('speed', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Camera pitch (°)</label>
          <select
            value={params.gimbalPitch}
            onChange={(e) => setNumber('gimbalPitch', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value={-90}>-90° Nadir / mapping</option>
            <option value={-80}>-80° 3D surface</option>
            <option value={-75}>-75° 3D surface</option>
            <option value={-65}>-65° Oblique</option>
            <option value={-60}>-60° 3D object</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Photo mode</label>
          <select
            value={params.photoMode}
            onChange={(e) => setPhotoMode(e.target.value as PolygonPhotoMode)}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="waypoint">Photo at every waypoint</option>
            <option value="interval">Interval photo by time</option>
          </select>
        </div>

        {params.photoMode === 'interval' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 text-xs">Photo interval (sec)</label>
              <input
                type="number"
                value={params.photoIntervalSec}
                min={1}
                max={10}
                step={0.5}
                onChange={(e) => setNumber('photoIntervalSec', Number(e.target.value))}
                className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <label className="col-span-2 flex items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={params.autoSpeedForInterval}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    autoSpeedForInterval: e.target.checked,
                  }))
                }
              />
              Auto speed for interval photos
            </label>
          </>
        )}
      </div>

      {stats && (
        <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700 text-xs text-gray-400 grid grid-cols-2 gap-1">
          <span>
            Route: <span className="text-white">{(stats.distanceM / 1000).toFixed(2)} km</span>
          </span>
          <span>
            Time: <span className="text-white">~{stats.timeMin} min</span>
          </span>
          <span>
            Photo spacing: <span className="text-white">~{stats.photoSpacingM} m</span>
          </span>
          <span>
            Speed: <span className="text-white">{stats.effectiveSpeedMs} m/s</span>
          </span>
          {params.photoMode === 'interval' && (
            <span className="col-span-2">
              Interval speed target:{' '}
              <span className="text-white">{stats.intervalSpeedMs} m/s</span>
              {stats.intervalSpeedMs > stats.cappedIntervalSpeedMs && (
                <span className="text-amber-400"> capped to {stats.cappedIntervalSpeedMs} m/s</span>
              )}
            </span>
          )}
          <span className="col-span-2">
            Waypoints:{' '}
            <span className={stats.waypointCount > 200 ? 'text-red-400' : 'text-green-400'}>
              {stats.waypointCount} / 200
            </span>
          </span>
        </div>
      )}

      {stats && stats.waypointCount > 200 && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 text-xs text-red-400">
          DJI Fly waypoint limit exceeded. Increase height, reduce overlap, switch to interval photos, or use a smaller polygon.
        </div>
      )}

      {params.photoMode === 'interval' && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-2 text-xs text-amber-300">
          Interval photo mode is experimental for DJI Fly. Reliable mode is “Photo at every waypoint”.
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || (stats?.waypointCount ?? 0) > 200}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generate polygon grid
      </button>
    </div>
  );
}
