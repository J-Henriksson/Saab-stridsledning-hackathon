# ROAD2AIR — Digital airbase simulator

> **Winner — SAAB Smart Airbase Hackathon**
>
> *"En källtrogen digitalisering av flygbasbrädspelet med attraktivt och intuitivt gränssnitt, inklusive en fullt spelbar demo samt AI-stöd. Den taktiska kartan är en trevlig bonus som gör spelet mer levande. Spelet känns redan imponerande färdigt med tanke på den korta utvecklingstiden."*
> — Jury, SAAB Smart Airbase

---

## What is this?

ROAD2AIR is a web-based digitization of SAAB's airbase simulation board game (*flygbasbrädspelet*). Players take the role of an airbase commander managing a Gripen fleet through a 7-day campaign that escalates from peacetime (FRED) through crisis (KRIS) to full-scale war (KRIG).

The game faithfully reproduces the original simulation mechanics — including stochastic outcome tables, aircraft lifecycle states, ATO order management, and cannibalization policy — wrapped in a modern, intuitive interface with an AI advisor and a live tactical map of Sweden.

---

## Features

### Fully playable campaign
A 7-day scenario with a 14-phase turn sequence. Each turn covers interpreting Air Tasking Orders, allocating aircraft, managing preparation pipelines, rolling stochastic failure outcomes, and updating maintenance plans. Phases auto-advance where no player input is needed, so the game stays focused on decisions that matter.

### Aircraft lifecycle management
Every aircraft moves through a 9-state lifecycle: `ready → allocated → in_preparation → awaiting_launch → on_mission → returning → recovering → under_maintenance → unavailable`. Fuel drain, service intervals, and failure rates are all modelled per phase and base type.

### Stochastic outcomes (Utfall)
Two d6 dice tables taken directly from the SAAB simulation deck determine fault type, repair time, required facility, capability requirements, weapon loss (10–100%), and extra maintenance time (0–50%) on every preparation and recovery roll.

### ATO management
Full Air Tasking Order editor with Gantt timeline view. Orders specify mission type, time window, aircraft type, payload, launch base, and priority. Orders are auto-generated on day rollover and can be modified or extended by the player.

### AI advisor
A chat-style advisor panel that analyses the current resource state and generates recommendations on maintenance priority, fuel levels, spare parts, redeployment strategy, and ATO compliance — all in Swedish.

### Tactical map
An interactive MapLibre GL map of Sweden showing all active bases (MOB, FOBs, ROBs), supply lines, and live aircraft positions with animated tracking. Clicking a base or aircraft opens a detail panel linked to the game state.

### After-Action Review
A post-game event log filterable by action type and risk level, with a calendar-based date picker for browsing the full campaign history.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite + SWC |
| Styling | Tailwind CSS + shadcn/ui |
| State | `useReducer` + React Context |
| Routing | React Router 6 |
| Map | MapLibre GL + react-map-gl |
| Animation | Framer Motion |
| Charts | Recharts |
| Testing | Vitest + Testing Library + Playwright |

---

## Architecture

The game engine (`src/core/engine.ts`) is a pure reducer — `gameReducer(state, action): GameState` — with no side effects and no React dependencies. This makes the entire simulation fully testable without a browser and replayable from any snapshot.

All probabilities, durations, and capacities live in `src/data/config/` and can be tuned without touching engine code. All 5 pages (dashboard, ATO, map, aircraft detail, AAR) share a single `GameProvider` instance so there is no state drift between views.

---

## Getting started

```sh
# Clone the repo
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:8080` and click **New Game** to start a campaign.

---

## Project structure

```
src/
├── core/               # Pure game logic (engine, phases, stochastics, validators)
├── data/               # Initial state + config (probabilities, durations, capacities)
├── context/            # GameContext + useGame() hook
├── hooks/              # useGameEngine — reducer wrapper + convenience API
├── pages/              # 5 routes: dashboard, ATO, map, aircraft detail, AAR
├── components/
│   ├── game/           # Game-specific components (pipeline, Gantt, recommendations)
│   ├── dashboard/      # Dashboard widgets
│   └── ui/             # shadcn/ui primitives
└── types/game.ts       # All type definitions (single source of truth)
```

---

## Hackathon context

Built at the **SAAB Smart Airbase** hackathon. The goal was to digitize SAAB's physical airbase simulation board game in a way that preserves its tactical depth while making it accessible and engaging through a modern UI. The simulation mechanics, phase names, base designations, aircraft types, and dice tables are all faithful to the original SAAB material.
