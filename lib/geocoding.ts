// GEOCODING PROVIDER: Mapy.cz API v1 (api.mapy.cz)
// Optimalizováno pro ČR — nejlepší pokrytí českých adres a POI.
// Vyžaduje env proměnnou NEXT_PUBLIC_MAPY_API_KEY (developer.mapy.cz).
//
// Pro přepnutí na jiný provider stačí nahradit funkci searchAddress() níže:
//   - Nominatim (OpenStreetMap): zdarma, ale zakázáno pro komerční provoz
//   - Mapbox: https://docs.mapbox.com/api/search/geocoding/

const MAPY_API_KEY = process.env.NEXT_PUBLIC_MAPY_API_KEY ?? '';

// Bounding box České republiky — preferuje výsledky z ČR (není striktní filtr)
const CZ_BBOX = '12.09,48.55,18.87,51.06';

/** Result returned by the geocoding provider */
export interface GeocodingResult {
  /** Short display name — typically place name or street + city */
  name: string;
  /** Full location label for the detail line (name + administrative area) */
  displayName: string;
  lat: number;
  lng: number;
  /** Stable React list key — undefined when the provider doesn't supply an ID */
  placeId?: number;
}

/** Raw shape of a single item in the Mapy.cz v1 geocode response */
interface MapyCzItem {
  name: string;
  label: string;
  position: {
    lon: number;
    lat: number;
  };
  type: string;
  location: string;
}

/** Raw shape of the Mapy.cz v1 geocode API response */
interface MapyCzResponse {
  items: MapyCzItem[];
}

/**
 * Search for addresses and places matching the given query string.
 * Powered by Mapy.cz API v1 — preferred results from Czech Republic.
 * Docs: https://api.mapy.cz/v1/docs/geocode/
 *
 * @param query  - Address or place name to search for
 * @param signal - Optional AbortSignal for cancelling in-flight requests
 * @returns Up to 5 matching results, preferring Czech Republic
 */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  if (!MAPY_API_KEY) {
    throw new Error(
      'Geocoding API klíč není nastaven. Zkontroluj proměnnou NEXT_PUBLIC_MAPY_API_KEY v .env.local.'
    );
  }

  const params = new URLSearchParams({
    apikey: MAPY_API_KEY,
    query,
    limit: '5',
    lang: 'cs',
    preferBBox: CZ_BBOX,
  });

  let response: Response;
  try {
    response = await fetch(
      `https://api.mapy.cz/v1/geocode?${params.toString()}`,
      { signal }
    );
  } catch (err) {
    // AbortError = request was superseded by a newer search — rethrow as-is
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new Error('Nepodařilo se připojit k geocoding API. Zkontroluj internetové připojení.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Geocoding API klíč je neplatný nebo nemá potřebná oprávnění.');
  }

  if (response.status === 429) {
    throw new Error('Překročen limit dotazů geocoding API. Zkus to za chvíli.');
  }

  if (!response.ok) {
    throw new Error(`Geocoding API vrátila chybu ${response.status}. Zkus to znovu.`);
  }

  let data: MapyCzResponse;
  try {
    data = await response.json();
  } catch {
    throw new Error('Geocoding API vrátila neplatná data.');
  }

  return data.items.map((item) => {
    // displayName = "název místa, administrativní lokace" (např. "Václavské náměstí, Praha 1 - Nové Město, Česko")
    const displayName = item.location ? `${item.name}, ${item.location}` : item.name;

    return {
      name: item.name,
      displayName,
      lat: item.position.lat,
      lng: item.position.lon,
      // Mapy.cz v1 nevrací numerické place ID — SearchBar fallbackuje na index
      placeId: undefined,
    };
  });
}
