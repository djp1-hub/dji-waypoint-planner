// Terrain Following — abstraction layer for elevation data
// Current implementation: Open-Meteo Elevation API (free, no API key, ~90m SRTM resolution)
// For higher precision or offline use, consider Mapbox Terrain API or local SRTM tiles.

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/elevation';
const BATCH_SIZE = 100; // Open-Meteo accepts max 100 points per request

/**
 * Fetches terrain elevation (metres above sea level) for each given point.
 * Automatically batches requests when more than 100 points are provided.
 *
 * @param points - Array of {lat, lng} coordinates
 * @returns Array of elevation values in metres, one per input point
 * @throws Error with a human-readable message if the API call fails
 */
export async function fetchElevations(
  points: { lat: number; lng: number }[],
): Promise<number[]> {
  if (points.length === 0) return [];

  // Split into batches of BATCH_SIZE
  const batches: { lat: number; lng: number }[][] = [];
  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    batches.push(points.slice(i, i + BATCH_SIZE));
  }

  // Fetch each batch sequentially to avoid hammering the API
  const results: number[] = [];
  for (const batch of batches) {
    const lats = batch.map((p) => p.lat).join(',');
    const lngs = batch.map((p) => p.lng).join(',');
    const url = `${OPEN_METEO_URL}?latitude=${encodeURIComponent(lats)}&longitude=${encodeURIComponent(lngs)}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error('Nepodařilo se připojit k elevation API. Zkontroluj internetové připojení.');
    }

    if (!response.ok) {
      throw new Error(`Elevation API vrátila chybu ${response.status}. Zkus to znovu.`);
    }

    let data: { elevation?: number[] };
    try {
      data = await response.json();
    } catch {
      throw new Error('Elevation API vrátila neplatná data.');
    }

    if (!Array.isArray(data.elevation) || data.elevation.length !== batch.length) {
      throw new Error('Elevation API vrátila neočekávaný počet hodnot.');
    }

    results.push(...data.elevation);
  }

  return results;
}
