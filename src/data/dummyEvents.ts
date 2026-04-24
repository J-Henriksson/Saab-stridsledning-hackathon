import type { GameEvent } from "@/types/game";

// Covers all bases, all event types, and all three scopes:
//   global  → no base field
//   base    → base field set, no unitId
//   entity  → base + unitId both set

export const DUMMY_EVENTS: GameEvent[] = [
  // ── GLOBAL ──────────────────────────────────────────────────────────────────
  {
    id: "d-g-01",
    timestamp: "Dag 1 06:00",
    type: "critical",
    message: "HÖJD BEREDSKAP: Oidentifierade flygföremål observerade längs östra kustlinjen. Samtliga baser försätts i KRIG-beredskap.",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-g-02",
    timestamp: "Dag 1 06:30",
    type: "warning",
    message: "Väderleksvarning: kraftig dimma förväntas längs Norrlandskusten. Reducerad sikt kan påverka startfönster vid FOB N och ROB N.",
  },
  {
    id: "d-g-03",
    timestamp: "Dag 1 07:15",
    type: "info",
    message: "Flygvapnet bekräftar: ATO-order för perioden Dag 1 08:00–Dag 2 06:00 är distribuerade till samtliga baser.",
    actionType: "MISSION_DISPATCH",
  },
  {
    id: "d-g-04",
    timestamp: "Dag 1 08:45",
    type: "success",
    message: "NATO-samordning bekräftad. Luftrumssektorer N2 och N3 överlämnade till flygledarcentral CAOC Ramstein.",
  },
  {
    id: "d-g-05",
    timestamp: "Dag 1 09:00",
    type: "warning",
    message: "Cyberhot detekterat mot militärt kommunikationsnät. IT-säkerhetsprotokoll Tier-2 aktiverat.",
  },
  {
    id: "d-g-06",
    timestamp: "Dag 1 11:30",
    type: "info",
    message: "Övning ARKTISK VIND avslutad. Alla enheter rapporterar klar för skarp insats.",
    actionType: "UNIT_RECALLED",
  },

  // ── MOB – F7 Malmen ─────────────────────────────────────────────────────────
  {
    id: "d-mob-01",
    timestamp: "Dag 1 06:05",
    type: "critical",
    message: "Brandalarm utlöst i Hangar 3. Brandkår insatt. GE04 och GE07 evakuerade till öppet uppställningsplats.",
    base: "MOB",
    actionType: "FAULT_NMC",
  },
  {
    id: "d-mob-02",
    timestamp: "Dag 1 07:00",
    type: "warning",
    message: "Bränslenivå vid MOB sjunkit till 38%. Tankvagn begärd från Östgöta logistikdepå.",
    base: "MOB",
    actionType: "UNIT_FUEL_LOW",
  },
  {
    id: "d-mob-03",
    timestamp: "Dag 1 08:00",
    type: "info",
    message: "GripenE-division Alpha klar för uppdrag. 6 av 8 maskiner i MC-status.",
    base: "MOB",
    actionType: "MISSION_DISPATCH",
  },
  {
    id: "d-mob-04",
    timestamp: "Dag 1 09:30",
    type: "success",
    message: "QRA-beredskap upprätthållen. Maschinen GE01 och GE02 startklara inom 5 minuter.",
    base: "MOB",
  },
  {
    id: "d-mob-05",
    timestamp: "Dag 1 10:15",
    type: "warning",
    message: "Reservdel LRU-47 (EW-modul) slut i lager. Beställning lagd med prio 1 till FMV.",
    base: "MOB",
    actionType: "SPARE_PART_USED",
  },
  {
    id: "d-mob-06",
    timestamp: "Dag 1 11:00",
    type: "critical",
    message: "GE09 rapporterar hydraulikläcka vid landning. Hangar 1 blockerad. Underhåll pågår.",
    base: "MOB",
    unitId: "ge09",
    actionType: "FAULT_NMC",
  },

  // ── FOB_N – F21 Luleå ───────────────────────────────────────────────────────
  {
    id: "d-fobn-01",
    timestamp: "Dag 1 05:50",
    type: "critical",
    message: "Luftvärn vid FOB N har identifierat okänt radareko på 12 000 m höjd, bäring 045. Eskortuppdrag begärs.",
    base: "FOB_N",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-fobn-02",
    timestamp: "Dag 1 06:45",
    type: "warning",
    message: "Avisningskapacitet begränsad. Kö på 4 maskiner. Start fördröjd med uppskattningsvis 35 minuter.",
    base: "FOB_N",
  },
  {
    id: "d-fobn-03",
    timestamp: "Dag 1 08:20",
    type: "success",
    message: "DCA-patrull GE11/GE12 startade i tid. Luftrumskontroll upprätthålls i sektor NORTH.",
    base: "FOB_N",
    unitId: "ge11",
    actionType: "MISSION_DISPATCH",
  },
  {
    id: "d-fobn-04",
    timestamp: "Dag 1 09:10",
    type: "info",
    message: "Personalförstärkning anländ: 12 tekniker från F21 reserve. Underhållskapacitet ökad med 30%.",
    base: "FOB_N",
  },
  {
    id: "d-fobn-05",
    timestamp: "Dag 1 10:50",
    type: "warning",
    message: "Ammunition Meteor BVRAAM: 4 robotar kvar. Omfördelning från MOB-lager begärd.",
    base: "FOB_N",
    actionType: "SPARE_PART_USED",
  },

  // ── FOB_S – F10 Ängelholm ───────────────────────────────────────────────────
  {
    id: "d-fobs-01",
    timestamp: "Dag 1 06:10",
    type: "info",
    message: "F10 rapporterar startberedskap. Banan operativ, alla navigationshjälpmedel aktiva.",
    base: "FOB_S",
  },
  {
    id: "d-fobs-02",
    timestamp: "Dag 1 07:30",
    type: "warning",
    message: "Fogelstad radarstation rapporterar störning på frekvens 3 300 MHz. Trolig elektronisk motverkan från öst.",
    base: "FOB_S",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-fobs-03",
    timestamp: "Dag 1 08:55",
    type: "critical",
    message: "GE17 nödlandning pga motorfel. Pilot oskadad. Banan avspärrad i 20 minuter.",
    base: "FOB_S",
    unitId: "ge17",
    actionType: "UTFALL_APPLIED",
  },
  {
    id: "d-fobs-04",
    timestamp: "Dag 1 10:00",
    type: "success",
    message: "Banan återöppnad. GE17 bogseras till underhåll. Övriga maskiner oskadade.",
    base: "FOB_S",
    actionType: "HANGAR_CONFIRM",
  },

  // ── ROB_N – Vidsel ──────────────────────────────────────────────────────────
  {
    id: "d-robn-01",
    timestamp: "Dag 1 06:00",
    type: "info",
    message: "ROB N aktiverat. 2 GripenE positionerade för QRA-stöd norra sektorn.",
    base: "ROB_N",
    actionType: "UNIT_DEPLOYED",
  },
  {
    id: "d-robn-02",
    timestamp: "Dag 1 07:45",
    type: "warning",
    message: "Bränsletransport försenad 3 timmar pga vägstängning E10. Aktuell reserv räcker till kl 14:00.",
    base: "ROB_N",
    actionType: "UNIT_FUEL_LOW",
  },
  {
    id: "d-robn-03",
    timestamp: "Dag 1 09:20",
    type: "critical",
    message: "Obehörig fordon observerat 800 m från startbanans norra ände. Basskydd larmat. Incidentutredning inledd.",
    base: "ROB_N",
  },

  // ── ROB_S – F17 Kallinge ────────────────────────────────────────────────────
  {
    id: "d-robs-01",
    timestamp: "Dag 1 05:55",
    type: "critical",
    message: "Luftvärn vid F17 har upptäckt okänt eko bäring 120, alt 8 000 m. Robotluftvärn RBS-23 larmat.",
    base: "ROB_S",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-robs-02",
    timestamp: "Dag 1 07:10",
    type: "warning",
    message: "Hangar 2 kapacitetsbrist. 3 maskiner exponerade på uppställningsplats utan splitterskydd.",
    base: "ROB_S",
  },
  {
    id: "d-robs-03",
    timestamp: "Dag 1 08:30",
    type: "success",
    message: "Obekräftat eko klassificerat som civil luftfart SAS-431. Luftvärnet nedgraderat till beredskap.",
    base: "ROB_S",
    actionType: "CONTACT_CLASSIFIED",
  },
  {
    id: "d-robs-04",
    timestamp: "Dag 1 09:45",
    type: "info",
    message: "GE21 återvänder från RECCE-uppdrag. Bildmaterial överfört till underrättelsecentral.",
    base: "ROB_S",
    unitId: "ge21",
    actionType: "LANDING_RECEIVED",
  },
  {
    id: "d-robs-05",
    timestamp: "Dag 1 11:20",
    type: "warning",
    message: "Personal: 3 tekniker sjukanmälda. Underhållskapacitet reducerad. Extern förstärkning begärd.",
    base: "ROB_S",
  },

  // ── ROB_E – F15 Söderhamn ───────────────────────────────────────────────────
  {
    id: "d-robe-01",
    timestamp: "Dag 1 06:20",
    type: "info",
    message: "ROB E klar. Vägbaser GRB-1 och GRB-2 operativa längs E4-korridoren.",
    base: "ROB_E",
    actionType: "UNIT_DEPLOYED",
  },
  {
    id: "d-robe-02",
    timestamp: "Dag 1 07:55",
    type: "warning",
    message: "Kraftigt snöfall. Plogning pågår. Startberedskap estimerat klar om 45 minuter.",
    base: "ROB_E",
  },
  {
    id: "d-robe-03",
    timestamp: "Dag 1 09:00",
    type: "success",
    message: "GE25 och GE26 klara för insats. F15 rapporterar full MC-status för tilldelade maskiner.",
    base: "ROB_E",
    actionType: "MISSION_DISPATCH",
  },
  {
    id: "d-robe-04",
    timestamp: "Dag 1 10:30",
    type: "critical",
    message: "Kommunikationsavbrott med GE26 under 4 minuter. Återuppkoppling bekräftad. Utredning inledd.",
    base: "ROB_E",
    unitId: "ge26",
    actionType: "FAULT_NMC",
  },
];
