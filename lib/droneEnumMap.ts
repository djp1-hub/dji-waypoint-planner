// DJI WPML droneEnumValue mapping for KMZ export
//
// Tato mapa obsahuje POUZE drony s ověřeným droneEnumValue, potvrzeným
// extrakcí reálného KMZ souboru exportovaného z DJI Fly pro daný model.
//
// Pro přidání nového dronu:
//   1. Vytvoř misi v DJI Fly pro daný dron a exportuj ji jako .kmz
//   2. Rozbal kmz (je to ZIP archiv) → otevři wpmz/template.kml
//   3. Najdi element <wpml:droneEnumValue> a zapiš hodnotu sem
//   4. Přidej dron do DEFAULT_DRONES v profileStore.ts
//
// Pozn.: Oficiální DJI Cloud API dokumentace pokrývá pouze enterprise drony
// (M350 RTK, M300 RTK, M30, M3E, M3D) — consumer drony dokumentovány nejsou.

/**
 * Maps a drone model name to the DJI WPML droneEnumValue used in template.kml.
 * Falls back to 67 (DJI Mini 4 Pro) for any drone not in this map.
 */
const DRONE_ENUM_MAP: Record<string, number> = {
  'DJI Mini 4 Pro': 67,   // ověřeno — extrakce z DJI Fly KMZ export
  'DJI Mavic 3 Pro': 68,  // ověřeno — extrakce z DJI Fly KMZ export
};

/**
 * Returns the DJI WPML droneEnumValue for the given drone name.
 * Falls back to 67 (DJI Mini 4 Pro) if the drone is unknown.
 */
export function getDroneEnumValue(droneName: string | undefined): number {
  if (!droneName) return 67;
  return DRONE_ENUM_MAP[droneName] ?? 67;
}
