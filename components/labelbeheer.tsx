"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Check, Pencil, Plus, RotateCcw, GitMerge, X, History } from "lucide-react"
import { PageHeading } from "@/components/page-heading"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDatum } from "@/lib/aanbesteding-utils"

type Soort = "thema" | "leerpunt" | "procesthema"

const WOORD: Record<Soort, string> = {
  thema: "thema",
  leerpunt: "leerpunt",
  procesthema: "procesthema",
}

interface LabelRow {
  id: string
  soort: Soort
  naam: string
  actief: boolean
  aangemaakt_op: string
}

interface Wijziging {
  id: string
  soort: string
  actie: string
  oud: string | null
  nieuw: string | null
  aantal_bijgewerkt: number
  door: string | null
  op: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ACTIE_LABEL: Record<string, string> = {
  toegevoegd: "toegevoegd",
  hernoemd: "hernoemd",
  gedeactiveerd: "gedeactiveerd",
  geactiveerd: "geactiveerd",
  samengevoegd: "samengevoegd",
}

export function Labelbeheer() {
  const { data, isLoading, mutate } = useSWR<{ labels: LabelRow[]; wijzigingen: Wijziging[] }>(
    "/api/labels",
    fetcher,
    { revalidateOnFocus: false },
  )
  const [tab, setTab] = useState<Soort>("thema")

  const labels = data?.labels ?? []
  const wijzigingen = data?.wijzigingen ?? []

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeading
        eyebrow="Instellingen"
        bold="Beheer de"
        accent="labels"
        description="Thema's, leerpunten en procesthema's die het hele team gebruikt bij het coderen. Hernoemen of samenvoegen werkt automatisch door in alle bestaande aanbestedingen."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Soort)}>
        <TabsList>
          <TabsTrigger value="thema">Thema&apos;s</TabsTrigger>
          <TabsTrigger value="leerpunt">Leerpunten</TabsTrigger>
          <TabsTrigger value="procesthema">Procesthema&apos;s</TabsTrigger>
        </TabsList>
        <TabsContent value="thema" className="mt-6">
          <LabelPaneel soort="thema" labels={labels} loading={isLoading} onMutate={mutate} />
        </TabsContent>
        <TabsContent value="leerpunt" className="mt-6">
          <LabelPaneel soort="leerpunt" labels={labels} loading={isLoading} onMutate={mutate} />
        </TabsContent>
        <TabsContent value="procesthema" className="mt-6">
          <LabelPaneel soort="procesthema" labels={labels} loading={isLoading} onMutate={mutate} />
        </TabsContent>
      </Tabs>

      <WijzigingenLog wijzigingen={wijzigingen} />
    </div>
  )
}

