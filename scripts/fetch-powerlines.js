// One-time script to fetch Czech high-voltage power lines and substations from OSM.
// Saves LineString GeoJSON for power lines + Polygon GeoJSON for substations.
//
// Usage:  node scripts/fetch-powerlines.js
// Output: public/data/powerlines-cz.json
//
// Only lines with voltage >= 35 000 V (35 kV) are included — lower voltage
// distribution lines are too numerous and have a small buffer (7 m) that is
// not relevant for drone flight planning.
//
// Voltage classes and buffer distances:
//   EHV   > 400 kV  → 30 m  (extra-high voltage)
//   HV400   220–400 kV  → 20 m
//   HV220   110–220 kV  → 15 m
//   HV110    35–110 kV  → 12 m
//
// Substations (power=substation) are included as Polygon features with a 20 m buffer.
// All geometries stored as LineString (lines) or Polygon (substations) — runtime
// collision detection handles the distance check in lib/collisionDetection.ts.
//
// CZ is split into 4 quadrants to avoid Overpass timeout.

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { getCountry } = require('./countries');
const COUNTRY = getCountry();

const CZ_QUADRANTS = [
  { bbox: '49.8,12.09,51.06,15.475', label: 'NW' },
  { bbox: '49.8,15.475,51.06,18.86', label: 'NE' },
  { bbox: '48.55,12.09,49.8,15.475', label: 'SW' },
  { bbox: '48.55,15.475,49.8,18.86', label: 'SE' },
];

const MIRRORS = ['overpass-api.de', 'overpass.kumi.systems', 'lz4.overpass-api.de'];

// ── Voltage parsing ───────────────────────────────────────────────────────────
/**
 * Returns the highest voltage value (in V) from an OSM voltage tag.
 * The tag can contain multiple values separated by semicolons (e.g. "400000;220000").
 * Returns null if no valid number is found.
 */
function parseMaxVoltage(voltageStr) {
  if (!voltageStr) return null;
  const vals = String(voltageStr)
    .split(';')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
  return vals.length > 0 ? Math.max(...vals) : null;
}

/**
 * Returns voltage class config for a given max voltage in V.
 * Returns null for lines below 35 kV — these are excluded.
 */
function voltageClass(maxV) {
  if (maxV === null) return null;
  if (maxV > 400000) return { class: 'EHV',   bufferM: 30 };
  if (maxV >= 220000) return { class: 'HV400', bufferM: 20 };
  if (maxV >= 110000) return { class: 'HV220', bufferM: 15 };
  if (maxV >= 35000)  return { class: 'HV110', bufferM: 12 };
  return null; // below 35 kV — skip
}

