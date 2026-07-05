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
  klantcontact: number | null
  binnenUren: JaNee
  afwijking: number | null
  leerpunt1: string
  leerpunt2: string
  // Procesevaluatie — kwalitatieve toelichting per aspect (gericht op het proces, niet de inhoud).
  planningToelichting: string
  klantinputToelichting: string
  urenToelichting: string
  samenwerkingToelichting: string
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
