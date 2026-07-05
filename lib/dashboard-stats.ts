import { PROCES_ASPECTEN } from "./constants"
import type { Aanbesteding, Perceel } from "./types"

export interface ProcesAspectStat {
  key: string
  label: string
  aantal: number
  notities: { klant: string; kenmerk: string; tekst: string; thema: string }[]
}

export interface ProcesThemaStat {
  thema: string
  aantal: number
}

export interface ProcesStats {
  metEvaluatie: number
  binnenUrenPct: number | null
  binnenUrenJa: number
  binnenUrenNee: number
  gemAfwijking: number | null
  gemKlantcontact: number | null
  aspecten: ProcesAspectStat[]
  procesThemas: ProcesThemaStat[]
}

export interface ThemaStat {
  thema: string
  totaal: number
  bijVerlies: number
  overwegendVerlies: boolean
  gewogenVerlies: number
}

export interface GewogenVerliesResultaat {
  themas: { thema: string; gewogenVerlies: number }[]
  meegeteld: number
  overgeslagen: number
}

/**
 * Gewogen puntenverlies per thema. Voor elk criterium waar het thema als thema1 of
 * thema2 voorkomt: weging × max(0, winnaar − eigen) / 100, gesommeerd. Criteria met
 * ontbrekende weging/eigen/winnaar worden overgeslagen en geteld.
 */
export function berekenGewogenVerlies(items: Aanbesteding[]): GewogenVerliesResultaat {
  const map = new Map<string, number>()
  let meegeteld = 0
  let overgeslagen = 0
  const gezien = new Set<unknown>()

  for (const a of items) {
    for (const p of a.percelen) {
      for (const c of p.criteria) {
        const themas = [c.thema1, c.thema2].filter(Boolean) as string[]
        if (themas.length === 0) continue
        const compleet = c.weging != null && c.eigen != null && c.winnaar != null
        if (!compleet) {
          if (!gezien.has(c)) {
            overgeslagen += 1
            gezien.add(c)
          }
          continue
        }
        if (!gezien.has(c)) {
          meegeteld += 1
          gezien.add(c)
        }
        const verlies = ((c.weging as number) * Math.max(0, (c.winnaar as number) - (c.eigen as number))) / 100
        for (const t of themas) {
          map.set(t, (map.get(t) ?? 0) + verlies)
        }
      }
    }
  }

  const themas = Array.from(map.entries())
    .map(([thema, gewogenVerlies]) => ({ thema, gewogenVerlies }))
    .sort((a, b) => b.gewogenVerlies - a.gewogenVerlies)

  return { themas, meegeteld, overgeslagen }
}

export interface SectorStat {
  sector: string
  gewonnen: number
  verloren: number
  winrate: number | null
}

export interface LeerpuntStat {
  leerpunt: string
  aantal: number
}

