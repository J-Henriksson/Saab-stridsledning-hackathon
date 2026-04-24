import type { FixedMilitaryAsset } from "@/types/overlay";

export const FIXED_MILITARY_ASSETS: FixedMilitaryAsset[] = [
  {
    id: "LG",
    name: "Livgardet",
    shortName: "LG",
    type: "army_regiment",
    lat: 59.49,
    lng: 17.75,
    protectionRadiusKm: 5,
    sizeRadiusKm: 0.8,          // ~2 km² compound
    defaultAorRadiusKm: 25,
  },
  {
    id: "Amf1",
    name: "Amfibieregementet",
    shortName: "Amf 1",
    type: "marine_regiment",
    lat: 59.24,
    lng: 18.24,
    protectionRadiusKm: 4,
    sizeRadiusKm: 1.0,          // larger marine base
    defaultAorRadiusKm: 40,
  },
  {
    id: "Musko",
    name: "Muskö Marinbas",
    shortName: "Muskö",
    type: "naval_base",
    lat: 58.99,
    lng: 17.97,
    protectionRadiusKm: 8,
    sizeRadiusKm: 1.5,          // large rock-carved naval base
    defaultAorRadiusKm: 80,
  },
  {
    id: "ARN",
    name: "Arlanda Airport",
    shortName: "ARN",
    type: "airport_civilian",
    lat: 59.6519,
    lng: 17.9237,
    sizeRadiusKm: 2.5,          // large international airport
    defaultAorRadiusKm: 20,
  },
  {
    id: "BMA",
    name: "Bromma Airport",
    shortName: "BMA",
    type: "airport_civilian",
    lat: 59.3543,
    lng: 17.9415,
    sizeRadiusKm: 1.2,
    defaultAorRadiusKm: 12,
  },
];

export const AMMO_DEPOTS: FixedMilitaryAsset[] = [
  {
    id: "AMMO_ENKOPING",
    name: "Ammunitionsdepå Enköping",
    shortName: "AMMO-E",
    type: "ammo_depot",
    lat: 59.635,
    lng: 17.077,
    fillLevel: 75,
    protectionRadiusKm: 3,
    sizeRadiusKm: 0.4,
    defaultAorRadiusKm: 50,     // supply radius
  },
  {
    id: "AMMO_EKSJO",
    name: "Ammunitionsdepå Eksjö",
    shortName: "AMMO-K",
    type: "ammo_depot",
    lat: 57.664,
    lng: 14.974,
    fillLevel: 60,
    protectionRadiusKm: 3,
    sizeRadiusKm: 0.4,
    defaultAorRadiusKm: 50,
  },
];
