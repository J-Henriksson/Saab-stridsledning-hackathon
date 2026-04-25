// Hand-crafted intel cards (estimated weapons, equipment, AI history).
// Read by the augmented detail panels to enrich the demo entities.

export interface IntelCard {
  classification: string;
  estimates: { label: string; value: string }[];
  weapons: string[];
  history: string[];
  aiAssessment: string;
}

export const SHIP_INTEL: Record<string, IntelCard> = {
  "scn-baltic-ship-01": {
    classification: "Karakurt-klass korvett (ProjectE 22800) — flagg RFS",
    estimates: [
      { label: "Deplacement", value: "~870 ton" },
      { label: "Längd", value: "67 m" },
      { label: "Besättning (uppskattad)", value: "39" },
      { label: "Marschfart", value: "~24 knop" },
    ],
    weapons: [
      "8× Kalibr-NK kryssningsrobot (3M-54, räckvidd ~1500 km)",
      "Pantsir-M CIWS — 76 mm + RBS-luftvärn",
      "AK-176MA 76 mm allmålspjäs",
    ],
    history: [
      "Senast spårad utgående från Baltiysk dag −12, 03:14",
      "Återkommande övningar med ubåtsstöd i SÖ-sektorn",
      "Två tidigare passager genom svensk EEZ utan kursändring",
    ],
    aiAssessment:
      "Sammansättningen indikerar en framskjuten anti-ytstridsgrupp. Kalibr-räckvidd täcker hela målregistret från Karlskrona till Stockholm. Sannolikhet maktdemonstration: hög. Sannolikhet aktiv attackförberedelse: medium.",
  },
  "scn-baltic-ship-02": {
    classification: "Steregushchiy-klass fregatt (Project 20380) — flagg RFS",
    estimates: [
      { label: "Deplacement", value: "~2200 ton" },
      { label: "Längd", value: "104 m" },
      { label: "Besättning", value: "99" },
      { label: "Marschfart", value: "~27 knop" },
    ],
    weapons: [
      "8× Uran (Kh-35) sjömålsrobot",
      "12× Redut SAM (medelräckvidd, ~50 km)",
      "Paket-NK torpedsystem",
      "A-190 100 mm pjäs",
    ],
    history: [
      "Aktiv i Östersjön sedan 2021, baserad i Baltiysk",
      "Tre observerade samordningar med Karakurt-korvetter",
      "Avsikt enligt OSINT: täckning för amfibiestöd",
    ],
    aiAssessment:
      "Fregattens närvaro tillsammans med korvetten ger en luftvärns-bubbla på ~50 km radie. Detta utvidgar gruppens överlevnadsförmåga avsevärt. Trolig grupproll: området-luftvärn för korvettens missilstart.",
  },
  "scn-baltic-ship-03": {
    classification: "Ropucha-klass landstigningsfartyg (Project 775)",
    estimates: [
      { label: "Deplacement", value: "~4080 ton" },
      { label: "Last (uppskattad)", value: "10× stridsvagn / 340 soldater" },
      { label: "Besättning", value: "98" },
      { label: "Marschfart", value: "~17 knop" },
    ],
    weapons: [
      "AK-725 57 mm tvillingpjäs",
      "Strela-2 MANPADS (för luftförsvar)",
      "A-215 Grad-M raketkastare (täckning vid landstigning)",
    ],
    history: [
      "Lastlogg dag −3 indikerar pansarfordon ombord",
      "Dock-aktivitet vid Baltiysk natt dag −1",
      "Mönster matchar 2014 års Krim-rörelser",
    ],
    aiAssessment:
      "Närvaron av en amfibieenhet i samma ytstridsgrupp som en Karakurt + Steregushchiy är en tydlig markör för möjlig landstigningsövning eller -förberedelse. Avstånd till Gotland: 320 km. Avstånd till södra fastlandet: 280 km.",
  },
};

