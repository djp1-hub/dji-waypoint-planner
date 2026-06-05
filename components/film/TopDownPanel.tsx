'use client';

// Top-down shot: drone flies over a subject at constant height, camera straight down
import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import { generateId } from '@/lib/panelUtils';

interface TopDownPanelProps {
  startPos: { lat: number; lng: number } | null;
  endPos: { lat: number; lng: number } | null;
  isSelectingStart: boolean;
  isSelectingEnd: boolean;
  onSelectStart: () => void;
  onSelectEnd: () => void;
  onGenerate: (waypoints: Waypoint[]) => void;
}

/**
 * Generates a Top-down shot: 3 waypoints at constant height with gimbalPitch=-90
 * (camera pointing straight down). Drone flies from start to end.
 */
export default function TopDownPanel({
  startPos,
  endPos,
  isSelectingStart,
  isSelectingEnd,
  onSelectStart,
  onSelectEnd,
  onGenerate,
}: TopDownPanelProps) {
  const [height, setHeight] = useState(30);   // constant altitude (m)
  const [speed, setSpeed] = useState(4);

  function handleGenerate() {
    if (!startPos || !endPos) return;

    // 3 waypoints: start, midpoint, end — all at same height, gimbal -90°
    const steps = [0, 0.5, 1];
    const waypoints: Waypoint[] = steps.map((t, i) => ({
      id: generateId('wp', i),
      lat: startPos.lat + (endPos.lat - startPos.lat) * t,
      lng: startPos.lng + (endPos.lng - startPos.lng) * t,
      height,
      speed,
      waitTime: 0,
      cameraAction: i === 0 ? 'startVideo' : i === steps.length - 1 ? 'stopVideo' : 'none',
      gimbalPitch: -90,
    }));

    onGenerate(waypoints);
  }

  const ready = startPos && endPos;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-400 text-xs leading-relaxed">
        The drone flies over the subject at constant altitude with the camera pointing straight down (gimbal -90°).
      </p>

      {/* Start selector */}
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-xs">Start point</span>
        <button
          onClick={onSelectStart}
          className={`w-full py-2 text-xs rounded border transition-colors ${
            isSelectingStart
              ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
              : startPos
              ? 'bg-green-600/20 border-green-700 text-green-400'
              : 'bg-[#0f1117] border-gray-600 text-gray-400 hover:border-blue-500'
          }`}
        >
          {isSelectingStart
            ? 'Click on the map...'
            : startPos
            ? `Start: ${startPos.lat.toFixed(5)}, ${startPos.lng.toFixed(5)}`
            : 'Select start on map'}
        </button>
      </div>

      {/* End selector */}
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-xs">End point</span>
        <button
          onClick={onSelectEnd}
          className={`w-full py-2 text-xs rounded border transition-colors ${
            isSelectingEnd
              ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
              : endPos
              ? 'bg-green-600/20 border-green-700 text-green-400'
              : 'bg-[#0f1117] border-gray-600 text-gray-400 hover:border-blue-500'
          }`}
        >
          {isSelectingEnd
            ? 'Click on the map...'
            : endPos
            ? `Konec: ${endPos.lat.toFixed(5)}, ${endPos.lng.toFixed(5)}`
            : 'Select end on map'}
        </button>
      </div>

      {/* Parameters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Flight height (m)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            min={5}
            max={120}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Speed (m/s)</label>
          <input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            min={1}
            max={15}
            step={0.5}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#0f1117] rounded p-2 text-xs text-gray-400">
        Gimbal: -90° (straight down) · Video: start → stop
      </div>

      <button
        onClick={handleGenerate}
        disabled={!ready}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generovat Top-down
      </button>
    </div>
  );
}
