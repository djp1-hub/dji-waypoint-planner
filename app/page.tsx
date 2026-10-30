'use client';

// Main application page — full-screen map with sidebar
import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SaveMissionDialog from '@/components/SaveMissionDialog';
import { Waypoint, Mission, MissionType, Drone } from '@/lib/types';
import { exportKMZ } from '@/lib/exportKMZ';
import { exportLitchiCSV } from '@/lib/exportLitchi';
import { saveMission } from '@/lib/missionStore';
import { encodeMission, decodeMission } from '@/lib/shareUrl';
import { importKmz } from '@/lib/importKmz';
import { checkWaypointCollisions, Collision } from '@/lib/collisionDetection';
import { loadActiveDrone } from '@/lib/profileStore';
import { generateId } from '@/lib/panelUtils';
import { DEFAULT_DATA_REGION, DataRegion } from '@/lib/dataRegion';
import { useTranslation } from '@/lib/languageContext';

// Leaflet map must be loaded client-side only (it uses browser APIs)
const MapView = dynamic(() => import('@/components/Map'), { ssr: false });
// Sidebar uses useLanguage hook which requires LanguageProvider context — delay until mounted
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });

const AVAILABLE_MISSION_TYPES = new Set<MissionType>(['waypoints', 'polygonGrid', 'facade']);

function availableMissionType(type: MissionType): MissionType {
  return AVAILABLE_MISSION_TYPES.has(type) ? type : 'waypoints';
}

