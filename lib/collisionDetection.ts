// Collision detection — checks waypoints against airspace zones, NP/CHKO areas,
// small nature reserves, water sources, and railway buffer zones.
//
// Two check types:
//   1. Polygon zones (airspaces, protected areas, reserves, water sources):
//      ray-casting point-in-polygon, O(n) per check.
//   2. Line zones (railways): point-to-segment distance check.
//      Railway GeoJSON is LineString — distance < bufferDeg triggers collision.
//
// All GeoJSON data is fetched once and cached in module-level variables.

import { Waypoint } from '@/lib/types';
import { AIRSPACE_TYPE_NAMES } from './airspaceTypes';
import { DataRegion, DEFAULT_DATA_REGION, dataFileUrl } from './dataRegion';

// ── Types ──────────────────────────────────────────────────────────────────

export type Severity = 'DANGER' | 'WARNING' | 'CAUTION';

export interface Collision {
  waypointId: string;
  waypointIndex: number;
  zoneName: string;
  zoneType: string;
  severity: Severity;
  instructions: string;
}

/** One unique zone with all waypoint indices that fall inside it. */
export interface CollisionGroup {
  zoneName: string;
  zoneType: string;
  severity: Severity;
  instructions: string;
  /** 0-based waypoint indices (displayed as WP n+1) */
  waypointIndices: number[];
}

/**
 * Collapses a flat Collision[] into one entry per unique zone.
 * Severity of a group = highest severity among all WP collisions in that zone.
 */
export function groupCollisionsByZone(collisions: Collision[]): CollisionGroup[] {
  const map = new Map<string, CollisionGroup>();
  const SEVERITY_RANK: Record<Severity, number> = { DANGER: 2, WARNING: 1, CAUTION: 0 };

  for (const c of collisions) {
    const key = `${c.zoneType}|${c.zoneName}`;
    const existing = map.get(key);
    if (existing) {
      existing.waypointIndices.push(c.waypointIndex);
      if (SEVERITY_RANK[c.severity] > SEVERITY_RANK[existing.severity]) {
        existing.severity = c.severity;
      }
    } else {
      map.set(key, {
        zoneName: c.zoneName,
        zoneType: c.zoneType,
        severity: c.severity,
        instructions: c.instructions,
        waypointIndices: [c.waypointIndex],
      });
    }
  }

  // Sort: DANGER first, then WARNING, then CAUTION
  return [...map.values()].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
}

// Internal record for polygon-based zones
interface Zone {
  name: string;
  type: string;
  severity: Severity;
  instructions: string;
  /** Outer ring coordinates [lng, lat][] */
  ring: [number, number][];
}

// Internal record for line-based zones (railways)
interface LineZone {
  name: string;
  type: string;
  severity: Severity;
  instructions: string;
  /** Consecutive coordinate pairs extracted from LineString coordinates */
  coords: [number, number][];
  /** Protection buffer in approximate degrees of latitude (60 m ≈ 0.000539°) */
  bufferDeg: number;
}

// ── Module-level cache ─────────────────────────────────────────────────────

const zonesCacheByRegion = new Map<DataRegion, Zone[]>();
const lineZonesCacheByRegion = new Map<DataRegion, LineZone[]>();
/** Raw powerlines GeoJSON — cached per region and shared by loadZones() and loadLineZones() */
const powerlinesCacheByRegion = new Map<DataRegion, GeoJSON.FeatureCollection | null>();

// ── Severity + instructions mapping ───────────────────────────────────────

function airspaceSeverity(typeNum: number): Severity {
  const t = AIRSPACE_TYPE_NAMES[typeNum] ?? 'OTHER';
  if (['PROHIBITED', 'RESTRICTED'].includes(t)) return 'DANGER';
  if (['CTR', 'TRA', 'TSA', 'DANGER'].includes(t)) return 'WARNING';
  return 'CAUTION'; // TMA, ATZ, RMZ, TMZ, FIR, ADIZ, OTHER
}