export function berekenStats(items: Aanbesteding[]) {
  const percelen = items.flatMap((a) => a.percelen)
  const aantalPercelen = percelen.length
  const aantalAanbestedingen = items.length

  const gewonnen = percelen.filter((p) => p.uitslag === "Gewonnen").length
  const verloren = percelen.filter((p) => p.uitslag === "Verloren").length
  const winrate = gewonnen + verloren > 0 ? gewonnen / (gewonnen + verloren) : null

  // Gemiddeld scoreverschil met winnaar bij verloren percelen.
  const verschillen = percelen
    .filter((p) => p.uitslag === "Verloren" && p.totaalEigen != null && p.totaalWinnaar != null)
    .map((p) => (p.totaalWinnaar as number) - (p.totaalEigen as number))
  const gemVerschil = verschillen.length > 0 ? verschillen.reduce((a, b) => a + b, 0) / verschillen.length : null

  // Thema's: tel thema1 + thema2, hoe vaak bij verloren percelen, en gewogen verlies.
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
  const themas: ThemaStat[] = Array.from(themaMap.entries())
    .map(([thema, v]) => ({
      thema,
      totaal: v.totaal,
      bijVerlies: v.bijVerlies,
      overwegendVerlies: v.bijVerlies > v.totaal / 2,
      gewogenVerlies: v.gewogenVerlies,
    }))
    .sort((a, b) => b.totaal - a.totaal)

  // Winrate per sector (op perceelniveau).
  const sectorMap = new Map<string, { gewonnen: number; verloren: number }>()
  for (const a of items) {
    const sec = a.sector || "Onbekend"
    for (const p of a.percelen) {
      const cur = sectorMap.get(sec) ?? { gewonnen: 0, verloren: 0 }
      if (p.uitslag === "Gewonnen") cur.gewonnen += 1
      if (p.uitslag === "Verloren") cur.verloren += 1
      sectorMap.set(sec, cur)
    }
  }
  const sectoren: SectorStat[] = Array.from(sectorMap.entries())
    .map(([sector, v]) => ({
      sector,
      gewonnen: v.gewonnen,
      verloren: v.verloren,
      winrate: v.gewonnen + v.verloren > 0 ? v.gewonnen / (v.gewonnen + v.verloren) : null,
    }))
    .filter((s) => s.gewonnen + s.verloren > 0)
    .sort((a, b) => (b.winrate ?? -1) - (a.winrate ?? -1))

  // Terugkerende leerpunten uit interne evaluaties.
  const leerMap = new Map<string, number>()
  for (const a of items) {
    if (!a.evaluatie) continue
    for (const lp of [a.evaluatie.leerpunt1, a.evaluatie.leerpunt2]) {
      if (!lp) continue
      leerMap.set(lp, (leerMap.get(lp) ?? 0) + 1)
    }
  }
  const leerpunten: LeerpuntStat[] = Array.from(leerMap.entries())
    .map(([leerpunt, aantal]) => ({ leerpunt, aantal }))
    .sort((a, b) => b.aantal - a.aantal)

  // Procesevaluatie: kwantitatieve kerncijfers + kwalitatieve toelichtingen per aspect.
  const metEval = items.filter((a) => a.evaluatie)
  const binnenUrenJa = metEval.filter((a) => a.evaluatie?.binnenUren === "Ja").length
  const binnenUrenNee = metEval.filter((a) => a.evaluatie?.binnenUren === "Nee").length
  const urenBekend = binnenUrenJa + binnenUrenNee
  const binnenUrenPct = urenBekend > 0 ? binnenUrenJa / urenBekend : null

  const afwijkingen = metEval
    .map((a) => a.evaluatie?.afwijking)
    .filter((n): n is number => typeof n === "number")
  const gemAfwijking = afwijkingen.length > 0 ? afwijkingen.reduce((a, b) => a + b, 0) / afwijkingen.length : null

  const klantcontacten = metEval
    .map((a) => a.evaluatie?.klantcontact)
    .filter((n): n is number => typeof n === "number")
  const gemKlantcontact =
    klantcontacten.length > 0 ? klantcontacten.reduce((a, b) => a + b, 0) / klantcontacten.length : null

  const aspecten: ProcesAspectStat[] = PROCES_ASPECTEN.map((asp) => {
    const notities = items
      .map((a) => {
        const tekst = (a.evaluatie?.[asp.key] ?? "").trim()
        const thema = (a.evaluatie?.[asp.themaKey] ?? "").trim()
        return tekst ? { klant: a.klant || a.opdrachtgever || "Onbekend", kenmerk: a.kenmerk, tekst, thema } : null
      })
      .filter((n): n is ProcesAspectStat["notities"][number] => n !== null)
    return { key: asp.key, label: asp.label, aantal: notities.length, notities }
  })

  // Terugkerende procesthema's, over alle vier de aspecten heen.
  const procesThemaMap = new Map<string, number>()
  for (const a of items) {
    if (!a.evaluatie) continue
    for (const asp of PROCES_ASPECTEN) {
      const thema = a.evaluatie[asp.themaKey]
      if (!thema) continue
      procesThemaMap.set(thema, (procesThemaMap.get(thema) ?? 0) + 1)
    }
  }
  const procesThemas: ProcesThemaStat[] = Array.from(procesThemaMap.entries())
    .map(([thema, aantal]) => ({ thema, aantal }))
    .sort((a, b) => b.aantal - a.aantal)

  const proces: ProcesStats = {
    metEvaluatie: metEval.length,
    binnenUrenPct,
    binnenUrenJa,
    binnenUrenNee,
    gemAfwijking,
    gemKlantcontact,
    aspecten,
    procesThemas,
  }

  return {
    aantalPercelen,
    aantalAanbestedingen,
    gewonnen,
    verloren,
    winrate,
    gemVerschil,
    themas,
    sectoren,
    leerpunten,
    proces,
  }
}

export interface SectorAnalyseStat {
  sector: string
  gewonnen: number
  verloren: number
  winrate: number | null
  metEvaluatie: number
  binnenUrenPct: number | null
  gemAfwijking: number | null
  gemKlantcontact: number | null
}

/**
 * Winrate + procescijfers per sector, zodat zichtbaar wordt waar niet alleen vaker
 * wordt verloren maar ook waar de urenbesteding of samenwerking structureel afwijkt.
 */
