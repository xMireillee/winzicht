"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AanbestedingOverzicht } from "@/components/aanbesteding-overzicht"
import { EvaluatieForm } from "@/components/evaluatie-form"
import { DebriefCard } from "@/components/debrief-card"
import { ReviewForm } from "@/components/review-form"
import type { Aanbesteding, Debrief } from "@/lib/types"

type FormData = Omit<Aanbesteding, "id" | "aangemaaktOp">
type Tab = "overzicht" | "evaluatie" | "bewerken"

/**
 * Detailpagina van één aanbesteding in drie tabbladen: lezen (overzicht +
 * debrief), de interne evaluatie invullen, en de geëxtraheerde gegevens
 * corrigeren. Na opslaan van de evaluatie krijgt het bewerkformulier de
 * verse data via een remount (versie-key), zodat tabs elkaar niet overschrijven.
 */
export function AanbestedingDetail({
  id,
  initial,
  debrief,
  initieleTab,
}: {
  id: string
  initial: FormData
  debrief: Debrief | null
  initieleTab?: string
}) {
  const [tab, setTab] = useState<Tab>(
    initieleTab === "evaluatie" || initieleTab === "bewerken" ? initieleTab : "overzicht",
  )
  const [huidige, setHuidige] = useState<FormData>(initial)
  const [versie, setVersie] = useState(0)

  function bijgewerkt(item: Aanbesteding) {
    const { id: _id, aangemaaktOp: _op, ...rest } = item
    setHuidige(rest)
    setVersie((v) => v + 1)
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
      <TabsList>
        <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
        <TabsTrigger value="evaluatie">Interne evaluatie</TabsTrigger>
        <TabsTrigger value="bewerken">Gegevens bewerken</TabsTrigger>
      </TabsList>

      <TabsContent value="overzicht" className="mt-6">
        <div className="flex flex-col gap-6">
          <DebriefCard id={id} initieel={debrief} />
          <AanbestedingOverzicht aanbesteding={huidige} onNaarEvaluatie={() => setTab("evaluatie")} />
        </div>
      </TabsContent>

      <TabsContent value="evaluatie" className="mt-6">
        <EvaluatieForm key={`evaluatie-${versie}`} id={id} aanbesteding={huidige} onOpgeslagen={bijgewerkt} />
      </TabsContent>

      <TabsContent value="bewerken" className="mt-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Corrigeer hier de geëxtraheerde gegevens: percelen, criteria, scores en feedback. Wijzigingen gelden voor
          alle collega&apos;s.
        </p>
        <ReviewForm key={`bewerken-${versie}`} initial={huidige} mode="bewerken" id={id} />
      </TabsContent>
    </Tabs>
  )
}
