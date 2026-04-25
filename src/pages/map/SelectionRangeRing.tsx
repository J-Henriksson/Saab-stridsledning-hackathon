import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import * as turf from "@turf/turf";
import type { Unit } from "@/types/units";
import { isAirDefense, isAircraft, isDrone, isGroundVehicle } from "@/types/units";
import type { NavalUnit, EnemyEntity, EnemyBase } from "@/types/game";

// ── Estimated ranges (km) ──────────────────────────────────────────────────

const ENEMY_ENTITY_RANGE_KM: Record<EnemyEntity["category"], number> = {
  fighter:      150,
  transport:    0,
  helicopter:   8,
  apc:          2,
  artillery:    35,
  sam_launcher: 40,
  ship:         18,
};

const ENEMY_BASE_RANGE_KM: Record<EnemyBase["category"], number> = {
  airfield:    200,
  sam_site:    80,
  command:     0,
  logistics:   0,
  radar:       250,
  naval_base:  60,
};

const NAVAL_RANGE_KM: Record<NavalUnit["kind"], number> = {
  corvette:       20,
  frigate:        35,
  submarine:      50,
  amphib:         10,
  logistics_ship: 5,
  patrol_boat:    8,
};

type RingStyle = "friendly" | "hostile" | "estimated";

const RING_COLOR: Record<RingStyle, string> = {
  friendly:  "#22c55e",
  hostile:   "#ef4444",
  estimated: "#ef4444",
};

interface RingEntry {
  id: string;
  circle: GeoJSON.Feature<GeoJSON.Polygon>;
  style: RingStyle;
}

function makeCircle(lat: number, lng: number, radiusKm: number): GeoJSON.Feature<GeoJSON.Polygon> {
  return turf.circle([lng, lat], radiusKm, { steps: 80, units: "kilometers" });
}

function ringForUnit(u: Unit): RingEntry | null {
  const { lat, lng } = u.position;
  const style: RingStyle = u.affiliation === "friend" ? "friendly" : "estimated";
  if (isAirDefense(u)) {
    const rangeKm = u.engagementRange / 1000;
    if (rangeKm < 0.5) return null;
    return { id: u.id, circle: makeCircle(lat, lng, rangeKm), style };
  }
  if (isDrone(u)) {
    return { id: u.id, circle: makeCircle(lat, lng, u.sensorRangeKm), style };
  }
  if (isAircraft(u)) {
    return { id: u.id, circle: makeCircle(lat, lng, 100), style };
  }
  if (isGroundVehicle(u)) return null;
  return null;
}

function ringForNaval(n: NavalUnit): RingEntry | null {
  const rangeKm = NAVAL_RANGE_KM[n.kind] ?? 10;
  const style: RingStyle = n.affiliation === "friend" ? "friendly" : "hostile";
  return { id: n.id, circle: makeCircle(n.position.lat, n.position.lng, rangeKm), style };
}

function ringForEnemyEntity(e: EnemyEntity): RingEntry | null {
  const rangeKm = ENEMY_ENTITY_RANGE_KM[e.category] ?? 0;
  if (rangeKm === 0) return null;
  return { id: e.id, circle: makeCircle(e.coords.lat, e.coords.lng, rangeKm), style: "estimated" };
}

function ringForEnemyBase(b: EnemyBase): RingEntry | null {
  const rangeKm = ENEMY_BASE_RANGE_KM[b.category] ?? 0;
  if (rangeKm === 0) return null;
  return { id: b.id, circle: makeCircle(b.coords.lat, b.coords.lng, rangeKm), style: "estimated" };
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  // single-selection props (shown when showAll is false)
  selectedUnit?:        Unit | null;
  selectedNaval?:       NavalUnit | null;
  selectedEnemyEntity?: EnemyEntity | null;
  selectedEnemyBase?:   EnemyBase | null;

  // "show all rings" mode
  showAll?:         boolean;
  allUnits?:        Unit[];
  allNaval?:        NavalUnit[];
  allEnemyEntities?: EnemyEntity[];
  allEnemyBases?:   EnemyBase[];
}

// ── Shared layer renderer ──────────────────────────────────────────────────

function RingLayers({ id, features, color, dashed }: {
  id: string;
  features: GeoJSON.Feature<GeoJSON.Polygon>[];
  color: string;
  dashed: boolean;
}) {
  if (features.length === 0) return null;
  const data: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
  return (
    <Source id={id} type="geojson" data={data}>
      <Layer
        id={`${id}-fill`}
        type="fill"
        paint={{ "fill-color": color, "fill-opacity": 0.06 }}
      />
      <Layer
        id={`${id}-glow`}
        type="line"
        paint={{ "line-color": color, "line-width": 8, "line-opacity": 0.12, "line-blur": 6 }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id={`${id}-line`}
        type="line"
        paint={{
          "line-color": color,
          "line-width": 1.6,
          "line-opacity": 0.85,
          ...(dashed ? { "line-dasharray": [6, 4] } : {}),
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
    </Source>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function SelectionRangeRing({
  selectedUnit,
  selectedNaval,
  selectedEnemyEntity,
  selectedEnemyBase,
  showAll = false,
  allUnits = [],
  allNaval = [],
  allEnemyEntities = [],
  allEnemyBases = [],
}: Props) {

  const rings = useMemo<RingEntry[]>(() => {
    if (showAll) {
      const result: RingEntry[] = [];
      for (const u of allUnits) {
        const r = ringForUnit(u);
        if (r) result.push(r);
      }
      for (const n of allNaval) {
        const r = ringForNaval(n);
        if (r) result.push(r);
      }
      for (const e of allEnemyEntities) {
        const r = ringForEnemyEntity(e);
        if (r) result.push(r);
      }
      for (const b of allEnemyBases) {
        const r = ringForEnemyBase(b);
        if (r) result.push(r);
      }
      return result;
    }

    // Single-selection mode
    if (selectedUnit) {
      const r = ringForUnit(selectedUnit);
      return r ? [r] : [];
    }
    if (selectedNaval) {
      const r = ringForNaval(selectedNaval);
      return r ? [r] : [];
    }
    if (selectedEnemyEntity) {
      const r = ringForEnemyEntity(selectedEnemyEntity);
      return r ? [r] : [];
    }
    if (selectedEnemyBase) {
      const r = ringForEnemyBase(selectedEnemyBase);
      return r ? [r] : [];
    }
    return [];
  }, [showAll, allUnits, allNaval, allEnemyEntities, allEnemyBases,
      selectedUnit, selectedNaval, selectedEnemyEntity, selectedEnemyBase]);

  const friendlyFeatures = useMemo(
    () => rings.filter((r) => r.style === "friendly").map((r) => r.circle),
    [rings]
  );
  const hostileFeatures = useMemo(
    () => rings.filter((r) => r.style === "hostile" || r.style === "estimated").map((r) => r.circle),
    [rings]
  );

  if (rings.length === 0) return null;

  return (
    <>
      <RingLayers
        id="range-rings-friendly"
        features={friendlyFeatures}
        color={RING_COLOR.friendly}
        dashed={false}
      />
      <RingLayers
        id="range-rings-hostile"
        features={hostileFeatures}
        color={RING_COLOR.hostile}
        dashed={!showAll}
      />
    </>
  );
}