export function berekenSectorAnalyse(items: Aanbesteding[]): SectorAnalyseStat[] {
  const map = new Map<string, Aanbesteding[]>()
  for (const a of items) {
    const sec = a.sector || "Onbekend"
    const groep = map.get(sec) ?? []
    groep.push(a)
    map.set(sec, groep)
  }

  const result: SectorAnalyseStat[] = Array.from(map.entries()).map(([sector, groep]) => {
    const percelen = groep.flatMap((a) => a.percelen)
    const gewonnen = percelen.filter((p) => p.uitslag === "Gewonnen").length
    const verloren = percelen.filter((p) => p.uitslag === "Verloren").length
    const winrate = gewonnen + verloren > 0 ? gewonnen / (gewonnen + verloren) : null

    const metEval = groep.filter((a) => a.evaluatie)
    const binnenUrenJa = metEval.filter((a) => a.evaluatie?.binnenUren === "Ja").length
    const binnenUrenNee = metEval.filter((a) => a.evaluatie?.binnenUren === "Nee").length
    const urenBekend = binnenUrenJa + binnenUrenNee
    const binnenUrenPct = urenBekend > 0 ? binnenUrenJa / urenBekend : null

    const afwijkingen = metEval
      .map((a) => a.evaluatie?.afwijking)
      .filter((n): n is number => typeof n === "number")
    const gemAfwijking = afwijkingen.length > 0 ? afwijkingen.reduce((a, b) => a + b, 0) / afwijkingen.length : null

    const klantcontacten = metEval
      .map((a) => a.evaluatie?.klantcontact)
      .filter((n): n is number => typeof n === "number")
    const gemKlantcontact =
      klantcontacten.length > 0 ? klantcontacten.reduce((a, b) => a + b, 0) / klantcontacten.length : null

    return {
      sector,
      gewonnen,
      verloren,
      winrate,
      metEvaluatie: metEval.length,
      binnenUrenPct,
      gemAfwijking,
      gemKlantcontact,
    }
  })

  return result
    .filter((s) => s.gewonnen + s.verloren > 0 || s.metEvaluatie > 0)
    .sort((a, b) => b.gewonnen + b.verloren - (a.gewonnen + a.verloren))
}

// ── Extra dashboard-afgeleiden (volledig client-side berekend) ──────────────

export interface KwartaalWinrate {
  key: string // "2025-1" voor sortering
  label: string // "Q1 '25"
  gewonnen: number
  verloren: number
  winrate: number | null
}

export interface DashboardActie {
  id: string
  type: "bezwaar" | "evaluatie" | "dossier"
  tekst: string
  href: string
}

function kwartaalVan(iso: string): { key: string; label: string; jaar: number; q: number } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const q = Math.floor(d.getMonth() / 3) + 1
  const jaar = d.getFullYear()
  return { key: `${jaar}-${q}`, label: `Q${q} '${String(jaar).slice(2)}`, jaar, q }
}

/** Winrate per kwartaal (op perceelniveau), gesorteerd op tijd. */
export function berekenKwartaalWinrate(items: Aanbesteding[]): KwartaalWinrate[] {
  const map = new Map<string, { label: string; gewonnen: number; verloren: number }>()
  for (const a of items) {
    const kw = kwartaalVan(a.datum)
    if (!kw) continue
    const cur = map.get(kw.key) ?? { label: kw.label, gewonnen: 0, verloren: 0 }
    for (const p of a.percelen) {
      if (p.uitslag === "Gewonnen") cur.gewonnen += 1
      if (p.uitslag === "Verloren") cur.verloren += 1
    }
    map.set(kw.key, cur)
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      gewonnen: v.gewonnen,
      verloren: v.verloren,
      winrate: v.gewonnen + v.verloren > 0 ? v.gewonnen / (v.gewonnen + v.verloren) : null,
    }))
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))
}

/** Delta van de winrate van het laatste kwartaal t.o.v. het voorgaande (in %-punten). */
export function winrateDelta(kwartalen: KwartaalWinrate[]): number | null {
  const metData = kwartalen.filter((k) => k.winrate != null)
  if (metData.length < 2) return null
  const laatste = metData[metData.length - 1].winrate as number
  const vorige = metData[metData.length - 2].winrate as number
  return Math.round((laatste - vorige) * 100)
}

/** Kwaliteitsscore van een perceel: som van criteria die niet over prijs gaan. */
function kwaliteit(perceel: Perceel, veld: "eigen" | "winnaar"): number | null {
  const rel = perceel.criteria.filter((c) => !/prij|kosten|tarief/i.test(c.naam) && c[veld] != null)
  if (rel.length === 0) return null
  return rel.reduce((sum, c) => sum + (c[veld] as number), 0)
}

