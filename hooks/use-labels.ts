"use client"

import useSWR from "swr"
import { THEMAS, LEERPUNTEN } from "@/lib/constants"

interface LabelRow {
  id: string
  soort: "thema" | "leerpunt"
  naam: string
  actief: boolean
  aangemaakt_op: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Actieve labels uit de database, met de hardcoded constants als fallback wanneer
 * de data nog laadt of de query faalt. Zo blijven de dropdowns altijd gevuld.
 */
export function useLabels() {
  const { data } = useSWR<{ labels: LabelRow[] }>("/api/labels", fetcher, {
    revalidateOnFocus: false,
  })

  const rows = data?.labels
  if (!rows || rows.length === 0) {
    return { themas: [...THEMAS] as string[], leerpunten: [...LEERPUNTEN] as string[] }
  }

  const actief = rows.filter((l) => l.actief)
  const themas = actief.filter((l) => l.soort === "thema").map((l) => l.naam)
  const leerpunten = actief.filter((l) => l.soort === "leerpunt").map((l) => l.naam)

  return {
    themas: themas.length > 0 ? themas : ([...THEMAS] as string[]),
    leerpunten: leerpunten.length > 0 ? leerpunten : ([...LEERPUNTEN] as string[]),
  }
}

/** Voeg een bestaande (mogelijk gedeactiveerde) waarde toe aan de optielijst. */
export function metHuidige(opties: string[], huidige: string): string[] {
  if (huidige && !opties.includes(huidige)) return [huidige, ...opties]
  return opties
}
