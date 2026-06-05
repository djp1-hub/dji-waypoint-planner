// Type definitions for the DJI Waypoint Planner application

/** Camera action that can be triggered at a waypoint */
export type CameraAction = 'none' | 'photo' | 'startVideo' | 'stopVideo';

/** Mission types supported by the application */
export type MissionType =
  | 'waypoints'
  | 'spiral'
  | 'grid'
  | 'polygonGrid'
  | 'orbit'
  | 'facade'
  | 'film';

/** A single waypoint in a mission */
export interface Waypoint {
  /** Unique identifier for this waypoint */
  id: string;
  /** Latitude coordinate (WGS84) */
  lat: number;
  /** Longitude coordinate (WGS84) */
  lng: number;
  /** Flight altitude above start point in meters */
  height: number;
  /** Flight speed at this waypoint in m/s */
  speed: number;
  /** Time to hover at this waypoint in seconds */
  waitTime: number;
  /** Camera action to perform at this waypoint */
  cameraAction: CameraAction;
  /** Optional gimbal pitch angle in degrees (0 = horizontal, -90 = straight down) */
  gimbalPitch?: number;
  /** Optional fixed heading angle in degrees (0 = North, 90 = East, clockwise) */
  headingAngle?: number;
}

/** A registered drone pilot */
export interface Pilot {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** 12-digit ÚCL operator registration number */
  uclOperatorId: string;
  /** Pilot licence number (A1/A3 or A2 category) */
  licenseNumber: string;
  isDefault: boolean;
}

/** A drone stored in the pilot's fleet */
export interface Drone {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  /** Total weight in grams */
  weightG: number;
  /** EU drone class */
  droneClass: 'C0' | 'C1' | 'C2';
  serialNumber: string;
  /** Battery capacity in watt-hours (used for flight time estimate) */
  batteryWh: number;
  /** Average power draw in watts during normal flight */
  avgPowerW: number;
  /** Maximum legal altitude in metres */
  maxAltitudeM: number;
  /** Maximum speed in m/s */
  maxSpeedMs: number;
  isDefault: boolean;
}

/** A saved mission */
export interface Mission {
  /** Unique identifier for this mission */
  id: string;
  /** User-defined name for this mission */
  name: string;
  /** Type of the mission */
  type: MissionType;
  /** ISO date string of when the mission was created */
  createdAt: string;
  /** List of waypoints in this mission */
  waypoints: Waypoint[];
  /** Point of interest for orbit missions (gimbal points here) */
  poi?: { lat: number; lng: number };
}
