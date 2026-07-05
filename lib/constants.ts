// Vaste labellijsten — exact deze Nederlandse strings gebruiken in dropdowns en codering.

export const SECTOREN = [
  "Zorg",
  "Overheid – Rijk",
  "Overheid – gemeente",
  "Onderwijs",
  "Bouw & infra",
  "ICT",
  "Facilitair",
  "Mobiliteit & transport",
  "Energie & duurzaamheid",
  "Overig",
] as const

export const PROCEDURES = [
  "Europees openbaar",
  "Europees niet-openbaar",
  "Nationaal openbaar",
  "Meervoudig onderhands",
  "Enkelvoudig onderhands",
  "Concurrentiegerichte dialoog",
  "Mededingingsprocedure",
] as const

export const THEMAS = [
  "Onvoldoende concreet / SMART",
  "Te generiek, niet toegespitst op opdrachtgever",
  "Onvoldoende aansluiting op vraagstelling",
  "Risico's onvoldoende uitgewerkt",
  "Implementatie/planning overtuigend",
  "Implementatie/planning zwak",
  "Sterk inlevingsvermogen / goede situatieschets",
  "Duurzaamheid/SROI onderscheidend",
  "Duurzaamheid/SROI zwak",
  "Prijs te hoog t.o.v. kwaliteit",
  "Prijs gunstig",
  "Team/CV's overtuigend",
  "Team/CV's zwak",
  "Innovatief / onderscheidend voorstel",
  "Weinig onderscheidend vermogen",
  "Structuur/leesbaarheid sterk",
  "Structuur/leesbaarheid zwak",
  "Meerwaarde onvoldoende aangetoond",
  "Overig / niet te coderen",
] as const

export const LEERPUNTEN = [
  "Eerder starten / planning intern",
  "Betere uitvraag bij klant",
  "Scherpere win-thema's bepalen",
  "Meer bewijsvoering / cases opnemen",
  "Concreter en SMART schrijven",
  "Review-proces verbeteren",
  "Prijsstrategie herzien",
  "Kennis van opdrachtgever verdiepen",
  "Rolverdeling team verduidelijken",
  "Verwachtingsmanagement klant",
  "Urenraming realistischer",
  "Kennisborging / hergebruik teksten",
] as const

// Procesaspecten voor de interne evaluatie (los van de inhoud). Elk aspect wordt
// als vrije toelichting vastgelegd; de `key` verwijst naar het veld op InterneEvaluatie.
export const PROCES_ASPECTEN = [
  { key: "planningToelichting", label: "Planning & tijdigheid", hint: "Op tijd gestart, deadlines gehaald, geen last-minute stress?" },
  { key: "klantinputToelichting", label: "Klant-/opdrachtgever-input", hint: "Kwaliteit en tijdigheid van de aangeleverde input." },
  { key: "urenToelichting", label: "Urenbesteding vs. raming", hint: "Werkelijke inzet t.o.v. de begrote uren en waarom." },
  { key: "samenwerkingToelichting", label: "Samenwerking met klant", hint: "Verloop van de samenwerking en afstemming." },
] as const

export const UITSLAGEN = ["Gewonnen", "Verloren", "Ingetrokken", "Onbekend"] as const

export const SENTIMENTEN = ["Positief", "Negatief", "Gemengd", "Neutraal"] as const

export const JA_NEE = ["Ja", "Nee"] as const
