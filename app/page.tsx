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

// Leaflet map must be loaded client-side only (it uses browser APIs)
const MapView = dynamic(() => import('@/components/Map'), { ssr: false });
// Sidebar uses useLanguage hook which requires LanguageProvider context — delay until mounted
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });

/** Shot types available in film mode */
export type FilmType = 'dronie' | 'reveal' | 'topdown' | 'craneup' | 'hyperlapse' | 'arcshot' | 'boomerang' | 'rocket' | 'poisequence';

export default function HomePage() {
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

  // ── App mode: photo workflow vs. cinematic film shots ─────────
  const [appMode, setAppMode] = useState<'photo' | 'film'>('photo');
  const [filmType, setFilmType] = useState<FilmType>('dronie');

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
  const [mapCenter, setMapCenter] = useState({ lat: 50.08, lng: 14.42 });

  // ── Fly-to target (driven by address search in SearchBar) ─────
  // Setting a new object triggers the useEffect in Map.tsx which calls map.flyTo().
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  const handleFlyTo = useCallback((lat: number, lng: number) => {
    setFlyToTarget({ lat, lng, zoom: 17 });
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
      setMissionType(data.missionType);
      setAppMode(data.missionType === 'film' ? 'film' : 'photo');
    }
    // Remove the ?mission= param so the URL stays clean
    window.history.replaceState({}, '', window.location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load mission from /missions page — runs once on mount ───────
  // When user clicks "Načíst" on /missions, the mission is stored in
  // sessionStorage under 'loadMission'. This effect reads and applies it.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('loadMission');
      if (!raw) return;
      sessionStorage.removeItem('loadMission'); // clear immediately to prevent re-load on refresh
      const mission: Mission = JSON.parse(raw);
      if (!mission?.waypoints?.length) return;
      setWaypoints(mission.waypoints);
      const isFilm = mission.type === 'film';
      setMissionType(isFilm ? 'waypoints' : mission.type);
      setAppMode(isFilm ? 'film' : 'photo');
      setTerrainActive(false);
      setOriginalWaypoints(null);
      // Fly to centroid of loaded waypoints
      const avgLat = mission.waypoints.reduce((s, wp) => s + wp.lat, 0) / mission.waypoints.length;
      const avgLng = mission.waypoints.reduce((s, wp) => s + wp.lng, 0) / mission.waypoints.length;
      setFlyToTarget({ lat: avgLat, lng: avgLng, zoom: 15 });
    } catch {
      // Ignore corrupted sessionStorage data
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    missionType: effectiveMissionType,
  });

  const url = `${window.location.origin}?mission=${encoded}`;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      showToast('🔗 Odkaz zkopírován!');
      return;
    }

    const copied = copyTextFallback(url);

    if (copied) {
      showToast('🔗 Odkaz zkopírován!');
      return;
    }

    window.prompt('Zkopírujte odkaz ručně:', url);
  } catch {
    const copied = copyTextFallback(url);

    if (copied) {
      showToast('🔗 Odkaz zkopírován!');
      return;
    }

    window.prompt('Zkopírujte odkaz ručně:', url);
  }
}, [waypoints, effectiveMissionType, showToast]);

  // ── KMZ import ───────────────────────────────────────────────

  /** Handle file input change — parse KMZ and load waypoints into the map */
  const handleImportKmz = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { waypoints: imported } = await importKmz(file);

      setWaypoints(imported);
      setMissionType('waypoints');
      setAppMode('photo');
      setTerrainActive(false);
      setOriginalWaypoints(null);

      // Fly to centroid of imported waypoints
      const avgLat = imported.reduce((sum, wp) => sum + wp.lat, 0) / imported.length;
      const avgLng = imported.reduce((sum, wp) => sum + wp.lng, 0) / imported.length;
      setFlyToTarget({ lat: avgLat, lng: avgLng, zoom: 15 });

      showToast(`✅ Mise načtena – ${imported.length} waypointů`);
    } catch (err) {
      showToast(`❌ ${String(err).replace('Error: ', '')}`, 4000);
    }

    // Reset file input so the same file can be re-imported if needed
    e.target.value = '';
  }, [showToast]);

  // ── Grid state ───────────────────────────────────────────────
  const [gridCorners, setGridCorners] = useState<{ sw: [number, number]; ne: [number, number] } | null>(null);
  const [gridDrawStep, setGridDrawStep] = useState<'idle' | 'sw' | 'ne'>('idle');
  // Temporary SW corner while waiting for NE click
  const [pendingSw, setPendingSw] = useState<[number, number] | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [polygonDrawActive, setPolygonDrawActive] = useState(false);

  // ── Orbit state ──────────────────────────────────────────────
  const [poi, setPoi] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingPoi, setIsSelectingPoi] = useState(false);

  // ── Facade state (single side) ───────────────────────────────
  type FacadePoints = { a: { lat: number; lng: number }; b: { lat: number; lng: number } };
  const [facadePoints, setFacadePoints] = useState<FacadePoints | null>(null);
  const [facadeDrawStep, setFacadeDrawStep] = useState<'idle' | 'a' | 'b'>('idle');
  // Temporary point A while waiting for point B click
  const [pendingFacadeA, setPendingFacadeA] = useState<{ lat: number; lng: number } | null>(null);
  // 'single' = one facade side; '360' = full building (corners added via map clicks like waypoints)
  const [facadeMode, setFacadeMode] = useState<'single' | '360'>('single');

  // ── Film state — one point-selector per shot type ─────────────
  // Dronie
  const [dronieStart, setDronieStart] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingDronieStart, setIsSelectingDronieStart] = useState(false);
  // Reveal
  const [revealPoi, setRevealPoi] = useState<{ lat: number; lng: number } | null>(null);
  const [revealStart, setRevealStart] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingRevealPoi, setIsSelectingRevealPoi] = useState(false);
  const [isSelectingRevealStart, setIsSelectingRevealStart] = useState(false);
  // Top-down
  const [topDownStart, setTopDownStart] = useState<{ lat: number; lng: number } | null>(null);
  const [topDownEnd, setTopDownEnd] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingTopDownStart, setIsSelectingTopDownStart] = useState(false);
  const [isSelectingTopDownEnd, setIsSelectingTopDownEnd] = useState(false);
  // Crane Up
  const [craneUpPos, setCraneUpPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingCraneUpPos, setIsSelectingCraneUpPos] = useState(false);
  // Hyperlapse
  const [hyperlapseStart, setHyperlapseStart] = useState<{ lat: number; lng: number } | null>(null);
  const [hyperlapseEnd, setHyperlapseEnd] = useState<{ lat: number; lng: number } | null>(null);
  const [hyperlapseSelectStep, setHyperlapseSelectStep] = useState<'idle' | 'start' | 'end'>('idle');
  // Arc Shot
  const [arcShotPoi, setArcShotPoi] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingArcShotPoi, setIsSelectingArcShotPoi] = useState(false);
  // Boomerang
  const [boomerangStart, setBoomerangStart] = useState<{ lat: number; lng: number } | null>(null);
  const [boomerangEnd, setBoomerangEnd] = useState<{ lat: number; lng: number } | null>(null);
  const [boomerangSelectStep, setBoomerangSelectStep] = useState<'idle' | 'start' | 'end'>('idle');
  // Rocket
  const [rocketPos, setRocketPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingRocket, setIsSelectingRocket] = useState(false);
  // POI Sequence
  const [poiSeqPoi, setPoiSeqPoi] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingPoiSeq, setIsSelectingPoiSeq] = useState(false);

  // ── Map interaction ──────────────────────────────────────────

  /** Returns true when any film point selector is active */
  const isAnyFilmSelecting =
    isSelectingDronieStart ||
    isSelectingRevealPoi ||
    isSelectingRevealStart ||
    isSelectingTopDownStart ||
    isSelectingTopDownEnd ||
    isSelectingCraneUpPos ||
    hyperlapseSelectStep !== 'idle' ||
    isSelectingArcShotPoi ||
    boomerangSelectStep !== 'idle' ||
    isSelectingRocket ||
    isSelectingPoiSeq;

  /** Single handler for all map clicks — behavior depends on current mode */
  const handleMapClick = useCallback((lat: number, lng: number) => {
    // ── Film mode point selectors ────────────────────────────
    if (isSelectingDronieStart) {
      setDronieStart({ lat, lng });
      setIsSelectingDronieStart(false);
      return;
    }
    if (isSelectingRevealPoi) {
      setRevealPoi({ lat, lng });
      setIsSelectingRevealPoi(false);
      return;
    }
    if (isSelectingRevealStart) {
      setRevealStart({ lat, lng });
      setIsSelectingRevealStart(false);
      return;
    }
    if (isSelectingTopDownStart) {
      setTopDownStart({ lat, lng });
      setIsSelectingTopDownStart(false);
      return;
    }
    if (isSelectingTopDownEnd) {
      setTopDownEnd({ lat, lng });
      setIsSelectingTopDownEnd(false);
      return;
    }
    if (isSelectingCraneUpPos) {
      setCraneUpPos({ lat, lng });
      setIsSelectingCraneUpPos(false);
      return;
    }
    if (hyperlapseSelectStep === 'start') {
      setHyperlapseStart({ lat, lng });
      setHyperlapseSelectStep('idle');
      return;
    }
    if (hyperlapseSelectStep === 'end') {
      setHyperlapseEnd({ lat, lng });
      setHyperlapseSelectStep('idle');
      return;
    }
    if (isSelectingArcShotPoi) {
      setArcShotPoi({ lat, lng });
      setIsSelectingArcShotPoi(false);
      return;
    }
    if (boomerangSelectStep === 'start') {
      setBoomerangStart({ lat, lng });
      setBoomerangSelectStep('idle');
      return;
    }
    if (boomerangSelectStep === 'end') {
      setBoomerangEnd({ lat, lng });
      setBoomerangSelectStep('idle');
      return;
    }
    if (isSelectingRocket) {
      setRocketPos({ lat, lng });
      setIsSelectingRocket(false);
      return;
    }
    if (isSelectingPoiSeq) {
      setPoiSeqPoi({ lat, lng });
      setIsSelectingPoiSeq(false);
      return;
    }

    // ── Photo mode ───────────────────────────────────────────

    // POI select mode (orbit)
    if (isSelectingPoi) {
      setPoi({ lat, lng });
      setIsSelectingPoi(false);
      return;
    }

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
    // Grid corner selection
    if (gridDrawStep === 'sw') {
      setPendingSw([lat, lng]);
      setGridDrawStep('ne');
      return;
    }
    if (gridDrawStep === 'ne' && pendingSw) {
      setGridCorners({ sw: pendingSw, ne: [lat, lng] });
      setPendingSw(null);
      setGridDrawStep('idle');
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
    isSelectingDronieStart, isSelectingRevealPoi, isSelectingRevealStart,
    isSelectingTopDownStart, isSelectingTopDownEnd, isSelectingCraneUpPos,
    hyperlapseSelectStep, isSelectingArcShotPoi,
    boomerangSelectStep, isSelectingRocket, isSelectingPoiSeq,
    isSelectingPoi, facadeDrawStep, pendingFacadeA, gridDrawStep, pendingSw,
    polygonDrawActive,
    missionType, facadeMode,
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

  /** Replace all waypoints with a newly generated set (spiral/grid/orbit/film) */
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
    setGridDrawStep('idle');
    setPendingSw(null);
    setIsSelectingPoi(false);
    setFacadeDrawStep('idle');
    setPendingFacadeA(null);
  }, []);

  /** Switch between photo and film app modes — clears waypoints and film selections */
  const handleAppModeChange = useCallback((mode: 'photo' | 'film') => {
    setAppMode(mode);
    setWaypoints([]);
    // Reset all film selectors
    setIsSelectingDronieStart(false);
    setIsSelectingRevealPoi(false);
    setIsSelectingRevealStart(false);
    setIsSelectingTopDownStart(false);
    setIsSelectingTopDownEnd(false);
    setIsSelectingCraneUpPos(false);
    setHyperlapseSelectStep('idle');
    setIsSelectingArcShotPoi(false);
    setBoomerangSelectStep('idle');
    setIsSelectingRocket(false);
    setIsSelectingPoiSeq(false);
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
    // Film missions are saved with type 'film'
    const effectiveMissionType: MissionType = appMode === 'film' ? 'film' : missionType;
    const mission: Mission = {
      id: `mission-${Date.now()}`,
      name,
      type: effectiveMissionType,
      createdAt: new Date().toISOString(),
      waypoints: [...waypoints],
      // Include POI for orbit missions so KMZ export uses towardPOI heading
      ...(missionType === 'orbit' && poi ? { poi } : {}),
    };
    saveMission(mission);
    setSaveDialogOpen(false);
    router.push('/missions');
  }, [waypoints, missionType, appMode, poi, router]);

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
        '⚠️ Mise obsahuje waypointy v zakázané zóně.\n\nPokud máš platné povolení, můžeš pokračovat. Chceš exportovat KMZ?'
      );
      if (!proceed) return;
    }
    setIsExporting(true);
    try {
      const effectiveMissionType: MissionType = appMode === 'film' ? 'film' : missionType;
      const mission: Mission = {
        id: 'export',
        name: 'mise',
        type: effectiveMissionType,
        createdAt: new Date().toISOString(),
        waypoints,
        ...(missionType === 'orbit' && poi ? { poi } : {}),
      };
      await exportKMZ(mission, activeDrone?.name);
    } catch (error) {
      console.error('KMZ export failed:', error);
      alert('Export se nezdaril. Zkontroluj konzoli.');
    } finally {
      setIsExporting(false);
    }
  }, [waypoints, missionType, appMode, poi, collisions]);

  // ── Derived map props ────────────────────────────────────────

  // Show crosshair cursor when the user is placing a point on the map
  const crosshairCursor =
    gridDrawStep !== 'idle' ||
    polygonDrawActive ||
    facadeDrawStep !== 'idle' ||
    isSelectingPoi ||
    isAnyFilmSelecting;

  // Markers are draggable in waypoints mode and in facade 360° mode (to fine-tune corners)
  const draggableMarkers = missionType === 'waypoints' || (missionType === 'facade' && facadeMode === '360');

  // Show grid rectangle when both corners are selected
  const gridRect: [[number, number], [number, number]] | null = gridCorners
    ? [gridCorners.sw, gridCorners.ne]
    : null;

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
        appMode={appMode}
        onAppModeChange={handleAppModeChange}
        filmType={filmType}
        onFilmTypeChange={setFilmType}
        onUpdateWaypoint={handleUpdateWaypoint}
        onDeleteWaypoint={handleDeleteWaypoint}
        onClearAll={handleClearAll}
        onSetWaypoints={handleSetWaypoints}
        mapCenter={mapCenter}
        gridCorners={gridCorners}
        gridDrawStep={gridDrawStep}
        onStartDrawGrid={() => setGridDrawStep('sw')}
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
        poi={poi}
        isSelectingPoi={isSelectingPoi}
        onSelectPoi={() => setIsSelectingPoi(true)}
        onSetPoi={setPoi}
        facadePoints={facadePoints}
        facadeDrawStep={facadeDrawStep}
        onStartDrawFacade={() => setFacadeDrawStep('a')}
        facadeMode={facadeMode}
        onFacadeModeChange={handleFacadeModeChange}
        // Film props
        dronieStart={dronieStart}
        isSelectingDronieStart={isSelectingDronieStart}
        onSelectDronieStart={() => setIsSelectingDronieStart(true)}
        revealPoi={revealPoi}
        revealStart={revealStart}
        isSelectingRevealPoi={isSelectingRevealPoi}
        isSelectingRevealStart={isSelectingRevealStart}
        onSelectRevealPoi={() => setIsSelectingRevealPoi(true)}
        onSelectRevealStart={() => setIsSelectingRevealStart(true)}
        topDownStart={topDownStart}
        topDownEnd={topDownEnd}
        isSelectingTopDownStart={isSelectingTopDownStart}
        isSelectingTopDownEnd={isSelectingTopDownEnd}
        onSelectTopDownStart={() => setIsSelectingTopDownStart(true)}
        onSelectTopDownEnd={() => setIsSelectingTopDownEnd(true)}
        craneUpPos={craneUpPos}
        isSelectingCraneUpPos={isSelectingCraneUpPos}
        onSelectCraneUpPos={() => setIsSelectingCraneUpPos(true)}
        // Hyperlapse props
        hyperlapseStart={hyperlapseStart}
        hyperlapseEnd={hyperlapseEnd}
        hyperlapseSelectStep={hyperlapseSelectStep}
        onSelectHyperlapseStart={() => setHyperlapseSelectStep('start')}
        onSelectHyperlapseEnd={() => setHyperlapseSelectStep('end')}
        // Arc Shot props
        arcShotPoi={arcShotPoi}
        isSelectingArcShotPoi={isSelectingArcShotPoi}
        onSelectArcShotPoi={() => setIsSelectingArcShotPoi(true)}
        // Boomerang props
        boomerangStart={boomerangStart}
        boomerangEnd={boomerangEnd}
        boomerangSelectStep={boomerangSelectStep}
        onSelectBoomerangStart={() => setBoomerangSelectStep('start')}
        onSelectBoomerangEnd={() => setBoomerangSelectStep('end')}
        // Rocket props
        rocketPos={rocketPos}
        isSelectingRocket={isSelectingRocket}
        onSelectRocket={() => setIsSelectingRocket(true)}
        // POI Sequence props
        poiSeqPoi={poiSeqPoi}
        isSelectingPoiSeq={isSelectingPoiSeq}
        onSelectPoiSeq={() => setIsSelectingPoiSeq(true)}
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
        onDataRegionChange={setDataRegion}
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
          gridRect={gridRect}
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
