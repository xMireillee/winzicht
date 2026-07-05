import type { Aanbesteding, Criterium, InterneEvaluatie, Perceel } from "./types"

export function leegCriterium(): Criterium {
  return {
    naam: "",
    weging: null,
    max: null,
    eigen: null,
    winnaar: null,
    feedback: "",
    thema1: "",
    thema2: "",
    sentiment: "",
  }
}

export function leegPerceel(naam = "Geheel"): Perceel {
  return {
    naam,
    uitslag: "Onbekend",
    positie: null,
    aantalInschrijvers: null,
    totaalEigen: null,
    totaalWinnaar: null,
    criteria: [leegCriterium()],
  }
}

export function legeEvaluatie(): InterneEvaluatie {
  return {
    klantcontact: null,
    binnenUren: "",
    afwijking: null,
    leerpunt1: "",
    leerpunt2: "",
    planningToelichting: "",
    klantinputToelichting: "",
    urenToelichting: "",
    samenwerkingToelichting: "",
    planningThema: "",
    klantinputThema: "",
    urenThema: "",
    samenwerkingThema: "",
  }
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function str(v: unknown): string {
  return typeof v === "string" ? v : ""
}

/** Voeg een (mogelijk incompleet) extractieresultaat samen met veilige defaults. */
export function mergeCriterium(raw: Partial<Criterium> | undefined): Criterium {
  const base = leegCriterium()
  if (!raw) return base
  return {
    naam: str(raw.naam),
    weging: num(raw.weging),
    max: num(raw.max),
    eigen: num(raw.eigen),
    winnaar: num(raw.winnaar),
    feedback: str(raw.feedback),
    thema1: str(raw.thema1),
    thema2: str(raw.thema2),
    sentiment: (str(raw.sentiment) as Criterium["sentiment"]) ?? "",
  }
}

export function mergePerceel(raw: Partial<Perceel> | undefined): Perceel {
  const base = leegPerceel()
  if (!raw) return base
  const criteria = Array.isArray(raw.criteria) && raw.criteria.length > 0 ? raw.criteria.map(mergeCriterium) : [leegCriterium()]
  const uitslag = str(raw.uitslag)
  return {
    naam: str(raw.naam) || "Geheel",
    uitslag: (["Gewonnen", "Verloren", "Ingetrokken", "Onbekend"].includes(uitslag) ? uitslag : "Onbekend") as Perceel["uitslag"],
    positie: num(raw.positie),
    aantalInschrijvers: num(raw.aantalInschrijvers),
    totaalEigen: num(raw.totaalEigen),
    totaalWinnaar: num(raw.totaalWinnaar),
    criteria,
  }
}

/** Maak van ruwe (AI-)data een volledig Aanbesteding-object voor het reviewformulier. */
export function normaliseerExtractie(raw: Record<string, unknown>): Omit<Aanbesteding, "id" | "aangemaaktOp"> {
  const percelenRaw = Array.isArray(raw.percelen) ? (raw.percelen as Partial<Perceel>[]) : []
  const percelen = percelenRaw.length > 0 ? percelenRaw.map(mergePerceel) : [leegPerceel()]
  return {
    opdrachtgever: str(raw.opdrachtgever),
    klant: str(raw.klant),
    kenmerk: str(raw.kenmerk),
    sector: str(raw.sector),
    procedure: str(raw.procedure),
    datum: str(raw.datum),
    bron: str(raw.bron),
    aangemaaktDoor: str(raw.aangemaaktDoor),
    percelen,
    evaluatie: null,
  }
}

export function formatDatum(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
}

/** Jaar (als string) van een ISO-datum, of null als de datum ontbreekt/ongeldig is. */
export function jaarVan(iso: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return String(d.getFullYear())
}

/** Kwartaallabel "Q1 2024" van een ISO-datum, of null. */
export function kwartaalVan(iso: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const q = Math.floor(d.getMonth() / 3) + 1
  return `Q${q} ${d.getFullYear()}`
}

/** Bevat de aanbesteding het gegeven thema (als thema1 of thema2 op enig criterium)? */
export function heeftThema(a: Aanbesteding, thema: string): boolean {
  const t = thema.trim().toLowerCase()
  if (t === "") return true
  return a.percelen.some((p) =>
    p.criteria.some((c) => c.thema1.toLowerCase() === t || c.thema2.toLowerCase() === t),
  )
}

/**
 * Datakwaliteit: geeft een lijst met concrete ontbrekende velden terug.
 * Een aanbesteding is "onvolledig" als deze lijst niet leeg is.
 */
export function ontbrekendeVelden(a: Aanbesteding): string[] {
  const issues: string[] = []
  if (!a.datum || Number.isNaN(new Date(a.datum).getTime())) issues.push("briefdatum")
  if (!a.sector) issues.push("sector")
  if (!a.klant) issues.push("klant")

  let critZonderScore = 0
  let critZonderThema = 0
  for (const p of a.percelen) {
    for (const c of p.criteria) {
      if (c.weging == null || c.eigen == null || c.winnaar == null) critZonderScore += 1
      if (!c.thema1 && !c.thema2) critZonderThema += 1
    }
  }
  if (critZonderScore > 0) issues.push(`${critZonderScore}× criterium zonder volledige scores`)
  if (critZonderThema > 0) issues.push(`${critZonderThema}× criterium zonder thema`)
  const verlorenZonderEval = a.percelen.some((p) => p.uitslag === "Verloren") && a.evaluatie == null
  if (verlorenZonderEval) issues.push("interne evaluatie ontbreekt")
  return issues
}

export function isOnvolledig(a: Aanbesteding): boolean {
  return ontbrekendeVelden(a).length > 0
}