function airspaceInstructions(typeNum: number): string {
  const t = AIRSPACE_TYPE_NAMES[typeNum] ?? 'OTHER';
  switch (t) {
    case 'PROHIBITED':
      return 'Zákaz vstupu. Kontaktujte ÚCL: caa.gov.cz nebo tel. +420 225 422 444';
    case 'RESTRICTED':
      return 'Omezený prostor. Kontaktujte ÚCL: caa.gov.cz nebo tel. +420 225 422 444';
    case 'DANGER':
      return 'Nebezpečný vzdušný prostor. Ověřte podmínky na dronemap.gov.cz';
    case 'CTR':
      return 'Řízený prostor letiště. Kontaktujte provozovatele letiště nebo ŘLP: rlp.cz';
    case 'TRA':
    case 'TSA':
      return 'Vojenský vyhrazený prostor. Kontaktujte ÚCL: caa.gov.cz';
    case 'ATZ':
      return 'Nekontrolované letiště. Sledujte ATZ frekvenci (najdete v DroneMap)';
    case 'TMA':
      return 'Přibližovací prostor letiště. Ověřte podmínky s ATC nebo na dronemap.gov.cz';
    case 'RMZ':
      return 'Zóna povinného rádiového volání. Nastavte transpondér nebo kontaktujte ATC';
    default:
      return 'Zvýšená opatrnost. Ověřte podmínky na dronemap.gov.cz';
  }
}

function protectedAreaSeverity(type: string): Severity {
  if (type === 'NP' || type === 'NATIONAL_PARK') return 'DANGER';
  if (type === 'PROTECTED_AREA') return 'CAUTION';
  return 'CAUTION'; // CHKO and other protected area types
}

function protectedAreaInstructions(type: string): string {
  if (type === 'NP') {
    return 'Národní park – zákaz létání mimo zastavěné oblasti. Kontaktujte správu NP.';
  }
  if (type === 'NATIONAL_PARK') {
    return 'National park – verify Serbian local drone rules and official restrictions before flight.';
  }
  if (type === 'PROTECTED_AREA') {
    return 'Protected area – verify local drone restrictions before flight.';
  }
  return 'CHKO – ověřte zónu I–IV a podmínky na letejtezodpovedne.cz';
}

function smallReserveSeverity(type: string): Severity {
  if (type === 'NPR' || type === 'NPP') return 'DANGER';
  if (type === 'PR') return 'WARNING';
  return 'CAUTION'; // PP
}

function smallReserveInstructions(type: string): string {
  switch (type) {
    case 'NPR': return 'Národní přírodní rezervace – přísný zákaz létání. Kontaktujte AOPK ČR: ochranaprirody.cz';
    case 'NPP': return 'Národní přírodní památka – zákaz létání. Kontaktujte AOPK ČR: ochranaprirody.cz';
    case 'PR':  return 'Přírodní rezervace – omezené létání. Ověřte podmínky na ochranaprirody.cz';
    default:    return 'Přírodní památka – ověřte podmínky na ochranaprirody.cz';
  }
}

function railwaySeverity(tier: string): Severity {
  if (tier === 'main') return 'WARNING';
  return 'CAUTION'; // tram
}

function railwayInstructions(tier: string): string {
  if (tier === 'main') {
    return 'Ochranné pásmo železnice – zákaz létání do 60 m od osy koleje (LKR311). Kontaktujte Správu železnic: spravazeleznic.cz';
  }
  return 'Ochranné pásmo tramvajové trati – 30 m od osy koleje. Ověřte podmínky u provozovatele.';
}

function roadSeverity(roadClass: string): Severity {
  if (['MOTORWAY', 'TRUNK', 'EXPRESSWAY', 'PRIMARY'].includes(roadClass)) return 'WARNING';
  return 'CAUTION'; // SECONDARY
}

