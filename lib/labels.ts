import { createClient } from "@/lib/supabase/server"
import {
  THEMAS as THEMAS_FALLBACK,
  LEERPUNTEN as LEERPUNTEN_FALLBACK,
  PROCES_THEMAS as PROCES_THEMAS_FALLBACK,
} from "@/lib/constants"

export type LabelSoort = "thema" | "leerpunt" | "procesthema"

export interface Label {
  id: string
  soort: LabelSoort
  naam: string
  actief: boolean
  aangemaakt_op: string
}

export interface LabelWijziging {
  id: string
  soort: string
  actie: string
  oud: string | null
  nieuw: string | null
  aantal_bijgewerkt: number
  door: string | null
  op: string
}

export interface LabelSets {
  themas: string[]
  leerpunten: string[]
  procesThemas: string[]
}

const FALLBACK: LabelSets = {
  themas: [...THEMAS_FALLBACK],
  leerpunten: [...LEERPUNTEN_FALLBACK],
  procesThemas: [...PROCES_THEMAS_FALLBACK],
}

/**
 * Haalt de actieve labels op uit de database, gegroepeerd per soort.
 * Valt terug op de hardcoded constants wanneer de query faalt, zodat de
 * dropdowns en extractie nooit leeg zijn.
 */
export async function getActieveLabels(): Promise<LabelSets> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("labels")
      .select("soort, naam, actief")
      .eq("actief", true)
      .order("naam", { ascending: true })

    if (error || !data || data.length === 0) {
      return { ...FALLBACK }
    }

    const themas = data.filter((l) => l.soort === "thema").map((l) => l.naam as string)
    const leerpunten = data.filter((l) => l.soort === "leerpunt").map((l) => l.naam as string)
    const procesThemas = data.filter((l) => l.soort === "procesthema").map((l) => l.naam as string)

    return {
      themas: themas.length > 0 ? themas : [...THEMAS_FALLBACK],
      leerpunten: leerpunten.length > 0 ? leerpunten : [...LEERPUNTEN_FALLBACK],
      procesThemas: procesThemas.length > 0 ? procesThemas : [...PROCES_THEMAS_FALLBACK],
    }
  } catch {
    return { ...FALLBACK }
  }
}
