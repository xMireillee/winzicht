export type Uitslag = "Gewonnen" | "Verloren" | "Ingetrokken" | "Onbekend"
export type Sentiment = "Positief" | "Negatief" | "Gemengd" | "Neutraal" | ""
export type JaNee = "Ja" | "Nee" | ""

export interface Criterium {
  naam: string
  weging: number | null
  max: number | null
  eigen: number | null
  winnaar: number | null
  feedback: string
  thema1: string
  thema2: string
  sentiment: Sentiment
}

export interface Perceel {
  naam: string
  uitslag: Uitslag
  positie: number | null
  aantalInschrijvers: number | null
  totaalEigen: number | null
  totaalWinnaar: number | null
  criteria: Criterium[]
}

export interface InterneEvaluatie {
  // Enige kwantitatieve maat: afwijking op de begrote uren in procenten (+ = overschrijding).
  afwijking: number | null
  // Vijf open reflectievragen (zie EVALUATIE_VRAGEN in lib/constants.ts). De sleutels
  // hieronder zijn nieuw; oudere evaluaties met de vroegere velden (klantcontact,
  // binnenUren, leerpunt1/2, *Toelichting, *Thema) blijven in de database staan maar
  // worden niet meer getoond of geanalyseerd.
  terugblik: string // Hoe kijk je terug op dit project?
  contact: string // Hoe verliep het contact met de klant?
  planningUren: string // Hoe ging het project qua planning en uren?
  leerpunten: string // Wat zijn de belangrijkste leerpunten?
  hoogtepunt: string // Waar werd je blij van in dit project?
}

// Door AI gegenereerde debrief van één aanbesteding; wordt in de JSONB-data bewaard.
export interface Debrief {
  tekst: string
  gegenereerdOp: string // ISO-timestamp, server-side gezet
  door: string // e-mail van wie de debrief genereerde
}

// AI-analyse van de behaalde scores t.o.v. de beoordelingssystematiek uit de leidraad.
export type LeidraadAnalyse = Debrief

// Eén niveau van een beoordelingsschaal uit de leidraad (bijv. score 8 = "goed" + omschrijving).
export interface SchaalNiveau {
  score: number | null
  label: string
  omschrijving: string
}

// Gunningscriterium zoals beschreven in de aanbestedingsleidraad.
export interface LeidraadCriterium {
  naam: string
  weging: number | null
  maxScore: number | null
  omschrijving: string // wat er wordt gevraagd/beoordeeld
  schaal: SchaalNiveau[] // letterlijke schaalomschrijvingen per scoreniveau
}

// Geëxtraheerde beoordelingssystematiek uit de aanbestedingsleidraad.
export interface Leidraad {
  bron: string // bestandsnaam
  methodiek: string // bijv. gewogen gemiddelde, prijs-kwaliteitformule
  knockOuts: string[]
  criteria: LeidraadCriterium[]
  geuploadOp: string // ISO-timestamp, server-side gezet
  door: string
}

export interface Aanbesteding {
  id: string
  opdrachtgever: string
  klant: string
  kenmerk: string
  sector: string
  procedure: string
  datum: string
  bron: string
  aangemaaktOp: string
  aangemaaktDoor?: string
  percelen: Perceel[]
  evaluatie: InterneEvaluatie | null
  debrief?: Debrief | null
  leidraad?: Leidraad | null
  leidraadAnalyse?: LeidraadAnalyse | null
}

// Wat de extractie-API teruggeeft (zonder id/metadata).
export type ExtractieResultaat = Omit<Aanbesteding, "id" | "aangemaaktOp" | "bron" | "evaluatie" | "aangemaaktDoor">

export interface KlantNotitie {
  datum: string // ISO-timestamp, server-side gezet
  auteur: string // e-mail van ingelogde gebruiker, server-side gezet
  tekst: string
}

export interface KlantDossier {
  id: string
  klantNaam: string // komt overeen met Aanbesteding.klant; genormaliseerd (trim), case-insensitief gematcht
  profiel: string
  sterktes: string
  aandachtspunten: string
  afspraken: string
  notities: KlantNotitie[]
  bijgewerktOp: string
}

// Bewerkbaar deel van het dossier dat de client naar de server stuurt.
export type KlantDossierInvoer = Pick<KlantDossier, "profiel" | "sterktes" | "aandachtspunten" | "afspraken">
