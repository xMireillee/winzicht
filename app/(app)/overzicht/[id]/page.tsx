import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AanbestedingDetail } from "@/components/aanbesteding-detail"
import { legeEvaluatie, normaliseerExtractie, formatDatum } from "@/lib/aanbesteding-utils"
import type { Aanbesteding, Debrief, Leidraad, LeidraadAnalyse } from "@/lib/types"

export default async function AanbestedingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("aanbestedingen")
    .select("id, data, aangemaakt_door, aangemaakt_op")
    .eq("id", id)
    .single()

  if (error || !data) {
    notFound()
  }

  const raw = data.data as Record<string, unknown>
  const debrief =
    raw.debrief && typeof raw.debrief === "object" && typeof (raw.debrief as Debrief).tekst === "string"
      ? (raw.debrief as Debrief)
      : null
  const leidraad =
    raw.leidraad && typeof raw.leidraad === "object" && Array.isArray((raw.leidraad as Leidraad).criteria)
      ? (raw.leidraad as Leidraad)
      : null
  const leidraadAnalyse =
    raw.leidraadAnalyse &&
    typeof raw.leidraadAnalyse === "object" &&
    typeof (raw.leidraadAnalyse as LeidraadAnalyse).tekst === "string"
      ? (raw.leidraadAnalyse as LeidraadAnalyse)
      : null
  const genormaliseerd = normaliseerExtractie(raw)
  const initial: Omit<Aanbesteding, "id" | "aangemaaktOp"> = {
    ...genormaliseerd,
    bron: (raw.bron as string) ?? "",
    aangemaaktDoor: data.aangemaakt_door ?? "",
    evaluatie:
      raw.evaluatie && typeof raw.evaluatie === "object"
        ? { ...legeEvaluatie(), ...(raw.evaluatie as object) }
        : legeEvaluatie(),
  }

  const subregel = [initial.kenmerk, initial.klant, initial.datum ? formatDatum(initial.datum) : ""]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow text-muted-foreground">Aanbesteding</p>
        <h2 className="mt-1 font-heading text-2xl font-bold text-balance">
          {initial.opdrachtgever || "Onbekende opdrachtgever"}
        </h2>
        {subregel && <p className="mt-2 font-mono text-sm text-muted-foreground">{subregel}</p>}
      </div>
      <AanbestedingDetail
        id={id}
        initial={initial}
        debrief={debrief}
        leidraad={leidraad}
        leidraadAnalyse={leidraadAnalyse}
        initieleTab={tab}
      />
    </div>
  )
}
