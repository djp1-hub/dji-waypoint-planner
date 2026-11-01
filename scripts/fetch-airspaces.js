// One-time script to fetch Czech airspace data from OpenAIP REST API
// and save it as a static JSON file bundled with the app.
//
// Usage:  node scripts/fetch-airspaces.js
// Output: public/data/airspaces-cz.json
//
// Re-run whenever you want to refresh the airspace data (changes rarely).
// Node.js is not subject to CORS restrictions, so this works even though
// browser fetches to api.openaip.net fail.

const fs   = require('fs');
const path = require('path');
const { getCountry } = require('./countries');
const COUNTRY = getCountry();
const https = require('https');

// Read runtime settings without printing credentials.
let apiKey = process.env.NEXT_PUBLIC_OPENAIP_API_KEY;
for (const name of ['.env.local', '.env']) {
  if (apiKey) break;
  try {
    const text = fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
    const match = text.match(/^NEXT_PUBLIC_OPENAIP_API_KEY\s*=\s*(.+)$/m);
    if (match) apiKey = match[1].trim().replace(/^['"]|['"]$/g, '');
  } catch {}
}
if (!apiKey) {
  console.error('NEXT_PUBLIC_OPENAIP_API_KEY is required');
  process.exit(1);
}

// ── Build request URL ─────────────────────────────────────────────────────────
// Types: 1=RESTRICTED, 2=DANGER, 3=PROHIBITED, 4=CTR, 8=TRA
// OpenAIP moved from api.openaip.net to api.core.openaip.net
// API key sent only via header — never in the URL (prevents exposure in proxy logs)
const typeParams = [1, 2, 3, 4, 8].map((t) => `type[]=${t}`).join('&');
const url = `https://api.core.openaip.net/api/airspaces?page=1&limit=1000&country=${COUNTRY.openAipCode}&${typeParams}`;

console.log(`Fetching ${COUNTRY.label} airspace data from OpenAIP REST API...`);

// ── Fetch data ────────────────────────────────────────────────────────────────
const req = https.get(url, { headers: { 'x-openaip-api-key': apiKey, 'Accept': 'application/json' } }, (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`OpenAIP returned HTTP ${res.statusCode}:`);

      process.exit(1);
    }

    let parsed;
    try {
      parsed = JSON.parse(rawData);
    } catch (e) {
      console.error('Invalid JSON response');
      process.exit(1);
    }

    const count = parsed.items?.length ?? 0;
    console.log(`Received ${count} airspace zones.`);
    if (parsed.totalCount && parsed.totalCount > 1000) {
      console.error('Incomplete response; keeping existing file');
      process.exit(1);
    }

    // ── Save to public/data/ ────────────────────────────────────────────────
    const outDir  = path.join(__dirname, '..', 'public', 'data');
    const outFile = path.join(outDir, `airspaces-${COUNTRY.code}.json`);
    fs.mkdirSync(outDir, { recursive: true });
    if (!count || !parsed.items.every(item => item.geometry?.coordinates)) {
      console.error('Empty or invalid zones; keeping existing file');
      process.exit(1);
    }
    fs.writeFileSync(outFile + '.tmp', JSON.stringify(parsed, null, 2), 'utf-8');
    fs.renameSync(outFile + '.tmp', outFile);
    console.log(`Saved to: ${outFile}`);
    console.log(`Done. Commit public/data/airspaces-${COUNTRY.code}.json to include it in the build.`);
  });
});

req.setTimeout(120000, () => {
  req.destroy(new Error('Požadavek vypršel po 120 s.'));
});

req.on('error', (err) => {
  console.error('Network error:', err.message);
  process.exit(1);
});
