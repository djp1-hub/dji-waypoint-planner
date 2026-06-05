// One-time script to fetch Czech roads and save as LineString GeoJSON.
//
// Usage:  node scripts/fetch-roads.js
// Output: public/data/roads-cz.json
//
// Two-track approach:
//
//   Track A — individual ways (highway=motorway, highway=trunk):
//     Czech D-roads and R/S-roads do not have usable route relations in OSM.
//     Individual way segments are fetched and stitched by endpoint proximity.
//
//   Track B — route relations (cz:national only):
//     OSM route=road relations give numbered state roads (I. třída) as
//     pre-assembled ordered sequences. ~57 national roads.
//
// Buffer zones per LKR310 (included in this file):
//   MOTORWAY  highway=motorway     50 m, WARNING  (dálnice D*)
//   TRUNK     highway=trunk        50 m, WARNING  (rychlostní silnice R*/S*)
//   PRIMARY   cz:national routes   50 m, WARNING  (silnice I. třídy I/*)
//
// NOT INCLUDED — too large for web delivery (5 804+ features, 15 MB):
//   SECONDARY cz:regional routes  15 m  (silnice II. třídy II/*)
//   Users should check II. třída roads manually per LKR310.
//
// CZ is split into North/South halves to stay within Overpass timeout.

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
        'User-Agent':     'DJI-Waypoint-Planner/1.0 (fetch-roads script)',
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
 * Simplify a LineString — drop intermediate points closer than tol degrees.
 * NOTE: tol must be ≤ bufferDeg to avoid missing collisions at road curves.
 * We use tol = 0.0004° (~44 m) which is safely below the 50 m buffer.
 */
function simplifyLine(coords, tol = 0.0004) {
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

/** Round coordinate pair to 5 decimal places (~1 m precision). */
function roundCoords(coords) {
  return coords.map(([lng, lat]) => [
    Math.round(lng * 100000) / 100000,
    Math.round(lat * 100000) / 100000,
  ]);
}

// ── Route relation stitching ──────────────────────────────────────────────────
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
    if (!connected) break;
  }

  return result.length >= 2 ? result : null;
}

// ── Way chain-building for motorway/trunk ─────────────────────────────────────
/**
 * Greedy chain-building: joins OSM ways that share endpoints.
 * Handles both head and tail extension.
 */
function buildChains(ways) {
  const chains = [];

  for (const way of ways) {
    const seg = (way.geometry || []).map((n) => [n.lon, n.lat]);
    if (seg.length < 2) continue;

    let attached = false;
    for (const chain of chains) {
      const head = chain.coords[0];
      const tail = chain.coords[chain.coords.length - 1];

      if (pointsEqual(tail, seg[0])) {
        chain.coords.push(...seg.slice(1));
        attached = true; break;
      }
      if (pointsEqual(tail, seg[seg.length - 1])) {
        chain.coords.push(...[...seg].reverse().slice(1));
        attached = true; break;
      }
      if (pointsEqual(head, seg[seg.length - 1])) {
        chain.coords.unshift(...seg.slice(0, -1));
        attached = true; break;
      }
      if (pointsEqual(head, seg[0])) {
        chain.coords.unshift(...[...seg].reverse().slice(0, -1));
        attached = true; break;
      }
    }
    if (!attached) chains.push({ coords: [...seg] });
  }

  return chains.map((c) => c.coords).filter((c) => c.length >= 2);
}

// ── Restriction text ──────────────────────────────────────────────────────────
function restrictionText(roadClass) {
  if (roadClass === 'MOTORWAY' || roadClass === 'TRUNK') {
    return 'Ochranné pásmo dálnice/rychlostní silnice – zákaz létání do 50 m od osy krajního pruhu a do výšky 50 m (LKR310). Kontaktujte ŘSD: rsd.cz';
  }
  if (roadClass === 'PRIMARY') {
    return 'Ochranné pásmo silnice I. třídy – zákaz létání do 50 m od osy, výška do 50 m (LKR310). Kontaktujte ŘSD: rsd.cz';
  }
  return 'Ochranné pásmo silnice II. třídy – zákaz létání do 15 m od osy (LKR310). Kontaktujte správu silnic kraje.';
}

// ── Track A: Fetch individual motorway + trunk ways ───────────────────────────
async function fetchHighwayWays(bbox, seenWays, waysByClass, label) {
  const query = `[out:json][timeout:180][bbox:${bbox}];
(
  way["highway"="motorway"](${bbox});
  way["highway"="trunk"](${bbox});
);
out body geom;`;

  try {
    const r = await overpassPostWithFallback(query);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const data = JSON.parse(r.body);
    const ways = (data.elements || []).filter((e) => e.type === 'way');

    let added = 0;
    for (const way of ways) {
      if (seenWays.has(way.id)) continue;
      seenWays.add(way.id);
      const hw        = way.tags?.highway;
      const roadClass = hw === 'motorway' ? 'MOTORWAY' : 'TRUNK';
      if (!waysByClass[roadClass]) waysByClass[roadClass] = [];
      waysByClass[roadClass].push(way);
      added++;
    }
    console.log(`  ${label}: +${added} motorway/trunk ways`);
  } catch (e) {
    console.error(`  ${label} highway ways failed: ${e.message}`);
  }
}

