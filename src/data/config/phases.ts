import type { TurnPhase, GameAction } from "@/types/game";

export interface PhaseDefinition {
  id: TurnPhase;
  label: string;
  shortLabel: string;
  description: string;
  allowedActions: GameAction["type"][];
  autoAdvance: boolean;
  buttonLabel?: string;
}

export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    id: "InitializeState",
    label: "Initialisera tillstånd",
    shortLabel: "INIT",
    description: "Återställ per-varv-flaggor och sammanfatta föregående varv",
    allowedActions: [],
    autoAdvance: true,
  },
  {
    id: "InterpretATO",
    label: "Tolka ATO",
    shortLabel: "ATO",
    description: "Tolka uppdragsordern (ATO) och identifiera krav",
    allowedActions: ["CREATE_ATO_ORDER", "EDIT_ATO_ORDER", "DELETE_ATO_ORDER"],
    autoAdvance: false,
    buttonLabel: "BEKRÄFTA ATO",
  },
  {
    id: "ReviewResources",
    label: "Granska resurser",
    shortLabel: "RESURSER",
    description: "Kontrollera bränsle, ammunition, personal och reservdelar",
    allowedActions: [],
    autoAdvance: true,
  },
  {
    id: "ChooseGroupingStrategy",
    label: "Välj grupperingsplan",
    shortLabel: "GRUPP",
    description: "Bestäm basering och gruppering av förband",
    allowedActions: ["MOVE_AIRCRAFT"],
    autoAdvance: false,
    buttonLabel: "GODKÄNN GRUPPERING",
  },
  {
    id: "SetManningSchedule",
    label: "Bestäm bemanning",
    shortLabel: "PERSONAL",
    description: "Sätt personalschema och skiftplanering",
    allowedActions: [],
    autoAdvance: true,
  },
  {
    id: "EstimateNeeds",
    label: "Behovsbedöm",
    shortLabel: "BEHOV",
    description: "Bedöm behov av materiel, tid och resurser",
    allowedActions: [],
    autoAdvance: true,
  },
  {
    id: "BuildTimetable",
    label: "Skapa tidsplan",
    shortLabel: "TIDSPLAN",
    description: "Bygg tidsplan för klargöring och start",
    allowedActions: [],
    autoAdvance: true,
  },
  {
    id: "AllocateAircraft",
    label: "Tilldela flygplan",
    shortLabel: "TILLDELA",
    description: "Tilldela flygplan till ATO-uppdrag efter beredskap och typ",
    allowedActions: ["ASSIGN_AIRCRAFT"],
    autoAdvance: false,
    buttonLabel: "TILLDELA FLYGPLAN",
  },
  {
    id: "OrderPreparation",
    label: "Beordra klargöring",
    shortLabel: "BEORDRA",
    description: "Beordra klargöring av tilldelade flygplan",
    allowedActions: ["DISPATCH_ORDER"],
    autoAdvance: false,
    buttonLabel: "BEORDRA KLARGÖRING",
  },
  {
    id: "PrepareStatusCards",
    label: "Förbered statuskort",
    shortLabel: "STATUS",
    description: "Uppdatera statuskort och generera rekommendationer",
    allowedActions: ["APPLY_RECOMMENDATION", "DISMISS_RECOMMENDATION"],
    autoAdvance: false,
    buttonLabel: "BEKRÄFTA STATUS",
  },
  {
    id: "ExecutePreparation",
    label: "Genomför klargöring",
    shortLabel: "KLARGÖR",
    description: "Klargöring pågår — stokastiska kontroller, BIT-test, bränsle, beväpning",
    allowedActions: ["APPLY_UTFALL_OUTCOME"],
    autoAdvance: false,
    buttonLabel: "GENOMFÖR",
  },
  {
    id: "ReportOutcome",
    label: "Rapportera utfall",
    shortLabel: "RAPPORT",
    description: "Sammanfatta resultat, uppdatera uppdragsstatistik",
    allowedActions: [],
    autoAdvance: true,
  },
  {
    id: "UpdateMaintenancePlan",
    label: "Uppdatera UH-plan",
    shortLabel: "UH-PLAN",
    description: "Uppdatera underhållstider, slutför klara arbeten",
    allowedActions: ["START_MAINTENANCE"],
    autoAdvance: false,
    buttonLabel: "GODKÄNN UH-PLAN",
  },
  {
    id: "IncrementTime",
    label: "Avancera tid",
    shortLabel: "TID",
    description: "Avancera klocka, uppdatera scenariofas",
    allowedActions: [],
    autoAdvance: true,
  },
];

export const PHASE_ORDER: TurnPhase[] = PHASE_DEFINITIONS.map((p) => p.id);

export function getPhaseDefinition(phase: TurnPhase): PhaseDefinition {
  return PHASE_DEFINITIONS.find((p) => p.id === phase)!;
}

export function getNextPhase(current: TurnPhase): TurnPhase | null {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

export function isLastPhase(phase: TurnPhase): boolean {
  return phase === PHASE_ORDER[PHASE_ORDER.length - 1];
}
