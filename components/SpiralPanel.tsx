'use client';

// Spiral mission generator panel
import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import { METERS_PER_DEG_LAT, generateId } from '@/lib/panelUtils';

const POINTS_PER_TURN = 8;

interface SpiralParams {
  startRadius: number;
  endRadius: number;
  turns: number;
  startHeight: number;
  endHeight: number;
  speed: number;
  direction: 1 | -1; // 1 = CW, -1 = CCW
}

interface SpiralPanelProps {
  /** Current map center — used as the spiral center */
  mapCenter: { lat: number; lng: number };
  onGenerate: (waypoints: Waypoint[]) => void;
}

export default function SpiralPanel({ mapCenter, onGenerate }: SpiralPanelProps) {
  const [params, setParams] = useState<SpiralParams>({
    startRadius: 20,
    endRadius: 100,
    turns: 3,
    startHeight: 30,
    endHeight: 80,
    speed: 5,
    direction: 1,
  });

  function set(key: keyof SpiralParams, value: number | 1 | -1) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function handleGenerate() {
    const { startRadius, endRadius, turns, startHeight, endHeight, speed, direction } = params;
    const totalPoints = Math.round(turns * POINTS_PER_TURN) + 1;

    const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((mapCenter.lat * Math.PI) / 180);

    const waypoints: Waypoint[] = [];
    for (let i = 0; i < totalPoints; i++) {
      const fraction = totalPoints > 1 ? i / (totalPoints - 1) : 0;
      // Angle advances by 2π per turn, multiplied by direction
      const angle = direction * i * ((2 * Math.PI) / POINTS_PER_TURN);
      const radius = startRadius + (endRadius - startRadius) * fraction;
      const height = startHeight + (endHeight - startHeight) * fraction;

      // Offset from center in meters, then converted to degrees
      const latOffset = (radius * Math.cos(angle)) / METERS_PER_DEG_LAT;
      const lngOffset = (radius * Math.sin(angle)) / metersPerDegLng;

      waypoints.push({
        id: generateId('spiral', i),
        lat: mapCenter.lat + latOffset,
        lng: mapCenter.lng + lngOffset,
        height,
        speed,
        waitTime: 0,
        cameraAction: 'none',
      });
    }

    onGenerate(waypoints);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Center info */}
      <div className="bg-[#0f1117] rounded-lg p-3 border border-gray-700">
        <p className="text-gray-500 text-xs mb-1">Stred spiraly (stred mapy)</p>
        <p className="text-gray-300 text-xs font-mono">
          {mapCenter.lat.toFixed(5)}, {mapCenter.lng.toFixed(5)}
        </p>
        <p className="text-gray-600 text-xs mt-1">Posun mapu pro zmenu stredu</p>
      </div>

      {/* Radii */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Poc. polomer (m)</label>
          <input type="number" value={params.startRadius} min={5} max={2000}
            onChange={(e) => set('startRadius', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Kon. polomer (m)</label>
          <input type="number" value={params.endRadius} min={5} max={2000}
            onChange={(e) => set('endRadius', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      {/* Heights */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Poc. vyska (m)</label>
          <input type="number" value={params.startHeight} min={5} max={500}
            onChange={(e) => set('startHeight', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Kon. vyska (m)</label>
          <input type="number" value={params.endHeight} min={5} max={500}
            onChange={(e) => set('endHeight', Number(e.target.value))}
            className="bg-[#0f1117] text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      {/* Turns + Speed */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Number of turns</label>
          <input type="number" value={params.turns} min={1} max={20} step={0.5}
            onChange={(e) => set('turns', Number(e.target.value))}
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
        <button
          onClick={() => set('direction', 1)}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
            params.direction === 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          CW (clockwise)
        </button>
        <button
          onClick={() => set('direction', -1)}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
            params.direction === -1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          CCW (proti)
        </button>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        Generovat spiralu
      </button>
    </div>
  );
}
