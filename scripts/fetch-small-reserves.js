// One-time script to fetch Czech small nature reserves from OSM Overpass API
// and save as static GeoJSON.
//
// Usage:  node scripts/fetch-small-reserves.js
// Output: public/data/small-reserves-cz.json
//
// Categories:
//   NPR — Národní přírodní rezervace (~115 in CZ)
//   NPP — Národní přírodní památka   (~120 in CZ)
//   PR  — Přírodní rezervace          (~800 in CZ)
//   PP  — Přírodní památka            (~1200 in CZ)
//
// NOTE: PR and PP have many features so queries are split into 4 bbox quadrants
//       to avoid Overpass server timeouts.

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { getCountry } = require('./countries');
const COUNTRY = getCountry();

// CZ split into 4 quadrants to reduce query load
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
        'User-Agent': 'DJI-Waypoint-Planner/1.0 (fetch-small-reserves script)',
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

// ── Polygon stitching ─────────────────────────────────────────────────────────
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

function simplifyRing(ring, tolerance = 0.001) {
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

// ── Protection title classification ──────────────────────────────────────────
// Returns one of 'NPR'|'NPP'|'PR'|'PP'|null based on protection_title tag.
// Uses JS regex because OSM data has inconsistent casing and parenthetical suffixes.
function classifyTitle(title) {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes('národní přírodní rezervace')) return 'NPR';
  if (t.includes('národní přírodní památka'))   return 'NPP';
  if (t.includes('přírodní rezervace'))         return 'PR';
  if (t.includes('přírodní památka'))           return 'PP';
  return null;
}

function restrictionText(type) {
  switch (type) {
    case 'NPR': return 'Národní přírodní rezervace – přísný zákaz létání. Kontaktujte AOPK ČR: ochranaprirody.cz';
    case 'NPP': return 'Národní přírodní památka – zákaz létání. Kontaktujte AOPK ČR: ochranaprirody.cz';
    case 'PR':  return 'Přírodní rezervace – omezené létání. Ověřte podmínky na ochranaprirody.cz';
    default:    return 'Přírodní památka – ověřte podmínky na ochranaprirody.cz';
  }
}

function osmRelationToFeature(rel) {
  const title   = rel.tags?.protection_title ?? rel.tags?.['protection_title:cs'] ?? '';
  const areaType = classifyTitle(title);
  if (!areaType) return null; // skip unrecognized types (e.g. "Městská památková rezervace")

  const outerMembers = (rel.members || []).filter(
    (m) => m.type === 'way' && (m.role === 'outer' || m.role === ''),
  );
  const rawRing = stitchWays(outerMembers);
  if (!rawRing) return null;
  const ring = simplifyRing(rawRing);

  return {
    type: 'Feature',
    properties: {
      name: rel.tags?.name || rel.tags?.['name:cs'] || 'Neznámé území',
      type: areaType,
      restriction: restrictionText(areaType),
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

// ── Fetch one bbox quadrant ───────────────────────────────────────────────────
async function fetchBbox(bbox, seen, features, quadrantLabel) {
  // Fetch all protected_area relations with a protection_title tag in this bbox
  const query = `[out:json][timeout:180][bbox:${bbox}];
relation["boundary"="protected_area"]["protection_title"];
out body geom;`;

  try {
    const r = await overpassPostWithFallback(query);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const data = JSON.parse(r.body);
    const relations = (data.elements || []).filter((e) => e.type === 'relation');
    console.log(`  ${quadrantLabel}: ${relations.length} relations`);

    let added = 0;
    for (const rel of relations) {
      if (seen.has(rel.id)) continue;
      seen.add(rel.id);
      const feat = osmRelationToFeature(rel);
      if (feat) {
        features.push(feat);
        added++;
      }
    }
    console.log(`  ${quadrantLabel}: +${added} features added`);
  } catch (e) {
    console.error(`  ${quadrantLabel} failed: ${e.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const features = [];
  const seen = new Set();
  const labels = ['NW', 'NE', 'SW', 'SE'];

  console.log('Fetching selected-country small nature reserves (NPR/NPP/PR/PP) in 4 quadrants...');
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

  // ── Summary ─────────────────────────────────────────────────────────────────
  const counts = { NPR: 0, NPP: 0, PR: 0, PP: 0 };
  for (const f of features) counts[f.properties.type]++;

  console.log(`\nSummary: NPR=${counts.NPR}, NPP=${counts.NPP}, PR=${counts.PR}, PP=${counts.PP} — total ${features.length}`);

  if (features.length === 0) {
    console.error('No features collected. The Overpass servers may be down. Try again later.');
    process.exit(1);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const collection = { type: 'FeatureCollection', features };
  const outDir     = path.join(__dirname, '..', 'public', 'data');
  const outFile    = path.join(outDir, `small-reserves-${COUNTRY.code}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(collection), 'utf-8');

  const sizeKb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`\nSaved to: ${outFile} (${sizeKb} KB)`);
  console.log('Done.');
})();
