export type ZoneCategory = "fixed" | "user";
export type ZoneShape = "circle" | "polygon";
export type UserZoneType = "restricted" | "surveillance" | "logistics" | "roadstrip";
export type FixedZoneType = "no_fly" | "high_security";
export type DrawingMode =
  | "none"
  | "circle_restricted"
  | "circle_surveillance"
  | "circle_logistics"
  | "polygon_roadstrip";

export interface TacticalZone {
  id: string;
  name: string;
  category: ZoneCategory;
  shape: ZoneShape;
  center?: { lat: number; lng: number };
  radiusKm?: number;
  coordinates?: [number, number][];
  userType?: UserZoneType;
  fixedType?: FixedZoneType;
  expiresAtHour?: number;
  expiresAtDay?: number;
  createdAtHour: number;
  createdAtDay: number;
  description?: string;
  createdBy?: string;
}

export type FixedAssetType =
  | "army_regiment"
  | "marine_regiment"
  | "naval_base"
  | "airport_civilian"
  | "ammo_depot";

export interface FixedMilitaryAsset {
  id: string;
  name: string;
  shortName: string;
  type: FixedAssetType;
  lat: number;
  lng: number;
  fillLevel?: number;
  protectionRadiusKm?: number;
  baseAreaKm?: number;
  areaOfResponsibilityKm?: number;
}

export interface OverlayLayerVisibility {
  militaryAssets: boolean;
  civilianInfrastructure: boolean;
  activeZones: boolean;
  coverageRings: boolean;
}
