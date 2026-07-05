import { createClient } from "@/lib/supabase/server"
import {
  THEMAS as THEMAS_FALLBACK,
  LEERPUNTEN as LEERPUNTEN_FALLBACK,
} from "@/lib/constants"

export type LabelSoort = "thema" | "leerpunt"

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
      return { themas: [...THEMAS_FALLBACK], leerpunten: [...LEERPUNTEN_FALLBACK] }
    }

    const themas = data.filter((l) => l.soort === "thema").map((l) => l.naam as string)
    const leerpunten = data.filter((l) => l.soort === "leerpunt").map((l) => l.naam as string)

    return {
      themas: themas.length > 0 ? themas : [...THEMAS_FALLBACK],
      leerpunten: leerpunten.length > 0 ? leerpunten : [...LEERPUNTEN_FALLBACK],
    }
  } catch {
    return { themas: [...THEMAS_FALLBACK], leerpunten: [...LEERPUNTEN_FALLBACK] }
  }
}
