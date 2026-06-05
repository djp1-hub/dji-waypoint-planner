'use client';

// Arc Shot: drone orbits a POI while linearly changing altitude — a dynamic cinematic move
import { useState, useMemo } from 'react';
import { Waypoint } from '@/lib/types';
import { METERS_PER_DEG_LAT, generateId, bearingDeg } from '@/lib/panelUtils';

const POINTS_PER_CIRCLE = 16; // same resolution as OrbitPanel

const LAPS_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0];

interface ArcShotPanelProps {
  poi: { lat: number; lng: number } | null;
  isSelectingPoi: boolean;
  onSelectPoi: () => void;
  onGenerate: (waypoints: Waypoint[]) => void;
}

export default function ArcShotPanel({
  poi,
  isSelectingPoi,
  onSelectPoi,
  onGenerate,
}: ArcShotPanelProps) {
  const [radius, setRadius] = useState(20);         // orbit radius (m)
  const [startHeight, setStartHeight] = useState(10); // altitude at first waypoint (m)
  const [endHeight, setEndHeight] = useState(40);    // altitude at last waypoint (m)
  const [laps, setLaps] = useState(0.5);             // number of circles (0.25–2.0)
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = CW, -1 = CCW
  const [speed, setSpeed] = useState(2);             // m/s

  // Live calculations
  const info = useMemo(() => {
    const totalPoints = Math.round(laps * POINTS_PER_CIRCLE) + 1;
    const arcDeg = laps * 360;
    const arcLength = 2 * Math.PI * radius * laps;
    const flightTimeSec = arcLength / speed;
    return { totalPoints, arcDeg, arcLength, flightTimeSec };
  }, [laps, radius, speed]);

  function handleGenerate() {
    if (!poi) return;

    const { totalPoints } = info;
    const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((poi.lat * Math.PI) / 180);
    const waypoints: Waypoint[] = [];

    for (let i = 0; i < totalPoints; i++) {
      // Angle step: each full circle = POINTS_PER_CIRCLE steps
      const angle = direction * i * (2 * Math.PI) / POINTS_PER_CIRCLE;
      const lat = poi.lat + (radius * Math.cos(angle)) / METERS_PER_DEG_LAT;
      const lng = poi.lng + (radius * Math.sin(angle)) / mPerDegLng;

      // Height interpolates linearly from startHeight to endHeight
      const t = totalPoints > 1 ? i / (totalPoints - 1) : 0;
      const height = startHeight + (endHeight - startHeight) * t;

      // Heading: nose always points at POI
      const headingAngle = bearingDeg(lat, lng, poi.lat, poi.lng);

      waypoints.push({
        id: generateId('arc', i),
        lat,
        lng,
        height,
        speed,
        waitTime: 0,
        cameraAction: i === 0 ? 'startVideo' : i === totalPoints - 1 ? 'stopVideo' : 'none',
        gimbalPitch: 0,    // gimbal level — looking at POI via heading rotation
        headingAngle,
      });
    }

    onGenerate(waypoints);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-400 text-xs leading-relaxed">
        The drone circles around the POI while changing altitude. The result is a dramatic orbit shot with changing perspective.
      </p>

      {/* POI selector */}
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-xs">Arc center (POI)</span>
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

      {/* Parameters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Radius (m)</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            min={5}
            max={200}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

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
            min={2}
            max={120}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Laps selector */}
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Number of turns</label>
          <div className="flex gap-1">
            {LAPS_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setLaps(opt)}
                className={`flex-1 py-1 text-xs rounded border transition-colors ${
                  laps === opt
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Direction */}
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs">Rotation direction</span>
          <div className="flex gap-1">
            <button
              onClick={() => setDirection(1)}
              className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                direction === 1
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              CW (clockwise)
            </button>
            <button
              onClick={() => setDirection(-1)}
              className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                direction === -1
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              CCW (proti)
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Speed (m/s)</label>
          <input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            min={0.5}
            max={15}
            step={0.5}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Info box */}
      <div className="bg-[#0f1117] rounded-lg px-3 py-2 text-xs text-gray-400 border border-gray-700">
        <div className="flex justify-between">
          <span>Total arc angle</span>
          <span className="text-white">{info.arcDeg.toFixed(0)}°</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Waypoint count</span>
          <span className="text-white">{info.totalPoints}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Route length</span>
          <span className="text-white">{info.arcLength.toFixed(0)} m</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Odh. doba letu</span>
          <span className="text-white">{info.flightTimeSec.toFixed(0)} s</span>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!poi}
        className="w-full py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generovat Arc Shot
      </button>
    </div>
  );
}
