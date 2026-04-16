// profileStore.ts — localStorage persistence for pilots and drones.
//
// localStorage keys:
//   dji-planner-pilots        — Pilot[]
//   dji-planner-drones        — Drone[]
//   dji-planner-active-pilot  — string (pilot id)
//   dji-planner-active-drone  — string (drone id)

import { Pilot, Drone } from './types';

const KEYS = {
  pilots:        'dji-planner-pilots',
  drones:        'dji-planner-drones',
  activePilot:   'dji-planner-active-pilot',
  activeDrone:   'dji-planner-active-drone',
} as const;

// ── Default drones ───────────────────────────────────────────────────────────
// Obsahuje pouze drony s ověřeným droneEnumValue (viz lib/droneEnumMap.ts).
// Pro přidání nového dronu je potřeba reálný KMZ export z DJI Fly.

export const DEFAULT_DRONE: Drone = {
  id:           'default-mini4pro',
  name:         'DJI Mini 4 Pro',
  manufacturer: 'DJI',
  model:        'Mini 4 Pro',
  weightG:      249,
  droneClass:   'C0',
  serialNumber: '',
  batteryWh:    33.48,
  avgPowerW:    7,
  maxAltitudeM: 120,
  maxSpeedMs:   16,
  isDefault:    true,
};

/** All pre-seeded drones. Loaded into localStorage on first run (empty list). */
export const DEFAULT_DRONES: Drone[] = [
  DEFAULT_DRONE,
  {
    id:           'default-mavic3pro',
    name:         'DJI Mavic 3 Pro',
    manufacturer: 'DJI',
    model:        'Mavic 3 Pro',
    weightG:      895,
    droneClass:   'C2',
    serialNumber: '',
    batteryWh:    77.6,
    avgPowerW:    48,
    maxAltitudeM: 120,
    maxSpeedMs:   21,
    isDefault:    false,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn('[profileStore] localStorage write failed for key:', key);
  }
}

// ── Pilots ───────────────────────────────────────────────────────────────────

export function loadPilots(): Pilot[] {
  return safeRead<Pilot[]>(KEYS.pilots, []);
}

export function savePilot(pilot: Omit<Pilot, 'id'>): Pilot {
  const pilots = loadPilots();
  const newPilot: Pilot = { ...pilot, id: generateId() };
  safeWrite(KEYS.pilots, [...pilots, newPilot]);
  return newPilot;
}

export function updatePilot(updated: Pilot): void {
  const pilots = loadPilots().map((p) => (p.id === updated.id ? updated : p));
  safeWrite(KEYS.pilots, pilots);
}

export function deletePilot(id: string): void {
  const pilots = loadPilots().filter((p) => p.id !== id);
  safeWrite(KEYS.pilots, pilots);
  // Clear active if deleted
  if (loadActivePilotId() === id) {
    safeWrite(KEYS.activePilot, null);
  }
}

export function loadActivePilotId(): string | null {
  return safeRead<string | null>(KEYS.activePilot, null);
}

export function setActivePilotId(id: string | null): void {
  safeWrite(KEYS.activePilot, id);
}

export function loadActivePilot(): Pilot | null {
  const id = loadActivePilotId();
  if (!id) return null;
  return loadPilots().find((p) => p.id === id) ?? null;
}

// ── Drones ───────────────────────────────────────────────────────────────────

/** Returns saved drones.
 * On first run (empty list): seeds with all DEFAULT_DRONES.
 * On subsequent runs: appends any DEFAULT_DRONES missing by name,
 * so existing users automatically receive newly added default drones.
 */
export function loadDrones(): Drone[] {
  const drones = safeRead<Drone[]>(KEYS.drones, []);

  if (drones.length === 0) {
    safeWrite(KEYS.drones, DEFAULT_DRONES);
    return DEFAULT_DRONES;
  }

  // Add any DEFAULT_DRONES not yet present (matched by name)
  const existingNames = new Set(drones.map((d) => d.name));
  const missing = DEFAULT_DRONES.filter((d) => !existingNames.has(d.name));
  if (missing.length > 0) {
    const updated = [...drones, ...missing];
    safeWrite(KEYS.drones, updated);
    return updated;
  }

  return drones;
}

export function saveDrone(drone: Omit<Drone, 'id'>): Drone {
  const drones = loadDrones();
  const newDrone: Drone = { ...drone, id: generateId() };
  safeWrite(KEYS.drones, [...drones, newDrone]);
  return newDrone;
}

export function updateDrone(updated: Drone): void {
  const drones = loadDrones().map((d) => (d.id === updated.id ? updated : d));
  safeWrite(KEYS.drones, drones);
}

export function deleteDrone(id: string): void {
  // Prevent deleting last drone
  const drones = loadDrones();
  if (drones.length <= 1) return;
  safeWrite(KEYS.drones, drones.filter((d) => d.id !== id));
  if (loadActiveDroneId() === id) {
    safeWrite(KEYS.activeDrone, null);
  }
}

export function loadActiveDroneId(): string | null {
  return safeRead<string | null>(KEYS.activeDrone, null);
}

export function setActiveDroneId(id: string | null): void {
  safeWrite(KEYS.activeDrone, id);
}

/** Returns the active drone, falling back to the first drone in the list. */
export function loadActiveDrone(): Drone {
  const id = loadActiveDroneId();
  const drones = loadDrones();
  return drones.find((d) => d.id === id) ?? drones[0] ?? DEFAULT_DRONE;
}
