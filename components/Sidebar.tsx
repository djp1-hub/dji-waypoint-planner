'use client';

// Left sidebar (desktop) / bottom drawer (mobile) with mission controls
import { useState } from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar';
import TerrainFollowingButton from './TerrainFollowingButton';
import WaypointPanel from './WaypointPanel';
import SpiralPanel from './SpiralPanel';
import GridPanel from './GridPanel';
import OrbitPanel from './OrbitPanel';
import FacadePanel from './FacadePanel';
import DroniePanel from './film/DroniePanel';
import RevealPanel from './film/RevealPanel';
import TopDownPanel from './film/TopDownPanel';
import CraneUpPanel from './film/CraneUpPanel';
import HyperlapsePanel from './film/HyperlapsePanel';
import ArcShotPanel from './film/ArcShotPanel';
import BoomerangPanel from './film/BoomerangPanel';
import RocketPanel from './film/RocketPanel';
import PoiSequencePanel from './film/PoiSequencePanel';
import { Waypoint, MissionType, Drone } from '@/lib/types';
import ActiveProfileBadge from './ActiveProfileBadge';
import { FilmType } from '@/app/page';
import { estimateBattery } from '@/lib/batteryEstimate';
import { Collision, highestSeverity, groupCollisionsByZone } from '@/lib/collisionDetection';
import { severityClasses } from '@/lib/severityColor';
import CollisionPanel from './CollisionPanel';

const PHOTO_TABS: { type: MissionType; label: string }[] = [
  { type: 'waypoints', label: 'Body' },
  { type: 'spiral', label: 'Spirala' },
  { type: 'grid', label: 'Grid' },
  { type: 'orbit', label: 'Orbit' },
  { type: 'facade', label: 'Fasada' },
];

const FILM_TABS: { type: FilmType; label: string }[] = [
  { type: 'dronie',      label: 'Dronie'     },
  { type: 'reveal',      label: 'Reveal'     },
  { type: 'topdown',     label: 'Top-down'   },
  { type: 'craneup',     label: 'Crane Up'   },
  { type: 'hyperlapse',  label: 'Hyperlapse' },
  { type: 'arcshot',     label: 'Arc Shot'   },
  { type: 'boomerang',   label: 'Boomerang'  },
  { type: 'rocket',      label: 'Rocket'     },
  { type: 'poisequence', label: 'POI Seq'    },
];

interface SidebarProps {
  waypoints: Waypoint[];
  missionType: MissionType;
  onMissionTypeChange: (type: MissionType) => void;
  // App mode (photo vs. film)
  appMode: 'photo' | 'film';
  onAppModeChange: (mode: 'photo' | 'film') => void;
  filmType: FilmType;
  onFilmTypeChange: (type: FilmType) => void;
  // Waypoints panel
  onUpdateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  onDeleteWaypoint: (id: string) => void;
  onClearAll: () => void;
  // Generated mission panels
  onSetWaypoints: (waypoints: Waypoint[]) => void;
  // Spiral
  mapCenter: { lat: number; lng: number };
  // Grid
  gridCorners: { sw: [number, number]; ne: [number, number] } | null;
  gridDrawStep: 'idle' | 'sw' | 'ne';
  onStartDrawGrid: () => void;
  // Orbit
  poi: { lat: number; lng: number } | null;
  isSelectingPoi: boolean;
  onSelectPoi: () => void;
  onSetPoi: (poi: { lat: number; lng: number }) => void;
  // Facade
  facadePoints: { a: { lat: number; lng: number }; b: { lat: number; lng: number } } | null;
  facadeDrawStep: 'idle' | 'a' | 'b';
  onStartDrawFacade: () => void;
  facadeMode: 'single' | '360';
  onFacadeModeChange: (mode: 'single' | '360') => void;
  // Film — Dronie
  dronieStart: { lat: number; lng: number } | null;
  isSelectingDronieStart: boolean;
  onSelectDronieStart: () => void;
  // Film — Reveal
  revealPoi: { lat: number; lng: number } | null;
  revealStart: { lat: number; lng: number } | null;
  isSelectingRevealPoi: boolean;
  isSelectingRevealStart: boolean;
  onSelectRevealPoi: () => void;
  onSelectRevealStart: () => void;
  // Film — Top-down
  topDownStart: { lat: number; lng: number } | null;
  topDownEnd: { lat: number; lng: number } | null;
  isSelectingTopDownStart: boolean;
  isSelectingTopDownEnd: boolean;
  onSelectTopDownStart: () => void;
  onSelectTopDownEnd: () => void;
  // Film — Crane Up
  craneUpPos: { lat: number; lng: number } | null;
  isSelectingCraneUpPos: boolean;
  onSelectCraneUpPos: () => void;
  // Film — Hyperlapse
  hyperlapseStart: { lat: number; lng: number } | null;
  hyperlapseEnd: { lat: number; lng: number } | null;
  hyperlapseSelectStep: 'idle' | 'start' | 'end';
  onSelectHyperlapseStart: () => void;
  onSelectHyperlapseEnd: () => void;
  // Film — Arc Shot
  arcShotPoi: { lat: number; lng: number } | null;
  isSelectingArcShotPoi: boolean;
  onSelectArcShotPoi: () => void;
  // Film — Boomerang
  boomerangStart: { lat: number; lng: number } | null;
  boomerangEnd: { lat: number; lng: number } | null;
  boomerangSelectStep: 'idle' | 'start' | 'end';
  onSelectBoomerangStart: () => void;
  onSelectBoomerangEnd: () => void;
  // Film — Rocket
  rocketPos: { lat: number; lng: number } | null;
  isSelectingRocket: boolean;
  onSelectRocket: () => void;
  // Film — POI Sequence
  poiSeqPoi: { lat: number; lng: number } | null;
  isSelectingPoiSeq: boolean;
  onSelectPoiSeq: () => void;
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
}

