'use client';

// Hyperlapse shot: drone flies along a route taking photos at regular intervals
import { useState, useMemo } from 'react';
import { Waypoint } from '@/lib/types';
import { generateId, bearingDeg, haversineM } from '@/lib/panelUtils';

const MAX_WAYPOINTS = 200;

/** Linear interpolation between two lat/lng points at fraction t (0–1) */
function lerpLatLng(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  t: number,
): { lat: number; lng: number } {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

type GimbalMode = 'forward' | 'center' | 'down';

interface HyperlapsePanelProps {
  startPos: { lat: number; lng: number } | null;
  endPos: { lat: number; lng: number } | null;
  /** Which point is currently being selected on the map */
  selectStep: 'idle' | 'start' | 'end';
  onSelectStart: () => void;
  onSelectEnd: () => void;
  onGenerate: (waypoints: Waypoint[]) => void;
}

export default function HyperlapsePanel({
  startPos,
  endPos,
  selectStep,
  onSelectStart,
  onSelectEnd,
  onGenerate,
}: HyperlapsePanelProps) {
  const [height, setHeight] = useState(40);       // constant flight height (m)
  const [speed, setSpeed] = useState(1);           // m/s — very slow for timelapse
  const [interval, setInterval] = useState(3);     // seconds between photos
  const [gimbalMode, setGimbalMode] = useState<GimbalMode>('forward');
  const [gimbalPitch, setGimbalPitch] = useState(-30); // degrees; ignored when mode = 'down'

  // Live calculations shown in info box
  const info = useMemo(() => {
    if (!startPos || !endPos) return null;
    const distM = haversineM(startPos.lat, startPos.lng, endPos.lat, endPos.lng);
    const step = speed * interval; // meters between photos
    if (step <= 0) return null;
    const numPhotos = Math.floor(distM / step) + 1;
    const videoSec = numPhotos / 25; // at 25 fps
    return { distM, numPhotos, videoSec };
  }, [startPos, endPos, speed, interval]);

  function handleGenerate() {
    if (!startPos || !endPos || !info) return;
    const { distM, numPhotos } = info;
    if (numPhotos > MAX_WAYPOINTS) return;

    const step = speed * interval;
    const fwdBearing = bearingDeg(startPos.lat, startPos.lng, endPos.lat, endPos.lng);
    const midpoint = lerpLatLng(startPos, endPos, 0.5);

    const waypoints: Waypoint[] = [];

    for (let i = 0; i < numPhotos; i++) {
      // Fraction along the route (clamp last point to exactly endPos)
      const t = i === numPhotos - 1 ? 1 : (i * step) / distM;
      const pos = lerpLatLng(startPos, endPos, t);

      // Heading angle depends on gimbal mode
      let headingAngle: number | undefined;
      let wpGimbalPitch: number | undefined;

      if (gimbalMode === 'forward') {
        headingAngle = fwdBearing;
        wpGimbalPitch = gimbalPitch;
      } else if (gimbalMode === 'center') {
        headingAngle = bearingDeg(pos.lat, pos.lng, midpoint.lat, midpoint.lng);
        wpGimbalPitch = gimbalPitch;
      } else {
        // down — no heading lock, gimbal straight down
        wpGimbalPitch = -90;
      }

      waypoints.push({
        id: generateId('hlapse', i),
        lat: pos.lat,
        lng: pos.lng,
        height,
        speed,
        waitTime: 0,
        cameraAction: 'photo',
        ...(headingAngle !== undefined ? { headingAngle } : {}),
        gimbalPitch: wpGimbalPitch,
      });
    }

    onGenerate(waypoints);
  }

  // Waypoint count colour: green / yellow / red
  function countColour(n: number): string {
    if (n <= 150) return 'text-green-400';
    if (n <= 200) return 'text-yellow-400';
    return 'text-red-400';
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-400 text-xs leading-relaxed">
        The drone flies along a route and takes photos at regular intervals. The result is a moving timelapse video.
      </p>

      {/* Start point selector */}
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-xs">Start point</span>
        <button
          onClick={onSelectStart}
          className={`w-full py-2 text-xs rounded border transition-colors ${
            selectStep === 'start'
              ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
              : startPos
              ? 'bg-green-600/20 border-green-700 text-green-400'
              : 'bg-[#0f1117] border-gray-600 text-gray-400 hover:border-blue-500'
          }`}
        >
          {selectStep === 'start'
            ? 'Click on the map...'
            : startPos
            ? `Start: ${startPos.lat.toFixed(5)}, ${startPos.lng.toFixed(5)}`
            : 'Select start on map'}
        </button>
      </div>

      {/* End point selector */}
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-xs">End point</span>
        <button
          onClick={onSelectEnd}
          className={`w-full py-2 text-xs rounded border transition-colors ${
            selectStep === 'end'
              ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
              : endPos
              ? 'bg-green-600/20 border-green-700 text-green-400'
              : 'bg-[#0f1117] border-gray-600 text-gray-400 hover:border-blue-500'
          }`}
        >
          {selectStep === 'end'
            ? 'Click on the map...'
            : endPos
            ? `Konec: ${endPos.lat.toFixed(5)}, ${endPos.lng.toFixed(5)}`
            : 'Select end on map'}
        </button>
      </div>

      {/* Parameters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Flight height (m) — constant</label>
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
            min={0.5}
            max={10}
            step={0.5}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Photo interval (s)</label>
          <input
            type="number"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            min={1}
            max={30}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Gimbal direction */}
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-xs">Gimbal direction</span>
        <div className="flex gap-1">
          {(['forward', 'center', 'down'] as GimbalMode[]).map((mode) => {
            const labels: Record<GimbalMode, string> = {
              forward: 'Dopred',
              center: 'Na stred',
              down: 'Dolu',
            };
            return (
              <button
                key={mode}
                onClick={() => setGimbalMode(mode)}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                  gimbalMode === mode
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gimbal pitch (hidden when mode = down) */}
      {gimbalMode !== 'down' && (
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Gimbal pitch (°) — 0 = horizon, -90 = down</label>
          <input
            type="number"
            value={gimbalPitch}
            onChange={(e) => setGimbalPitch(Number(e.target.value))}
            min={-90}
            max={0}
            className="w-full bg-[#0f1117] text-white text-sm rounded px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      {/* Live info box */}
      {info && (
        <div
          className={`rounded-lg px-3 py-2 text-xs border ${
            info.numPhotos > MAX_WAYPOINTS
              ? 'bg-red-900/20 border-red-800 text-red-400'
              : info.numPhotos > 150
              ? 'bg-yellow-900/20 border-yellow-800 text-yellow-400'
              : 'bg-[#0f1117] border-gray-700 text-gray-400'
          }`}
        >
          <div className="flex justify-between">
            <span>Route length</span>
            <span className="text-white">{info.distM.toFixed(0)} m</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Photo count</span>
            <span className={countColour(info.numPhotos)}>
              {info.numPhotos} / {MAX_WAYPOINTS}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Video at 25fps</span>
            <span className="text-white">~{info.videoSec.toFixed(1)} s</span>
          </div>
          {info.numPhotos > MAX_WAYPOINTS && (
            <p className="mt-2 text-red-400">
              Too many photos. Increase speed or interval, or shorten the route.
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!startPos || !endPos || !info || info.numPhotos > MAX_WAYPOINTS}
        className="w-full py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generovat Hyperlapse
      </button>
    </div>
  );
}
