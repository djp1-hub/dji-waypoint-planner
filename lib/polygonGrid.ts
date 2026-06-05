import { Waypoint } from './types';
import { generateId } from './panelUtils';

export interface LatLng {
  lat: number;
  lng: number;
}

interface Point {
  x: number;
  y: number;
}

export interface PolygonGridParams {
  height: number;
  overlap: number;
  direction: number;
  speed: number;
}

const EARTH_RADIUS_M = 6378137;

function polygonCentroid(points: LatLng[]): LatLng {
  const sum = points.reduce(
    (acc, p) => ({
      lat: acc.lat + p.lat,
      lng: acc.lng + p.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

function latLngToMeters(p: LatLng, origin: LatLng): Point {
  const latRad = (origin.lat * Math.PI) / 180;

  return {
    x: ((p.lng - origin.lng) * Math.PI * EARTH_RADIUS_M * Math.cos(latRad)) / 180,
    y: ((p.lat - origin.lat) * Math.PI * EARTH_RADIUS_M) / 180,
  };
}

function metersToLatLng(p: Point, origin: LatLng): LatLng {
  const latRad = (origin.lat * Math.PI) / 180;

  return {
    lat: origin.lat + (p.y * 180) / (Math.PI * EARTH_RADIUS_M),
    lng: origin.lng + (p.x * 180) / (Math.PI * EARTH_RADIUS_M * Math.cos(latRad)),
  };
}

function rotatePoint(p: Point, angleRad: number): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  };
}

function bbox(points: Point[]) {
  return points.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxY: Math.max(acc.maxY, p.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function segmentHorizontalIntersection(a: Point, b: Point, y: number): number | null {
  if (Math.abs(a.y - b.y) < 1e-9) {
    return null;
  }

  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);

  if (y < minY || y >= maxY) {
    return null;
  }

  const t = (y - a.y) / (b.y - a.y);

  return a.x + t * (b.x - a.x);
}

export function generatePolygonGridWaypoints(
  polygon: LatLng[],
  params: PolygonGridParams,
): Waypoint[] {
  if (polygon.length < 3) {
    return [];
  }

  if (params.height <= 0) {
    throw new Error('Height must be greater than zero');
  }

  if (params.overlap < 0 || params.overlap >= 95) {
    throw new Error('Overlap must be between 0 and 95');
  }

  const origin = polygonCentroid(polygon);
  const angleRad = (params.direction * Math.PI) / 180;

  const localPolygon = polygon.map((p) => latLngToMeters(p, origin));

  // Поворачиваем полигон так, чтобы проходы стали горизонтальными линиями.
  const rotatedPolygon = localPolygon.map((p) => rotatePoint(p, -angleRad));
  const box = bbox(rotatedPolygon);

  // Упрощённая модель покрытия камеры.
  // При 60 м и overlap 70% шаг получится около 25 м.
  const footprintAcrossM = params.height * 1.4;
  const footprintAlongM = params.height * 1.4;

  const rowSpacing = footprintAcrossM * (1 - params.overlap / 100);
  const photoSpacing = footprintAlongM * (1 - params.overlap / 100);

  const rows: Point[][] = [];

  for (let y = box.minY; y <= box.maxY; y += rowSpacing) {
    const intersections: number[] = [];

    for (let i = 0; i < rotatedPolygon.length; i++) {
      const a = rotatedPolygon[i];
      const b = rotatedPolygon[(i + 1) % rotatedPolygon.length];

      const x = segmentHorizontalIntersection(a, b, y);

      if (x !== null && Number.isFinite(x)) {
        intersections.push(x);
      }
    }

    intersections.sort((a, b) => a - b);

    const rowSegments: Point[][] = [];

    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const x1 = intersections[i];
      const x2 = intersections[i + 1];

      if (Math.abs(x2 - x1) < 0.5) {
        continue;
      }

      const start: Point = { x: x1, y };
      const end: Point = { x: x2, y };

      const points = pointsAlongSegment(start, end, photoSpacing);

      if (points.length > 0) {
        rowSegments.push(points);
      }
    }

    if (rowSegments.length === 0) {
      continue;
    }

    // Для обычного полигона это будет один сегмент на строку.
    // Для вогнутого полигона может быть несколько сегментов.
    const rowPoints = rowSegments.flat();

    rows.push(rowPoints);
  }

  const route: Point[] = [];

  rows.forEach((rowPoints, rowIndex) => {
    if (rowIndex % 2 === 0) {
      route.push(...rowPoints);
    } else {
      route.push(...[...rowPoints].reverse());
    }
  });

  return route.map((p, index) => {
    const unrotated = rotatePoint(p, angleRad);
    const latLng = metersToLatLng(unrotated, origin);

    return {
      id: generateId('polygrid', index),
      lat: latLng.lat,
      lng: latLng.lng,
      height: params.height,
      speed: params.speed,
      waitTime: 0,
      cameraAction: 'photo',
      gimbalPitch: -90,
    };
  });
}

export function estimatePolygonGridStats(
  polygon: LatLng[],
  params: PolygonGridParams,
) {
  const waypoints = generatePolygonGridWaypoints(polygon, params);

  let distanceM = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1];
    const b = waypoints[i];

    const origin = { lat: a.lat, lng: a.lng };
    const p = latLngToMeters({ lat: b.lat, lng: b.lng }, origin);

    distanceM += Math.sqrt(p.x * p.x + p.y * p.y);
  }

  const timeMin = params.speed > 0 ? distanceM / (params.speed * 60) : 0;

  return {
    waypointCount: waypoints.length,
    distanceM: Math.round(distanceM),
    timeMin: timeMin.toFixed(1),
  };
}