const REGION_DEFAULT_CENTER: Record<DataRegion, { lat: number; lng: number; zoom: number }> = {
  cz: { lat: 50.08, lng: 14.42, zoom: 12 },      // Prague
  rs: { lat: 44.8125, lng: 20.4612, zoom: 12 },  // Belgrade
};

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── Active drone — loaded from localStorage, re-synced on window focus ───────
  const [activeDrone, setActiveDrone] = useState<Drone | undefined>(undefined);

  useEffect(() => {
    function syncDrone() {
      setActiveDrone(loadActiveDrone());
    }
    syncDrone();
    window.addEventListener('focus', syncDrone);
    return () => window.removeEventListener('focus', syncDrone);
  }, []);

  // ── Core state ──────────────────────────────────────────────
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [missionType, setMissionType] = useState<MissionType>('waypoints');
  const [isExporting, setIsExporting] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // ── Terrain Following state ──────────────────────────────────
  // originalWaypoints stores heights before terrain adjustment so they can be restored
  const [originalWaypoints, setOriginalWaypoints] = useState<Waypoint[] | null>(null);
  const [terrainActive, setTerrainActive] = useState(false);

  // ── Data region state ───────────────────────────────────────
  const [dataRegion, setDataRegion] = useState<DataRegion>(DEFAULT_DATA_REGION);

  // ── Airspace zones state ─────────────────────────────────────
  const [showAirspace, setShowAirspace] = useState(false);

  const handleToggleAirspace = useCallback(() => {
    setShowAirspace((prev) => !prev);
  }, []);

  // ── Protected areas (NP/CHKO) state ──────────────────────────
  const [showProtectedAreas, setShowProtectedAreas] = useState(false);

  // ── Small nature reserves (NPR/NPP/PR/PP) state ───────────────
  const [showSmallReserves, setShowSmallReserves] = useState(false);

  // ── Water sources and protection zones state ──────────────────
  const [showWaterSources, setShowWaterSources] = useState(false);

  // ── Railway buffer zones state ────────────────────────────────
  const [showRailways, setShowRailways] = useState(false);

  // ── Road and highway protection zones state ───────────────────
  const [showRoads, setShowRoads] = useState(false);

  // ── Power line protection zones state ────────────────────────
  const [showPowerlines, setShowPowerlines] = useState(false);

  // ── Collision detection state ─────────────────────────────────
  const [collisions, setCollisions] = useState<Collision[]>([]);

  const handleToggleProtectedAreas = useCallback(() => {
    setShowProtectedAreas((prev) => !prev);
  }, []);

  const handleToggleSmallReserves = useCallback(() => {
    setShowSmallReserves((prev) => !prev);
  }, []);

  const handleToggleWaterSources = useCallback(() => {
    setShowWaterSources((prev) => !prev);
  }, []);

  const handleToggleRailways = useCallback(() => {
    setShowRailways((prev) => !prev);
  }, []);

  const handleToggleRoads = useCallback(() => {
    setShowRoads((prev) => !prev);
  }, []);

  const handleTogglePowerlines = useCallback(() => {
    setShowPowerlines((prev) => !prev);
  }, []);

  // Re-run collision check whenever waypoints change
  useEffect(() => {
    if (waypoints.length === 0) {
      setCollisions([]);
      return;
    }
    checkWaypointCollisions(waypoints, dataRegion)
      .then(setCollisions)
      .catch((err) => console.warn('[collisionDetection] Check failed:', err));
  }, [waypoints, dataRegion]);

  // ── Toast notification (used for share URL feedback) ──────────
  const [toast, setToast] = useState<string | null>(null);
  // Ref for the auto-dismiss timer — allows cleanup on unmount and prevents stacking
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show a toast and auto-dismiss it after `ms` ms. Cancels any pending timer first.
  const showToast = useCallback((msg: string, ms = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }, []);

  // Cleanup: cancel pending toast timer on unmount
  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  // ── Map state ────────────────────────────────────────────────
  const [, setMapCenter] = useState({
    lat: REGION_DEFAULT_CENTER[DEFAULT_DATA_REGION].lat,
    lng: REGION_DEFAULT_CENTER[DEFAULT_DATA_REGION].lng,
  });

  // ── Fly-to target (driven by address search in SearchBar) ─────
  // Setting a new object triggers the useEffect in Map.tsx which calls map.flyTo().
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  const handleFlyTo = useCallback((lat: number, lng: number) => {
    setFlyToTarget({ lat, lng, zoom: 17 });
  }, []);

  const handleDataRegionChange = useCallback((region: DataRegion) => {
    setDataRegion(region);

    const center = REGION_DEFAULT_CENTER[region];

    setMapCenter({
      lat: center.lat,
      lng: center.lng,
    });

    setFlyToTarget({
      lat: center.lat,
      lng: center.lng,
      zoom: center.zoom,
    });

    // Reset layer toggles so old-country overlays do not remain visible
    // while the new region data is loading.
    setShowAirspace(false);
    setShowProtectedAreas(false);
    setShowSmallReserves(false);
    setShowWaterSources(false);
    setShowRailways(false);
    setShowRoads(false);
    setShowPowerlines(false);
  }, []);

  // ── URL mission import — runs once on mount ───────────────────
  // When someone opens a shared link (?mission=...) this effect reads,
  // decodes and loads the mission, then cleans the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('mission');
    if (!encoded) return;
    const data = decodeMission(encoded);
    if (data) {
      setWaypoints(data.waypoints);
      setMissionType(availableMissionType(data.missionType));
    }
    // Remove the ?mission= param so the URL stays clean
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // ── Load mission from /missions page — runs once on mount ───────
  // When user clicks "Load" on /missions, the mission is stored in
  // sessionStorage under 'loadMission'. This effect reads and applies it.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('loadMission');
      if (!raw) return;
      sessionStorage.removeItem('loadMission'); // clear immediately to prevent re-load on refresh
      const mission: Mission = JSON.parse(raw);
      if (!mission?.waypoints?.length) return;
      setWaypoints(mission.waypoints);
      setMissionType(availableMissionType(mission.type));
      setTerrainActive(false);
      setOriginalWaypoints(null);
      // Fly to centroid of loaded waypoints
      const avgLat = mission.waypoints.reduce((s, wp) => s + wp.lat, 0) / mission.waypoints.length;
      const avgLng = mission.waypoints.reduce((s, wp) => s + wp.lng, 0) / mission.waypoints.length;
      setFlyToTarget({ lat: avgLat, lng: avgLng, zoom: 15 });
    } catch {
      // Ignore corrupted sessionStorage data
    }
  }, []);

  // ── Share mission as URL ──────────────────────────────────────
function copyTextFallback(text: string): boolean {
  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    document.body.removeChild(textarea);
    return false;
  }
}

