import { createClient } from "@/lib/supabase/server"
import { THEMAS as THEMAS_FALLBACK } from "@/lib/constants"

// Alleen feedbackthema's zijn nog beheerbaar; leerpunten en procesthema's zijn vervallen
// met de nieuwe (open) interne evaluatie.
export type LabelSoort = "thema"

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
}

/**
 * Haalt de actieve feedbackthema's op uit de database. Valt terug op de hardcoded
 * constants wanneer de query faalt, zodat de dropdowns en extractie nooit leeg zijn.
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
      return { themas: [...THEMAS_FALLBACK] }
    }

    const themas = data.filter((l) => l.soort === "thema").map((l) => l.naam as string)
    return { themas: themas.length > 0 ? themas : [...THEMAS_FALLBACK] }
  } catch {
    return { themas: [...THEMAS_FALLBACK] }
  }
}
