// One-time script to fetch protected areas via OpenStreetMap Overpass API
// and save them as static GeoJSON.
//
// Usage:
//   node scripts/fetch-protected-areas.js cz
//   node scripts/fetch-protected-areas.js rs
//
// Output:
//   public/data/protected-areas-cz.json
//   public/data/protected-areas-rs.json

const https = require('https');
const fs = require('fs');
const path = require('path');

const { getCountry } = require('./countries');
const COUNTRY = getCountry();

// ── HTTP POST helper ──────────────────────────────────────────────────────────

function overpassPost(query, hostname = 'overpass-api.de') {
  return new Promise((resolve, reject) => {
    const body = 'data=' + encodeURIComponent(query);

    const opts = {
      hostname,
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': `DJI-Waypoint-Planner/1.0 (fetch-protected-areas ${COUNTRY.code})`,
      },
    };

    const req = https.request(opts, (res) => {
      let raw = '';

      res.on('data', (chunk) => {
        raw += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: raw,
        });
      });
    });

    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Overpass timeout'));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function overpassPostWithFallback(query) {
  for (const host of ['overpass-api.de', 'overpass.kumi.systems']) {
    try {
      const response = await overpassPost(query, host);

      if (response.status === 200 && response.body.trimStart().startsWith('{')) {
        return response;
      }

      console.log(`  [${host}] status ${response.status} — trying next mirror...`);
    } catch (error) {
      console.log(`  [${host}] error: ${error.message} — trying next mirror...`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error('All Overpass mirrors failed');
}

// ── Polygon stitching from OSM member ways ────────────────────────────────────

function pointsEqual(a, b, eps = 1e-5) {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}

function stitchWays(ways) {
  const segments = ways
    .map((way) => (way.geometry || []).map((node) => [node.lon, node.lat]))
    .filter((segment) => segment.length >= 2);

  if (segments.length === 0) {
    return null;
  }

  const result = [...segments[0]];
  const remaining = segments.slice(1);

  while (remaining.length > 0) {
    const tail = result[result.length - 1];
    let connected = false;

    for (let i = 0; i < remaining.length; i++) {
      const segment = remaining[i];

      if (pointsEqual(tail, segment[0])) {
        result.push(...segment.slice(1));
        remaining.splice(i, 1);
        connected = true;
        break;
      }

      if (pointsEqual(tail, segment[segment.length - 1])) {
        result.push(...[...segment].reverse().slice(1));
        remaining.splice(i, 1);
        connected = true;
        break;
      }
    }

    if (!connected) {
      console.warn(`  [stitchWays] ${remaining.length} segment(s) could not be connected — dropped`);
      break;
    }
  }

  if (!pointsEqual(result[0], result[result.length - 1])) {
    result.push(result[0]);
  }

  return result.length >= 4 ? result : null;
}

function simplifyRing(ring, tolerance = 0.001) {
  if (ring.length < 4) {
    return ring;
  }

  const out = [ring[0]];

  for (let i = 1; i < ring.length - 1; i++) {
    const prev = out[out.length - 1];
    const dx = ring[i][0] - prev[0];
    const dy = ring[i][1] - prev[1];

    if (Math.sqrt(dx * dx + dy * dy) >= tolerance) {
      out.push(ring[i]);
    }
  }

  out.push(ring[ring.length - 1]);
  return out;
}

// ── Country-specific classification ──────────────────────────────────────────

function getLocalizedName(tags = {}) {
  return (
    tags.name ||
    tags['name:en'] ||
    tags['name:cs'] ||
    tags['name:sr'] ||
    tags['name:sr-Latn'] ||
    tags['name:sr-Latn-RS'] ||
    'Unknown protected area'
  );
}

function classifyProtectedArea(rel) {
  const tags = rel.tags || {};
  const name = getLocalizedName(tags);
  const lowerName = name.toLowerCase();

  if (COUNTRY.code === 'cz') {
    if (
      tags.boundary === 'national_park' ||
      lowerName.includes('národní park')
    ) {
      return {
        type: 'NP',
        restriction:
          'Zákaz létání drony mimo zastavěná území bez výjimky (§ 29 zákona č. 114/1992 Sb.)',
      };
    }

    if (
      tags.boundary === 'protected_area' &&
      tags.protect_class === '5' &&
      name.toUpperCase().startsWith('CHKO')
    ) {
      return {
        type: 'CHKO',
        restriction:
          'Omezené létání – ověřte podmínky pro konkrétní zónu CHKO. Viz letejtezodpovedne.cz',
      };
    }

    return null;
  }

  if (COUNTRY.code === 'rs') {
    if (tags.boundary === 'national_park') {
      return {
        type: 'NATIONAL_PARK',
        restriction:
          'Protected area. Drone flight conditions must be verified against Serbian local regulations and official sources.',
      };
    }

    if (tags.boundary === 'protected_area') {
      return {
        type: 'PROTECTED_AREA',
        restriction:
          'Protected area. Verify local drone restrictions before flight.',
      };
    }

    return null;
  }

  return null;
}

function osmRelationToFeature(rel) {
  const classification = classifyProtectedArea(rel);

  if (!classification) {
    return null;
  }

  const outerMembers = (rel.members || []).filter(
    (member) => member.type === 'way' && (member.role === 'outer' || member.role === ''),
  );

  const rawRing = stitchWays(outerMembers);

  if (!rawRing) {
    return null;
  }

  const ring = simplifyRing(rawRing);

  return {
    type: 'Feature',
    properties: {
      id: rel.id,
      name: getLocalizedName(rel.tags),
      type: classification.type,
      country: COUNTRY.code,
      restriction: classification.restriction,
      source: 'OpenStreetMap Overpass API',
      osmTags: {
        boundary: rel.tags?.boundary || null,
        protect_class: rel.tags?.protect_class || null,
        leisure: rel.tags?.leisure || null,
      },
    },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

// ── Query builders ───────────────────────────────────────────────────────────

function buildQueries() {
  if (COUNTRY.code === 'cz') {
    return [
      {
        label: 'Czech National Parks',
        query: `[out:json][timeout:120][bbox:${COUNTRY.bbox}];
relation["boundary"="national_park"]["name"~"národní park",i];
out body geom;`,
      },
      {
        label: 'Czech CHKO',
        query: `[out:json][timeout:120][bbox:${COUNTRY.bbox}];
relation["boundary"="protected_area"]["protect_class"="5"]["name"~"^CHKO"];
out body geom;`,
      },
    ];
  }

  if (COUNTRY.code === 'rs') {
    return [
      {
        label: 'Serbian National Parks',
        query: `[out:json][timeout:120][bbox:${COUNTRY.bbox}];
relation["boundary"="national_park"];
out body geom;`,
      },
      {
        label: 'Serbian Protected Areas',
        query: `[out:json][timeout:120][bbox:${COUNTRY.bbox}];
relation["boundary"="protected_area"];
out body geom;`,
      },
    ];
  }

  throw new Error(`No query builder for country: ${COUNTRY.code}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const features = [];
  const seen = new Set();
  const queries = buildQueries();

  console.log(`Fetching protected areas for: ${COUNTRY.label} (${COUNTRY.code})`);
  console.log(`Using bbox: ${COUNTRY.bbox}`);

  for (let i = 0; i < queries.length; i++) {
    const item = queries[i];

    if (i > 0) {
      console.log('\nWaiting 15 s before next query (Overpass rate limit)...');
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }

    console.log(`\nFetching ${item.label}...`);

    try {
      const response = await overpassPostWithFallback(item.query);

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.body.substring(0, 200)}`);
      }

      const data = JSON.parse(response.body);
      const relations = (data.elements || []).filter((element) => element.type === 'relation');

      console.log(`  Found ${relations.length} relations`);

      for (const rel of relations) {
        if (seen.has(rel.id)) {
          continue;
        }

        const feature = osmRelationToFeature(rel);

        if (!feature) {
          const name = getLocalizedName(rel.tags);
          console.log(`  - skipped: ${name}`);
          continue;
        }

        seen.add(rel.id);
        features.push(feature);

        console.log(`  ✓ ${feature.properties.type}: ${feature.properties.name}`);
      }
    } catch (error) {
      console.error(`${item.label} query failed:`, error.message);
    }
  }

  if (features.length === 0) {
    console.error('\nNo features collected.');
    process.exit(1);
  }

  const counts = features.reduce((acc, feature) => {
    const type = feature.properties.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  console.log('\nTotal:');
  for (const [type, count] of Object.entries(counts)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log(`  all: ${features.length}`);

  const collection = {
    type: 'FeatureCollection',
    metadata: {
      country: COUNTRY.code,
      countryLabel: COUNTRY.label,
      bbox: COUNTRY.bbox,
      source: 'OpenStreetMap Overpass API',
      generatedAt: new Date().toISOString(),
    },
    features,
  };

  const outDir = path.join(__dirname, '..', 'public', 'data');
  const outFile = path.join(outDir, `protected-areas-${COUNTRY.code}.json`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(collection), 'utf-8');

  const sizeKb = Math.round(fs.statSync(outFile).size / 1024);

  console.log(`\nSaved to: ${outFile} (${sizeKb} KB)`);
  console.log('Done.');
})();