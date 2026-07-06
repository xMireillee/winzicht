"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { NumberField, SelectField, TextAreaField, TextField } from "@/components/form-fields"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { useKenmerkCheck } from "@/hooks/use-kenmerk-check"
import { leegCriterium, leegPerceel, formatDatum } from "@/lib/aanbesteding-utils"
import { useLabels, metHuidige } from "@/hooks/use-labels"
import { PROCEDURES, SECTOREN, SENTIMENTEN, UITSLAGEN } from "@/lib/constants"
import type { Aanbesteding, Criterium, Perceel } from "@/lib/types"

type FormData = Omit<Aanbesteding, "id" | "aangemaaktOp">

export function ReviewForm({
  initial,
  mode,
  id,
  onOpgeslagen,
  onOpnieuw,
}: {
  initial: FormData
  mode: "nieuw" | "bewerken"
  id?: string
  onOpgeslagen?: () => void
  onOpnieuw?: () => void
}) {
  const router = useRouter()
  const { themas: themaOpties } = useLabels()
  const [form, setForm] = useState<FormData>(initial)
  const { treffers: kenmerkTreffers } = useKenmerkCheck(form.kenmerk, id)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [opgeslagenKlant, setOpgeslagenKlant] = useState<string | null>(null)
  // Sleutels van velden die de gebruiker heeft aangeraakt (niet langer "AI-ingevuld").
  const [touched, setTouched] = useState<Set<string>>(() => new Set())

  useUnsavedChanges(dirty && !opgeslagenKlant)

  // Aantal velden dat AI heeft ingevuld en dat nog niet is aangeraakt (voor de banner).
  const aiVeldKeys = useMemo(() => {
    if (mode !== "nieuw") return [] as string[]
    const keys: string[] = []
    const push = (k: string, v: unknown) => {
      if (String(v ?? "").trim() !== "") keys.push(k)
    }
    push("opdrachtgever", initial.opdrachtgever)
    push("klant", initial.klant)
    push("kenmerk", initial.kenmerk)
    push("datum", initial.datum)
    push("sector", initial.sector)
    push("procedure", initial.procedure)
    initial.percelen.forEach((p, pi) => {
      push(`p${pi}.naam`, p.naam)
      push(`p${pi}.uitslag`, p.uitslag)
      p.criteria.forEach((c, ci) => {
        push(`p${pi}.c${ci}.naam`, c.naam)
        push(`p${pi}.c${ci}.feedback`, c.feedback)
        push(`p${pi}.c${ci}.thema1`, c.thema1)
        push(`p${pi}.c${ci}.thema2`, c.thema2)
        push(`p${pi}.c${ci}.sentiment`, c.sentiment)
      })
    })
    return keys
  }, [initial, mode])
  const aiResterend = aiVeldKeys.filter((k) => !touched.has(k)).length

  function raakAan(...keys: string[]) {
    setTouched((t) => {
      const next = new Set(t)
      for (const k of keys) next.add(k)
      return next
    })
    setDirty(true)
  }

  // AI-ingevuld = nieuw record, waarde aanwezig, en nog niet aangeraakt.
  function ai(key: string, value: unknown) {
    return mode === "nieuw" && !touched.has(key) && String(value ?? "").trim() !== ""
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    raakAan(String(key))
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updatePerceel(pi: number, patch: Partial<Perceel>) {
    raakAan(...Object.keys(patch).map((k) => `p${pi}.${k}`))
    setForm((f) => ({ ...f, percelen: f.percelen.map((p, i) => (i === pi ? { ...p, ...patch } : p)) }))
  }

  function updateCriterium(pi: number, ci: number, patch: Partial<Criterium>) {
    raakAan(...Object.keys(patch).map((k) => `p${pi}.c${ci}.${k}`))
    setForm((f) => ({
      ...f,
      percelen: f.percelen.map((p, i) =>
        i === pi ? { ...p, criteria: p.criteria.map((c, j) => (j === ci ? { ...c, ...patch } : c)) } : p,
      ),
    }))
  }

  function addPerceel() {
    setDirty(true)
    setForm((f) => ({ ...f, percelen: [...f.percelen, leegPerceel(`Perceel ${f.percelen.length + 1}`)] }))
  }

  function removePerceel(pi: number) {
    setDirty(true)
    setForm((f) => ({ ...f, percelen: f.percelen.filter((_, i) => i !== pi) }))
  }

  function addCriterium(pi: number) {
    setDirty(true)
    setForm((f) => ({
      ...f,
      percelen: f.percelen.map((p, i) => (i === pi ? { ...p, criteria: [...p.criteria, leegCriterium()] } : p)),
    }))
  }

  function removeCriterium(pi: number, ci: number) {
    setDirty(true)
    setForm((f) => ({
      ...f,
      percelen: f.percelen.map((p, i) => (i === pi ? { ...p, criteria: p.criteria.filter((_, j) => j !== ci) } : p)),
    }))
  }

  // Zachte waarschuwing: criterium met feedbacktekst maar zonder thema 1.
  const issues = useMemo(() => {
    const lijst: { id: string; label: string }[] = []
    form.percelen.forEach((p, pi) => {
      p.criteria.forEach((c, ci) => {
        if (c.feedback.trim() !== "" && c.thema1.trim() === "") {
          lijst.push({ id: `crit-${pi}-${ci}`, label: `${p.naam || `Perceel ${pi + 1}`} · ${c.naam || "criterium"}` })
        }
      })
    })
    return lijst
  }, [form.percelen])

  function scrollNaarEerste() {
    const el = document.getElementById(issues[0]?.id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("ring-2", "ring-[var(--lost)]")
      setTimeout(() => el.classList.remove("ring-2", "ring-[var(--lost)]"), 1600)
    }
  }

  async function handleSave() {
    setSaving(true)
    const url = mode === "nieuw" ? "/api/aanbestedingen" : `/api/aanbestedingen/${id}`
    const method = mode === "nieuw" ? "POST" : "PUT"
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? "Opslaan mislukt. Controleer je verbinding en probeer het opnieuw.")
      return
    }
    setDirty(false)
    toast.success(mode === "nieuw" ? "Opgeslagen in de teamdatabase." : "Wijzigingen opgeslagen.")
    router.refresh()
    if (mode === "nieuw") {
      setOpgeslagenKlant(form.klant.trim() || "Onbekend")
      onOpgeslagen?.()
      return
    }
    router.push("/overzicht")
  }

  if (opgeslagenKlant) {
    const aantalThemas = new Set(
      form.percelen.flatMap((p) => p.criteria.flatMap((c) => [c.thema1, c.thema2].filter((t) => t.trim() !== ""))),
    ).size
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--won-bg)]">
          <CheckCircle2 className="size-6 text-[var(--won)]" aria-hidden="true" />
        </span>
        <p className="eyebrow">Opgeslagen</p>
        <h3 className="text-h2">Opgeslagen in de teamdatabase</h3>
        <p className="max-w-md text-pretty text-muted-foreground">
          <span className="font-mono text-foreground">{form.kenmerk || "Zonder kenmerk"}</span> · {form.percelen.length}{" "}
          {form.percelen.length === 1 ? "perceel" : "percelen"} · {aantalThemas} gecodeerde thema&apos;s — het dashboard
          is bijgewerkt.
        </p>
        <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button render={<Link href={`/klanten/open?naam=${encodeURIComponent(opgeslagenKlant)}`} />}>
            Bekijk dossier {opgeslagenKlant}
          </Button>
          {onOpnieuw ? (
            <Button variant="outline" onClick={onOpnieuw}>
              Nog een brief
            </Button>
          ) : (
            <Button variant="outline" render={<Link href="/overzicht" />}>
              Naar overzicht
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {mode === "nieuw" && aiResterend > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-[color-mix(in_srgb,var(--ai)_35%,#fff)] bg-[var(--ai-bg)] p-4">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--ai)]" aria-hidden="true" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{aiResterend}</span>{" "}
            {aiResterend === 1 ? "veld is" : "velden zijn"} door AI ingevuld (gemarkeerd met{" "}
            <span className="inline-block size-1.5 -translate-y-px rounded-full align-middle" style={{ backgroundColor: "var(--ai)" }} />
            ) — controleer ze; de markering verdwijnt zodra je een veld aanraakt.
          </p>
        </div>
      )}

      {/* Kerngegevens */}
      <Card className="p-5">
        <h3 className="text-h3">Kerngegevens</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Opdrachtgever" value={form.opdrachtgever} onChange={(v) => setField("opdrachtgever", v)} aiFilled={ai("opdrachtgever", form.opdrachtgever)} />
          <TextField label="Klant (inschrijver)" value={form.klant} onChange={(v) => setField("klant", v)} aiFilled={ai("klant", form.klant)} />
          <div>
            <TextField label="Kenmerk" value={form.kenmerk} onChange={(v) => setField("kenmerk", v)} mono placeholder="EA2025-006" aiFilled={ai("kenmerk", form.kenmerk)} />
            {kenmerkTreffers.length > 0 && (
              <div
                className="mt-2 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--lost)", backgroundColor: "var(--lost-bg)", color: "var(--lost)" }}
                role="alert"
              >
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  Dit kenmerk bestaat al ({kenmerkTreffers.length}×)
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {kenmerkTreffers.slice(0, 3).map((t) => (
                    <li key={t.id}>
                      <Link href={`/overzicht/${t.id}`} className="underline underline-offset-2 hover:no-underline">
                        {[t.opdrachtgever || t.klant || "Bestaande brief", formatDatum(t.datum)].filter(Boolean).join(" · ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <TextField label="Datum brief" type="date" value={form.datum} onChange={(v) => setField("datum", v)} aiFilled={ai("datum", form.datum)} />
          <SelectField label="Sector" value={form.sector} onChange={(v) => setField("sector", v)} options={SECTOREN} aiFilled={ai("sector", form.sector)} />
          <SelectField label="Procedure" value={form.procedure} onChange={(v) => setField("procedure", v)} options={PROCEDURES} aiFilled={ai("procedure", form.procedure)} />
          <TextField label="Bron (bestandsnaam)" value={form.bron} onChange={(v) => setField("bron", v)} mono />
        </div>
      </Card>

      {/* Percelen */}
      {form.percelen.map((perceel, pi) => (
        <Card key={pi} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="eyebrow">Perceel {pi + 1}</p>
              <h3 className="mt-1 text-h3">{perceel.naam || "Naamloos perceel"}</h3>
            </div>
            {form.percelen.length > 1 && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removePerceel(pi)}>
                Perceel verwijderen
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <TextField label="Naam perceel" value={perceel.naam} onChange={(v) => updatePerceel(pi, { naam: v })} aiFilled={ai(`p${pi}.naam`, perceel.naam)} />
            <SelectField
              label="Uitslag"
              value={perceel.uitslag}
              onChange={(v) => updatePerceel(pi, { uitslag: v as Perceel["uitslag"] })}
              options={UITSLAGEN}
              aiFilled={ai(`p${pi}.uitslag`, perceel.uitslag)}
            />
            <NumberField label="Positie" value={perceel.positie} onChange={(v) => updatePerceel(pi, { positie: v })} />
            <NumberField label="Aantal inschrijvers" value={perceel.aantalInschrijvers} onChange={(v) => updatePerceel(pi, { aantalInschrijvers: v })} />
            <NumberField label="Totaal eigen score" value={perceel.totaalEigen} onChange={(v) => updatePerceel(pi, { totaalEigen: v })} />
            <NumberField label="Totaal winnaar" value={perceel.totaalWinnaar} onChange={(v) => updatePerceel(pi, { totaalWinnaar: v })} />
          </div>

          <Separator className="my-5" />
          <div className="flex items-center justify-between">
            <h4 className="text-h3">Gunningscriteria</h4>
            <Button variant="outline" size="sm" onClick={() => addCriterium(pi)}>
              Criterium toevoegen
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {perceel.criteria.map((crit, ci) => {
              const themaOntbreekt = crit.feedback.trim() !== "" && crit.thema1.trim() === ""
              return (
                <div
                  key={ci}
                  id={`crit-${pi}-${ci}`}
                  className="scroll-mt-24 rounded-md border border-border bg-secondary/40 p-4 transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="md:col-span-4">
                        <TextField label="Criterium" value={crit.naam} onChange={(v) => updateCriterium(pi, ci, { naam: v })} placeholder="Plan van aanpak, Prijs…" aiFilled={ai(`p${pi}.c${ci}.naam`, crit.naam)} />
                      </div>
                      <NumberField label="Weging (%)" value={crit.weging} onChange={(v) => updateCriterium(pi, ci, { weging: v })} />
                      <NumberField label="Max" value={crit.max} onChange={(v) => updateCriterium(pi, ci, { max: v })} />
                      <NumberField label="Eigen" value={crit.eigen} onChange={(v) => updateCriterium(pi, ci, { eigen: v })} />
                      <NumberField label="Winnaar" value={crit.winnaar} onChange={(v) => updateCriterium(pi, ci, { winnaar: v })} />
                    </div>
                    {perceel.criteria.length > 1 && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeCriterium(pi, ci)}>
                        Verwijderen
                      </Button>
                    )}
                  </div>
                  <div className="mt-4">
                    <TextAreaField
                      label="Feedback (letterlijk uit de brief)"
                      value={crit.feedback}
                      onChange={(v) => updateCriterium(pi, ci, { feedback: v })}
                      rows={3}
                      aiFilled={ai(`p${pi}.c${ci}.feedback`, crit.feedback)}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <SelectField
                      label="Thema 1"
                      value={crit.thema1}
                      onChange={(v) => updateCriterium(pi, ci, { thema1: v })}
                      options={metHuidige(themaOpties, crit.thema1)}
                      allowEmpty
                      aiFilled={ai(`p${pi}.c${ci}.thema1`, crit.thema1)}
                      warn={themaOntbreekt ? "Er is feedback, maar nog geen thema gekoppeld." : undefined}
                    />
                    <SelectField label="Thema 2" value={crit.thema2} onChange={(v) => updateCriterium(pi, ci, { thema2: v })} options={metHuidige(themaOpties, crit.thema2)} allowEmpty aiFilled={ai(`p${pi}.c${ci}.thema2`, crit.thema2)} />
                    <SelectField
                      label="Sentiment"
                      value={crit.sentiment}
                      onChange={(v) => updateCriterium(pi, ci, { sentiment: v as Criterium["sentiment"] })}
                      options={SENTIMENTEN}
                      allowEmpty
                      aiFilled={ai(`p${pi}.c${ci}.sentiment`, crit.sentiment)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ))}

      <div>
        <Button variant="outline" onClick={addPerceel}>
          Perceel toevoegen
        </Button>
      </div>

      {/* Sticky actiebalk: opslaan altijd zichtbaar + compacte validatiesamenvatting */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-xl bg-[var(--ink)] px-5 py-3 text-[var(--ink-foreground)] shadow-lg">
          {issues.length > 0 ? (
            <button
              type="button"
              onClick={scrollNaarEerste}
              className="flex items-center gap-2 text-left text-sm text-[color-mix(in_srgb,var(--lost)_55%,#fff)] underline-offset-2 hover:underline"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {issues.length} {issues.length === 1 ? "criterium" : "criteria"} zonder thema — ga ernaartoe
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm text-[color-mix(in_srgb,var(--ink-foreground)_75%,transparent)]">
              <CheckCircle2 className="size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
              Alles ziet er compleet uit
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? "Bezig met opslaan…" : mode === "nieuw" ? "Opslaan in teamdatabase" : "Wijzigingen opslaan"}
          </Button>
        </div>
      </div>
    </div>
  )
}
