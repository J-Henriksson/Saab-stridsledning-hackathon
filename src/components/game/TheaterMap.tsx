import { useState } from "react";
import { motion } from "framer-motion";
import { Aircraft } from "@/types/game";

const W = 600, H = 280;

// Equirectangular projection: lon 5–30°E, lat 54–72°N → W×H
const p = (lon: number, lat: number): [number, number] => [
  ((lon - 5) / 25) * W,
  ((72 - lat) / 18) * H,
];

const svgPts = (coords: [number, number][]) =>
  coords.map(([lo, la]) => p(lo, la).map((v) => v.toFixed(1)).join(",")).join(" ");

// ── Simplified country outlines ────────────────────────────────────────────

const SWEDEN = svgPts([
  [13, 55.6], [14.2, 55.4], [15.6, 56.2], [16.8, 57.2], [16.3, 58.6], [18.1, 59.5],
  [17.2, 60.7], [17.5, 62.4], [20.3, 63.8], [21.2, 64.8], [22.2, 65.6], [24.1, 65.8],
  [24, 68.5], [20.5, 69.1], [18.5, 68.5], [17, 67.5], [15.2, 66.3], [14.1, 65],
  [13, 64], [12.2, 63.5], [12.1, 62], [11.9, 60.5], [11.8, 59], [11.9, 57.7],
  [12.5, 56.8], [12.7, 56.1],
]);

const NORWAY = svgPts([
  [5, 72], [20.5, 72], [20.5, 69.1], [18.5, 68.5], [17, 67.5], [15.2, 66.3],
  [14.1, 65], [13, 64], [12.2, 63.5], [12.1, 62], [11.9, 60.5], [11.8, 59],
  [11.9, 57.7], [10, 57.5], [8, 57.5], [5.5, 58], [5, 60],
]);

const FINLAND = svgPts([
  [20.3, 63.8], [22.2, 65.6], [24.1, 65.8], [24, 68.5], [27, 70], [30, 69],
  [30, 61], [27, 60], [25, 60.2], [22, 60], [21, 60.5],
]);

const DENMARK = svgPts([
  [12.7, 55.9], [12.5, 55.5], [10.5, 57.7], [8.2, 56.5],
  [8.5, 55.2], [9.5, 54.6], [12, 54.6], [12.7, 55.5],
]);

const SOUTH_LAND = svgPts([
  [5, 54], [30, 54], [30, 55], [25, 54.5], [18.5, 54.5],
  [14, 54.7], [9.5, 54.8], [8.5, 55.2], [8.2, 56.5], [5, 55.5],
]);

const BALTIC_STATES = svgPts([
  [21, 59.5], [28.5, 59.5], [28.5, 54], [21, 54],
]);

// ── Deterministic orbit seeded by aircraft id ──────────────────────────────

function hashId(s: string): number {
  let h = 5381;
  for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) & 0x7fffffff;
  return h;
}

function getOrbit(id: string) {
  const h = hashId(id);
  return {
    cx: 155 + (h % 225),       // x: 155–380 (over Sweden/Baltic)
    cy: 65 + ((h >> 8) % 165),  // y: 65–230
    rx: 14 + (h % 10),
    ry: 8 + ((h >> 4) % 7),
    dur: 7 + (h % 6),
  };
}

// ── Component ──────────────────────────────────────────────────────────────

interface TheaterMapProps {
  onMissionAircraft: Aircraft[];
  baseName: string;
}

