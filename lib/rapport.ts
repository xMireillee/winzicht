import type { Aanbesteding } from "./types"
import { berekenStats, berekenGewogenVerlies } from "./dashboard-stats"

export interface KwartaalId {
  jaar: number
  q: number
}

export interface RapportStats {
  kwartaalLabel: string // "Q2 2026"
  kwartaalKort: string // "2026-Q2"
  aantalBrieven: number
  aantalPercelen: number
  gewonnen: number
  verloren: number
  winratePct: number | null
  deltaPct: number | null // t.o.v. vorig kwartaal, in procentpunten
  topThemas: { thema: string; gewogenVerlies: number }[]
  sectoren: { sector: string; gewonnen: number; verloren: number; winratePct: number | null }[]
  datakwaliteit: {
    criteriaZonderThema: number
    aanbestedingenZonderEvaluatie: number
  }
}

/** Kwartaal (1-4) waarin een ISO-datum valt, of null bij ongeldige datum. */
export function kwartaalVanDatum(iso: string): KwartaalId | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return { jaar: d.getFullYear(), q: Math.floor(d.getMonth() / 3) + 1 }
}

export function kwartaalKort(k: KwartaalId): string {
  return `${k.jaar}-Q${k.q}`
}

export function kwartaalLabel(k: KwartaalId): string {
  return `Q${k.q} ${k.jaar}`
}

export function parseKwartaalKort(s: string): KwartaalId | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(s.trim())
  if (!m) return null
  return { jaar: Number(m[1]), q: Number(m[2]) }
}

/** Het laatst voltooide kwartaal ten opzichte van nu. */
export function laatsteVoltooideKwartaal(nu = new Date()): KwartaalId {
  const q = Math.floor(nu.getMonth() / 3) + 1
  if (q === 1) return { jaar: nu.getFullYear() - 1, q: 4 }
  return { jaar: nu.getFullYear(), q: q - 1 }
}

function vorigKwartaal(k: KwartaalId): KwartaalId {
  if (k.q === 1) return { jaar: k.jaar - 1, q: 4 }
  return { jaar: k.jaar, q: k.q - 1 }
}

function inKwartaal(a: Aanbesteding, k: KwartaalId): boolean {
  const kw = kwartaalVanDatum(a.datum)
  return kw != null && kw.jaar === k.jaar && kw.q === k.q
}

/** Kwartalen waarvoor data bestaat, nieuwste eerst (voor de picker). */
export function beschikbareKwartalen(items: Aanbesteding[]): KwartaalId[] {
  const set = new Map<string, KwartaalId>()
  for (const a of items) {
    const kw = kwartaalVanDatum(a.datum)
    if (kw) set.set(kwartaalKort(kw), kw)
  }
  return Array.from(set.values()).sort((a, b) => (b.jaar - a.jaar) || (b.q - a.q))
}

function winrateVanItems(items: Aanbesteding[]): number | null {
  const s = berekenStats(items)
  return s.winrate
}

export function berekenRapportStats(alleItems: Aanbesteding[], k: KwartaalId): RapportStats {
  const items = alleItems.filter((a) => inKwartaal(a, k))
  const stats = berekenStats(items)
  const gewogen = berekenGewogenVerlies(items)

  const vorige = vorigKwartaal(k)
  const vorigeItems = alleItems.filter((a) => inKwartaal(a, vorige))
  const vorigeWinrate = winrateVanItems(vorigeItems)
  const deltaPct =
    stats.winrate != null && vorigeWinrate != null ? Math.round((stats.winrate - vorigeWinrate) * 100) : null

  // Datakwaliteit binnen het kwartaal.
  let criteriaZonderThema = 0
  for (const a of items) {
    for (const p of a.percelen) {
      for (const c of p.criteria) {
        if (c.feedback.trim() !== "" && !c.thema1 && !c.thema2) criteriaZonderThema += 1
      }
    }
  }
  const aanbestedingenZonderEvaluatie = items.filter((a) => !a.evaluatie).length

  return {
    kwartaalLabel: kwartaalLabel(k),
    kwartaalKort: kwartaalKort(k),
    aantalBrieven: items.length,
    aantalPercelen: stats.aantalPercelen,
    gewonnen: stats.gewonnen,
    verloren: stats.verloren,
    winratePct: stats.winrate != null ? Math.round(stats.winrate * 100) : null,
    deltaPct,
    topThemas: gewogen.themas.filter((t) => t.gewogenVerlies > 0).slice(0, 5),
    sectoren: stats.sectoren.map((s) => ({
      sector: s.sector,
      gewonnen: s.gewonnen,
      verloren: s.verloren,
      winratePct: s.winrate != null ? Math.round(s.winrate * 100) : null,
    })),
    datakwaliteit: { criteriaZonderThema, aanbestedingenZonderEvaluatie },
  }
}