/** % percelen waar de eigen kwaliteitsscore ≥ die van de winnaar. */
export function kwalitatiefAlsBestePct(items: Aanbesteding[]): { pct: number | null; aantal: number } {
  let teller = 0
  let beste = 0
  for (const a of items) {
    for (const p of a.percelen) {
      const eigen = kwaliteit(p, "eigen")
      const winnaar = kwaliteit(p, "winnaar")
      if (eigen == null || winnaar == null) continue
      teller += 1
      if (eigen >= winnaar) beste += 1
    }
  }
  return { pct: teller > 0 ? beste / teller : null, aantal: teller }
}

/** Eén platte-taal-conclusie over verlies-thema's. */
export function themaTakeaway(themas: ThemaStat[]): string | null {
  const uitsluitend = themas.filter((t) => t.totaal >= 2 && t.bijVerlies === t.totaal)
  if (uitsluitend.length > 0) {
    const naam = uitsluitend.sort((a, b) => b.totaal - a.totaal)[0].thema
    return `"${naam}" kwam dit kwartaal uitsluitend bij verloren percelen voor.`
  }
  const overwegend = themas
    .filter((t) => t.overwegendVerlies && t.bijVerlies >= 2)
    .sort((a, b) => b.bijVerlies - a.bijVerlies)[0]
  if (overwegend) {
    return `"${overwegend.thema}" komt overwegend bij verloren percelen voor (${overwegend.bijVerlies}× van ${overwegend.totaal}).`
  }
  return null
}

/** Takeaway voor de gewogen-puntenverlies-weergave. */
export function gewogenTakeaway(themas: { thema: string; gewogenVerlies: number }[]): string | null {
  const top = themas.filter((t) => t.gewogenVerlies > 0).sort((a, b) => b.gewogenVerlies - a.gewogenVerlies)[0]
  if (!top) return null
  return `"${top.thema}" kostte dit jaar de meeste gewogen punten — hier zit de grootste schrijfwinst.`
}

/** Berekende actie-items voor het Actiecentrum (max 4, op prioriteit). */
export function berekenActies(items: Aanbesteding[]): DashboardActie[] {
  const acties: DashboardActie[] = []
  const nu = Date.now()
  const DAG = 24 * 60 * 60 * 1000

  // 1. Bezwaartermijn (datum + 20 kalenderdagen) voor aanbestedingen met verlies.
  for (const a of items) {
    if (!a.percelen.some((p) => p.uitslag === "Verloren")) continue
    const d = new Date(a.datum)
    if (Number.isNaN(d.getTime())) continue
    const eind = d.getTime() + 20 * DAG
    const resterend = Math.ceil((eind - nu) / DAG)
    if (resterend > 0) {
      acties.push({
        id: `bezwaar-${a.id}`,
        type: "bezwaar",
        tekst: `Bezwaartermijn ${a.kenmerk || a.opdrachtgever || "aanbesteding"} verloopt over ${resterend} ${resterend === 1 ? "dag" : "dagen"}`,
        href: `/overzicht/${a.id}`,
      })
    }
  }

  // 2. Ontbrekende interne evaluatie.
  const zonderEval = items.filter((a) => !a.evaluatie)
  if (zonderEval.length > 0) {
    const kenmerken = zonderEval
      .map((a) => a.kenmerk || a.opdrachtgever)
      .filter(Boolean)
      .slice(0, 4)
      .join(", ")
    acties.push({
      id: "evaluatie",
      type: "evaluatie",
      tekst: `${zonderEval.length} ${zonderEval.length === 1 ? "aanbesteding wacht" : "aanbestedingen wachten"} nog op een interne evaluatie: ${kenmerken}${zonderEval.length > 4 ? "…" : ""}`,
      href: `/overzicht/${zonderEval[0].id}`,
    })
  }

  // 3. Gewonnen → dossier (laatste 30 dagen).
  const gewonnenRecent = items
    .filter((a) => {
      const d = new Date(a.datum)
      return (
        !Number.isNaN(d.getTime()) &&
        nu - d.getTime() <= 30 * DAG &&
        a.percelen.some((p) => p.uitslag === "Gewonnen")
      )
    })
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())[0]
  if (gewonnenRecent) {
    const perceel = gewonnenRecent.percelen.find((p) => p.uitslag === "Gewonnen")?.naam || "perceel"
    const klant = gewonnenRecent.klant || "de klant"
    acties.push({
      id: `dossier-${gewonnenRecent.id}`,
      type: "dossier",
      tekst: `${perceel} gewonnen — verwerk de succesfactoren in het dossier van ${klant}`,
      href: `/klanten/open?naam=${encodeURIComponent(gewonnenRecent.klant || "")}`,
    })
  }

  return acties.slice(0, 4)
}
