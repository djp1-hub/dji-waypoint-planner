'use client';

// Displays a list of saved missions with load/delete actions
import { Mission, MissionType } from '@/lib/types';

/** Human-readable labels for mission types */
const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  waypoints: 'Waypointy',
  spiral: 'Spirála',
  grid: 'Grid',
  orbit: 'Orbit',
  facade: 'Fasáda',
  film: 'Film',
};

interface MissionListProps {
  missions: Mission[];
  onLoad: (mission: Mission) => void;
  onDelete: (id: string) => void;
}

export default function MissionList({ missions, onLoad, onDelete }: MissionListProps) {
  if (missions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">Žádné uložené mise</p>
        <p className="text-sm">Ulož svoji první misi z hlavní stránky.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {missions.map((mission) => (
        <div
          key={mission.id}
          className="bg-[#1a1d27] rounded-lg p-4 border border-gray-700 flex items-center justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{mission.name}</h3>
            <div className="flex gap-3 mt-1 text-xs text-gray-500">
              <span>{MISSION_TYPE_LABELS[mission.type]}</span>
              <span>{mission.waypoints.length} bodů</span>
              <span>{new Date(mission.createdAt).toLocaleDateString('cs-CZ')}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onLoad(mission)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              Načíst
            </button>
            <button
              onClick={() => {
                if (!confirm(`Smazat misi "${mission.name}"?`)) return;
                onDelete(mission.id);
              }}
              className="px-3 py-1.5 bg-[#0f1117] text-red-400 text-xs rounded border border-red-900 hover:bg-red-900/30 transition-colors"
            >
              Smazat
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
