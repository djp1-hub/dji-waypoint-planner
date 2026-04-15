'use client';

// Panel for managing individual waypoints in a mission
import { Waypoint, CameraAction } from '@/lib/types';
import { Collision, Severity } from '@/lib/collisionDetection';

interface WaypointPanelProps {
  waypoints: Waypoint[];
  onUpdateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  onDeleteWaypoint: (id: string) => void;
  onClearAll: () => void;
  collisions: Collision[];
}

const SEVERITY_ICON: Record<Severity, string> = {
  DANGER:  '⛔',
  WARNING: '⚠️',
  CAUTION: 'ℹ️',
};

/** Label text for camera action options */
const CAMERA_ACTION_LABELS: Record<CameraAction, string> = {
  none: 'Žádná',
  photo: 'Foto',
  startVideo: 'Spustit video',
  stopVideo: 'Zastavit video',
};

export default function WaypointPanel({
  waypoints,
  onUpdateWaypoint,
  onDeleteWaypoint,
  onClearAll,
  collisions,
}: WaypointPanelProps) {
  if (waypoints.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        <p>Klikni na mapu</p>
        <p>pro přidání waypointu</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* List of waypoints */}
      {waypoints.map((wp, index) => {
        // Find highest severity collision for this waypoint (if any)
        const wpCollisions = collisions.filter((c) => c.waypointId === wp.id);
        const wpSeverity: Severity | null =
          wpCollisions.some((c) => c.severity === 'DANGER')  ? 'DANGER'  :
          wpCollisions.some((c) => c.severity === 'WARNING') ? 'WARNING' :
          wpCollisions.length > 0 ? 'CAUTION' : null;

        return (
        <div
          key={wp.id}
          className={`bg-[#0f1117] rounded-lg p-3 border ${
            wpSeverity === 'DANGER'  ? 'border-red-700' :
            wpSeverity === 'WARNING' ? 'border-orange-700' :
            wpSeverity === 'CAUTION' ? 'border-yellow-700' :
            'border-gray-700'
          }`}
        >
          {/* Waypoint header */}
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {index + 1}
              </span>
              {wpSeverity && (
                <span title={wpCollisions.map((c) => c.zoneName).join(', ')}>
                  {SEVERITY_ICON[wpSeverity]}
                </span>
              )}
              <span className="text-gray-300 text-xs font-mono">
                {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
              </span>
            </span>
            <button
              onClick={() => onDeleteWaypoint(wp.id)}
              className="text-gray-500 hover:text-red-400 transition-colors text-xs"
              aria-label="Smazat waypoint"
            >
              x
            </button>
          </div>

          {/* Waypoint parameters in a compact grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Altitude */}
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 text-xs">Výška (m)</label>
              <input
                type="number"
                value={wp.height}
                min={5}
                max={500}
                onChange={(e) => onUpdateWaypoint(wp.id, { height: Number(e.target.value) })}
                className="bg-[#1a1d27] text-white text-xs rounded px-2 py-1 border border-gray-700 w-full focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Speed */}
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 text-xs">Rychlost (m/s)</label>
              <input
                type="number"
                value={wp.speed}
                min={1}
                max={15}
                step={0.5}
                onChange={(e) => onUpdateWaypoint(wp.id, { speed: Number(e.target.value) })}
                className="bg-[#1a1d27] text-white text-xs rounded px-2 py-1 border border-gray-700 w-full focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Wait time */}
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 text-xs">Čekání (s)</label>
              <input
                type="number"
                value={wp.waitTime}
                min={0}
                max={300}
                onChange={(e) => onUpdateWaypoint(wp.id, { waitTime: Number(e.target.value) })}
                className="bg-[#1a1d27] text-white text-xs rounded px-2 py-1 border border-gray-700 w-full focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Camera action */}
          <div className="mt-2">
            <label className="text-gray-500 text-xs">Kamera</label>
            <select
              value={wp.cameraAction}
              onChange={(e) => onUpdateWaypoint(wp.id, { cameraAction: e.target.value as CameraAction })}
              className="mt-1 bg-[#1a1d27] text-white text-xs rounded px-2 py-1 border border-gray-700 w-full focus:border-blue-500 focus:outline-none"
            >
              {(Object.keys(CAMERA_ACTION_LABELS) as CameraAction[]).map((action) => (
                <option key={action} value={action}>
                  {CAMERA_ACTION_LABELS[action]}
                </option>
              ))}
            </select>
          </div>
        </div>
        );
      })}

      {/* Clear all button */}
      <button
        onClick={() => { if (confirm('Smazat všechny waypointy?')) onClearAll(); }}
        className="mt-2 w-full py-2 text-xs text-red-400 border border-red-900 rounded-lg hover:bg-red-900/30 transition-colors"
      >
        Smazat vše
      </button>
    </div>
  );
}
