"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { NumberField, SelectField, TextAreaField } from "@/components/form-fields"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { legeEvaluatie } from "@/lib/aanbesteding-utils"
import { useLabels, metHuidige } from "@/hooks/use-labels"
import { JA_NEE, PROCES_ASPECTEN } from "@/lib/constants"
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
  const { leerpunten: leerpuntOpties, procesThemas: procesThemaOpties } = useLabels()
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
        Beoordeling van hoe het traject <em>intern</em> is verlopen — gericht op het proces, niet op de inhoud van de
        inschrijving. Hiermee worden het dashboard en de analyse rijker.
      </p>

      <p className="eyebrow mt-5">Kerncijfers proces</p>
      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField label="Klantcontact (1–5)" value={evaluatie.klantcontact} onChange={(v) => update({ klantcontact: v })} />
        <SelectField
          label="Binnen begrote uren"
          value={evaluatie.binnenUren}
          onChange={(v) => update({ binnenUren: v as InterneEvaluatie["binnenUren"] })}
          options={JA_NEE}
          allowEmpty
        />
        <NumberField label="Afwijking uren (%)" value={evaluatie.afwijking} onChange={(v) => update({ afwijking: v })} />
        <div className="hidden md:block" />
        <SelectField label="Leerpunt 1" value={evaluatie.leerpunt1} onChange={(v) => update({ leerpunt1: v })} options={metHuidige(leerpuntOpties, evaluatie.leerpunt1)} allowEmpty />
        <SelectField label="Leerpunt 2" value={evaluatie.leerpunt2} onChange={(v) => update({ leerpunt2: v })} options={metHuidige(leerpuntOpties, evaluatie.leerpunt2)} allowEmpty />
      </div>

      <Separator className="my-5" />

      <p className="eyebrow">Procesevaluatie — toelichting per aspect</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Beschrijf per aspect hoe het proces verliep en koppel een procesthema. Laat leeg wat niet van toepassing is.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {PROCES_ASPECTEN.map((asp) => (
          <div key={asp.key} className="flex flex-col gap-2">
            <TextAreaField
              label={asp.label}
              value={evaluatie[asp.key]}
              onChange={(v) => update({ [asp.key]: v } as Partial<InterneEvaluatie>)}
              placeholder={asp.hint}
              rows={3}
            />
            <SelectField
              label="Procesthema"
              value={evaluatie[asp.themaKey] ?? ""}
              onChange={(v) => update({ [asp.themaKey]: v } as Partial<InterneEvaluatie>)}
              options={metHuidige(procesThemaOpties, evaluatie[asp.themaKey] ?? "")}
              allowEmpty
            />
          </div>
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
