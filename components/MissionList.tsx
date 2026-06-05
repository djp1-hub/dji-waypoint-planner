'use client';

// Displays a list of saved missions with load/delete actions
import { Mission, MissionType } from '@/lib/types';
import { useTranslation } from '@/lib/languageContext';

/** Human-readable labels for mission types */
const MISSION_TYPE_LABEL_KEYS: Record<MissionType, string> = {
  waypoints: 'mission.waypoints',
  spiral: 'mission.spiral',
  grid: 'mission.grid',
  polygonGrid: 'mission.polygonGrid',
  orbit: 'mission.orbit',
  facade: 'mission.facade',
  film: 'mission.film',
};

interface MissionListProps {
  missions: Mission[];
  onLoad: (mission: Mission) => void;
  onDelete: (id: string) => void;
}

export default function MissionList({ missions, onLoad, onDelete }: MissionListProps) {
  const { t } = useTranslation();
  if (missions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">{t('missionList.emptyTitle')}</p>
        <p className="text-sm">{t('missionList.emptySubtitle')}</p>
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
              <span>{t(MISSION_TYPE_LABEL_KEYS[mission.type])}</span>
              <span>{mission.waypoints.length} {t('missionList.points')}</span>
              <span>{new Date(mission.createdAt).toLocaleDateString('cs-CZ')}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onLoad(mission)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              {t('missionList.load')}
            </button>
            <button
              onClick={() => {
                if (!confirm(`${t('missionList.deleteConfirmPrefix')} "${mission.name}"?`)) return;
                onDelete(mission.id);
              }}
              className="px-3 py-1.5 bg-[#0f1117] text-red-400 text-xs rounded border border-red-900 hover:bg-red-900/30 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
