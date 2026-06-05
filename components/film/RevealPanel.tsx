'use client';

// Reveal shot: drone flies toward a POI while rising, revealing the subject
import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import { generateId, bearingDeg } from '@/lib/panelUtils';

interface RevealPanelProps {
  /** Point of interest (subject being revealed) */
  poi: { lat: number; lng: number } | null;
  /** Start position of the drone */
  startPos: { lat: number; lng: number } | null;
  /** Whether the user is currently selecting the POI */
  isSelectingPoi: boolean;
  /** Whether the user is currently selecting the start */
  isSelectingStart: boolean;
  onSelectPoi: () => void;
  onSelectStart: () => void;
  onGenerate: (waypoints: Waypoint[]) => void;
}

/**
 * Generates a Reveal shot: drone starts behind a low obstacle, then rises and
 * flies toward the POI. 4 waypoints from start to 60% of the way to POI.
 * Drone nose always points toward POI (headingAngle calculated per waypoint).
 */
export default function RevealPanel({
  poi,
  startPos,
  isSelectingPoi,
  isSelectingStart,
  onSelectPoi,
  onSelectStart,
  onGenerate,
}: RevealPanelProps) {
  const [startHeight, setStartHeight] = useState(5);    // low start height (m)
  const [endHeight, setEndHeight] = useState(25);        // height at end of reveal (m)
  const [travelPct, setTravelPct] = useState(60);        // % of POI distance to travel (0–100)
  const [speed, setSpeed] = useState(3);

  function handleGenerate() {
    if (!startPos || !poi) return;

    const ratio = travelPct / 100;

    // 4 evenly spaced waypoints from start to (ratio * distance toward POI)
    const steps = [0, 0.33, 0.66, 1];
    const waypoints: Waypoint[] = steps.map((t, i) => {
      const lat = startPos.lat + (poi.lat - startPos.lat) * ratio * t;
      const lng = startPos.lng + (poi.lng - startPos.lng) * ratio * t;
      return {
        id: generateId('reveal', i),
        lat,
        lng,
        height: startHeight + (endHeight - startHeight) * t,
        speed,
        waitTime: 0,
        cameraAction: i === 0 ? 'startVideo' : i === steps.length - 1 ? 'stopVideo' : 'none',
        headingAngle: bearingDeg(lat, lng, poi.lat, poi.lng),
      };
    });

    onGenerate(waypoints);
  }

  const ready = startPos && poi;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-400 text-xs leading-relaxed">
        The drone flies from the start toward the POI and gradually climbs, revealing the subject. The camera always points at the POI.
      </p>

      {/* POI selector */}
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-xs">POI (subjekt)</span>
        <button
          onClick={onSelectPoi}
          className={`w-full py-2 text-xs rounded border transition-colors ${
            isSelectingPoi
              ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
              : poi
              ? 'bg-green-600/20 border-green-700 text-green-400'
              : 'bg-[#0f1117] border-gray-600 text-gray-400 hover:border-blue-500'
          }`}
        >
          {isSelectingPoi
            ? 'Click on the map...'
            : poi
            ? `POI: ${poi.lat.toFixed(5)}, ${poi.lng.toFixed(5)}`
            : 'Select POI on map'}
        </button>
      </div>

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
            min={5}
            max={120}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Approach distance (% to POI)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={travelPct}
              onChange={(e) => setTravelPct(Number(e.target.value))}
              min={10}
              max={90}
              step={5}
              className="flex-1"
            />
            <span className="text-white text-sm w-10 text-right">{travelPct}%</span>
          </div>
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
        disabled={!ready}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generovat Reveal
      </button>
    </div>
  );
}