function roadInstructions(roadClass: string): string {
  if (roadClass === 'MOTORWAY' || roadClass === 'TRUNK' || roadClass === 'EXPRESSWAY') {
    return 'Ochranné pásmo dálnice/rychlostní silnice – zákaz létání do 50 m od osy a do výšky 50 m (LKR310). Kontaktujte ŘSD: rsd.cz';
  }
  if (roadClass === 'PRIMARY') {
    return 'Ochranné pásmo silnice I. třídy – zákaz létání do 50 m od osy, výška do 50 m (LKR310). Kontaktujte ŘSD: rsd.cz';
  }
  return 'Ochranné pásmo silnice II. třídy – zákaz létání do 15 m od osy (LKR310). Kontaktujte správu silnic kraje.';
}

function powerlineSeverity(voltageClass: string): Severity {
  if (voltageClass === 'EHV' || voltageClass === 'HV400') return 'WARNING';
  return 'CAUTION'; // HV220, HV110, SUBSTATION
}

function powerlineInstructions(voltageClass: string): string {
  switch (voltageClass) {
    case 'EHV':
      return 'Elektrické vedení >400 kV – ochranné pásmo 30 m (zákon 458/2000 Sb.). Nebezpečí indukce! Kontaktujte ČEPS: ceps.cz';
    case 'HV400':
      return 'Elektrické vedení 220–400 kV – ochranné pásmo 20 m (zákon 458/2000 Sb.). Kontaktujte ČEPS: ceps.cz';
    case 'HV220':
      return 'Elektrické vedení 110–220 kV – ochranné pásmo 15 m (zákon 458/2000 Sb.). Kontaktujte provozovatele distribuce.';
    case 'HV110':
      return 'Elektrické vedení 35–110 kV – ochranné pásmo 12 m (zákon 458/2000 Sb.). Kontaktujte provozovatele distribuce.';
    case 'SUBSTATION':
      return 'Elektrická trafostanice – ochranné pásmo 20 m. Elektromagnetické záření. Kontaktujte provozovatele.';
    default:
      return 'Elektrické vedení – dodržte bezpečnou vzdálenost (zákon 458/2000 Sb.).';
  }
}

function waterSourceSeverity(): Severity {
  return 'CAUTION';
}

function waterSourceInstructions(tier: string): string {
  if (tier === 'drinking') {
    return 'Ochranné pásmo vodního zdroje pitné vody – ověřte podmínky u správce soustavy. Viz vuv.cz';
  }
  return 'Vodní nádrž – ověřte zda jde o zdroj pitné vody. Viz vuv.cz';
}

// ── Ray-casting point-in-polygon ──────────────────────────────────────────

/**
 * Returns true if point [lng, lat] is inside the polygon ring.
 * Ring is array of [lng, lat] pairs (GeoJSON order).
 * Uses ray-casting algorithm — O(n) per check, no external deps.
 */
function pointInPolygon(
  lng: number,
  lat: number,
  ring: [number, number][],
): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    // Check if the horizontal ray from (lng, lat) crosses the edge (xi,yi)→(xj,yj)
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// ── Point-to-segment distance (for railway line zones) ─────────────────────

// cos(50°) — longitude scale factor for Czech Republic latitude
const COS_50 = Math.cos(50 * Math.PI / 180);

/**
 * Returns the squared distance (in degrees²) from point P to segment AB.
 * Longitude differences are scaled by COS_50 to approximate metric distance.
 * Used for railway buffer zone collision detection.
 */
function pointToSegmentDistSq(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = (bx - ax) * COS_50;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;

  if (len2 < 1e-12) {
    // Degenerate segment — just check distance to point A
    const ex = (px - ax) * COS_50;
    const ey = py - ay;
    return ex * ex + ey * ey;
  }

  // Project P onto line AB, clamped to [0, 1]
  const t = Math.max(0, Math.min(1,
    ((px - ax) * COS_50 * dx + (py - ay) * dy) / len2,
  ));
  const projX = ax + t * (bx - ax);
  const projY = ay + t * (by - ay);
  const rx = (px - projX) * COS_50;
  const ry = py - projY;
  return rx * rx + ry * ry;
}

