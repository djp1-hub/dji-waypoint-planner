'use client';

// Left sidebar (desktop) / bottom drawer (mobile) with mission controls
import { useState } from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar';
import TerrainFollowingButton from './TerrainFollowingButton';
import WaypointPanel from './WaypointPanel';
import PolygonGridPanel from './PolygonGridPanel';
import FacadePanel from './FacadePanel';
import { Waypoint, MissionType, Drone } from '@/lib/types';
import ActiveProfileBadge from './ActiveProfileBadge';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '@/lib/languageContext';
import { estimateBattery } from '@/lib/batteryEstimate';
import { Collision, highestSeverity, groupCollisionsByZone } from '@/lib/collisionDetection';
import { DataRegion } from '@/lib/dataRegion';
import { severityClasses } from '@/lib/severityColor';
import CollisionPanel from './CollisionPanel';

const PHOTO_TABS: { type: MissionType; labelKey: string }[] = [
  { type: 'waypoints', labelKey: 'mission.waypoints' },
  { type: 'polygonGrid', labelKey: 'mission.polygonGrid' },
  { type: 'facade', labelKey: 'mission.facade' },
];

interface SidebarProps {
  waypoints: Waypoint[];
  missionType: MissionType;
  onMissionTypeChange: (type: MissionType) => void;
  // Waypoints panel
  onUpdateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  onDeleteWaypoint: (id: string) => void;
  onClearAll: () => void;
  // Generated mission panels
  onSetWaypoints: (waypoints: Waypoint[]) => void;
  polygonPoints: { lat: number; lng: number }[];
  polygonDrawActive: boolean;
  onStartDrawPolygon: () => void;
  onFinishDrawPolygon: () => void;
  onClearPolygon: () => void;
  // Facade
  facadePoints: { a: { lat: number; lng: number }; b: { lat: number; lng: number } } | null;
  facadeDrawStep: 'idle' | 'a' | 'b';
  onStartDrawFacade: () => void;
  facadeMode: 'single' | '360';
  onFacadeModeChange: (mode: 'single' | '360') => void;
  // Terrain Following
  terrainActive: boolean;
  onTerrainApply: (adjusted: import('@/lib/types').Waypoint[]) => void;
  onTerrainReset: () => void;
  // Airspace zones toggle
  showAirspace: boolean;
  onToggleAirspace: () => void;
  // Protected areas (NP/CHKO) toggle
  showProtectedAreas: boolean;
  onToggleProtectedAreas: () => void;
  // Small nature reserves (NPR/NPP/PR/PP) toggle
  showSmallReserves: boolean;
  onToggleSmallReserves: () => void;
  // Water sources and protection zones toggle
  showWaterSources: boolean;
  onToggleWaterSources: () => void;
  // Railway buffer zones toggle
  showRailways: boolean;
  onToggleRailways: () => void;
  // Road and highway protection zones toggle
  showRoads: boolean;
  onToggleRoads: () => void;
  // Power line and substation protection zones toggle
  showPowerlines: boolean;
  onTogglePowerlines: () => void;
  // Collision detection results
  collisions: Collision[];
  // Save / Export / Share
  onSaveMission: () => void;
  onShareMission: () => void;
  onImportKmz: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportKMZ: () => void;
  onExportLitchi: () => void;
  isExporting: boolean;
  // Address search — flies the map to the selected location
  onFlyTo: (lat: number, lng: number) => void;
  // Active drone — used for battery estimate (undefined = fall back to Mini 4 Pro defaults)
  activeDrone?: Drone;
  // Static dataset region for airspaces/protected areas/infrastructure layers
  dataRegion: DataRegion;
  onDataRegionChange: (region: DataRegion) => void;
}

/** Reusable tab strip — renders a row of toggle buttons with a shared active color. */
function TabGroup<T extends string>({
  tabs,
  activeTab,
  onSelect,
  activeColor,
  t,
}: {
  tabs: { type: T; labelKey: string }[];
  activeTab: T;
  onSelect: (type: T) => void;
  activeColor: string;
  t: (key: string) => string;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.type}
          onClick={() => onSelect(tab.type)}
          className={`flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            activeTab === tab.type
              ? `${activeColor} text-white`
              : 'bg-[#0f1117] text-gray-400 hover:text-white'
          }`}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  );
}

