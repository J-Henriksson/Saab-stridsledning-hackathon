// Pure scripted state-machine for the Baltic-incursion scenario.
// Reads the current GameState (which already contains state.scenario), returns
// a list of GameAction to dispatch this tick. The hook in useScenario.ts is
// the only caller.

import type { GameState, GameAction, NavalUnit, EnemyEntity } from "@/types/game";
import { absoluteGameSec } from "@/core/engine";
import { haversineDistance } from "@/utils/geoDistance";
import { computeFriendlySensorCoverage, isInsideAnyDisc } from "@/core/intel/visibility";
import {
  SHIP_SPAWNS,
  BOGEY_SPAWNS,
  SHIP_SPEED_KTS,
  BOGEY_TRANSIT_KTS,
  BOGEY_RETREAT_KTS,
  FIGHTER_TRANSIT_KTS,
  INTERCEPT_KM,
  TRANSIT_CLOCK_MULT,
  KARLSKRONA,
  KALININGRAD,
} from "./geo";

const KTS_TO_KM_PER_SEC = 1.852 / 3600;

interface XY { lat: number; lng: number }

function bearingDeg(from: XY, to: XY): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Move `from` `distKm` along bearing `headingDeg`. Approximation good enough
 *  for the Baltic at our zoom level — no need for Vincenty. */
