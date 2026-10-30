import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const MAX_SPAN_DEGREES = 0.06;
const MAX_OSM_API_SPAN_DEGREES = 0.008;
const MAX_BUILDINGS = 2500;

interface OverpassNodeGeometry {
  lat: number;
  lon: number;
}

interface OverpassWay {
  id: number;
  type: 'way';
  geometry?: OverpassNodeGeometry[];
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassWay[];
  remark?: string;
}

interface OsmApiNode {
  id: number;
  type: 'node';
  lat: number;
  lon: number;
}

interface OsmApiWay {
  id: number;
  type: 'way';
  nodes?: number[];
  tags?: Record<string, string>;
}

interface OsmApiResponse {
  elements?: (OsmApiNode | OsmApiWay)[];
}

function parseLength(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim().replace(',', '.');
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) return null;
  if (/\b(ft|feet)\b/i.test(normalized)) return numeric * 0.3048;
  return numeric;
}

function buildingHeights(tags: Record<string, string> = {}) {
  const levels = Number.parseFloat(tags['building:levels'] ?? '');
  const minLevels = Number.parseFloat(tags['building:min_level'] ?? '');
  const explicitHeight = parseLength(tags.height);
  const explicitMinHeight = parseLength(tags.min_height);
  const height = explicitHeight ?? (Number.isFinite(levels) ? levels * 3 : 6);
  const minHeight = explicitMinHeight ?? (Number.isFinite(minLevels) ? minLevels * 3 : 0);

  return {
    height: Math.min(600, Math.max(2.5, height)),
    minHeight: Math.min(Math.max(0, minHeight), Math.max(0, height - 1)),
  };
}

function validBounds(values: number[]) {
  if (values.length !== 4 || values.some(value => !Number.isFinite(value))) return false;
  const [south, west, north, east] = values;
  return south >= -90 && north <= 90 && west >= -180 && east <= 180 &&
    south < north && west < east && north - south <= MAX_SPAN_DEGREES &&
    east - west <= MAX_SPAN_DEGREES;
}

async function fetchOverpass(query: string): Promise<OverpassResponse> {
  let lastError = 'Overpass unavailable';

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'DJI-Waypoint-Planner/1.0 (3D building preview)',
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(20_000),
        cache: 'no-store',
      });
      if (!response.ok) {
        lastError = `Overpass HTTP ${response.status}`;
        continue;
      }
      const data = await response.json() as OverpassResponse;
      if (data.remark) {
        lastError = 'Overpass returned an incomplete result';
        continue;
      }
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Overpass request failed';
    }
  }

  throw new Error(lastError);
}

async function fetchOsmApiBuildings(bounds: number[]): Promise<OverpassResponse> {
  const [south, west, north, east] = bounds;
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;
  const halfLat = Math.min((north - south) / 2, MAX_OSM_API_SPAN_DEGREES / 2);
  const halfLng = Math.min((east - west) / 2, MAX_OSM_API_SPAN_DEGREES / 2);
  const apiBounds = [
    centerLng - halfLng,
    centerLat - halfLat,
    centerLng + halfLng,
    centerLat + halfLat,
  ].map(value => value.toFixed(6)).join(',');

  const response = await fetch(`https://api.openstreetmap.org/api/0.6/map.json?bbox=${apiBounds}`, {
    headers: { 'User-Agent': 'DJI-Waypoint-Planner/1.0 (3D building preview)' },
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`OSM API HTTP ${response.status}`);

  const data = await response.json() as OsmApiResponse;
  const nodes = new Map(
    (data.elements ?? [])
      .filter((element): element is OsmApiNode => element.type === 'node')
      .map(node => [node.id, node]),
  );
  const elements: OverpassWay[] = (data.elements ?? [])
    .filter((element): element is OsmApiWay => element.type === 'way' && Boolean(element.tags?.building))
    .flatMap(way => {
      const geometry = (way.nodes ?? []).flatMap(nodeId => {
        const node = nodes.get(nodeId);
        return node ? [{ lat: node.lat, lon: node.lon }] : [];
      });
      return geometry.length >= 4 ? [{
        id: way.id,
        type: 'way' as const,
        tags: way.tags,
        geometry,
      }] : [];
    });

  return { elements };
}

export async function GET(request: NextRequest) {
  const values = (request.nextUrl.searchParams.get('bbox') ?? '')
    .split(',')
    .map(Number);

  if (!validBounds(values)) {
    return NextResponse.json({ error: 'Invalid or oversized bbox' }, { status: 400 });
  }

  const [south, west, north, east] = values;
  const query = `[out:json][timeout:18];way["building"](${south},${west},${north},${east});out tags geom;`;

  try {
    let data: OverpassResponse;
    try {
      data = await fetchOsmApiBuildings(values);
    } catch {
      data = await fetchOverpass(query);
    }
    const buildings = (data.elements ?? [])
      .filter((element): element is OverpassWay =>
        element.type === 'way' && Array.isArray(element.geometry) && element.geometry.length >= 4)
      .slice(0, MAX_BUILDINGS)
      .flatMap(element => {
        const polygon = element.geometry!.map(node => [node.lon, node.lat] as [number, number]);
        const first = polygon[0];
        const last = polygon[polygon.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) polygon.push(first);
        if (polygon.length < 4) return [];
        const { height, minHeight } = buildingHeights(element.tags);
        return [{
          id: `osm-way-${element.id}`,
          name: element.tags?.name ?? null,
          polygon,
          height,
          minHeight,
        }];
      });

    return NextResponse.json(
      { buildings, truncated: (data.elements?.length ?? 0) > MAX_BUILDINGS },
      { headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json({ error: 'Building source unavailable' }, { status: 502 });
  }
}
