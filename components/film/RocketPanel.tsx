'use client';

// Rocket shot: drone launches straight up from a fixed position with gimbal locked down
// Unlike Crane Up (slow, gimbal tilts from down to horizon), Rocket is fast with a fixed steep angle
import { useState, useMemo } from 'react';
import { Waypoint } from '@/lib/types';
import { generateId } from '@/lib/panelUtils';

interface RocketPanelProps {
  pos: { lat: number; lng: number } | null;
  isSelectingPos: boolean;
  onSelectPos: () => void;
  onGenerate: (waypoints: Waypoint[]) => void;
}

export default function RocketPanel({
  pos,
  isSelectingPos,
  onSelectPos,
  onGenerate,
}: RocketPanelProps) {
  const [startHeight, setStartHeight] = useState(5);   // altitude at launch (m)
  const [endHeight, setEndHeight] = useState(60);       // altitude at peak (m)
  const [speed, setSpeed] = useState(4);                // fast for dramatic feel
  const GIMBAL_PITCH = -70;                             // fixed steep-down angle

  // Live info calculations
  const info = useMemo(() => {
    const diff = endHeight - startHeight;
    const flightTimeSec = diff > 0 ? diff / speed : 0;
    return { diff, flightTimeSec };
  }, [startHeight, endHeight, speed]);

  function handleGenerate() {
    if (!pos) return;

    // 4 waypoints at the same GPS position, linearly spaced in altitude
    const steps = [0, 1 / 3, 2 / 3, 1];
    const waypoints: Waypoint[] = steps.map((t, i) => ({
      id: generateId('rocket', i),
      lat: pos.lat,
      lng: pos.lng,
      height: startHeight + (endHeight - startHeight) * t,
      speed,
      waitTime: 0,
      cameraAction: i === 0 ? 'startVideo' : i === steps.length - 1 ? 'stopVideo' : 'none',
      // Gimbal fixed throughout — this is what distinguishes Rocket from Crane Up
      gimbalPitch: GIMBAL_PITCH,
    }));

    onGenerate(waypoints);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-400 text-xs leading-relaxed">
        The drone climbs vertically from one point. The gimbal points steeply downward throughout the shot.
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
            min={1}
            max={15}
            step={0.5}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Info box */}
      <div className="bg-[#0f1117] rounded-lg px-3 py-2 text-xs text-gray-400 border border-gray-700">
        <div className="flex justify-between">
          <span>Height difference</span>
          <span className="text-white">{info.diff} m</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Gimbal (fixed)</span>
          <span className="text-white">{GIMBAL_PITCH}°</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Odh. doba letu</span>
          <span className="text-white">{info.flightTimeSec.toFixed(0)} s</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Waypointy</span>
          <span className="text-white">4</span>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!pos}
        className="w-full py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generovat Rocket
      </button>
    </div>
  );
}