function step(from: XY, headingDeg: number, distKm: number): XY {
  const R = 6371; // earth radius
  const δ = distKm / R;
  const θ = (headingDeg * Math.PI) / 180;
  const φ1 = (from.lat * Math.PI) / 180;
  const λ1 = (from.lng * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}

function distanceKm(a: XY, b: XY): number {
  return haversineDistance(a, b) / 1000;
}

function findNaval(state: GameState, id: string): NavalUnit | undefined {
  return state.navalUnits.find((n) => n.id === id);
}
function findBogey(state: GameState, id: string): EnemyEntity | undefined {
  return state.enemyEntities.find((e) => e.id === id);
}

export function step_scenario(
  state: GameState,
  deltaSec: number,
): GameAction[] {
  const sc = state.scenario;
  if (!sc) return [];

  const out: GameAction[] = [];
  const nowSec = absoluteGameSec(state);

  switch (sc.beat) {
    case "armed": {
      // Waiting for operator to click trigger event — drift boats slowly NW
      // so they look alive on the map even before the brief is opened.
      for (const spawn of SHIP_SPAWNS) {
        const n = findNaval(state, spawn.id);
        if (!n) continue;
        const distKm = SHIP_SPEED_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const next = step(n.position, spawn.heading, distKm);
        out.push({ type: "SCENARIO_PATCH_ENTITY", targetKind: "naval", id: spawn.id, position: next, heading: spawn.heading });
      }
      return out;
    }

    case "stage1": {
      // Boats already spawned. Drift them slowly NW. T+10s game-time → reveal bogeys.
      const elapsed = nowSec - (sc.stage1AtSec ?? nowSec);
      // Drift naval positions
      for (const spawn of SHIP_SPAWNS) {
        const n = findNaval(state, spawn.id);
        if (!n) continue;
        const distKm = SHIP_SPEED_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const next = step(n.position, spawn.heading, distKm);
        out.push({ type: "SCENARIO_PATCH_ENTITY", targetKind: "naval", id: spawn.id, position: next, heading: spawn.heading });
      }
      if (elapsed >= 10) {
        // Spawn bogeys
        for (const b of BOGEY_SPAWNS) {
          const entity: EnemyEntity = {
            id: b.id,
            name: b.id === "scn-bogey-01" ? "Okänt luftmål LEAD" : "Okänt luftmål WING",
            category: "fighter",
            coords: b.pos,
            threatLevel: "high",
            operationalStatus: "active",
            estimates: "Su-30SM-klass jaktplan, kurs 278° mot Karlskrona",
            notes: "Detekterad via MOB-radarn (östra täckningsgränsen vid Klaipėda). ELINT-pod misstänks.",
            createdAt: state.day,
          };
          out.push({ type: "SCENARIO_ADD_ENEMY_ENTITY", entity });
        }
        out.push({
          type: "ADD_EVENT",
          event: {
            type: "critical",
            message: "Två okända luftmål — kurs Karlskrona. Hastighet 0.85 Mach.",
            actionType: "CONTACT_CLASSIFIED",
          },
        });
        out.push({ type: "SCENARIO_SET_BEAT", beat: "stage2" });
      }
      return out;
    }

    case "stage2": {
      // Boats keep drifting; bogeys run on heading toward Karlskrona; awaiting click.
      for (const spawn of SHIP_SPAWNS) {
        const n = findNaval(state, spawn.id);
        if (!n) continue;
        const distKm = SHIP_SPEED_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const next = step(n.position, spawn.heading, distKm);
        out.push({ type: "SCENARIO_PATCH_ENTITY", targetKind: "naval", id: spawn.id, position: next, heading: spawn.heading });
      }
      for (const b of BOGEY_SPAWNS) {
        const e = findBogey(state, b.id);
        if (!e) continue;
        const distKm = BOGEY_TRANSIT_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const heading = bearingDeg(e.coords, KARLSKRONA);
        const next = step(e.coords, heading, distKm);
        out.push({ type: "SCENARIO_PATCH_ENTITY", targetKind: "enemy_entity", id: b.id, position: next, heading });
      }
      return out;
    }

    case "stage3":
      // Operator viewing the AI Action Card. Bogeys keep coming, boats keep drifting.
      // Same logic as stage2 (continue motion until they decide).
      for (const spawn of SHIP_SPAWNS) {
        const n = findNaval(state, spawn.id);
        if (!n) continue;
        const distKm = SHIP_SPEED_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const next = step(n.position, spawn.heading, distKm);
        out.push({ type: "SCENARIO_PATCH_ENTITY", targetKind: "naval", id: spawn.id, position: next, heading: spawn.heading });
      }
      for (const b of BOGEY_SPAWNS) {
        const e = findBogey(state, b.id);
        if (!e) continue;
        const distKm = BOGEY_TRANSIT_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const heading = bearingDeg(e.coords, KARLSKRONA);
        const next = step(e.coords, heading, distKm);
        out.push({ type: "SCENARIO_PATCH_ENTITY", targetKind: "enemy_entity", id: b.id, position: next, heading });
      }
      return out;

    case "stage4": {
      // Friendly fighters pursue; bogeys continue inbound; boats drift.
      // Boats
      for (const spawn of SHIP_SPAWNS) {
        const n = findNaval(state, spawn.id);
        if (!n) continue;
        const distKm = SHIP_SPEED_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const next = step(n.position, spawn.heading, distKm);
        out.push({ type: "SCENARIO_PATCH_ENTITY", targetKind: "naval", id: spawn.id, position: next, heading: spawn.heading });
      }
      // Bogeys keep heading toward Karlskrona
      const lead = findBogey(state, "scn-bogey-01");
      const wing = findBogey(state, "scn-bogey-02");
      if (lead) {
        const distKm = BOGEY_TRANSIT_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const heading = bearingDeg(lead.coords, KARLSKRONA);
        out.push({
          type: "SCENARIO_PATCH_ENTITY",
          targetKind: "enemy_entity",
          id: lead.id,
          position: step(lead.coords, heading, distKm),
          heading,
        });
      }
      if (wing) {
        const distKm = BOGEY_TRANSIT_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const heading = bearingDeg(wing.coords, KARLSKRONA);
        out.push({
          type: "SCENARIO_PATCH_ENTITY",
          targetKind: "enemy_entity",
          id: wing.id,
          position: step(wing.coords, heading, distKm),
          heading,
        });
      }
      // Friendly fighters chase the lead bogey
      const allFriendly = [...state.deployedUnits, ...state.bases.flatMap((b) => b.units)];
      for (const fid of sc.friendlyInterceptIds) {
        const u = allFriendly.find((x) => x.id === fid);
        if (!u || !lead) continue;
        const distKm = FIGHTER_TRANSIT_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const heading = bearingDeg(u.position, lead.coords);
        out.push({
          type: "SCENARIO_PATCH_ENTITY",
          targetKind: "unit",
          id: fid,
          position: step(u.position, heading, distKm),
          heading,
        });
      }
      // Check intercept distance
      if (lead && sc.friendlyInterceptIds.length) {
        const f1 = allFriendly.find((u) => u.id === sc.friendlyInterceptIds[0]);
        if (f1) {
          const sep = distanceKm(f1.position, lead.coords);
          if (sep <= INTERCEPT_KM) {
            out.push({ type: "SCENARIO_SET_BEAT", beat: "stage5" });
            out.push({ type: "SET_CLOCK_MULTIPLIER", value: 1 });
            out.push({
              type: "ADD_EVENT",
              event: {
                type: "success",
                message: "Avvisning lyckad — luftmålen vänder söderut. JAS-paret skuggar.",
                actionType: "CONTACT_CLASSIFIED",
              },
            });
          }
        }
      }
      return out;
    }

    case "stage5": {
      // Bogeys reverse heading toward Kaliningrad until they exit all friendly
      // sensor coverage — at which point fog-of-war makes them invisible and
      // the scenario disarms cleanly.
      const lead = findBogey(state, "scn-bogey-01");
      const wing = findBogey(state, "scn-bogey-02");
      const discs = computeFriendlySensorCoverage(state);

      if (lead) {
        const distKm = BOGEY_RETREAT_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const heading = bearingDeg(lead.coords, KALININGRAD);
        out.push({
          type: "SCENARIO_PATCH_ENTITY",
          targetKind: "enemy_entity",
          id: lead.id,
          position: step(lead.coords, heading, distKm),
          heading,
        });
      }
      if (wing) {
        const distKm = BOGEY_RETREAT_KTS * KTS_TO_KM_PER_SEC * deltaSec;
        const heading = bearingDeg(wing.coords, KALININGRAD);
        out.push({
          type: "SCENARIO_PATCH_ENTITY",
          targetKind: "enemy_entity",
          id: wing.id,
          position: step(wing.coords, heading, distKm),
          heading,
        });
      }

      // Friendly fighters: shadow until just before they'd cross outside our
      // own coverage. Once bogeys exit, fighters break off and turn back.
      const allFriendly = [...state.deployedUnits, ...state.bases.flatMap((b) => b.units)];
      const bogeysOutside =
        (!lead || !isInsideAnyDisc(lead.coords, discs)) &&
        (!wing || !isInsideAnyDisc(wing.coords, discs));

      for (const fid of sc.friendlyInterceptIds) {
        const u = allFriendly.find((x) => x.id === fid);
        if (!u) continue;
        if (bogeysOutside) {
          // Break off pursuit — head back toward Ronneby CAP centre.
          const RONNEBY_CAP_CENTRE = { lat: 55.85, lng: 15.80 };
          const distKm = FIGHTER_TRANSIT_KTS * 0.6 * KTS_TO_KM_PER_SEC * deltaSec;
          const heading = bearingDeg(u.position, RONNEBY_CAP_CENTRE);
          out.push({
            type: "SCENARIO_PATCH_ENTITY",
            targetKind: "unit",
            id: fid,
            position: step(u.position, heading, distKm),
            heading,
          });
        } else if (lead) {
          const distToLead = distanceKm(u.position, lead.coords);
          const targetSep = 50;
          let speedKts = BOGEY_RETREAT_KTS;
          if (distToLead < targetSep - 2) speedKts *= 0.85;
          else if (distToLead > targetSep + 2) speedKts *= 1.05;
          const distKm = speedKts * KTS_TO_KM_PER_SEC * deltaSec;
          const heading = bearingDeg(u.position, lead.coords);
          out.push({
            type: "SCENARIO_PATCH_ENTITY",
            targetKind: "unit",
            id: fid,
            position: step(u.position, heading, distKm),
            heading,
          });
        }
      }

      // Bogeys have crossed the radar border — remove them so they fully
      // disappear from the map (no lingering fog-of-war ghost), restore the
      // friendly fighters to their original Ronneby CAP patrol, and disarm.
      if (bogeysOutside) {
        if (lead) out.push({ type: "SCENARIO_REMOVE_ENEMY_ENTITY", id: lead.id });
        if (wing) out.push({ type: "SCENARIO_REMOVE_ENEMY_ENTITY", id: wing.id });
        for (const fid of sc.friendlyInterceptIds) {
          out.push({
            type: "SCENARIO_PATCH_FRIENDLY_FIGHTER",
            id: fid,
            updates: {
              patrol: {
                center: { lat: 55.85, lng: 15.80 },
                radiusKm: 70,
                speedKts: 380,
                axisDeg: 90,
                clockwise: fid === "scn-jas-rb-01",
                aspect: 0.5,
              },
              movement: { state: "airborne", speed: 380 },
            },
          });
        }
        out.push({
          type: "ADD_EVENT",
          event: {
            type: "info",
            message: "Luftmålen utanför vår sensortäckning — JAS-paret återgår till CAP över Blekinge.",
          },
        });
        out.push({ type: "SCENARIO_DISARM" });
      }
      return out;
    }

    case "done":
      return out;

    default:
      return out;
  }
}
