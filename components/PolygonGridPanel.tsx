'use client';

import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import {
  LatLng,
  PolygonGridParams,
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
  });

  function set(key: keyof PolygonGridParams, value: number) {
    setParams((prev) => ({ ...prev, [key]: value }));
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
            onChange={(e) => set('height', Number(e.target.value))}
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
            onChange={(e) => set('overlap', Number(e.target.value))}
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
            onChange={(e) => set('direction', Number(e.target.value))}
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
            onChange={(e) => set('speed', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {stats && (
        <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700 text-xs text-gray-400 grid grid-cols-2 gap-1">
          <span>
            Route: <span className="text-white">{(stats.distanceM / 1000).toFixed(2)} km</span>
          </span>
          <span>
            Time: <span className="text-white">~{stats.timeMin} min</span>
          </span>
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
          DJI Fly waypoint limit exceeded. Increase height, reduce overlap, or use a smaller polygon.
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