export default function Sidebar({
  waypoints,
  missionType,
  onMissionTypeChange,
  onUpdateWaypoint,
  onDeleteWaypoint,
  onClearAll,
  onSetWaypoints,
  polygonPoints,
  polygonDrawActive,
  onStartDrawPolygon,
  onFinishDrawPolygon,
  onClearPolygon,
  facadePoints,
  facadeDrawStep,
  onStartDrawFacade,
  facadeMode,
  onFacadeModeChange,
  terrainActive,
  onTerrainApply,
  onTerrainReset,
  showAirspace,
  onToggleAirspace,
  showProtectedAreas,
  onToggleProtectedAreas,
  showSmallReserves,
  onToggleSmallReserves,
  showWaterSources,
  onToggleWaterSources,
  showRailways,
  onToggleRailways,
  showRoads,
  onToggleRoads,
  showPowerlines,
  onTogglePowerlines,
  collisions,
  onSaveMission,
  onShareMission,
  onImportKmz,
  onExportKMZ,
  onExportLitchi,
  isExporting,
  onFlyTo,
  activeDrone,
  dataRegion,
  onDataRegionChange,
}: SidebarProps) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCollisionPanel, setShowCollisionPanel] = useState(false);
  const [preview3dError, setPreview3dError] = useState<string | null>(null);

  // Derive banner color from highest severity in current collisions
  const topSeverity = highestSeverity(collisions);
  const sc = severityClasses(topSeverity);
  // Count unique zones (not individual WP collisions) for the banner
  const uniqueZoneCount = groupCollisionsByZone(collisions).length;

  const content = (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Address search — above everything else */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <SearchBar onFlyTo={onFlyTo} />
      </div>

      {/* App logo/title + Language Switcher */}
      <div className="px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-white font-bold text-sm tracking-wide">{t('app.title')}</h1>
            {terrainActive && (
              <span className="text-xs text-green-400 bg-green-400/10 border border-green-700 rounded px-1.5 py-0.5">
                {t('sidebar.terrain')}
              </span>
            )}
          </div>
          <Link
            href="/settings"
            title={t('nav.settings')}
            className="text-gray-500 hover:text-gray-300 transition-colors text-base leading-none"
          >
            ⚙️
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-xs">Mini 4 Pro</p>
          <LanguageSwitcher />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-gray-500 text-xs">{t('region.coverage')}</span>
          <select
            value={dataRegion}
            onChange={(e) => onDataRegionChange(e.target.value as DataRegion)}
            className="bg-[#0f1117] border border-gray-600 text-gray-300 text-xs rounded px-2 py-1 outline-none"
          >
            <option value="cz">{t('region.cz')}</option>
            <option value="rs">{t('region.rs')}</option>
          </select>
        </div>
        <ActiveProfileBadge />
      </div>

      {/* Available mission types */}
      <div className="px-2 pt-2 flex-shrink-0">
        <TabGroup
          tabs={PHOTO_TABS}
          activeTab={missionType}
          onSelect={onMissionTypeChange}
          activeColor="bg-blue-600"
          t={t}
        />
      </div>

      {/* Panel content */}
      <div className="px-3 py-3 flex-shrink-0">
        {missionType === 'waypoints' && (
          <WaypointPanel
            waypoints={waypoints}
            onUpdateWaypoint={onUpdateWaypoint}
            onDeleteWaypoint={onDeleteWaypoint}
            onClearAll={onClearAll}
            collisions={collisions}
          />
        )}

        {missionType === 'polygonGrid' && (
          <PolygonGridPanel
            polygonPoints={polygonPoints}
            polygonDrawActive={polygonDrawActive}
            onStartDraw={onStartDrawPolygon}
            onFinishDraw={onFinishDrawPolygon}
            onClearPolygon={onClearPolygon}
            onGenerate={onSetWaypoints}
          />
        )}

        {missionType === 'facade' && (
          <FacadePanel
            facadePoints={facadePoints}
            drawStep={facadeDrawStep}
            onStartDraw={onStartDrawFacade}
            mode={facadeMode}
            onModeChange={onFacadeModeChange}
            waypoints={waypoints}
            onGenerate={onSetWaypoints}
          />
        )}

      </div>

      {/* Terrain Following + 3D Preview — shown only when there are waypoints */}
      {waypoints.length > 0 && (
        <div className="px-3 pb-2 flex-shrink-0 flex flex-col gap-2">
          <TerrainFollowingButton
            waypoints={waypoints}
            terrainActive={terrainActive}
            onApply={onTerrainApply}
            onReset={onTerrainReset}
          />
          <button
            onClick={() => {
              // Store mission data in localStorage so the new tab can read it.
              // localStorage.setItem can throw QuotaExceededError in private browsing.
              try {
                localStorage.setItem(
                  'preview3d-mission',
                  JSON.stringify({
                    waypoints,
                    missionType,
                    timestamp: Date.now(),
                  }),
                );
                setPreview3dError(null);
                window.open('/preview-3d', '_blank');
              } catch {
                setPreview3dError(t('sidebar.3dPreview') + ' – ' + t('msg.error'));
              }
            }}
            className="w-full py-1.5 bg-[#0f1117] text-gray-300 text-xs rounded border border-gray-600 hover:border-purple-500 hover:text-white transition-colors"
          >
            {t('sidebar.3dPreview')}
          </button>
          {preview3dError && (
            <p className="text-xs text-red-400 mt-1">{preview3dError}</p>
          )}
        </div>
      )}

      {/* Battery estimate panel — shown when mission has at least 2 waypoints */}
      {waypoints.length >= 2 && (() => {
        const est = estimateBattery(waypoints, 5, activeDrone?.batteryWh, activeDrone?.avgPowerW);
        const barColor =
          est.batteryPercent > 80 ? '#ef4444' :
          est.batteryPercent > 60 ? '#f97316' :
          '#22c55e';
        const barWidth = Math.min(est.batteryPercent, 100);
        return (
          <div className="px-3 pb-2 flex-shrink-0">
            <div className="bg-[#1a1d27] border border-gray-700 rounded-lg px-3 py-2.5">
              <div className="text-xs font-semibold text-gray-400 mb-2">{t('battery.title')}</div>
              <div className="flex flex-col gap-1 text-xs text-gray-300 mb-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('battery.distance')}</span>
                  <span>{est.totalDistanceM.toLocaleString('cs-CZ')} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('battery.duration')}</span>
                  <span>~{est.flightTimeMin} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('battery.estimated')}</span>
                  <span style={{ color: barColor }}>~{est.batteryPercent} %</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${barWidth}%`, background: barColor }}
                />
              </div>
              {est.isWarning && (
                <div className="text-[10px] text-red-400 mt-1">
                  ⚠️ {t('battery.reserve')}
                </div>
              )}
              <div className="text-[10px] text-gray-600 mt-1">
                {t('battery.mini4proEstimate')}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Collision warning banner — shown when any waypoint is inside a restricted zone */}
      {collisions.length > 0 && (
        <div className={`mx-3 mb-2 rounded-lg border px-3 py-2 flex-shrink-0 ${sc.bg30} ${sc.border}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-medium ${sc.text}`}>
              {topSeverity === 'DANGER' ? '⛔' : topSeverity === 'WARNING' ? '⚠️' : 'ℹ️'}{' '}
              {uniqueZoneCount} {uniqueZoneCount === 1 ? t('collision.zone.one') : uniqueZoneCount < 5 ? t('collision.zone.few') : t('collision.zone.many')} {t('collision.zonesAffected')}
            </span>
            <button
              onClick={() => setShowCollisionPanel(true)}
              className={`text-xs underline flex-shrink-0 ${sc.textMuted} ${sc.textHover}`}
            >
              Detail
            </button>
          </div>
        </div>
      )}

      {/* Layer toggles — always visible, independent of waypoints */}
      <div className="px-3 pb-2 flex-shrink-0 flex flex-col gap-1">
        <button
          onClick={onToggleAirspace}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showAirspace
              ? 'bg-orange-600/20 border-orange-500 text-orange-300 hover:bg-orange-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-orange-500 hover:text-white'
          }`}
        >
          {showAirspace ? t('map.airspace.hide') : t('map.airspace.show')}
        </button>
        <button
          onClick={onToggleProtectedAreas}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showProtectedAreas
              ? 'bg-green-600/20 border-green-500 text-green-300 hover:bg-green-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-green-500 hover:text-white'
          }`}
        >
          {showProtectedAreas ? t('map.protected.hide') : t('map.protected.show')}
        </button>
        <button
          onClick={onToggleSmallReserves}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showSmallReserves
              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 hover:bg-emerald-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-emerald-500 hover:text-white'
          }`}
        >
          {showSmallReserves ? t('map.reserves.hide') : t('map.reserves.show')}
        </button>
        <button
          onClick={onToggleWaterSources}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showWaterSources
              ? 'bg-sky-600/20 border-sky-500 text-sky-300 hover:bg-sky-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-sky-500 hover:text-white'
          }`}
        >
          {showWaterSources ? t('map.water.hide') : t('map.water.show')}
        </button>
        <button
          onClick={onToggleRailways}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showRailways
              ? 'bg-red-600/20 border-red-500 text-red-300 hover:bg-red-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-red-500 hover:text-white'
          }`}
        >
          {showRailways ? t('map.railways.hide') : t('map.railways.show')}
        </button>
        <button
          onClick={onToggleRoads}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showRoads
              ? 'bg-amber-600/20 border-amber-500 text-amber-300 hover:bg-amber-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-amber-500 hover:text-white'
          }`}
        >
          {showRoads ? t('map.roads.hide') : t('map.roads.show')}
        </button>
        <button
          onClick={onTogglePowerlines}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showPowerlines
              ? 'bg-yellow-600/20 border-yellow-500 text-yellow-300 hover:bg-yellow-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-yellow-500 hover:text-white'
          }`}
        >
          {showPowerlines ? t('map.powerlines.hide') : t('map.powerlines.show')}
        </button>
      </div>

      {/* Action buttons */}
      <div className="px-3 py-3 border-t border-gray-700 flex flex-col gap-2 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={onSaveMission}
            className="flex-1 py-2 bg-[#1a1d27] text-white text-sm rounded-lg border border-gray-600 hover:border-blue-500 transition-colors"
          >
            {t('panel.saveMission')}
          </button>
          {waypoints.length > 0 && (
            <button
              onClick={onShareMission}
              title={t('btn.share')}
              className="px-3 py-2 bg-[#1a1d27] text-gray-300 text-sm rounded-lg border border-gray-600 hover:border-green-500 hover:text-white transition-colors"
            >
              🔗
            </button>
          )}
        </div>
        <button
          onClick={onExportKMZ}
          disabled={isExporting || waypoints.length === 0}
          className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? t('exporting') : t('sidebar.export')}
        </button>
        <button
          onClick={onExportLitchi}
          disabled={waypoints.length === 0}
          title={t('export.litchiTitle')}
          className="w-full py-1.5 bg-[#0f1117] text-gray-400 text-xs rounded-lg border border-gray-700 hover:border-blue-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('sidebar.exportLitchi')}
        </button>
      </div>

      {/* Navigation links */}
      <div className="px-3 pb-3 flex gap-3 flex-shrink-0 flex-wrap">
        <Link href="/missions" className="text-xs text-gray-500 hover:text-blue-400 transition-colors">
          {t('nav.missions')}
        </Link>
        <Link href="/guide" className="text-xs text-gray-500 hover:text-blue-400 transition-colors">
          {t('nav.guide')}
        </Link>
        <Link href="/help" className="text-xs text-gray-500 hover:text-blue-400 transition-colors">
          {t('nav.help')}
        </Link>
        {/* KMZ import — hidden file input triggered by label click */}
        <label className="text-xs text-gray-500 hover:text-blue-400 transition-colors cursor-pointer">
          📂 {t('sidebar.import')}
          <input
            type="file"
            accept=".kmz"
            style={{ display: 'none' }}
            onChange={onImportKmz}
          />
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Collision detail modal — rendered as portal-like overlay above everything */}
      {showCollisionPanel && (
        <CollisionPanel
          collisions={collisions}
          onClose={() => setShowCollisionPanel(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-80 bg-[#1a1d27] border-r border-gray-700 h-full flex-shrink-0">
        {content}
      </aside>

      {/* Mobile bottom drawer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1000]">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full bg-[#1a1d27] border-t border-gray-700 py-2 flex items-center justify-center gap-2"
        >
          <span className="text-gray-400 text-xs">
            {mobileOpen ? 'Hide panel' : `Mission panel (${waypoints.length} points)`}
          </span>
          <span className="text-gray-400">{mobileOpen ? '▼' : '▲'}</span>
        </button>
        {mobileOpen && (
          <div className="bg-[#1a1d27] border-t border-gray-700 max-h-[60vh] overflow-y-auto">
            {content}
          </div>
        )}
      </div>
    </>
  );
}
