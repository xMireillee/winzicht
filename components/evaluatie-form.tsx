"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { NumberField, TextAreaField } from "@/components/form-fields"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { legeEvaluatie } from "@/lib/aanbesteding-utils"
import { EVALUATIE_VRAGEN } from "@/lib/constants"
import type { Aanbesteding, InterneEvaluatie } from "@/lib/types"

type FormData = Omit<Aanbesteding, "id" | "aangemaaktOp">

/**
 * Zelfstandig formulier voor de interne evaluatie, met eigen opslaan-knop.
 * Stuurt de volledige aanbesteding mee (de PUT-route vervangt het hele record).
 */
export function EvaluatieForm({
  id,
  aanbesteding,
  onOpgeslagen,
}: {
  id: string
  aanbesteding: FormData
  onOpgeslagen?: (item: Aanbesteding) => void
}) {
  const [evaluatie, setEvaluatie] = useState<InterneEvaluatie>({
    ...legeEvaluatie(),
    ...(aanbesteding.evaluatie ?? {}),
  })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useUnsavedChanges(dirty)

  function update(patch: Partial<InterneEvaluatie>) {
    setDirty(true)
    setEvaluatie((e) => ({ ...e, ...patch }))
  }

  async function opslaan() {
    setSaving(true)
    const res = await fetch(`/api/aanbestedingen/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...aanbesteding, evaluatie }),
    })
    setSaving(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "Opslaan mislukt. Probeer het opnieuw.")
      return
    }
    setDirty(false)
    toast.success("Interne evaluatie opgeslagen.")
    if (data.item) onOpgeslagen?.(data.item)
  }

  return (
    <Card className="p-5">
      <h3 className="text-h3">Interne evaluatie</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Een korte terugblik op hoe dit project <em>intern</em> is verlopen. Vul in wat past; laat leeg wat niet van
        toepassing is.
      </p>

      <p className="eyebrow mt-5">Uren</p>
      <div className="mt-2 grid grid-cols-1 gap-1 md:max-w-xs">
        <NumberField
          label="Afwijking begrote uren (%)"
          value={evaluatie.afwijking}
          onChange={(v) => update({ afwijking: v })}
        />
        <p className="text-xs text-muted-foreground">
          Positief = meer uren dan begroot, negatief = minder. Laat leeg als je het niet weet.
        </p>
      </div>

      <Separator className="my-5" />

      <p className="eyebrow">Terugblik</p>
      <div className="mt-4 flex flex-col gap-5">
        {EVALUATIE_VRAGEN.map((vraag) => (
          <TextAreaField
            key={vraag.key}
            label={vraag.label}
            value={evaluatie[vraag.key]}
            onChange={(v) => update({ [vraag.key]: v } as Partial<InterneEvaluatie>)}
            placeholder={vraag.hint}
            rows={3}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {dirty ? (
            <span className="font-medium text-[var(--accent-strong)]">Niet-opgeslagen wijzigingen</span>
          ) : (
            "Alles opgeslagen"
          )}
        </p>
        <Button onClick={opslaan} disabled={saving || !dirty}>
          {saving ? "Bezig met opslaan…" : "Evaluatie opslaan"}
        </Button>
      </div>
    </Card>
  )
}
