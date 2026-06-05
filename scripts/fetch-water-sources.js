// One-time script to fetch Czech water reservoirs and drinking water sources from OSM
// Overpass API and save as static GeoJSON.
//
// Usage:  node scripts/fetch-water-sources.js
// Output: public/data/water-sources-cz.json
//
// Tags queried:
//   natural=water + water=reservoir  — designated water reservoirs (přehrady etc.)
//   landuse=reservoir + drinking_water=yes     — confirmed drinking water reservoirs
//   landuse=reservoir + reservoir_type=drinking_water
//
// Excluded: bare landuse=reservoir without qualifier (catches too many fish ponds/rybníky)
//
// Classification (local, post-fetch):
//   tier=drinking — tags: drinking_water=yes or reservoir_type=drinking_water
//   tier=general  — water=reservoir without drinking water tag
//
// NOTE: Czech Republic is split into 4 bbox quadrants to avoid Overpass timeouts.

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { getCountry } = require('./countries');
const COUNTRY = getCountry();

// CZ split into 4 quadrants to reduce per-query load
const CZ_BBOXES = [
  '49.8,12.09,51.06,15.5',   // NW
  '49.8,15.5,51.06,18.86',   // NE
  '48.55,12.09,49.8,15.5',   // SW
  '48.55,15.5,49.8,18.86',   // SE
];

// Overpass mirrors to try in order
const MIRRORS = ['overpass-api.de', 'overpass.kumi.systems', 'lz4.overpass-api.de'];

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
        'User-Agent': 'DJI-Waypoint-Planner/1.0 (fetch-water-sources script)',
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

// ── Polygon stitching (for relations whose boundary is split across multiple ways) ─────
function pointsEqual(a, b, eps = 1e-5) {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}

function stitchWays(ways) {
  const segments = ways.map((w) => (w.geometry || []).map((n) => [n.lon, n.lat]));
  const valid = segments.filter((s) => s.length >= 2);
  if (valid.length === 0) return null;

  const result = [...valid[0]];
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
    if (!connected) {
      console.warn(`    [stitchWays] ${remaining.length} segment(s) could not be connected — dropped`);
      break;
    }
  }

  if (!pointsEqual(result[0], result[result.length - 1])) result.push(result[0]);
  return result.length >= 4 ? result : null;
}

// Reduce point count — tolerance 0.0005° ≈ 50 m, sufficient for visual overlay.
function simplifyRing(ring, tolerance = 0.0005) {
  if (ring.length < 4) return ring;
  const out = [ring[0]];
  for (let i = 1; i < ring.length - 1; i++) {
    const prev = out[out.length - 1];
    const dx = ring[i][0] - prev[0];
    const dy = ring[i][1] - prev[1];
    if (Math.sqrt(dx * dx + dy * dy) >= tolerance) out.push(ring[i]);
  }
  out.push(ring[ring.length - 1]);
  return out;
}

// ── Classification ────────────────────────────────────────────────────────────
function classifyReservoir(tags) {
  if (tags.drinking_water === 'yes' || tags.reservoir_type === 'drinking_water') return 'drinking';
  return 'general';
}

function restrictionText(tier) {
  if (tier === 'drinking') {
    return 'Ochranné pásmo vodního zdroje pitné vody – ověřte podmínky u správce soustavy. Viz vuv.cz';
  }
  return 'Vodní nádrž – ověřte zda jde o zdroj pitné vody. Viz vuv.cz';
}

// ── OSM element → GeoJSON Feature ─────────────────────────────────────────────
// For way elements: geometry is a flat list of {lat, lon} nodes on the way itself.
function osmWayToFeature(way) {
  const ring = (way.geometry || []).map((n) => [n.lon, n.lat]);
  if (ring.length < 3) return null;
  // Ensure closed ring
  if (!pointsEqual(ring[0], ring[ring.length - 1])) ring.push(ring[0]);
  const simplified = simplifyRing(ring);
  if (simplified.length < 4) return null;

  const tags = way.tags || {};
  const tier = classifyReservoir(tags);
  return {
    type: 'Feature',
    properties: {
      name: tags.name || tags['name:cs'] || 'Vodní nádrž',
      tier,
      restriction: restrictionText(tier),
    },
    geometry: { type: 'Polygon', coordinates: [simplified] },
  };
}