// ── HTTP POST helper ──────────────────────────────────────────────────────────
function overpassPost(query, hostname) {
  return new Promise((resolve, reject) => {
    const body = 'data=' + encodeURIComponent(query);
    const opts = {
      hostname,
      path:   '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent':     'DJI-Waypoint-Planner/1.0 (fetch-powerlines script)',
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('Overpass timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function overpassPostWithFallback(query) {
  for (const host of MIRRORS) {
    try {
      const r = await overpassPost(query, host);
      if (r.status === 200 && r.body.trimStart().startsWith('{')) {
        return r;
      }
      console.log(`  [${host}] status ${r.status} — trying next mirror...`);
    } catch (e) {
      console.log(`  [${host}] error: ${e.message} — trying next mirror...`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('All Overpass mirrors failed');
}

// ── Geometry helpers ──────────────────────────────────────────────────────────
function pointsEqual(a, b, eps = 1e-5) {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}

/** Simplify a LineString — drop intermediate points closer than tol degrees. */
function simplifyLine(coords, tol = 0.001) {
  if (coords.length < 2) return coords;
  const out = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    const prev = out[out.length - 1];
    const dx = coords[i][0] - prev[0];
    const dy = coords[i][1] - prev[1];
    if (Math.sqrt(dx * dx + dy * dy) >= tol) out.push(coords[i]);
  }
  out.push(coords[coords.length - 1]);
  return out;
}

/**
 * Greedy way-stitching: joins consecutive way segments that share an endpoint.
 * Handles reversed segments. Returns a single open LineString or null.
 * Same algorithm as fetch-railways.js stitchWaysToLine().
 */
function stitchWaysToLine(ways) {
  const segments = ways
    .map((w) => (w.geometry || []).map((n) => [n.lon, n.lat]))
    .filter((s) => s.length >= 2);
  if (segments.length === 0) return null;

  const result    = [...segments[0]];
  const remaining = segments.slice(1);

  while (remaining.length > 0) {
    const tail = result[result.length - 1];
    let connected = false;
    for (let i = 0; i < remaining.length; i++) {
      const seg = remaining[i];
      if (pointsEqual(tail, seg[0])) {
        result.push(...seg.slice(1));
        remaining.splice(i, 1);
        connected = true;
        break;
      }
      if (pointsEqual(tail, seg[seg.length - 1])) {
        result.push(...[...seg].reverse().slice(1));
        remaining.splice(i, 1);
        connected = true;
        break;
      }
    }
    if (!connected) {
      if (remaining.length > 0) {
        console.warn(`  [stitchWaysToLine] ${remaining.length} segment(s) could not be connected — dropped`);
      }
      break;
    }
  }

  return result.length >= 2 ? result : null;
}

/**
 * Groups power line ways by voltage class, then stitches each group into
 * longer LineStrings. Returns an array of GeoJSON Feature objects.
 */
function mergeLineWays(lineWays) {
  // Build a map: voltageClassKey → { config, ways[] }
  const groups = new Map();

  for (const way of lineWays) {
    const maxV   = parseMaxVoltage(way.tags?.voltage);
    const config = voltageClass(maxV);
    if (!config) continue; // below 35 kV — skip

    const key = config.class;
    if (!groups.has(key)) {
      groups.set(key, { config, ways: [] });
    }
    groups.get(key).ways.push(way);
  }

  const features = [];

  for (const [, { config, ways }] of groups) {
    // Further sub-group by connected chains using greedy stitching.
    // Process ways one at a time — if it can connect to an existing open chain, extend it.
    // Otherwise start a new chain.
    const chains = []; // each chain: { coords: [number,number][], wayCount: number }

    for (const way of ways) {
      const seg = (way.geometry || []).map((n) => [n.lon, n.lat]);
      if (seg.length < 2) continue;

      // Try to attach to an existing chain (head or tail)
      let attached = false;
      for (const chain of chains) {
        const head = chain.coords[0];
        const tail = chain.coords[chain.coords.length - 1];

        if (pointsEqual(tail, seg[0])) {
          chain.coords.push(...seg.slice(1));
          chain.wayCount++;
          attached = true;
          break;
        }
        if (pointsEqual(tail, seg[seg.length - 1])) {
          chain.coords.push(...[...seg].reverse().slice(1));
          chain.wayCount++;
          attached = true;
          break;
        }
        if (pointsEqual(head, seg[seg.length - 1])) {
          chain.coords.unshift(...seg.slice(0, -1));
          chain.wayCount++;
          attached = true;
          break;
        }
        if (pointsEqual(head, seg[0])) {
          chain.coords.unshift(...[...seg].reverse().slice(0, -1));
          chain.wayCount++;
          attached = true;
          break;
        }
      }

      if (!attached) {
        chains.push({ coords: [...seg], wayCount: 1 });
      }
    }

    // Build GeoJSON features from chains
    for (const chain of chains) {
      const simplified = simplifyLine(chain.coords, 0.001);
      if (simplified.length < 2) continue;
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'line',
          voltageClass: config.class,
          bufferM:      config.bufferM,
          restriction:  restrictionText(config.class),
        },
        geometry: { type: 'LineString', coordinates: simplified },
      });
    }
  }

  return features;
}

/**
 * Converts an OSM substation way or relation to a GeoJSON Polygon feature.
 * Returns null if geometry is not a valid polygon (need >= 3 points, first=last).
 */
function osmSubstationToPolygon(element) {
  // Only include substations with voltage >= 35 kV (high-voltage substations).
  // Low-voltage distribution boxes are too numerous and not flight-relevant.
  const tags = element.tags || {};
  const maxV = parseMaxVoltage(tags.voltage);
  if (maxV === null || maxV < 35000) return null;

  let ring = null;

  if (element.type === 'way') {
    const pts = (element.geometry || []).map((n) => [n.lon, n.lat]);
    if (pts.length >= 4 && pointsEqual(pts[0], pts[pts.length - 1])) {
      ring = pts;
    }
  } else if (element.type === 'relation') {
    // Use the outer member way for geometry
    const outerMember = (element.members || []).find(
      (m) => m.type === 'way' && m.role === 'outer',
    );
    if (outerMember) {
      const pts = (outerMember.geometry || []).map((n) => [n.lon, n.lat]);
      if (pts.length >= 4 && pointsEqual(pts[0], pts[pts.length - 1])) {
        ring = pts;
      }
    }
  }

  if (!ring) return null;

  const name = tags.name || tags['name:cs'] || 'Trafostanice';

  return {
    type: 'Feature',
    properties: {
      featureType: 'substation',
      voltageClass: 'SUBSTATION',
      bufferM:      20,
      name,
      restriction: 'Elektrická trafostanice – nebezpečné elektromagnetické záření. Dodržte bezpečnou vzdálenost.',
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

// ── Restriction text ──────────────────────────────────────────────────────────
function restrictionText(cls) {
  switch (cls) {
    case 'EHV':   return 'Velmi vysoké napětí >400 kV – ochranné pásmo 30 m (zákon 458/2000 Sb.). Kategorie nebezpečí: VAROVÁNÍ.';
    case 'HV400': return 'Vysoké napětí 220–400 kV – ochranné pásmo 20 m (zákon 458/2000 Sb.).';
    case 'HV220': return 'Vysoké napětí 110–220 kV – ochranné pásmo 15 m (zákon 458/2000 Sb.).';
    case 'HV110': return 'Vysoké napětí 35–110 kV – ochranné pásmo 12 m (zákon 458/2000 Sb.).';
    default:      return 'Elektrické vedení – dodržte bezpečnou vzdálenost.';
  }
}

// ── Fetch one quadrant ────────────────────────────────────────────────────────
async function fetchQuadrant(bbox, seen, lineWays, substationElements, label) {
  const query = `[out:json][timeout:180][bbox:${bbox}];
(
  way["power"="line"]["voltage"](${bbox});
  way["power"="substation"]["voltage"](${bbox});
  relation["power"="substation"]["voltage"](${bbox});
);
out body geom;`;

  try {
    const r = await overpassPostWithFallback(query);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const data     = JSON.parse(r.body);
    const elements = data.elements || [];

    let linesAdded = 0;
    let substAdded = 0;

    for (const el of elements) {
      if (seen.has(`${el.type}-${el.id}`)) continue;
      seen.add(`${el.type}-${el.id}`);

      if (el.type === 'way' && el.tags?.power === 'line') {
        // Filter: only include if voltage class is valid (>= 35 kV)
        const maxV = parseMaxVoltage(el.tags?.voltage);
        if (voltageClass(maxV) !== null) {
          lineWays.push(el);
          linesAdded++;
        }
      } else if (
        (el.type === 'way' || el.type === 'relation') &&
        el.tags?.power === 'substation'
      ) {
        substationElements.push(el);
        substAdded++;
      }
    }

    console.log(`  ${label}: +${linesAdded} line ways, +${substAdded} substation elements`);
  } catch (e) {
    console.error(`  ${label} failed: ${e.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const lineWays            = [];
  const substationElements  = [];
  const seen                = new Set();

  console.log('Fetching selected-country power lines and substations in 4 quadrants...\n');

  for (let i = 0; i < COUNTRY.quadrants.length; i++) {
    if (i > 0) {
      console.log('\nWaiting 15 s before next quadrant (Overpass rate limit)...');
      await new Promise((r) => setTimeout(r, 15000));
    }
    console.log(`Quadrant ${COUNTRY.quadrants[i].label}:`);
    await fetchQuadrant(COUNTRY.quadrants[i].bbox, seen, lineWays, substationElements, COUNTRY.quadrants[i].label);
  }

  console.log(`\nTotal raw: ${lineWays.length} line ways, ${substationElements.length} substation elements`);

  // Merge power line ways into longer LineStrings grouped by voltage class
  console.log('Merging line ways by voltage class...');
  const lineFeatures = mergeLineWays(lineWays);

  // Convert substation elements to Polygon features
  console.log('Converting substation elements to polygons...');
  const substFeatures = substationElements
    .map(osmSubstationToPolygon)
    .filter(Boolean);

  const features = [...lineFeatures, ...substFeatures];

  // Summary by voltage class
  const counts = {};
  for (const f of lineFeatures) {
    const c = f.properties.voltageClass;
    counts[c] = (counts[c] || 0) + 1;
  }
  console.log('\nLine features by voltage class:');
  for (const [cls, n] of Object.entries(counts)) {
    console.log(`  ${cls}: ${n}`);
  }
  console.log(`Substation polygons: ${substFeatures.length}`);
  console.log(`Total features: ${features.length}`);

  if (features.length === 0) {
    console.error('No features collected. The Overpass servers may be down. Try again later.');
    process.exit(1);
  }

  const collection = { type: 'FeatureCollection', features };
  const outDir  = path.join(__dirname, '..', 'public', 'data');
  const outFile = path.join(outDir, `powerlines-${COUNTRY.code}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(collection), 'utf-8');

  const sizeKb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`\nSaved to: ${outFile} (${sizeKb} KB)`);
  console.log('Done.');
})();
