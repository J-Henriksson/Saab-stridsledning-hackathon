import type { ProtectedAsset } from "@/types/overlay";

export const PROTECTED_ASSETS: ProtectedAsset[] = [
  {
    id: "stockholm-city",
    name: "Stockholm stadskärna",
    type: "civilian_population",
    position: { lat: 59.3326, lng: 18.0649 },
    priority: "critical",
  },
  {
    id: "arlanda",
    name: "Arlanda flygplats",
    type: "logistics",
    position: { lat: 59.6519, lng: 17.9237 },
    priority: "critical",
  },
  {
    id: "musko",
    name: "Muskö Marinbas",
    type: "military_value",
    position: { lat: 58.99, lng: 17.97 },
    priority: "critical",
  },
  {
    id: "linkoping-saab",
    name: "Linköping / SAAB-anläggningen",
    type: "military_value",
    position: { lat: 58.4108, lng: 15.6214 },
    priority: "critical",
  },
  {
    id: "forsmark",
    name: "Forsmark kärnkraftverk",
    type: "critical_infrastructure",
    position: { lat: 60.408, lng: 18.171 },
    priority: "critical",
  },
  {
    id: "bromma",
    name: "Bromma flygplats",
    type: "logistics",
    position: { lat: 59.3543, lng: 17.9415 },
    priority: "high",
  },
  {
    id: "enkoping-ammo",
    name: "Enköping ammunitionsdepå",
    type: "military_value",
    position: { lat: 59.635, lng: 17.077 },
    priority: "high",
  },
  {
    id: "skavsta",
    name: "Stockholm-Skavsta",
    type: "logistics",
    position: { lat: 58.7886, lng: 16.9122 },
    priority: "medium",
  },
];
