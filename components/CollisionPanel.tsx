'use client';

// CollisionPanel — modal showing detailed collision warnings for waypoints.
// Each unique zone appears once; lists all affected waypoint numbers.

import { Collision, CollisionGroup, Severity, groupCollisionsByZone, highestSeverity } from '@/lib/collisionDetection';
import { severityClasses } from '@/lib/severityColor';
import { useTranslation } from '@/lib/languageContext';

interface CollisionPanelProps {
  collisions: Collision[];
  onClose: () => void;
}

const SEVERITY_CONFIG: Record<Severity, { labelKey: string; icon: string; bg: string; border: string; text: string }> = {
  DANGER:  { labelKey: 'collision.severity.danger',  icon: '⛔', bg: 'bg-red-900/30',    border: 'border-red-700',    text: 'text-red-300' },
  WARNING: { labelKey: 'collision.severity.warning', icon: '⚠️', bg: 'bg-orange-900/30', border: 'border-orange-700', text: 'text-orange-300' },
  CAUTION: { labelKey: 'collision.severity.caution', icon: 'ℹ️', bg: 'bg-yellow-900/30', border: 'border-yellow-700', text: 'text-yellow-300' },
};

const SEVERITY_ORDER: Severity[] = ['DANGER', 'WARNING', 'CAUTION'];

/** Formats a sorted list of 0-based indices as "WP 1, 2, 5" */
function formatWpList(indices: number[]): string {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  return 'WP ' + sorted.map((i) => i + 1).join(', ');
}

export default function CollisionPanel({ collisions, onClose }: CollisionPanelProps) {
  const { t } = useTranslation();
  const top = highestSeverity(collisions);
  const sc = severityClasses(top);

  // One entry per unique zone
  const groups: CollisionGroup[] = groupCollisionsByZone(collisions);
  const zoneCount = groups.length;

  // Group zone-cards by severity for section headers
  const bySeverity = SEVERITY_ORDER
    .map((sev) => ({ sev, items: groups.filter((g) => g.severity === sev) }))
    .filter(({ items }) => items.length > 0);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative bg-[#0f1117] border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-700 rounded-t-xl ${sc.bg20}`}>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {t('collision.title')} ({zoneCount} {zoneCount === 1 ? t('collision.zone.one') : zoneCount < 5 ? t('collision.zone.few') : t('collision.zone.many')})
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {zoneCount} {zoneCount === 1 ? t('collision.zone.one') : zoneCount < 5 ? t('collision.zone.few') : t('collision.zone.many')} {t('collision.zonesAffected')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
            aria-label={t('collision.close')}
          >
            ✕
          </button>
        </div>

        {/* Zone list — scrollable, one card per unique zone */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          {bySeverity.map(({ sev, items }) => {
            const cfg = SEVERITY_CONFIG[sev];
            return (
              <div key={sev}>
                {/* Severity section header */}
                <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold ${cfg.text}`}>
                  <span>{cfg.icon}</span>
                  <span>{t(cfg.labelKey)}</span>
                  <span className="text-gray-500 font-normal">({items.length})</span>
                </div>

                {/* Zone cards */}
                <div className="space-y-2">
                  {items.map((g) => (
                    <div
                      key={`${g.zoneType}|${g.zoneName}`}
                      className={`rounded-lg p-3 border ${cfg.bg} ${cfg.border}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-white text-xs font-medium leading-snug">
                          {g.zoneName}
                        </span>
                        <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded border ${cfg.border} ${cfg.text} bg-black/20 whitespace-nowrap`}>
                          {formatWpList(g.waypointIndices)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mb-1.5">
                        {t('collision.zoneType')}: <span className="text-gray-300">{g.zoneType}</span>
                      </p>
                      <p className="text-xs leading-relaxed text-gray-300">
                        {g.instructions}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 flex-shrink-0">
          <p className="text-xs text-gray-500 mb-2">
            {t('collision.verifyBeforeFlight')}{' '}
            <a
              href="https://www.dronemap.gov.cz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              dronemap.gov.cz
            </a>
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#1a1d27] text-gray-300 text-sm rounded-lg border border-gray-600 hover:border-gray-400 transition-colors"
          >
            {t('collision.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
