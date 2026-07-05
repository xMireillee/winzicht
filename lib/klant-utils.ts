import type { Aanbesteding, KlantDossier } from "./types"

/** Trim de klantnaam; lege waarde wordt "Onbekend". */
export function normaliseerKlantNaam(naam: string): string {
  const t = (naam ?? "").trim()
  return t === "" ? "Onbekend" : t
}

/** Case-insensitieve vergelijking van twee klantnamen. */
export function zelfdeKlant(a: string, b: string): boolean {
  return normaliseerKlantNaam(a).toLowerCase() === normaliseerKlantNaam(b).toLowerCase()
}

/** Leeg dossier-datablok (zonder id/naam/metadata). */
export function leegDossierData(): Pick<KlantDossier, "profiel" | "sterktes" | "aandachtspunten" | "afspraken" | "notities"> {
  return { profiel: "", sterktes: "", aandachtspunten: "", afspraken: "", notities: [] }
}

export interface KlantThemaStat {
  thema: string
  totaal: number
  bijVerlies: number
  overwegendVerlies: boolean
  gewogenVerlies: number
}

export interface KlantTijdlijnItem {
  id: string
  datum: string
  opdrachtgever: string
  kenmerk: string
  percelen: { naam: string; uitslag: Aanbesteding["percelen"][number]["uitslag"] }[]
}

export interface KlantStats {
  aantalAanbestedingen: number
  aantalPercelen: number
  gewonnen: number
  verloren: number
  winrate: number | null
  gemVerschil: number | null
  themas: KlantThemaStat[]
  tijdlijn: KlantTijdlijnItem[]
  laatsteInschrijving: string | null
}

/** Bereken client-specifieke cijfers op perceelniveau uit de aanbestedingen van één klant. */
export function berekenKlantStats(items: Aanbesteding[]): KlantStats {
  const percelen = items.flatMap((a) => a.percelen)
  const gewonnen = percelen.filter((p) => p.uitslag === "Gewonnen").length
  const verloren = percelen.filter((p) => p.uitslag === "Verloren").length
  const winrate = gewonnen + verloren > 0 ? gewonnen / (gewonnen + verloren) : null

  const verschillen = percelen
    .filter((p) => p.uitslag === "Verloren" && p.totaalEigen != null && p.totaalWinnaar != null)
    .map((p) => (p.totaalWinnaar as number) - (p.totaalEigen as number))
  const gemVerschil = verschillen.length > 0 ? verschillen.reduce((a, b) => a + b, 0) / verschillen.length : null

  const themaMap = new Map<string, { totaal: number; bijVerlies: number; gewogenVerlies: number }>()
  for (const p of percelen) {
    const verlies = p.uitslag === "Verloren"
    for (const c of p.criteria) {
      const compleet = c.weging != null && c.eigen != null && c.winnaar != null
      const gewogen = compleet
        ? ((c.weging as number) * Math.max(0, (c.winnaar as number) - (c.eigen as number))) / 100
        : 0
      for (const t of [c.thema1, c.thema2]) {
        if (!t) continue
        const cur = themaMap.get(t) ?? { totaal: 0, bijVerlies: 0, gewogenVerlies: 0 }
        cur.totaal += 1
        if (verlies) cur.bijVerlies += 1
        cur.gewogenVerlies += gewogen
        themaMap.set(t, cur)
      }
    }
  }
  const themas: KlantThemaStat[] = Array.from(themaMap.entries())
    .map(([thema, v]) => ({
      thema,
      totaal: v.totaal,
      bijVerlies: v.bijVerlies,
      overwegendVerlies: v.bijVerlies > v.totaal / 2,
      gewogenVerlies: v.gewogenVerlies,
    }))
    .sort((a, b) => b.totaal - a.totaal)

  // Tijdlijn: nieuwste eerst op basis van de briefdatum (val terug op aanmaakdatum).
  const gesorteerd = [...items].sort((a, b) => {
    const da = new Date(a.datum || a.aangemaaktOp).getTime()
    const db = new Date(b.datum || b.aangemaaktOp).getTime()
    return db - da
  })
  const tijdlijn: KlantTijdlijnItem[] = gesorteerd.map((a) => ({
    id: a.id,
    datum: a.datum || a.aangemaaktOp,
    opdrachtgever: a.opdrachtgever,
    kenmerk: a.kenmerk,
    percelen: a.percelen.map((p) => ({ naam: p.naam, uitslag: p.uitslag })),
  }))

  const laatsteInschrijving = tijdlijn.length > 0 ? tijdlijn[0].datum : null

  return {
    aantalAanbestedingen: items.length,
    aantalPercelen: percelen.length,
    gewonnen,
    verloren,
    winrate,
    gemVerschil,
    themas,
    tijdlijn,
    laatsteInschrijving,
  }
}