export function TheaterMap({ onMissionAircraft, baseName }: TheaterMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [bx, by] = p(17.5, 61.5); // Central Sweden base marker

  return (
    <div className="border-b border-border select-none" style={{ background: "#0c1620" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid #1a2c3e" }}
      >
        <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, color: "#4a80b0", letterSpacing: 2 }}>
          ▶ BALTISK OPERATIONSZON — {baseName.toUpperCase()}
        </span>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "#2a5070" }}>
          {onMissionAircraft.length > 0
            ? `${onMissionAircraft.length} PLAN I LUFTEN`
            : "INGA PLAN I LUFTEN"}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxHeight: 190, display: "block" }}>
        {/* Sea */}
        <rect width={W} height={H} fill="#0b1822" />

        {/* Land fills */}
        <polygon points={SOUTH_LAND}    fill="#13190e" />
        <polygon points={BALTIC_STATES} fill="#131a0f" />
        <polygon points={DENMARK}       fill="#131a0f" />
        <polygon points={NORWAY}        fill="#111a22" />
        <polygon points={FINLAND}       fill="#111a12" />

        {/* Sweden — SAAB Blue accent */}
        <polygon points={SWEDEN} fill="#0d1b2e" stroke="#005AA0" strokeWidth="1.2" />

        {/* Subtle country borders */}
        {[NORWAY, FINLAND, DENMARK, SOUTH_LAND, BALTIC_STATES].map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="#18293b" strokeWidth="0.6" />
        ))}

        {/* Grid */}
        {[1, 2, 3, 4, 5].map((i) => (
          <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={H} stroke="#101c28" strokeWidth="0.5" />
        ))}
        {[1, 2].map((i) => (
          <line key={`h${i}`} x1={0} y1={i * 93} x2={W} y2={i * 93} stroke="#101c28" strokeWidth="0.5" />
        ))}

        {/* Country labels */}
        {(
          [
            [78,  155, "NORGE"],
            [265, 180, "SVERIGE"],
            [468, 165, "FINLAND"],
            [310, 250, "ÖSTERSJÖN"],
            [490, 245, "BALT."],
            [150, 265, "DK"],
            [320,  32, "NORRLAND"],
          ] as [number, number, string][]
        ).map(([x, y, t]) => (
          <text key={t} x={x} y={y} textAnchor="middle" fontSize="7"
            fill="#1c3650" fontFamily="monospace" letterSpacing="1">
            {t}
          </text>
        ))}

        {/* Base marker with pulse ring */}
        <g>
          <circle cx={bx} cy={by} r="3" fill="none" stroke="#005AA0" strokeWidth="1.2">
            <animate attributeName="r" values="3;14;3" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={bx} cy={by} r="3.5" fill="#005AA0" />
          <circle cx={bx} cy={by} r="1.8" fill="#60a8d8" />
          <text x={bx + 9} y={by - 5} fontSize="7" fill="#3a6a9a" fontFamily="monospace" fontWeight="bold">
            {baseName.slice(0, 8).toUpperCase()}
          </text>
        </g>

        {/* On-mission aircraft */}
        {onMissionAircraft.map((ac) => {
          const { cx, cy, rx, ry, dur } = getOrbit(ac.id);
          const isHov = hovered === ac.id;

          return (
            <g key={ac.id} transform={`translate(${cx},${cy})`}>
              <motion.g
                animate={{
                  x: [rx, rx * .7, 0, -rx * .7, -rx, -rx * .7, 0, rx * .7, rx],
                  y: [0, ry * .7, ry, ry * .7, 0, -ry * .7, -ry, -ry * .7, 0],
                }}
                transition={{
                  duration: dur,
                  repeat: Infinity,
                  ease: "linear",
                  times: [0, .125, .25, .375, .5, .625, .75, .875, 1],
                }}
                onMouseEnter={() => setHovered(ac.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Wake trails */}
                <line x1="-15" y1="-1"  x2="-5"  y2="-.5" stroke="#1a4a90" strokeWidth="1.8" opacity="0.55" />
                <line x1="-15" y1="1"   x2="-5"  y2=".5"  stroke="#1a4a90" strokeWidth="1.8" opacity="0.55" />
                <line x1="-21" y1="-2"  x2="-13" y2="-1"  stroke="#1a4a90" strokeWidth="0.8" opacity="0.25" />
                <line x1="-21" y1="2"   x2="-13" y2="1"   stroke="#1a4a90" strokeWidth="0.8" opacity="0.25" />

                {/* Plane icon */}
                <image
                  href="/jas_e.png"
                  x={-7} y={-7}
                  width={14} height={14}
                  style={{
                    filter: isHov
                      ? "brightness(0) saturate(100%) invert(1) sepia(1) hue-rotate(180deg) saturate(900%)"
                      : "brightness(0) saturate(100%) invert(1) sepia(1) hue-rotate(185deg) saturate(400%)",
                  }}
                />

                {/* Hover tooltip */}
                {isHov && (
                  <g>
                    <rect x={9} y={-17} width={60} height={26} rx="2"
                      fill="#060f1a" stroke="#1e4a90" strokeWidth="0.8" />
                    <text x={13} y={-7} fontSize="7.5" fill="#60a0e8"
                      fontFamily="monospace" fontWeight="bold">
                      {ac.tailNumber}
                    </text>
                    <text x={13} y={4} fontSize="6" fill="#2a5a88" fontFamily="monospace">
                      {ac.currentMission
                        ? ac.currentMission.slice(0, 9)
                        : "UPPDRAG"}
                    </text>
                  </g>
                )}
              </motion.g>
            </g>
          );
        })}

        {/* Empty state */}
        {onMissionAircraft.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11"
            fill="#182e44" fontFamily="monospace" letterSpacing="3">
            INGA AKTIVA UPPDRAG
          </text>
        )}
      </svg>
    </div>
  );
}