// ── GeoJSON loading ────────────────────────────────────────────────────────

/** Fetches powerlines JSON once per region; subsequent calls return the cached result. */
async function loadPowerlinesData(dataRegion: DataRegion): Promise<GeoJSON.FeatureCollection | null> {
  if (powerlinesCacheByRegion.has(dataRegion)) {
    return powerlinesCacheByRegion.get(dataRegion) ?? null;
  }

  let result: GeoJSON.FeatureCollection | null = null;

  try {
    const res = await fetch(dataFileUrl('powerlines', dataRegion));
    if (res.ok) {
      result = await res.json() as GeoJSON.FeatureCollection;
    }
  } catch {
    console.warn(`[collisionDetection] Failed to load powerlines data for ${dataRegion}`);
  }

  powerlinesCacheByRegion.set(dataRegion, result);
  return result;
}

async function loadZones(dataRegion: DataRegion): Promise<Zone[]> {
  const cached = zonesCacheByRegion.get(dataRegion);
  if (cached) return cached;

  const zones: Zone[] = [];

  // Load airspaces
  try {
    const res = await fetch(dataFileUrl('airspaces', dataRegion));
    if (res.ok) {
      const data = await res.json() as { items: { name: string; type: number; geometry: { type: string; coordinates: [number, number][][] } }[] };
      for (const item of data.items) {
        if (item.geometry.type !== 'Polygon') continue;
        const ring = item.geometry.coordinates[0];
        if (!ring || ring.length < 3) continue;
        zones.push({
          name: item.name,
          type: AIRSPACE_TYPE_NAMES[item.type] ?? 'OTHER',
          severity: airspaceSeverity(item.type),
          instructions: airspaceInstructions(item.type),
          ring,
        });
      }
    }
  } catch {
    console.warn('[collisionDetection] Failed to load airspaces');
  }

  // Load protected areas (NP/CHKO)
  try {
    const res = await fetch(dataFileUrl('protected-areas', dataRegion));
    if (res.ok) {
      const data = await res.json() as GeoJSON.FeatureCollection;
      for (const feature of data.features) {
        if (feature.geometry.type !== 'Polygon') continue;
        const geom = feature.geometry as GeoJSON.Polygon;
        const ring = geom.coordinates[0] as [number, number][];
        if (!ring || ring.length < 3) continue;
        const props = feature.properties ?? {};
        const areaType: string = props.type ?? '';
        zones.push({
          name: props.name ?? 'Chráněné území',
          type: areaType,
          severity: protectedAreaSeverity(areaType),
          instructions: (props.restriction as string) ?? protectedAreaInstructions(areaType),
          ring,
        });
      }
    }
  } catch {
    console.warn('[collisionDetection] Failed to load protected areas');
  }

  // Load small nature reserves (NPR/NPP/PR/PP)
  try {
    const res = await fetch(dataFileUrl('small-reserves', dataRegion));
    if (res.ok) {
      const data = await res.json() as GeoJSON.FeatureCollection;
      for (const feature of data.features) {
        if (feature.geometry.type !== 'Polygon') continue;
        const geom = feature.geometry as GeoJSON.Polygon;
        const ring = geom.coordinates[0] as [number, number][];
        if (!ring || ring.length < 3) continue;
        const props = feature.properties ?? {};
        const areaType: string = props.type ?? '';
        zones.push({
          name: props.name ?? 'Přírodní rezervace',
          type: areaType,
          severity: smallReserveSeverity(areaType),
          instructions: smallReserveInstructions(areaType),
          ring,
        });
      }
    }
  } catch {
    console.warn('[collisionDetection] Failed to load small reserves');
  }

  // Load water sources (reservoirs and drinking water protection zones)
  try {
    const res = await fetch(dataFileUrl('water-sources', dataRegion));
    if (res.ok) {
      const data = await res.json() as GeoJSON.FeatureCollection;
      for (const feature of data.features) {
        if (feature.geometry.type !== 'Polygon') continue;
        const geom = feature.geometry as GeoJSON.Polygon;
        const ring = geom.coordinates[0] as [number, number][];
        if (!ring || ring.length < 3) continue;
        const props = feature.properties ?? {};
        const tier: string = props.tier ?? 'general';
        zones.push({
          name: props.name ?? 'Vodní nádrž',
          type: tier === 'drinking' ? 'WATER_DRINKING' : 'WATER_GENERAL',
          severity: waterSourceSeverity(),
          instructions: waterSourceInstructions(tier),
          ring,
        });
      }
    }
  } catch {
    console.warn('[collisionDetection] Failed to load water sources');
  }

  // Load power substation polygons (featureType='substation' in powerlines GeoJSON)
  // Uses shared cache — powerlines-cz.json is fetched only once per session.
  const powerlinesData = await loadPowerlinesData(dataRegion);
  if (powerlinesData) {
    for (const feature of powerlinesData.features) {
      if (feature.geometry.type !== 'Polygon') continue;
      const props = feature.properties ?? {};
      if ((props.featureType as string) !== 'substation') continue;
      const geom = feature.geometry as GeoJSON.Polygon;
      const ring = geom.coordinates[0] as [number, number][];
      if (!ring || ring.length < 3) continue;
      const voltClass: string = props.voltageClass ?? 'SUBSTATION';
      zones.push({
        name:         props.name ?? 'Trafostanice',
        type:         'POWERLINE_SUBSTATION',
        severity:     powerlineSeverity(voltClass),
        instructions: powerlineInstructions(voltClass),
        ring,
      });
    }
  }

  zonesCacheByRegion.set(dataRegion, zones);
  return zones;
}