// For relation elements: boundary split across member ways — stitch into one ring.
function osmRelationToFeature(rel) {
  const outerMembers = (rel.members || []).filter(
    (m) => m.type === 'way' && (m.role === 'outer' || m.role === ''),
  );
  const rawRing = stitchWays(outerMembers);
  if (!rawRing) return null;
  const ring = simplifyRing(rawRing);
  if (ring.length < 4) return null;

  const tags = rel.tags || {};
  const tier = classifyReservoir(tags);
  return {
    type: 'Feature',
    properties: {
      name: tags.name || tags['name:cs'] || 'Vodní nádrž',
      tier,
      restriction: restrictionText(tier),
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

// ── Fetch one bbox quadrant ───────────────────────────────────────────────────
async function fetchBbox(bbox, seen, features, label) {
  // Only fetch named reservoirs — filters out anonymous fish ponds (rybníky) which
  // represent the vast majority of water=reservoir features in CZ but have no name tag.
  // Drinking water sources are included regardless of name (they may be small intake points).
  const query = `[out:json][timeout:180][bbox:${bbox}];
(
  way["natural"="water"]["water"="reservoir"]["name"];
  relation["natural"="water"]["water"="reservoir"]["name"];
  way["landuse"="reservoir"]["name"];
  relation["landuse"="reservoir"]["name"];
  way["drinking_water"="yes"]["natural"="water"]["name"];
  relation["drinking_water"="yes"]["natural"="water"]["name"];
);
out body geom;`;

  try {
    const r = await overpassPostWithFallback(query);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const data = JSON.parse(r.body);
    const elements = data.elements || [];

    const ways      = elements.filter((e) => e.type === 'way');
    const relations = elements.filter((e) => e.type === 'relation');
    console.log(`  ${label}: ${ways.length} ways + ${relations.length} relations`);

    let added = 0;
    // Prefix IDs with type letter to avoid way/relation ID collisions
    for (const way of ways) {
      if (seen.has(`w${way.id}`)) continue;
      seen.add(`w${way.id}`);
      const feat = osmWayToFeature(way);
      if (feat) { features.push(feat); added++; }
    }
    for (const rel of relations) {
      if (seen.has(`r${rel.id}`)) continue;
      seen.add(`r${rel.id}`);
      const feat = osmRelationToFeature(rel);
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
  const seen = new Set();
  const labels = ['NW', 'NE', 'SW', 'SE'];

  console.log('Fetching selected-country water reservoirs (landuse=reservoir, water=reservoir) in 4 quadrants...');
  console.log('Each quadrant covers 1/4 of selected country to avoid Overpass timeout.\n');

  for (let i = 0; i < COUNTRY.quadrants.length; i++) {
    if (i > 0) {
      console.log('\nWaiting 20 s before next quadrant (Overpass rate limit)...');
      await new Promise((r) => setTimeout(r, 20000));
    }
    console.log(`\nQuadrant ${labels[i]}:`);
    const { bbox, label } = COUNTRY.quadrants[i];
    await fetchBbox(bbox, seen, features, label);
  }

  const drinking = features.filter((f) => f.properties.tier === 'drinking').length;
  const general  = features.filter((f) => f.properties.tier === 'general').length;
  console.log(`\nSummary: drinking=${drinking}, general=${general} — total ${features.length}`);

  if (features.length === 0) {
    console.error('No features collected. The Overpass servers may be down. Try again later.');
    process.exit(1);
  }

  const collection = { type: 'FeatureCollection', features };
  const outDir  = path.join(__dirname, '..', 'public', 'data');
  const outFile = path.join(outDir, `water-sources-${COUNTRY.code}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(collection), 'utf-8');

  const sizeKb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`\nSaved to: ${outFile} (${sizeKb} KB)`);
  console.log('Done.');
})();
