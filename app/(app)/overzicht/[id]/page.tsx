import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ReviewForm } from "@/components/review-form"
import { DebriefCard } from "@/components/debrief-card"
import { legeEvaluatie, normaliseerExtractie } from "@/lib/aanbesteding-utils"
import type { Aanbesteding, Debrief } from "@/lib/types"

export default async function BewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow text-muted-foreground">Bewerken</p>
        <h2 className="mt-1 font-heading text-2xl font-bold text-balance">
          {(raw.opdrachtgever as string) || "Aanbesteding bewerken"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          Pas de gegevens aan of vul de interne evaluatie in. Wijzigingen gelden voor alle collega&apos;s.
        </p>
      </div>
      <DebriefCard id={id} initieel={debrief} />
      <ReviewForm initial={initial} mode="bewerken" id={id} showEvaluatie />
    </div>
  )
}
