// Protected area types and color mapping — used by ProtectedAreasLayer component.
// Data pre-fetched by scripts/fetch-protected-areas.js → public/data/protected-areas-*.json

export type ProtectedAreaType = 'NP' | 'CHKO' | 'NATIONAL_PARK' | 'PROTECTED_AREA' | string;

/** Color for each protected area type */
export function protectedAreaColor(type: string): string {
  if (type === 'NP' || type === 'NATIONAL_PARK') return '#22c55e'; // green — National Park
  if (type === 'CHKO') return '#3b82f6';                           // blue — Czech CHKO
  if (type === 'PROTECTED_AREA') return '#86efac';                  // light green — generic protected area
  return '#94a3b8';                                                 // gray — other
}

/** Fill opacity per type */
export function protectedAreaFillOpacity(type: string): number {
  if (type === 'NP' || type === 'NATIONAL_PARK') return 0.25;
  if (type === 'CHKO') return 0.15;
  if (type === 'PROTECTED_AREA') return 0.18;
  return 0.1;
}

export interface ProtectedArea {
  name: string;
  type: ProtectedAreaType;
  restriction: string;
}
