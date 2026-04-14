// GEOCODING PROVIDER: Nominatim (OpenStreetMap)
// Pro komerční provoz vyměnit za:
//   - Mapy.cz API: https://api.mapy.cz (nejlepší pro ČR)
//   - Mapbox: https://docs.mapbox.com/api/search/geocoding/
// Stačí upravit funkci searchAddress() níže.

/** Result returned by the geocoding provider */
export interface GeocodingResult {
  /** Short display name — typically street + city */
  name: string;
  /** Full address string for the detail line */
  displayName: string;
  lat: number;
  lng: number;
  /** Nominatim place_id — used as a stable React list key */
  placeId?: number;
}

/** Raw shape of a single Nominatim JSON result */
interface NominatimResult {
  place_id?: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

/**
 * Search for addresses matching the given query string.
 * Currently powered by Nominatim (OpenStreetMap) — free, no API key required.
 * For commercial use, swap this function for Mapy.cz or Mapbox (see file header).
 *
 * @param query - Address or place name to search for
 * @returns Up to 5 matching results, filtered to Czech Republic
 */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    countrycodes: 'cz',  // Restrict results to Czech Republic
    limit: '5',
  });

  let response: Response;
  try {
    response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        signal,
        headers: {
          // Nominatim requires a valid User-Agent identifying the application
          'User-Agent': 'DJI-Waypoint-Planner/1.0',
        },
      }
    );
  } catch (err) {
    // AbortError is expected when a newer search cancels this one — rethrow as-is
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new Error('Nepodařilo se připojit k geocoding API. Zkontroluj internetové připojení.');
  }

  if (!response.ok) {
    throw new Error(`Geocoding API vrátila chybu ${response.status}. Zkus to znovu.`);
  }

  let data: NominatimResult[];
  try {
    data = await response.json();
  } catch {
    throw new Error('Geocoding API vrátila neplatná data.');
  }

  return data.map((item) => {
    // Build a short name from address components when available
    const addr = item.address;
    let name = '';
    if (addr) {
      const street = addr.road
        ? `${addr.road}${addr.house_number ? ' ' + addr.house_number : ''}`
        : '';
      const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? '';
      name = [street, city].filter(Boolean).join(', ');
    }
    // Fall back to the first part of the full display name
    if (!name) {
      name = item.display_name.split(',').slice(0, 2).join(',').trim();
    }

    return {
      name,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      placeId: item.place_id,
    };
  });
}