export const BOGEY_INTEL: Record<string, IntelCard> = {
  "scn-bogey-01": {
    classification: "Su-30SM (Flanker-H)",
    estimates: [
      { label: "Räckvidd (intern)", value: "~3000 km" },
      { label: "Marschhastighet", value: "0.85 Mach" },
      { label: "Topp", value: "Mach 2.0" },
      { label: "Servicetak", value: "17 500 m" },
    ],
    weapons: [
      "R-77 (AA-12) BVR-jaktrobot, ~110 km",
      "R-73 (AA-11) korthålls-IR-robot",
      "Kh-31 anti-radar / sjömålsrobot",
    ],
    history: [
      "Hörd start från Chkalovsk T−18 min via SIGINT",
      "Identisk konfig observerad under övning Zapad",
      "Pilot-callsign matchar Baltiska flygdivisionen",
    ],
    aiAssessment:
      "Multirollsjaktplan. Tillsammans med wingman kan paret bära 12 BVR-robotar. Kurs och hastighet pekar mot Karlskrona. Bedömning: provokationsflygning, ej attackformation. Watchpoint: kursändring inom 80 km från kustlinjen.",
  },
  "scn-bogey-02": {
    classification: "Su-30SM (Flanker-H) — Wingman",
    estimates: [
      { label: "Räckvidd (intern)", value: "~3000 km" },
      { label: "Höjd", value: "9 100 m (uppskattad)" },
      { label: "Hastighet", value: "0.84 Mach" },
      { label: "Avstånd till lead", value: "~10 km" },
    ],
    weapons: [
      "R-77 BVR-jaktrobot (bekräftad pylonkonfig)",
      "R-73 IR-robot",
      "Möjlig ELINT-kapsel (Khibiny-pod)",
    ],
    history: [
      "Wingman till lead bogey vid två tidigare ELINT-tillfällen",
      "Antagen ELINT-roll: signalspaning av svenska radarer",
      "Tidigare mönster: vänder söderut vid avvisning",
    ],
    aiAssessment:
      "Wingman-position och misstänkt ELINT-pod indikerar att paret också samlar elektroniska signaler. Detta är konsekvent med tidigare provokationsflygningar — målet är att kartlägga radarerna, ej att engagera.",
  },
};

export const FIGHTER_INTEL: Record<string, IntelCard> = {
  "scn-jas-rb-01": {
    classification: "JAS 39E Gripen — F17 Ronneby",
    estimates: [
      { label: "Bränsle", value: "92%" },
      { label: "Hastighet", value: "Mach 1.1 (transit)" },
      { label: "Höjd", value: "8 500 m" },
      { label: "Last", value: "4× IRIS-T, 2× Meteor" },
    ],
    weapons: [
      "Meteor BVR-robot, ~150 km",
      "IRIS-T korthålls-IR-robot, ~25 km",
      "Mauser BK-27 27 mm automatkanon",
    ],
    history: [
      "Patrullerat Blekingesektorn senaste 38 min",
      "Datalänk PS-860 Gotland East + GE-AEW-01 (GlobalEye)",
      "Beredd för avvisningsuppdrag",
    ],
    aiAssessment:
      "Position och bränsle räcker för avvisning + 25 min loiter. Avstånd till bogey: ~190 km. Tid till intercept: ~4 min vid Mach 1.1.",
  },
  "scn-jas-rb-02": {
    classification: "JAS 39E Gripen — F17 Ronneby",
    estimates: [
      { label: "Bränsle", value: "89%" },
      { label: "Hastighet", value: "Mach 1.05 (transit)" },
      { label: "Höjd", value: "8 200 m" },
      { label: "Last", value: "4× IRIS-T, 2× Meteor" },
    ],
    weapons: [
      "Meteor BVR-robot",
      "IRIS-T",
      "Mauser BK-27",
    ],
    history: [
      "Wingman-position för -01",
      "Datalänkad till PS-860 Gotland East",
      "Senaste tankning Dag 1 09:42",
    ],
    aiAssessment:
      "Intakt vapenkonfig. Wingman-roll. Kommer att hålla 8–10 km separation till lead i pursuit-fasen.",
  },
};

export function intelFor(id: string): IntelCard | undefined {
  return SHIP_INTEL[id] ?? BOGEY_INTEL[id] ?? FIGHTER_INTEL[id];
}
