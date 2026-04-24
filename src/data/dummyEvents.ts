import type { GameEvent } from "@/types/game";

// Timestamps are computed relative to now at module load so they always look current.
function ts(hoursAgo: number, minuteOffset = 0): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - hoursAgo * 60 - minuteOffset, 0, 0);
  const day  = d.getDate().toString().padStart(2, "0");
  const mon  = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"][d.getMonth()];
  const hh   = d.getHours().toString().padStart(2, "0");
  const mm   = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${mon} ${hh}:${mm}`;
}

// Covers all bases, all event types, and all three scopes:
//   global  → no base field
//   base    → base set, no unitId
//   entity  → base + unitId both set

export const DUMMY_EVENTS: GameEvent[] = [

  // ── GLOBAL ─────────────────────────────────────────────────────────────────
  {
    id: "d-g-01",
    timestamp: ts(5, 10),
    type: "critical",
    message: "HÖJD BEREDSKAP: Oidentifierade flygföremål observerade längs östra kustlinjen. Samtliga baser försätts i KRIG-beredskap omedelbart.",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-g-02",
    timestamp: ts(4, 30),
    type: "warning",
    message: "Väderleksvarning: kraftig dimma förväntas längs Norrlandskusten under morgontimmarna. Reducerad sikt kan påverka startfönster vid FOB_N och ROB_N.",
  },
  {
    id: "d-g-03",
    timestamp: ts(4, 0),
    type: "info",
    message: "ATO-order för perioden +0 till +22h är distribuerade och bekräftade av samtliga baser.",
    actionType: "MISSION_DISPATCH",
  },
  {
    id: "d-g-04",
    timestamp: ts(3, 15),
    type: "success",
    message: "NATO-samordning bekräftad. Luftrumssektorer N2 och N3 överlämnade till flygledarcentral CAOC Ramstein.",
  },
  {
    id: "d-g-05",
    timestamp: ts(2, 50),
    type: "warning",
    message: "Cyberhot detekterat mot militärt kommunikationsnät. IT-säkerhetsprotokoll Tier-2 aktiverat vid alla anläggningar.",
  },
  {
    id: "d-g-06",
    timestamp: ts(1, 20),
    type: "info",
    message: "Övning ARKTISK VIND avslutad. Alla enheter rapporterar klar för skarp insats.",
    actionType: "UNIT_RECALLED",
  },

  // ── MOB – F7 Malmen ────────────────────────────────────────────────────────
  {
    id: "d-mob-01",
    timestamp: ts(5, 5),
    type: "critical",
    message: "Brandalarm utlöst i Hangar 3. Brandkår insatt. GE04 och GE07 evakuerade till öppet uppställningsplats.",
    base: "MOB",
    actionType: "FAULT_NMC",
  },
  {
    id: "d-mob-02",
    timestamp: ts(4, 0),
    type: "warning",
    message: "Bränslenivå vid MOB sjunkit till 38%. Tankvagn begärd från Östgöta logistikdepå. ETA 90 minuter.",
    base: "MOB",
    actionType: "UNIT_FUEL_LOW",
  },
  {
    id: "d-mob-03",
    timestamp: ts(3, 0),
    type: "info",
    message: "GripenE-division Alpha klar för uppdrag. 6 av 8 maskiner i MC-status.",
    base: "MOB",
    actionType: "MISSION_DISPATCH",
  },
  {
    id: "d-mob-04",
    timestamp: ts(2, 30),
    type: "success",
    message: "QRA-beredskap upprätthållen. GE01 och GE02 startklara inom 5 minuter. Besättningar i beredskapsrum.",
    base: "MOB",
  },
  {
    id: "d-mob-05",
    timestamp: ts(1, 45),
    type: "warning",
    message: "Reservdel LRU-47 (EW-modul) slut i lager. Beställning lagd med prio 1 till FMV. Leveranstid 48h.",
    base: "MOB",
    actionType: "SPARE_PART_USED",
  },
  {
    id: "d-mob-06",
    timestamp: ts(0, 55),
    type: "critical",
    message: "GE09 rapporterar hydraulikläcka vid landning. Hangar 1 blockerad. Akut underhåll pågår. Beräknad åtgärdstid 3 timmar.",
    base: "MOB",
    unitId: "ge09",
    actionType: "FAULT_NMC",
  },
  {
    id: "d-mob-07",
    timestamp: ts(0, 20),
    type: "info",
    message: "GlobalEye AWACS slutfört spaningsuppdrag sektor BRAVO. Bildmaterial överförs till underrättelsecentralen.",
    base: "MOB",
    unitId: "awacs01",
    actionType: "LANDING_RECEIVED",
  },

  // ── FOB_N – F21 Luleå ──────────────────────────────────────────────────────
  {
    id: "d-fobn-01",
    timestamp: ts(5, 10),
    type: "critical",
    message: "Luftvärn vid FOB_N har identifierat okänt radareko på 12 000 m höjd, bäring 045. Eskortuppdrag begärs omgående.",
    base: "FOB_N",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-fobn-02",
    timestamp: ts(4, 15),
    type: "warning",
    message: "Avisningskapacitet begränsad p.g.a. tekniskt fel. Kö på 4 maskiner. Start fördröjd ca 35 minuter.",
    base: "FOB_N",
  },
  {
    id: "d-fobn-03",
    timestamp: ts(3, 20),
    type: "success",
    message: "DCA-patrull GE11/GE12 startade i tid. Luftrumskontroll upprätthålls i sektor NORTH. Nästa rotation om 2h.",
    base: "FOB_N",
    unitId: "ge11",
    actionType: "MISSION_DISPATCH",
  },
  {
    id: "d-fobn-04",
    timestamp: ts(2, 10),
    type: "info",
    message: "Personalförstärkning anländ: 12 tekniker från F21 reservbataljon. Underhållskapacitet ökad med 30%.",
    base: "FOB_N",
  },
  {
    id: "d-fobn-05",
    timestamp: ts(1, 10),
    type: "warning",
    message: "Ammunition Meteor BVRAAM: 4 robotar kvar av planerade 16. Omfördelning från MOB-lager begärd.",
    base: "FOB_N",
    actionType: "SPARE_PART_USED",
  },
  {
    id: "d-fobn-06",
    timestamp: ts(0, 30),
    type: "critical",
    message: "GE14 rapporterar motorstopp under start. Pilot evakuerad oskadad. Banan avspärrad. Haveriutredning inledd.",
    base: "FOB_N",
    unitId: "ge14",
    actionType: "FAULT_NMC",
  },

  // ── FOB_S – F10 Ängelholm ──────────────────────────────────────────────────
  {
    id: "d-fobs-01",
    timestamp: ts(4, 55),
    type: "info",
    message: "F10 rapporterar full startberedskap. Banan operativ, alla navigationshjälpmedel aktiva och testade.",
    base: "FOB_S",
  },
  {
    id: "d-fobs-02",
    timestamp: ts(3, 30),
    type: "warning",
    message: "Radarstation FOG-3 rapporterar störning på 3 300 MHz. Trolig elektronisk motverkan från östlig aktör.",
    base: "FOB_S",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-fobs-03",
    timestamp: ts(2, 55),
    type: "critical",
    message: "GE17 nödlandning p.g.a. motorfel under inkommande. Pilot oskadad. Banan avspärrad 20 minuter.",
    base: "FOB_S",
    unitId: "ge17",
    actionType: "UTFALL_APPLIED",
  },
  {
    id: "d-fobs-04",
    timestamp: ts(2, 30),
    type: "success",
    message: "Banan återöppnad. GE17 bogseras till underhållshangar. Övriga maskiner oskadade och redo.",
    base: "FOB_S",
    actionType: "HANGAR_CONFIRM",
  },
  {
    id: "d-fobs-05",
    timestamp: ts(0, 45),
    type: "info",
    message: "Bränslepåfyllning slutförd. FOB_S nu på 94% kapacitet. Nästa planerade leverans om 18h.",
    base: "FOB_S",
  },

  // ── ROB_N – Vidsel ─────────────────────────────────────────────────────────
  {
    id: "d-robn-01",
    timestamp: ts(5, 0),
    type: "info",
    message: "ROB_N aktiverat enligt krigsplan. 2 GripenE positionerade för QRA-stöd norra sektorn. Beredskapsläge etablerat.",
    base: "ROB_N",
    actionType: "UNIT_DEPLOYED",
  },
  {
    id: "d-robn-02",
    timestamp: ts(3, 45),
    type: "warning",
    message: "Bränsletransport försenad 3 timmar p.g.a. vägstängning E10. Aktuell reserv räcker till ca 14:00.",
    base: "ROB_N",
    actionType: "UNIT_FUEL_LOW",
  },
  {
    id: "d-robn-03",
    timestamp: ts(2, 20),
    type: "critical",
    message: "Obehörigt fordon observerat 800 m från startbanans norra ände. Basskydd larmat. Bevakning insatt. Incidentutredning pågår.",
    base: "ROB_N",
  },
  {
    id: "d-robn-04",
    timestamp: ts(1, 0),
    type: "success",
    message: "Säkerhetsincident ROB_N åtgärdad. Fordon identifierat som skogsmaskin från civilt skogsföretag. Larmet avblåst.",
    base: "ROB_N",
  },

  // ── ROB_S – F17 Kallinge ───────────────────────────────────────────────────
  {
    id: "d-robs-01",
    timestamp: ts(5, 5),
    type: "critical",
    message: "Luftvärn vid F17 har upptäckt okänt eko bäring 120, alt 8 000 m. RBS-23 larmat och redo. Identifiering pågår.",
    base: "ROB_S",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-robs-02",
    timestamp: ts(4, 10),
    type: "warning",
    message: "Hangar 2 kapacitetsbrist. 3 maskiner exponerade på uppställningsplats utan splitterskydd. Skyddstält beställda.",
    base: "ROB_S",
  },
  {
    id: "d-robs-03",
    timestamp: ts(3, 0),
    type: "success",
    message: "Obekräftat eko klassificerat som civil luftfart SAS-431 Stockholm–Köpenhamn. Luftvärnet nedgraderat till normal beredskap.",
    base: "ROB_S",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-robs-04",
    timestamp: ts(1, 50),
    type: "info",
    message: "GE21 återvänder från RECCE-uppdrag sektor DELTA. Bildmaterial och sensordata överfört till underrättelsecentral.",
    base: "ROB_S",
    unitId: "ge21",
    actionType: "LANDING_RECEIVED",
  },
  {
    id: "d-robs-05",
    timestamp: ts(0, 50),
    type: "warning",
    message: "3 tekniker sjukanmälda vid ROB_S. Underhållskapacitet reducerad med 25%. Extern förstärkning begärd från MOB.",
    base: "ROB_S",
  },

  // ── ROB_E – F15 Söderhamn ──────────────────────────────────────────────────
  {
    id: "d-robe-01",
    timestamp: ts(4, 40),
    type: "info",
    message: "ROB_E klar. Vägbaser GRB-1 och GRB-2 operativa längs E4-korridoren. Kommunikation etablerad.",
    base: "ROB_E",
    actionType: "UNIT_DEPLOYED",
  },
  {
    id: "d-robe-02",
    timestamp: ts(3, 55),
    type: "warning",
    message: "Kraftigt snöfall vid ROB_E. Plogning pågår. Startberedskap estimerat klar om 45 minuter.",
    base: "ROB_E",
  },
  {
    id: "d-robe-03",
    timestamp: ts(2, 0),
    type: "success",
    message: "GE25 och GE26 klara för insats. ROB_E rapporterar full MC-status för samtliga tilldelade maskiner.",
    base: "ROB_E",
    actionType: "MISSION_DISPATCH",
  },
  {
    id: "d-robe-04",
    timestamp: ts(0, 40),
    type: "critical",
    message: "Kommunikationsavbrott med GE26 i 4 minuter under lågflygning. Återuppkoppling bekräftad. Utredning inledd.",
    base: "ROB_E",
    unitId: "ge26",
    actionType: "FAULT_NMC",
  },
  {
    id: "d-robe-05",
    timestamp: ts(0, 10),
    type: "info",
    message: "Bränsleleverans till ROB_E bekräftad. Ankomst om 2 timmar. Aktuell nivå: 61%.",
    base: "ROB_E",
    actionType: "UNIT_FUEL_LOW",
  },
];
