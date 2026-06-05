'use client';

// Terrain Following button — fetches real terrain elevations and adjusts waypoint heights
// so the drone maintains its configured height above ground along the entire route.
import { useState } from 'react';
import { Waypoint } from '@/lib/types';
import { fetchElevations } from '@/lib/terrainFollowing';
import { useTranslation } from '@/lib/languageContext';

interface TerrainFollowingButtonProps {
  /** Current waypoints — used to fetch elevations and compute adjusted heights */
  waypoints: Waypoint[];
  /** Whether terrain following is currently active (elevations already applied) */
  terrainActive: boolean;
  /** Called with elevation-adjusted waypoints when the user activates terrain following */
  onApply: (adjusted: Waypoint[]) => void;
  /** Called when the user resets to original heights */
  onReset: () => void;
}

export default function TerrainFollowingButton({
  waypoints,
  terrainActive,
  onApply,
  onReset,
}: TerrainFollowingButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setLoading(true);
    setError(null);

    try {
      // Fetch elevation (metres above sea level) for every waypoint position
      const elevations = await fetchElevations(
        waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
      );

      // Elevation at the launch point (waypoint 0) is the reference
      const startElev = elevations[0];

      // Adjust each waypoint: preserve its configured height above the terrain
      // Formula: newHeight = (terrainElev - startElev) + originalHeight
      // This ensures the drone stays at the same AGL height the user set,
      // compensating for terrain rising or falling along the route.
      // Math.max(2, ...) prevents going below 2 m AGL as a safety floor.
      const adjusted: Waypoint[] = waypoints.map((wp, i) => ({
        ...wp,
        height: Math.max(2, (elevations[i] - startElev) + wp.height),
      }));

      onApply(adjusted);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('terrain.unknownError'));
    } finally {
      setLoading(false);
    }
  }

  // ── Active state ──────────────────────────────────────────────
  if (terrainActive) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span>{t('terrain.active')}</span>
        </div>
        <button
          onClick={onReset}
          className="w-full py-1.5 text-xs rounded border border-gray-600 bg-[#0f1117] text-gray-400 hover:border-gray-400 hover:text-white transition-colors"
        >
          {t('terrain.resetHeights')}
        </button>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-red-400 leading-relaxed">{error}</p>
        <button
          onClick={handleApply}
          className="w-full py-1.5 text-xs rounded border border-gray-600 bg-[#0f1117] text-gray-400 hover:border-blue-500 hover:text-white transition-colors"
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  // ── Idle / loading state ──────────────────────────────────────
  return (
    <button
      onClick={handleApply}
      disabled={loading || waypoints.length === 0}
      className="w-full py-1.5 bg-[#0f1117] text-gray-300 text-xs rounded border border-gray-600 hover:border-blue-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? t('common.loadingHeights') : t('terrain.apply')}
    </button>
  );
}
