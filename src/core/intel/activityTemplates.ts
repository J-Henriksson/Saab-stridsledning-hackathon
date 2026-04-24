import type { EnemyBaseCategory } from "@/types/game";

export const ACTIVITY_TEMPLATES_BY_CATEGORY: Record<EnemyBaseCategory, string[]> = {
  airfield: [
    "Ökad radiotrafik noterad",
    "Startklara jaktflyg observerade på plattan",
    "Avisering om CAP-patrullering inom 2 timmar",
    "Tankbilar i rörelse mot startbanan",
    "Siktövning eller taxi-körning pågår",
  ],
  sam_site: [
    "Emitterande eldledningsradar detekterad",
    "Missilbeväpning observerad",
    "Trafikrörelse kring skjutläge",
    "Maskering/Förflyttning pågår",
  ],
  command: [
    "Ökad signaltrafik mot underlydande enheter",
    "Möte på ledningsnivå indikerat",
    "Kommunikationsström till marinenheter uppmätt",
    "Krypterade kortmeddelanden observerade",
  ],
  logistics: [
    "Drivmedelskolonn anländer",
    "Ammunitionshantering pågår",
    "Lastbilar lämnar depån söderut",
    "Reservdelsleverans registrerad",
  ],
  radar: [
    "Ny frekvensmod detekterad",
    "Radar i energisnål scanmod",
    "Emission tyst — misstänkt periodisk doldmod",
    "Huvudradar i sökläge mot norr",
  ],
  naval_base: [
    "Förberedelse för maritim blockad pågår",
    "Avgångsklargöring av korvett observerad",
    "Lastfartyg dockar med ammunition",
    "U-båt försvinner från kajplats",
    "Ökad helikopterflygverksamhet kring hamn",
  ],
};

export const STRATEGIC_INTENT_BY_CATEGORY: Record<EnemyBaseCategory, string[]> = {
  airfield: [
    "Etablerar lufträndighet över egna operationsområdet",
    "Förbereder offensiva flygoperationer inom 24h",
    "Upprätthåller defensiv CAP över egen territorium",
  ],
  sam_site: [
    "Täcker eget luftrum — defensiv hållning",
    "Skyddar högvärdigt mål i närheten",
    "Beredskap för framryckning som A2/AD-bubbla",
  ],
  command: [
    "Koordinerar flera enhetsgrupper i regionen",
    "Förbereder operativ order till underenheter",
    "Högkvarter för kommande operation",
  ],
  logistics: [
    "Uppbyggnad av framskjutet förråd",
    "Försörjning av framskjutna stridskrafter",
    "Stödjer kommande operation — ökad beredskap",
  ],
  radar: [
    "Tidig-varning — defensiv övervakningsroll",
    "Målidentifiering för sammankopplad A2/AD",
  ],
  naval_base: [
    "Förbereder maritim blockad",
    "Amfibieförberedelser mot öster",
    "Avskräckning mot handelstrafik till Östersjön",
    "Hemmahamn för regional sjöstridsgrupp",
  ],
};

export const STOCKPILE_TEMPLATES: Record<EnemyBaseCategory, { label: string; value: string }[]> = {
  airfield: [
    { label: "Drivmedel", value: "Beräknat 60–75% av kapacitet" },
    { label: "Jaktrobotar", value: "Uppskattat 80–120 st" },
    { label: "Markpersonal", value: "Bataljonsnivå (400±50)" },
  ],
  sam_site: [
    { label: "Missiler laddade", value: "3–4 x 4-packs" },
    { label: "Reservmissiler", value: "Moderat lager" },
    { label: "Bränsle för gen.", value: "> 7 dagar autonomi" },
  ],
  command: [
    { label: "Redundanta länkar", value: "Minst 2 satellit + HF" },
    { label: "Personalstyrka", value: "Kompaninivå" },
    { label: "Reservgenerator", value: "Aktiv" },
  ],
  logistics: [
    { label: "Drivmedel", value: "Stort lager — beräknat 3 dagars flygning" },
    { label: "Ammunition", value: "Blandad lagerstruktur" },
    { label: "Fordon", value: "20–30 logistikbilar observerade" },
  ],
  radar: [
    { label: "Reservgeneratorer", value: "2 st, dieselmatade" },
    { label: "Reservantenner", value: "Okänt" },
  ],
  naval_base: [
    { label: "Bränsle (marin)", value: "Beräknat > 50,000 ton" },
    { label: "Sjömålsrobotar", value: "Uppskattat 40–60 st" },
    { label: "Bordfartyg", value: "1 korvett, 1 u-båt, 1 amfibie synliga" },
    { label: "Personal", value: "~1200 man" },
  ],
};

/** Pick an element deterministically from a list given any seed string. */
export function pickByHash<T>(seed: string, list: T[]): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % list.length;
  return list[idx];
}