function LabelPaneel({
  soort,
  labels,
  loading,
  onMutate,
}: {
  soort: Soort
  labels: LabelRow[]
  loading: boolean
  onMutate: () => void
}) {
  const [nieuw, setNieuw] = useState("")
  const [bezig, setBezig] = useState(false)
  const [bewerkId, setBewerkId] = useState<string | null>(null)
  const [bewerkNaam, setBewerkNaam] = useState("")
  const [mergeOpen, setMergeOpen] = useState(false)

  const relevante = useMemo(
    () => labels.filter((l) => l.soort === soort).sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
    [labels, soort],
  )
  const actief = relevante.filter((l) => l.actief)
  const inactief = relevante.filter((l) => !l.actief)

  const woord = WOORD[soort]

  async function toevoegen() {
    const naam = nieuw.trim()
    if (naam === "") return
    setBezig(true)
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ soort, naam }),
    })
    setBezig(false)
    if (res.ok) {
      setNieuw("")
      onMutate()
      toast.success(`${woord.charAt(0).toUpperCase() + woord.slice(1)} toegevoegd.`)
    } else {
      const { error } = await res.json().catch(() => ({ error: "Toevoegen mislukt." }))
      toast.error(error ?? "Toevoegen mislukt.")
    }
  }

  async function hernoemen(id: string) {
    const naam = bewerkNaam.trim()
    if (naam === "") return
    const res = await fetch("/api/labels", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "rename", id, naam }),
    })
    if (res.ok) {
      const { aantalBijgewerkt } = await res.json()
      setBewerkId(null)
      onMutate()
      toast.success(
        aantalBijgewerkt > 0
          ? `Hernoemd — ${aantalBijgewerkt} ${aantalBijgewerkt === 1 ? "aanbesteding" : "aanbestedingen"} bijgewerkt.`
          : "Label hernoemd.",
      )
    } else {
      const { error } = await res.json().catch(() => ({ error: "Hernoemen mislukt." }))
      toast.error(error ?? "Hernoemen mislukt.")
    }
  }

  async function schakel(id: string, actiefNu: boolean) {
    const res = await fetch("/api/labels", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: actiefNu ? "deactivate" : "activate", id }),
    })
    if (res.ok) {
      onMutate()
      toast.success(actiefNu ? "Gedeactiveerd." : "Weer geactiveerd.")
    } else {
      toast.error("Bijwerken mislukt.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toevoegen */}
      <Card className="p-5">
        <p className="eyebrow">Nieuw {woord}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            value={nieuw}
            onChange={(e) => setNieuw(e.target.value)}
            placeholder={`Nieuw ${woord} toevoegen…`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) toevoegen()
            }}
          />
          <Button onClick={toevoegen} disabled={bezig || nieuw.trim() === ""}>
            <Plus className="size-4" aria-hidden="true" />
            Toevoegen
          </Button>
        </div>
      </Card>

      {/* Actieve labels */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">
            Actief · {actief.length} {actief.length === 1 ? woord : woord + "'s"}
          </p>
          {actief.length >= 2 && (
            <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)}>
              <GitMerge className="size-4" aria-hidden="true" />
              Samenvoegen
            </Button>
          )}
        </div>

        <ul className="mt-3 divide-y divide-border">
          {loading && <li className="py-3 text-sm text-muted-foreground">Laden…</li>}
          {!loading && actief.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">Nog geen actieve labels.</li>
          )}
          {actief.map((label) => (
            <li key={label.id} className="flex items-center gap-3 py-2.5">
              {bewerkId === label.id ? (
                <>
                  <Input
                    value={bewerkNaam}
                    onChange={(e) => setBewerkNaam(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) hernoemen(label.id)
                      if (e.key === "Escape") setBewerkId(null)
                    }}
                    className="h-9 flex-1"
                  />
                  <Button size="sm" onClick={() => hernoemen(label.id)}>
                    <Check className="size-4" aria-hidden="true" />
                    Opslaan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setBewerkId(null)} aria-label="Annuleren">
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{label.naam}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBewerkId(label.id)
                      setBewerkNaam(label.naam)
                    }}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`${label.naam} hernoemen`}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => schakel(label.id, true)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`${label.naam} deactiveren`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* Inactieve labels */}
      {inactief.length > 0 && (
        <Card className="p-5">
          <p className="eyebrow text-muted-foreground">Gedeactiveerd · {inactief.length}</p>
          <ul className="mt-3 divide-y divide-border">
            {inactief.map((label) => (
              <li key={label.id} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-sm text-muted-foreground line-through">{label.naam}</span>
                <Button size="sm" variant="ghost" onClick={() => schakel(label.id, false)}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Heractiveren
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <MergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        opties={actief}
        woord={woord}
        onDone={onMutate}
      />
    </div>
  )
}

function MergeDialog({
  open,
  onOpenChange,
  opties,
  woord,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  opties: LabelRow[]
  woord: string
  onDone: () => void
}) {
  const [bronId, setBronId] = useState("")
  const [doelId, setDoelId] = useState("")
  const [bezig, setBezig] = useState(false)

  async function samenvoegen() {
    if (!bronId || !doelId || bronId === doelId) return
    setBezig(true)
    const res = await fetch("/api/labels", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "merge", bronId, doelId }),
    })
    setBezig(false)
    if (res.ok) {
      const { aantalBijgewerkt } = await res.json()
      onOpenChange(false)
      setBronId("")
      setDoelId("")
      onDone()
      toast.success(
        `Samengevoegd — ${aantalBijgewerkt} ${aantalBijgewerkt === 1 ? "aanbesteding" : "aanbestedingen"} bijgewerkt.`,
      )
    } else {
      const { error } = await res.json().catch(() => ({ error: "Samenvoegen mislukt." }))
      toast.error(error ?? "Samenvoegen mislukt.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Labels samenvoegen</DialogTitle>
          <DialogDescription>
            Alle codes van het bron-{woord} worden vervangen door het doel-{woord}. Het bron-{woord} wordt daarna
            gedeactiveerd. Dit werkt door in alle bestaande aanbestedingen.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow text-muted-foreground">Voeg samen (bron)</span>
            <Select value={bronId} onValueChange={(v) => setBronId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={`Kies een ${woord}…`} />
              </SelectTrigger>
              <SelectContent>
                {opties.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.naam}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow text-muted-foreground">Naar (doel)</span>
            <Select value={doelId} onValueChange={(v) => setDoelId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={`Kies een ${woord}…`} />
              </SelectTrigger>
              <SelectContent>
                {opties
                  .filter((l) => l.id !== bronId)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.naam}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={samenvoegen} disabled={bezig || !bronId || !doelId || bronId === doelId}>
            Samenvoegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WijzigingenLog({ wijzigingen }: { wijzigingen: Wijziging[] }) {
  if (wijzigingen.length === 0) return null
  return (
    <Card className="p-5">
      <p className="eyebrow flex items-center gap-1.5">
        <History className="size-3.5" aria-hidden="true" />
        Wijzigingslog
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {wijzigingen.slice(0, 12).map((w) => (
          <li key={w.id} className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
            <span className="font-mono text-xs text-muted-foreground">{formatDatum(w.op)}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium">{ACTIE_LABEL[w.actie] ?? w.actie}</span>
            {w.oud && <span className="text-foreground">&ldquo;{w.oud}&rdquo;</span>}
            {w.nieuw && w.actie !== "toegevoegd" && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className="text-foreground">&ldquo;{w.nieuw}&rdquo;</span>
              </>
            )}
            {w.actie === "toegevoegd" && w.nieuw && <span className="text-foreground">&ldquo;{w.nieuw}&rdquo;</span>}
            {w.aantal_bijgewerkt > 0 && (
              <span className="text-muted-foreground">({w.aantal_bijgewerkt} bijgewerkt)</span>
            )}
            {w.door && <span className="ml-auto font-mono text-xs text-muted-foreground">{w.door}</span>}
          </li>
        ))}
      </ul>
    </Card>
  )
}