/** Reusable tab strip — renders a row of toggle buttons with a shared active color. */
function TabGroup<T extends string>({
  tabs,
  activeTab,
  onSelect,
  activeColor,
}: {
  tabs: { type: T; label: string }[];
  activeTab: T;
  onSelect: (type: T) => void;
  activeColor: string;
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
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function Sidebar({
  waypoints,
  missionType,
  onMissionTypeChange,
  appMode,
  onAppModeChange,
  filmType,
  onFilmTypeChange,
  onUpdateWaypoint,
  onDeleteWaypoint,
  onClearAll,
  onSetWaypoints,
  mapCenter,
  gridCorners,
  gridDrawStep,
  onStartDrawGrid,
  poi,
  isSelectingPoi,
  onSelectPoi,
  onSetPoi,
  facadePoints,
  facadeDrawStep,
  onStartDrawFacade,
  facadeMode,
  onFacadeModeChange,
  dronieStart,
  isSelectingDronieStart,
  onSelectDronieStart,
  revealPoi,
  revealStart,
  isSelectingRevealPoi,
  isSelectingRevealStart,
  onSelectRevealPoi,
  onSelectRevealStart,
  topDownStart,
  topDownEnd,
  isSelectingTopDownStart,
  isSelectingTopDownEnd,
  onSelectTopDownStart,
  onSelectTopDownEnd,
  craneUpPos,
  isSelectingCraneUpPos,
  onSelectCraneUpPos,
  hyperlapseStart,
  hyperlapseEnd,
  hyperlapseSelectStep,
  onSelectHyperlapseStart,
  onSelectHyperlapseEnd,
  arcShotPoi,
  isSelectingArcShotPoi,
  onSelectArcShotPoi,
  boomerangStart,
  boomerangEnd,
  boomerangSelectStep,
  onSelectBoomerangStart,
  onSelectBoomerangEnd,
  rocketPos,
  isSelectingRocket,
  onSelectRocket,
  poiSeqPoi,
  isSelectingPoiSeq,
  onSelectPoiSeq,
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
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCollisionPanel, setShowCollisionPanel] = useState(false);
  const [preview3dError, setPreview3dError] = useState<string | null>(null);

  // Derive banner color from highest severity in current collisions
  const topSeverity = highestSeverity(collisions);
  const sc = severityClasses(topSeverity);
  // Count unique zones (not individual WP collisions) for the banner
  const uniqueZoneCount = groupCollisionsByZone(collisions).length;

  const content = (
    <div className="flex flex-col h-full">
      {/* Address search — above everything else */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <SearchBar onFlyTo={onFlyTo} />
      </div>

      {/* App logo/title */}
      <div className="px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-white font-bold text-sm tracking-wide">DJI Waypoint Planner</h1>
            {terrainActive && (
              <span className="text-xs text-green-400 bg-green-400/10 border border-green-700 rounded px-1.5 py-0.5">
                🏔 Terrain
              </span>
            )}
          </div>
          <Link
            href="/settings"
            title="Nastavení pilotů a dronů"
            className="text-gray-500 hover:text-gray-300 transition-colors text-base leading-none"
          >
            ⚙️
          </Link>
        </div>
        <p className="text-gray-500 text-xs">Mini 4 Pro</p>
        <ActiveProfileBadge />
      </div>

      {/* Mode switcher: Fotogrammetrie / Film */}
      <div className="px-3 pt-3 flex-shrink-0">
        <div className="flex rounded overflow-hidden border border-gray-700">
          <button
            onClick={() => onAppModeChange('photo')}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              appMode === 'photo'
                ? 'bg-blue-600 text-white'
                : 'bg-[#0f1117] text-gray-400 hover:text-white'
            }`}
          >
            Foto
          </button>
          <button
            onClick={() => onAppModeChange('film')}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              appMode === 'film'
                ? 'bg-purple-600 text-white'
                : 'bg-[#0f1117] text-gray-400 hover:text-white'
            }`}
          >
            Film
          </button>
        </div>
      </div>

      {/* Mission type tabs — switches based on app mode */}
      <div className="px-2 pt-2 flex-shrink-0">
        {appMode === 'photo' ? (
          <TabGroup
            tabs={PHOTO_TABS}
            activeTab={missionType}
            onSelect={onMissionTypeChange}
            activeColor="bg-blue-600"
          />
        ) : (
          <TabGroup
            tabs={FILM_TABS}
            activeTab={filmType}
            onSelect={onFilmTypeChange}
            activeColor="bg-purple-600"
          />
        )}
      </div>

      {/* Panel content — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {/* ── Photo mode panels ── */}
        {appMode === 'photo' && missionType === 'waypoints' && (
          <WaypointPanel
            waypoints={waypoints}
            onUpdateWaypoint={onUpdateWaypoint}
            onDeleteWaypoint={onDeleteWaypoint}
            onClearAll={onClearAll}
            collisions={collisions}
          />
        )}

        {appMode === 'photo' && missionType === 'spiral' && (
          <SpiralPanel
            mapCenter={mapCenter}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'photo' && missionType === 'grid' && (
          <GridPanel
            gridCorners={gridCorners}
            drawStep={gridDrawStep}
            onStartDraw={onStartDrawGrid}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'photo' && missionType === 'orbit' && (
          <OrbitPanel
            poi={poi}
            isSelectingPoi={isSelectingPoi}
            onSelectPoi={onSelectPoi}
            onGenerate={(wps, p) => {
              onSetWaypoints(wps);
              onSetPoi(p);
            }}
          />
        )}

        {appMode === 'photo' && missionType === 'facade' && (
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

        {/* ── Film mode panels ── */}
        {appMode === 'film' && filmType === 'dronie' && (
          <DroniePanel
            startPos={dronieStart}
            isSelectingStart={isSelectingDronieStart}
            onSelectStart={onSelectDronieStart}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'film' && filmType === 'reveal' && (
          <RevealPanel
            poi={revealPoi}
            startPos={revealStart}
            isSelectingPoi={isSelectingRevealPoi}
            isSelectingStart={isSelectingRevealStart}
            onSelectPoi={onSelectRevealPoi}
            onSelectStart={onSelectRevealStart}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'film' && filmType === 'topdown' && (
          <TopDownPanel
            startPos={topDownStart}
            endPos={topDownEnd}
            isSelectingStart={isSelectingTopDownStart}
            isSelectingEnd={isSelectingTopDownEnd}
            onSelectStart={onSelectTopDownStart}
            onSelectEnd={onSelectTopDownEnd}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'film' && filmType === 'craneup' && (
          <CraneUpPanel
            pos={craneUpPos}
            isSelectingPos={isSelectingCraneUpPos}
            onSelectPos={onSelectCraneUpPos}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'film' && filmType === 'hyperlapse' && (
          <HyperlapsePanel
            startPos={hyperlapseStart}
            endPos={hyperlapseEnd}
            selectStep={hyperlapseSelectStep}
            onSelectStart={onSelectHyperlapseStart}
            onSelectEnd={onSelectHyperlapseEnd}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'film' && filmType === 'arcshot' && (
          <ArcShotPanel
            poi={arcShotPoi}
            isSelectingPoi={isSelectingArcShotPoi}
            onSelectPoi={onSelectArcShotPoi}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'film' && filmType === 'boomerang' && (
          <BoomerangPanel
            start={boomerangStart}
            end={boomerangEnd}
            selectStep={boomerangSelectStep}
            onSelectStart={onSelectBoomerangStart}
            onSelectEnd={onSelectBoomerangEnd}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'film' && filmType === 'rocket' && (
          <RocketPanel
            pos={rocketPos}
            isSelectingPos={isSelectingRocket}
            onSelectPos={onSelectRocket}
            onGenerate={onSetWaypoints}
          />
        )}

        {appMode === 'film' && filmType === 'poisequence' && (
          <PoiSequencePanel
            poi={poiSeqPoi}
            isSelectingPoi={isSelectingPoiSeq}
            onSelectPoi={onSelectPoiSeq}
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
                setPreview3dError('Nelze otevřít 3D náhled – zkus vypnout soukromé prohlížení.');
              }
            }}
            className="w-full py-1.5 bg-[#0f1117] text-gray-300 text-xs rounded border border-gray-600 hover:border-purple-500 hover:text-white transition-colors"
          >
            🔭 3D náhled
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
              <div className="text-xs font-semibold text-gray-400 mb-2">🔋 Odhad baterie</div>
              <div className="flex flex-col gap-1 text-xs text-gray-300 mb-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Vzdálenost:</span>
                  <span>{est.totalDistanceM.toLocaleString('cs-CZ')} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Doba letu:</span>
                  <span>~{est.flightTimeMin} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Spotřeba:</span>
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
                  ⚠️ Mise překračuje bezpečnou hranici baterie!
                </div>
              )}
              <div className="text-[10px] text-gray-600 mt-1">
                Odhad pro DJI Mini 4 Pro, bez větru
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
              {uniqueZoneCount} {uniqueZoneCount === 1 ? 'zóna' : uniqueZoneCount < 5 ? 'zóny' : 'zón'} v omezené oblasti
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
          {showAirspace ? '🚧 Skrýt letové zóny' : '🚧 Zobrazit letové zóny'}
        </button>
        <button
          onClick={onToggleProtectedAreas}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showProtectedAreas
              ? 'bg-green-600/20 border-green-500 text-green-300 hover:bg-green-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-green-500 hover:text-white'
          }`}
        >
          {showProtectedAreas ? '🌿 Skrýt NP a CHKO' : '🌿 Zobrazit NP a CHKO'}
        </button>
        <button
          onClick={onToggleSmallReserves}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showSmallReserves
              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 hover:bg-emerald-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-emerald-500 hover:text-white'
          }`}
        >
          {showSmallReserves ? '🌱 Skrýt přírodní rezervace' : '🌱 Přírodní rezervace (NPR/PP)'}
        </button>
        <button
          onClick={onToggleWaterSources}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showWaterSources
              ? 'bg-sky-600/20 border-sky-500 text-sky-300 hover:bg-sky-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-sky-500 hover:text-white'
          }`}
        >
          {showWaterSources ? '💧 Skrýt vodní zdroje' : '💧 Vodní zdroje (nádrže)'}
        </button>
        <button
          onClick={onToggleRailways}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showRailways
              ? 'bg-red-600/20 border-red-500 text-red-300 hover:bg-red-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-red-500 hover:text-white'
          }`}
        >
          {showRailways ? '🚂 Skrýt železnice' : '🚂 Železnice (ochran. pásma)'}
        </button>
        <button
          onClick={onToggleRoads}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showRoads
              ? 'bg-amber-600/20 border-amber-500 text-amber-300 hover:bg-amber-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-amber-500 hover:text-white'
          }`}
        >
          {showRoads ? '🛣️ Skrýt silnice' : '🛣️ Silnice (ochran. pásma)'}
        </button>
        <button
          onClick={onTogglePowerlines}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            showPowerlines
              ? 'bg-yellow-600/20 border-yellow-500 text-yellow-300 hover:bg-yellow-600/30'
              : 'bg-[#0f1117] border-gray-600 text-gray-300 hover:border-yellow-500 hover:text-white'
          }`}
        >
          {showPowerlines ? '⚡ Skrýt el. vedení' : '⚡ El. vedení (ochran. pásma)'}
        </button>
      </div>

      {/* Action buttons */}
      <div className="px-3 py-3 border-t border-gray-700 flex flex-col gap-2 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={onSaveMission}
            className="flex-1 py-2 bg-[#1a1d27] text-white text-sm rounded-lg border border-gray-600 hover:border-blue-500 transition-colors"
          >
            Ulozit misi
          </button>
          {waypoints.length > 0 && (
            <button
              onClick={onShareMission}
              title="Zkopírovat odkaz na misi"
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
          {isExporting ? 'Exportuji...' : 'Exportovat KMZ'}
        </button>
        <button
          onClick={onExportLitchi}
          disabled={waypoints.length === 0}
          title="Export pro Litchi app (starší DJI drony)"
          className="w-full py-1.5 bg-[#0f1117] text-gray-400 text-xs rounded-lg border border-gray-700 hover:border-blue-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Export Litchi CSV
        </button>
      </div>

      {/* Navigation links */}
      <div className="px-3 pb-3 flex gap-3 flex-shrink-0 flex-wrap">
        <Link href="/missions" className="text-xs text-gray-500 hover:text-blue-400 transition-colors">
          Ulozene mise
        </Link>
        <Link href="/guide" className="text-xs text-gray-500 hover:text-blue-400 transition-colors">
          Navod RC 2
        </Link>
        <Link href="/help" className="text-xs text-gray-500 hover:text-blue-400 transition-colors">
          Napoveda
        </Link>
        {/* KMZ import — hidden file input triggered by label click */}
        <label className="text-xs text-gray-500 hover:text-blue-400 transition-colors cursor-pointer">
          📂 Import KMZ
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
            {mobileOpen ? 'Skryt panel' : `Panel mise (${waypoints.length} bodu)`}
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
