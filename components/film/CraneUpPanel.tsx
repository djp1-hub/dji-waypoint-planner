'use client';

// Crane Up shot: drone rises vertically from low to high, gimbal tilts from down to horizon
import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import { generateId } from '@/lib/panelUtils';

interface CraneUpPanelProps {
  pos: { lat: number; lng: number } | null;
  isSelectingPos: boolean;
  onSelectPos: () => void;
  onGenerate: (waypoints: Waypoint[]) => void;
}

/**
 * Generates a Crane Up shot: 4 waypoints at the same XY position, ascending from
 * startHeight to endHeight. Gimbal interpolates from -60° (near-down) to 0° (horizon).
 */
export default function CraneUpPanel({
  pos,
  isSelectingPos,
  onSelectPos,
  onGenerate,
}: CraneUpPanelProps) {
  const [startHeight, setStartHeight] = useState(5);
  const [endHeight, setEndHeight] = useState(40);
  const [speed, setSpeed] = useState(2);  // slow for cinematic feel

  function handleGenerate() {
    if (!pos) return;

    // 4 waypoints at same position, ascending height, gimbal from -60° to 0°
    const steps = [0, 0.33, 0.66, 1];
    const gimbalAngles = [-60, -40, -20, 0]; // tilt from near-down to horizon

    const waypoints: Waypoint[] = steps.map((t, i) => ({
      id: generateId('wp', i),
      lat: pos.lat,
      lng: pos.lng,
      height: startHeight + (endHeight - startHeight) * t,
      speed,
      waitTime: 0,
      cameraAction: i === 0 ? 'startVideo' : i === steps.length - 1 ? 'stopVideo' : 'none',
      gimbalPitch: gimbalAngles[i],
    }));

    onGenerate(waypoints);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-400 text-xs leading-relaxed">
        The drone climbs vertically at one point. The gimbal smoothly tilts from a downward view (-60°) to the horizon (0°).
      </p>

      {/* Position selector */}
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-xs">Poloha dronu</span>
        <button
          onClick={onSelectPos}
          className={`w-full py-2 text-xs rounded border transition-colors ${
            isSelectingPos
              ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
              : pos
              ? 'bg-green-600/20 border-green-700 text-green-400'
              : 'bg-[#0f1117] border-gray-600 text-gray-400 hover:border-blue-500'
          }`}
        >
          {isSelectingPos
            ? 'Click on the map...'
            : pos
            ? `Pozice: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`
            : 'Select position on map'}
        </button>
      </div>

      {/* Parameters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Start height (m)</label>
          <input
            type="number"
            value={startHeight}
            onChange={(e) => setStartHeight(Number(e.target.value))}
            min={1}
            max={50}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">End height (m)</label>
          <input
            type="number"
            value={endHeight}
            onChange={(e) => setEndHeight(Number(e.target.value))}
            min={10}
            max={120}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Climb speed (m/s)</label>
          <input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            min={0.5}
            max={8}
            step={0.5}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#0f1117] rounded p-2 text-xs text-gray-400">
        Gimbal: -60° → 0° · Horizontal movement: none · Video: start → stop
      </div>

      <button
        onClick={handleGenerate}
        disabled={!pos}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generovat Crane Up
      </button>
    </div>
  );
}