/**
 * Loads railway LineString features into LineZone records.
 * Cached separately from polygon zones because railways use distance-based checks.
 */
async function loadLineZones(dataRegion: DataRegion): Promise<LineZone[]> {
  const cached = lineZonesCacheByRegion.get(dataRegion);
  if (cached) return cached;

  const zones: LineZone[] = [];

  try {
    const res = await fetch(dataFileUrl('railways', dataRegion));
    if (res.ok) {
      const data = await res.json() as GeoJSON.FeatureCollection;
      for (const feature of data.features) {
        if (feature.geometry.type !== 'LineString') continue;
        const geom   = feature.geometry as GeoJSON.LineString;
        const coords = geom.coordinates as [number, number][];
        if (coords.length < 2) continue;
        const props   = feature.properties ?? {};
        const tier    = (props.tier as string) ?? 'main';
        const bufferM = (props.bufferM as number) ?? 60;
        // Convert metres to approximate degrees of latitude
        const bufferDeg = bufferM / 111320;
        zones.push({
          name:        props.name ?? 'Železniční trať',
          type:        tier === 'main' ? 'RAILWAY_MAIN' : 'RAILWAY_TRAM',
          severity:    railwaySeverity(tier),
          instructions: railwayInstructions(tier),
          coords,
          bufferDeg,
        });
      }
    }
  } catch {
    console.warn('[collisionDetection] Failed to load railways');
  }

  // Load road LineString features (motorway/expressway/primary/secondary)
  try {
    const res = await fetch(dataFileUrl('roads', dataRegion));
    if (res.ok) {
      const data = await res.json() as GeoJSON.FeatureCollection;
      for (const feature of data.features) {
        if (feature.geometry.type !== 'LineString') continue;
        const props   = feature.properties ?? {};
        const geom    = feature.geometry as GeoJSON.LineString;
        const coords  = geom.coordinates as [number, number][];
        if (coords.length < 2) continue;
        const roadClass: string = (props.roadClass as string) ?? 'PRIMARY';
        const bufferM:   number = (props.bufferM   as number) ?? 50;
        const ref:       string = (props.ref       as string) ?? '';
        zones.push({
          name:         ref ? `${roadClass === 'SECONDARY' ? 'Silnice II/III' : 'Silnice'} ${ref}` : 'Silnice',
          type:         `ROAD_${roadClass}`,
          severity:     roadSeverity(roadClass),
          instructions: roadInstructions(roadClass),
          coords,
          bufferDeg: bufferM / 111320,
        });
      }
    }
  } catch {
    console.warn('[collisionDetection] Failed to load roads');
  }

  // Load power line LineString features (featureType='line' in powerlines GeoJSON)
  // Uses shared cache — powerlines-cz.json is fetched only once per session.
  const powerlinesData = await loadPowerlinesData(dataRegion);
  if (powerlinesData) {
    for (const feature of powerlinesData.features) {
      if (feature.geometry.type !== 'LineString') continue;
      const props = feature.properties ?? {};
      if ((props.featureType as string) !== 'line') continue;
      const geom   = feature.geometry as GeoJSON.LineString;
      const coords = geom.coordinates as [number, number][];
      if (coords.length < 2) continue;
      const voltClass: string = (props.voltageClass as string) ?? 'HV110';
      const bufferM:   number = (props.bufferM      as number) ?? 12;
      zones.push({
        name:         `Elektrické vedení (${voltClass})`,
        type:         `POWERLINE_${voltClass}`,
        severity:     powerlineSeverity(voltClass),
        instructions: powerlineInstructions(voltClass),
        coords,
        bufferDeg: bufferM / 111320,
      });
    }
  }

  lineZonesCacheByRegion.set(dataRegion, zones);
  return zones;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Checks all waypoints against:
 *   - Polygon zones: airspaces, NP/CHKO, small reserves, water sources (point-in-polygon)
 *   - Line zones: railway routes (point-to-segment distance < bufferDeg)
 * Returns one Collision per (waypoint × zone) combination.
 * GeoJSON data is fetched once and cached for the session.
 */
export async function checkWaypointCollisions(
  waypoints: Waypoint[],
  dataRegion: DataRegion = DEFAULT_DATA_REGION,
): Promise<Collision[]> {
  const [zones, lineZones] = await Promise.all([loadZones(dataRegion), loadLineZones(dataRegion)]);
  const collisions: Collision[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];

    // ── Polygon zone check ──────────────────────────────────────────────
    for (const zone of zones) {
      if (pointInPolygon(wp.lng, wp.lat, zone.ring)) {
        collisions.push({
          waypointId:   wp.id,
          waypointIndex: i,
          zoneName:     zone.name,
          zoneType:     zone.type,
          severity:     zone.severity,
          instructions: zone.instructions,
        });
      }
    }

    // ── Railway line zone check (distance-based) ────────────────────────
    for (const lz of lineZones) {
      const bufSq = lz.bufferDeg * lz.bufferDeg;
      let hit = false;
      for (let s = 0; s < lz.coords.length - 1; s++) {
        const [ax, ay] = lz.coords[s];
        const [bx, by] = lz.coords[s + 1];
        if (pointToSegmentDistSq(wp.lng, wp.lat, ax, ay, bx, by) <= bufSq) {
          hit = true;
          break;
        }
      }
      if (hit) {
        collisions.push({
          waypointId:   wp.id,
          waypointIndex: i,
          zoneName:     lz.name,
          zoneType:     lz.type,
          severity:     lz.severity,
          instructions: lz.instructions,
        });
      }
    }
  }

  return collisions;
}

/** Returns the highest severity from a list of collisions, or null if empty. */
export function highestSeverity(collisions: Collision[]): Severity | null {
  if (collisions.length === 0) return null;
  if (collisions.some((c) => c.severity === 'DANGER')) return 'DANGER';
  if (collisions.some((c) => c.severity === 'WARNING')) return 'WARNING';
  return 'CAUTION';
}
