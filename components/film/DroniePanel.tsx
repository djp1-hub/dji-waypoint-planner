'use client';

// Dronie shot: drone flies backward and upward away from a start point
import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import { METERS_PER_DEG_LAT, generateId } from '@/lib/panelUtils';

interface DroniePanelProps {
  /** Starting position clicked on the map */
  startPos: { lat: number; lng: number } | null;
  /** Whether the user is currently selecting the start position */
  isSelectingStart: boolean;
  /** Called when the user clicks "Select start on map" */
  onSelectStart: () => void;
  /** Called with the generated waypoints */
  onGenerate: (waypoints: Waypoint[]) => void;
}

/**
 * Generates a Dronie shot: 3 waypoints where the drone starts close and low,
 * then flies backward (away from subject) and upward while tilting the gimbal up.
 */
export default function DroniePanel({
  startPos,
  isSelectingStart,
  onSelectStart,
  onGenerate,
}: DroniePanelProps) {
  const [startHeight, setStartHeight] = useState(10);   // height at start (m)
  const [endHeight, setEndHeight] = useState(40);        // height at end (m)
  const [distance, setDistance] = useState(30);          // horizontal distance to travel (m)
  const [bearing, setBearing] = useState(180);           // direction of travel in degrees (0=N, 90=E)
  const [speed, setSpeed] = useState(3);                 // m/s

  function handleGenerate() {
    if (!startPos) return;

    // Convert bearing to radians for coordinate math
    // bearing 0° = North = +lat direction, 90° = East = +lng direction
    const bearingRad = (bearing * Math.PI) / 180;
    const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((startPos.lat * Math.PI) / 180);

    // Offset per meter in each direction
    const dLatPerMeter = Math.cos(bearingRad) / METERS_PER_DEG_LAT;
    const dLngPerMeter = Math.sin(bearingRad) / mPerDegLng;

    // 3 waypoints: start, midpoint, end
    const steps = [0, 0.5, 1];
    const gimbalAngles = [0, -15, -30]; // degrees, starts horizontal, tilts slightly up as it climbs

    const waypoints: Waypoint[] = steps.map((t, i) => ({
      id: generateId('wp', i),
      lat: startPos.lat + dLatPerMeter * distance * t,
      lng: startPos.lng + dLngPerMeter * distance * t,
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
        The drone flies backward and upward from the subject. The gimbal gradually tilts down from the horizon.
      </p>

      {/* Start position selector */}
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

      {/* Parameters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Start height (m)</label>
          <input
            type="number"
            value={startHeight}
            onChange={(e) => setStartHeight(Number(e.target.value))}
            min={2}
            max={120}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">End height (m)</label>
          <input
            type="number"
            value={endHeight}
            onChange={(e) => setEndHeight(Number(e.target.value))}
            min={5}
            max={120}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Pull-away distance (m)</label>
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            min={5}
            max={200}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Flight direction (°) — 0=north, 90=east</label>
          <input
            type="number"
            value={bearing}
            onChange={(e) => setBearing(Number(e.target.value))}
            min={0}
            max={359}
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

      <button
        onClick={handleGenerate}
        disabled={!startPos}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generovat Dronie
      </button>
    </div>
  );
}
