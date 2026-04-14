// DJI WPML droneEnumValue mapping for KMZ export
// Source: DJI WPML specification and community-verified values.
// TBD values use the Mini 4 Pro fallback (67) until officially confirmed.

/**
 * Maps a drone model name to the DJI WPML droneEnumValue used in template.kml.
 * Falls back to 67 (DJI Mini 4 Pro) for unknown or unverified models.
 */
const DRONE_ENUM_MAP: Record<string, number> = {
  'DJI Mini 4 Pro': 67,   // verified
  'DJI Mavic 3 Pro': 68,  // verified
  'DJI Air 3': 67,        // TBD — using Mini 4 Pro fallback until confirmed
  'DJI Mini 3 Pro': 67,   // TBD — using Mini 4 Pro fallback until confirmed
};

/**
 * Returns the DJI WPML droneEnumValue for the given drone name.
 * Falls back to 67 (DJI Mini 4 Pro) if the drone is unknown.
 */
export function getDroneEnumValue(droneName: string | undefined): number {
  if (!droneName) return 67;
  return DRONE_ENUM_MAP[droneName] ?? 67;
}
