// DJI WPML droneEnumValue mapping for KMZ export.
//
// Value 68 is confirmed from KMZ files created directly on DJI RC2 / DJI Fly
// for DJI Mini 4 Pro waypoint missions.

const DRONE_ENUM_MAP: Record<string, number> = {
  'DJI Mini 4 Pro': 68,
  'DJI Mavic 3 Pro': 68,
};

export function getDroneEnumValue(droneName: string | undefined): number {
  if (!droneName) return 68;
  return DRONE_ENUM_MAP[droneName] ?? 68;
}