// ── Track B: Fetch cz:national route relations (silnice I. třídy) ─────────────
async function fetchNationalRelations(bbox, seenRels, features, label) {
  const query = `[out:json][timeout:180][bbox:${bbox}];
(
  relation["type"="route"]["route"="road"]["network"="cz:national"];
);
out body geom;`;

  try {
    const r = await overpassPostWithFallback(query);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const data      = JSON.parse(r.body);
    const relations = (data.elements || []).filter((e) => e.type === 'relation');
    console.log(`  ${label}: ${relations.length} national relations`);

    let added = 0;
    for (const rel of relations) {
      if (seenRels.has(rel.id)) continue;
      seenRels.add(rel.id);

      const wayMembers = (rel.members || []).filter((m) => m.type === 'way');
      const coords     = stitchWaysToLine(wayMembers);
      if (!coords || coords.length < 2) continue;

      // Collision-safe simplification: tol = 0.0004° ≈ 44 m < 50 m buffer
      const simplified = simplifyLine(coords, 0.0004);
      if (simplified.length < 2) continue;

      const tags = rel.tags || {};
      const ref  = tags.ref || '';
      const name = tags.name || ref || 'Silnice I. třídy';

      features.push({
        type: 'Feature',
        properties: {
          roadClass:   'PRIMARY',
          bufferM:     50,
          ref,
          name,
          restriction: restrictionText('PRIMARY'),
        },
        geometry: { type: 'LineString', coordinates: roundCoords(simplified) },
      });
      added++;
    }
    console.log(`  ${label}: +${added} national features`);
  } catch (e) {
    console.error(`  ${label} national relations failed: ${e.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const features    = [];
  const seenWays    = new Set();
  const seenRels    = new Set();
  const waysByClass = {};

  console.log('Fetching selected-country roads in 2 halves...\n');

  for (let i = 0; i < COUNTRY.halves.length; i++) {
    if (i > 0) {
      console.log('\nWaiting 20 s before next half (Overpass rate limit)...');
      await new Promise((r) => setTimeout(r, 20000));
    }
    const { bbox, label } = COUNTRY.halves[i];
    console.log(`Half ${label}:`);
    await fetchHighwayWays(bbox, seenWays, waysByClass, label);

    console.log(`  Waiting 10 s before national relations...`);
    await new Promise((r) => setTimeout(r, 10000));
    await fetchNationalRelations(bbox, seenRels, features, label);
  }

  // Build chains from motorway + trunk ways
  const HIGHWAY_CONFIG = {
    MOTORWAY: { bufferM: 50, name: 'Dálnice' },
    TRUNK:    { bufferM: 50, name: 'Rychlostní silnice' },
  };

  for (const [roadClass, ways] of Object.entries(waysByClass)) {
    console.log(`\nBuilding chains for ${roadClass} (${ways.length} ways)...`);
    const chains = buildChains(ways);
    console.log(`  → ${chains.length} chains`);

    const { bufferM, name } = HIGHWAY_CONFIG[roadClass];
    for (const coords of chains) {
      // Use collision-safe simplification: tol = 0.0004° ≈ 44 m < 50 m buffer
      const simplified = simplifyLine(coords, 0.0004);
      if (simplified.length < 2) continue;
      features.push({
        type: 'Feature',
        properties: { roadClass, bufferM, ref: '', name, restriction: restrictionText(roadClass) },
        geometry: { type: 'LineString', coordinates: roundCoords(simplified) },
      });
    }
  }

  // Summary
  const counts = {};
  for (const f of features) {
    const c = f.properties.roadClass;
    counts[c] = (counts[c] || 0) + 1;
  }
  console.log('\nSummary by road class:');
  for (const [cls, n] of Object.entries(counts)) console.log(`  ${cls}: ${n}`);
  console.log(`Total: ${features.length}`);

  if (features.length === 0) {
    console.error('No features collected. The Overpass servers may be down. Try again later.');
    process.exit(1);
  }

  const collection = { type: 'FeatureCollection', features };
  const outDir  = path.join(__dirname, '..', 'public', 'data');
  const outFile = path.join(outDir, `roads-${COUNTRY.code}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(collection), 'utf-8');

  const sizeKb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`\nSaved to: ${outFile} (${sizeKb} KB)`);
  console.log('Done.');
})();