const handleShareMission = useCallback(async () => {
  const encoded = encodeMission({
    waypoints,
    missionType,
  });

  const url = `${window.location.origin}?mission=${encoded}`;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      showToast(t('toast.linkCopied'));
      return;
    }

    const copied = copyTextFallback(url);

    if (copied) {
      showToast(t('toast.linkCopied'));
      return;
    }

    window.prompt(t('share.prompt'), url);
  } catch {
    const copied = copyTextFallback(url);

    if (copied) {
      showToast(t('toast.linkCopied'));
      return;
    }

    window.prompt(t('share.prompt'), url);
  }
}, [waypoints, missionType, showToast, t]);

  // ── KMZ import ───────────────────────────────────────────────

  /** Handle file input change — parse KMZ and load waypoints into the map */
  const handleImportKmz = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { waypoints: imported } = await importKmz(file);

      setWaypoints(imported);
      setMissionType('waypoints');
      setTerrainActive(false);
      setOriginalWaypoints(null);

      // Fly to centroid of imported waypoints
      const avgLat = imported.reduce((sum, wp) => sum + wp.lat, 0) / imported.length;
      const avgLng = imported.reduce((sum, wp) => sum + wp.lng, 0) / imported.length;
      setFlyToTarget({ lat: avgLat, lng: avgLng, zoom: 15 });

      showToast(`✅ ${t('import.loaded')} – ${imported.length} ${t('preview.waypoints')}`);
    } catch (err) {
      showToast(`❌ ${String(err).replace('Error: ', '')}`, 4000);
    }

    // Reset file input so the same file can be re-imported if needed
    e.target.value = '';
  }, [showToast, t]);

  // ── Polygon state ────────────────────────────────────────────
  const [polygonPoints, setPolygonPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [polygonDrawActive, setPolygonDrawActive] = useState(false);

  // ── Facade state (single side) ───────────────────────────────
  type FacadePoints = { a: { lat: number; lng: number }; b: { lat: number; lng: number } };
  const [facadePoints, setFacadePoints] = useState<FacadePoints | null>(null);
  const [facadeDrawStep, setFacadeDrawStep] = useState<'idle' | 'a' | 'b'>('idle');
  // Temporary point A while waiting for point B click
  const [pendingFacadeA, setPendingFacadeA] = useState<{ lat: number; lng: number } | null>(null);
  // 'single' = one facade side; '360' = full building (corners added via map clicks like waypoints)
  const [facadeMode, setFacadeMode] = useState<'single' | '360'>('single');


  // ── Map interaction ──────────────────────────────────────────

  /** Single handler for all map clicks — behavior depends on current mode */
  const handleMapClick = useCallback((lat: number, lng: number) => {
    // Facade point selection (single side)
    if (facadeDrawStep === 'a') {
      setPendingFacadeA({ lat, lng });
      setFacadeDrawStep('b');
      return;
    }
    if (facadeDrawStep === 'b' && pendingFacadeA) {
      setFacadePoints({ a: pendingFacadeA, b: { lat, lng } });
      setPendingFacadeA(null);
      setFacadeDrawStep('idle');
      return;
    }
    // Polygon grid drawing
    if (polygonDrawActive) {
      setPolygonPoints((prev) => [...prev, { lat, lng }]);
      return;
    }
    // Default: add waypoint in waypoints mode, or in facade 360° mode (building corners)
    if (missionType === 'waypoints' || (missionType === 'facade' && facadeMode === '360')) {
      setWaypoints((prev) => [
        ...prev,
        { id: generateId('wp', 0), lat, lng, height: 50, speed: 5, waitTime: 0, cameraAction: 'none' },
      ]);
    }
  }, [
    facadeDrawStep, pendingFacadeA, polygonDrawActive, missionType, facadeMode,
  ]);

  /** Update waypoint position after drag */
  const handleUpdateWaypointPosition = useCallback((id: string, lat: number, lng: number) => {
    setWaypoints((prev) => prev.map((wp) => (wp.id === id ? { ...wp, lat, lng } : wp)));
  }, []);

  /** Update waypoint parameters from the sidebar panel */
  const handleUpdateWaypoint = useCallback((id: string, updates: Partial<Waypoint>) => {
    setWaypoints((prev) => prev.map((wp) => (wp.id === id ? { ...wp, ...updates } : wp)));
  }, []);

  const handleDeleteWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setWaypoints([]);
    setTerrainActive(false);
    setOriginalWaypoints(null);
  }, []);

  /** Replace all waypoints with a newly generated mission. */
  const handleSetWaypoints = useCallback((wps: Waypoint[]) => {
    setWaypoints(wps);
    // New mission always starts without terrain following applied
    setTerrainActive(false);
    setOriginalWaypoints(null);
  }, []);

  /** Change mission type — clear waypoints and any mode-specific state */
  const handleMissionTypeChange = useCallback((type: MissionType) => {
    setMissionType(type);
    setWaypoints([]);
    setTerrainActive(false);
    setOriginalWaypoints(null);
    setFacadeDrawStep('idle');
    setPendingFacadeA(null);
  }, []);

  /** Switch between single-side and 360° facade modes — clears waypoints */
  const handleFacadeModeChange = useCallback((mode: 'single' | '360') => {
    setFacadeMode(mode);
    setWaypoints([]);
  }, []);

  // ── Terrain Following ────────────────────────────────────────

  /** Apply elevation-adjusted waypoints — saves originals so they can be restored */
  const handleTerrainApply = useCallback((adjusted: Waypoint[]) => {
    // Save the originals only on first activation (not on re-apply)
    setOriginalWaypoints((prev) => prev ?? waypoints);
    setWaypoints(adjusted);
    setTerrainActive(true);
  }, [waypoints]);

  /** Restore waypoints to their pre-terrain-following heights */
  const handleTerrainReset = useCallback(() => {
    if (originalWaypoints) {
      setWaypoints(originalWaypoints);
    }
    setTerrainActive(false);
    setOriginalWaypoints(null);
  }, [originalWaypoints]);

  // ── Save / Export ────────────────────────────────────────────

  const handleSaveMission = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);

  const handleSaveConfirm = useCallback((name: string) => {
    const mission: Mission = {
      id: `mission-${Date.now()}`,
      name,
      type: missionType,
      createdAt: new Date().toISOString(),
      waypoints: [...waypoints],
    };
    saveMission(mission);
    setSaveDialogOpen(false);
    router.push('/missions');
  }, [waypoints, missionType, router]);

  const handleExportLitchi = useCallback(() => {
    if (waypoints.length === 0) return;
    try {
      exportLitchiCSV(waypoints);
    } catch (error) {
      console.error('Litchi CSV export failed:', error);
      showToast('❌ Export Litchi CSV selhal');
    }
  }, [waypoints, showToast]);

  const handleExportKMZ = useCallback(async () => {
    if (waypoints.length === 0) return;
    // Warn (but don't block) if any waypoint is in a DANGER zone
    const hasDanger = collisions.some((c) => c.severity === 'DANGER');
    if (hasDanger) {
      const proceed = window.confirm(
        t('export.dangerConfirm')
      );
      if (!proceed) return;
    }
    setIsExporting(true);
    try {
      const mission: Mission = {
        id: 'export',
        name: 'mission',
        type: missionType,
        createdAt: new Date().toISOString(),
        waypoints,
      };
      await exportKMZ(mission, activeDrone?.name);
    } catch (error) {
      console.error('KMZ export failed:', error);
      alert('Export se nezdaril. Zkontroluj konzoli.');
    } finally {
      setIsExporting(false);
    }
  }, [waypoints, missionType, collisions, t, activeDrone?.name]);

  // ── Derived map props ────────────────────────────────────────

  // Show crosshair cursor when the user is placing a point on the map
  const crosshairCursor = polygonDrawActive || facadeDrawStep !== 'idle';

  // Markers are draggable in waypoints mode and in facade 360° mode (to fine-tune corners)
  const draggableMarkers = missionType === 'waypoints' || (missionType === 'facade' && facadeMode === '360');

  // Show facade line when both points are selected
  const facadeLine: [[number, number], [number, number]] | null = facadePoints
    ? [[facadePoints.a.lat, facadePoints.a.lng], [facadePoints.b.lat, facadePoints.b.lng]]
    : null;

  // Show building polygon in facade 360° mode once at least 4 corners have been placed
  const buildingPolygon: [[number, number], [number, number], [number, number], [number, number]] | null =
    missionType === 'facade' && facadeMode === '360' && waypoints.length >= 4
      ? [
          [waypoints[0].lat, waypoints[0].lng],
          [waypoints[1].lat, waypoints[1].lng],
          [waypoints[2].lat, waypoints[2].lng],
          [waypoints[3].lat, waypoints[3].lng],
        ]
      : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <SaveMissionDialog
        open={saveDialogOpen}
        onSave={handleSaveConfirm}
        onClose={() => setSaveDialogOpen(false)}
      />

      <Sidebar
        waypoints={waypoints}
        missionType={missionType}
        onMissionTypeChange={handleMissionTypeChange}
        onFlyTo={handleFlyTo}
        onUpdateWaypoint={handleUpdateWaypoint}
        onDeleteWaypoint={handleDeleteWaypoint}
        onClearAll={handleClearAll}
        onSetWaypoints={handleSetWaypoints}
        polygonPoints={polygonPoints}
        polygonDrawActive={polygonDrawActive}
        onStartDrawPolygon={() => {
          setPolygonPoints([]);
          setPolygonDrawActive(true);
        }}
        onFinishDrawPolygon={() => setPolygonDrawActive(false)}
        onClearPolygon={() => {
          setPolygonPoints([]);
          setPolygonDrawActive(false);
        }}
        facadePoints={facadePoints}
        facadeDrawStep={facadeDrawStep}
        onStartDrawFacade={() => setFacadeDrawStep('a')}
        facadeMode={facadeMode}
        onFacadeModeChange={handleFacadeModeChange}
        terrainActive={terrainActive}
        onTerrainApply={handleTerrainApply}
        onTerrainReset={handleTerrainReset}
        showAirspace={showAirspace}
        onToggleAirspace={handleToggleAirspace}
        showProtectedAreas={showProtectedAreas}
        onToggleProtectedAreas={handleToggleProtectedAreas}
        showSmallReserves={showSmallReserves}
        onToggleSmallReserves={handleToggleSmallReserves}
        showWaterSources={showWaterSources}
        onToggleWaterSources={handleToggleWaterSources}
        showRailways={showRailways}
        onToggleRailways={handleToggleRailways}
        showRoads={showRoads}
        onToggleRoads={handleToggleRoads}
        showPowerlines={showPowerlines}
        onTogglePowerlines={handleTogglePowerlines}
        collisions={collisions}
        onSaveMission={handleSaveMission}
        onShareMission={handleShareMission}
        onImportKmz={handleImportKmz}
        onExportKMZ={handleExportKMZ}
        onExportLitchi={handleExportLitchi}
        isExporting={isExporting}
        activeDrone={activeDrone}
        dataRegion={dataRegion}
        onDataRegionChange={handleDataRegionChange}
      />

      {/* Toast notification — appears bottom-right, auto-dismisses after 3 s */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-[#1a1d27] border border-gray-600 text-white text-sm rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <main className="flex-1 relative">
        <MapView
          waypoints={waypoints}
          draggableMarkers={draggableMarkers}
          crosshairCursor={crosshairCursor}
          onMapClick={handleMapClick}
          onUpdateWaypoint={handleUpdateWaypointPosition}
          onCenterChange={(lat, lng) => setMapCenter({ lat, lng })}
          gridRect={null}
          polygonPoints={polygonPoints}
          polygonDrawActive={polygonDrawActive}
          facadeLine={facadeLine}
          buildingPolygon={buildingPolygon}
          flyToTarget={flyToTarget}
          showAirspace={showAirspace}
          showProtectedAreas={showProtectedAreas}
          showSmallReserves={showSmallReserves}
          showWaterSources={showWaterSources}
          showRailways={showRailways}
          showRoads={showRoads}
          showPowerlines={showPowerlines}
          dataRegion={dataRegion}
        />
      </main>
    </div>
  );
}
