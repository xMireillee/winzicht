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

// Open reflectievragen voor de interne evaluatie. Elke `key` komt overeen met een
// tekstveld op InterneEvaluatie; `label` is de vraag en `hint` de toelichting eronder.
export const EVALUATIE_VRAGEN = [
  {
    key: "terugblik",
    label: "Hoe kijk je terug op dit project?",
    hint: "Wat ging goed en wat zou je een volgende keer anders doen?",
  },
  {
    key: "contact",
    label: "Hoe verliep het contact met de klant?",
    hint: "Denk aan duidelijkheid van de vraag, samenwerking en verwachtingen over en weer.",
  },
  {
    key: "planningUren",
    label: "Hoe ging het project qua planning en uren?",
    hint: "Bleven we binnen de begrote uren? Zo niet, waar zat dat in?",
  },
  {
    key: "leerpunten",
    label: "Wat zijn de belangrijkste leerpunten uit dit project?",
    hint: "Dingen die we als team of organisatie mee kunnen nemen naar een volgende opdracht.",
  },
  {
    key: "hoogtepunt",
    label: "Waar werd je blij van in dit project?",
    hint: "Bijvoorbeeld een moment, samenwerking, resultaat of reactie van de klant.",
  },
] as const

export const UITSLAGEN = ["Gewonnen", "Verloren", "Ingetrokken", "Onbekend"] as const

export const SENTIMENTEN = ["Positief", "Negatief", "Gemengd", "Neutraal"] as const

export const JA_NEE = ["Ja", "Nee"] as const
