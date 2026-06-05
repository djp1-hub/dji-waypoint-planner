// One-time script to fetch Czech railway route relations from OSM Overpass API
// and save as LineString GeoJSON.
//
// Usage:  node scripts/fetch-railways.js
// Output: public/data/railways-cz.json
//
// Why route RELATIONS (not individual ways)?
//   Individual ways produce 50 000+ segments = 34 MB file (unacceptable).
//   Railway route relations group entire lines into ~500 features = ~2-3 MB.
//
// OSM route types queried:
//   route=train        — celostátní a regionální tratě (buffer 60 m)
//   route=light_rail   — rychlodráha (buffer 60 m)
//   route=narrow_gauge — úzkorozchodné tratě (buffer 60 m)
//   route=tram         — tramvajové tratě (buffer 30 m)
//
// Output geometry: LineString (not buffer polygon).
// Buffer zone is checked at runtime in collisionDetection.ts via point-to-line distance.
//
// CZ is split into North/South halves to avoid Overpass timeout.

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { getCountry } = require('./countries');
const COUNTRY = getCountry();

const CZ_HALVES = [
  { bbox: '49.8,12.09,51.06,18.86', label: 'North' },
  { bbox: '48.55,12.09,49.8,18.86', label: 'South' },
];

const MIRRORS = ['overpass-api.de', 'overpass.kumi.systems', 'lz4.overpass-api.de'];

// Buffer distances per route type (metres)
const ROUTE_CONFIG = {
  train:         { bufferM: 60, tier: 'main' },
  light_rail:    { bufferM: 60, tier: 'main' },
  narrow_gauge:  { bufferM: 60, tier: 'main' },
  tram:          { bufferM: 30, tier: 'tram' },
};

// ── HTTP POST helper ──────────────────────────────────────────────────────────
function overpassPost(query, hostname) {
  return new Promise((resolve, reject) => {
    const body = 'data=' + encodeURIComponent(query);
    const opts = {
      hostname,
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'DJI-Waypoint-Planner/1.0 (fetch-railways script)',
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

/**
 * Stitches member way geometries into a single open LineString.
 * Handles out-of-order and reversed segments (same as stitchWays for polygons
 * but does NOT close the ring at the end).
 */
function stitchWaysToLine(ways) {
  const segments = ways.map((w) => (w.geometry || []).map((n) => [n.lon, n.lat]));
  const valid = segments.filter((s) => s.length >= 2);
  if (valid.length === 0) return null;

  const result    = [...valid[0]];
  const remaining = valid.slice(1);

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
    if (!connected) break; // remaining segments are disconnected — stop here
  }

  return result.length >= 2 ? result : null;
}

/** Drop intermediate points closer than `tol` degrees to the previous kept point. */
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

// ── Restriction text ──────────────────────────────────────────────────────────
function restrictionText(tier) {
  if (tier === 'main') {
    return 'Ochranné pásmo železnice – zákaz létání do 60 m od osy koleje (LKR311). Kontaktujte Správu železnic: spravazeleznic.cz';
  }
  return 'Ochranné pásmo tramvajové trati – 30 m od osy koleje. Ověřte podmínky u provozovatele.';
}

// ── OSM relation → GeoJSON LineString Feature ─────────────────────────────────
function osmRelationToLineString(rel) {
  const routeType = rel.tags?.route;
  const config    = ROUTE_CONFIG[routeType];
  if (!config) return null;

  // Use only way members (skip node members = platforms, stops)
  const wayMembers = (rel.members || []).filter((m) => m.type === 'way');
  const coords     = stitchWaysToLine(wayMembers);
  if (!coords) return null;

  const simplified = simplifyLine(coords, 0.001);
  if (simplified.length < 2) return null;

  const tags = rel.tags || {};
  const name = tags.name || tags.ref
    ? `${tags.ref ? tags.ref + ' ' : ''}${tags.name || ''}`.trim()
    : 'Železniční trať';

  return {
    type: 'Feature',
    properties: {
      name,
      tier:        config.tier,
      bufferM:     config.bufferM,
      restriction: restrictionText(config.tier),
    },
    geometry: { type: 'LineString', coordinates: simplified },
  };
}

// ── Fetch one half ────────────────────────────────────────────────────────────
async function fetchHalf(bbox, seen, features, label) {
  const query = `[out:json][timeout:180][bbox:${bbox}];
(
  relation["type"="route"]["route"="train"];
  relation["type"="route"]["route"="light_rail"];
  relation["type"="route"]["route"="narrow_gauge"];
  relation["type"="route"]["route"="tram"];
);
out body geom;`;

  try {
    const r = await overpassPostWithFallback(query);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const data      = JSON.parse(r.body);
    const relations = (data.elements || []).filter((e) => e.type === 'relation');
    console.log(`  ${label}: ${relations.length} relations`);

    let added = 0;
    for (const rel of relations) {
      if (seen.has(rel.id)) continue;
      seen.add(rel.id);
      const feat = osmRelationToLineString(rel);
      if (feat) { features.push(feat); added++; }
    }
    console.log(`  ${label}: +${added} features added`);
  } catch (e) {
    console.error(`  ${label} failed: ${e.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const features = [];
  const seen     = new Set();

  console.log('Fetching selected-country railway route relations in 2 halves...\n');

  for (let i = 0; i < COUNTRY.halves.length; i++) {
    if (i > 0) {
      console.log('\nWaiting 20 s before next half (Overpass rate limit)...');
      await new Promise((r) => setTimeout(r, 20000));
    }
    console.log(`Half ${COUNTRY.halves[i].label}:`);
    await fetchHalf(COUNTRY.halves[i].bbox, seen, features, COUNTRY.halves[i].label);
  }

  const main = features.filter((f) => f.properties.tier === 'main').length;
  const tram = features.filter((f) => f.properties.tier === 'tram').length;
  console.log(`\nSummary: main rail=${main}, tram=${tram} — total ${features.length}`);

  if (features.length === 0) {
    console.error('No features collected. The Overpass servers may be down. Try again later.');
    process.exit(1);
  }

  const collection = { type: 'FeatureCollection', features };
  const outDir  = path.join(__dirname, '..', 'public', 'data');
  const outFile = path.join(outDir, `railways-${COUNTRY.code}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(collection), 'utf-8');

  const sizeKb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`\nSaved to: ${outFile} (${sizeKb} KB)`);
  console.log('Done.');
})();
