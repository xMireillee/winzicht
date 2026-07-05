"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Breadcrumb } from "@/components/breadcrumb"
import { UitslagStamp } from "@/components/uitslag-stamp"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { formatDatum } from "@/lib/aanbesteding-utils"
import { berekenKlantStats, zelfdeKlant } from "@/lib/klant-utils"
import type { Aanbesteding, KlantDossier } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-2 font-heading text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </Card>
  )
}

function formatTijdstip(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function KennisVeld({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="rounded-lg bg-[var(--paper)] p-4">
      <Label htmlFor={id} className="eyebrow">
        {label}
      </Label>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      <Textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 bg-card"
      />
    </div>
  )
}

export function KlantDossierView({ id }: { id: string }) {
  const { data: dData, isLoading: dLoading, mutate } = useSWR<{ item: KlantDossier }>(`/api/klanten/${id}`, fetcher)
  const { data: aData, isLoading: aLoading } = useSWR<{ items: Aanbesteding[] }>("/api/aanbestedingen", fetcher)

  const dossier = dData?.item
  const alleAanbestedingen = useMemo(() => aData?.items ?? [], [aData])

  const klantAanbestedingen = useMemo(() => {
    if (!dossier) return []
    return alleAanbestedingen.filter((a) => zelfdeKlant(a.klant, dossier.klantNaam))
  }, [alleAanbestedingen, dossier])

  const stats = useMemo(() => berekenKlantStats(klantAanbestedingen), [klantAanbestedingen])

  const [themaWeergave, setThemaWeergave] = useState<"gewogen" | "frequentie">("gewogen")
  const [profiel, setProfiel] = useState("")
  const [sterktes, setSterktes] = useState("")
  const [aandachtspunten, setAandachtspunten] = useState("")
  const [afspraken, setAfspraken] = useState("")
  const [nieuweNotitie, setNieuweNotitie] = useState("")
  const [saving, setSaving] = useState(false)
  const [notitieBezig, setNotitieBezig] = useState(false)

  useEffect(() => {
    if (dossier) {
      setProfiel(dossier.profiel)
      setSterktes(dossier.sterktes)
      setAandachtspunten(dossier.aandachtspunten)
      setAfspraken(dossier.afspraken)
    }
  }, [dossier])

  const dirty =
    !!dossier &&
    (profiel !== dossier.profiel ||
      sterktes !== dossier.sterktes ||
      aandachtspunten !== dossier.aandachtspunten ||
      afspraken !== dossier.afspraken ||
      nieuweNotitie.trim() !== "")
  useUnsavedChanges(dirty)

  async function opslaan() {
    setSaving(true)
    const res = await fetch(`/api/klanten/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profiel, sterktes, aandachtspunten, afspraken }),
    })
    setSaving(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "Opslaan mislukt.")
      return
    }
    toast.success("Dossier opgeslagen.")
    mutate()
  }

  async function notitieToevoegen() {
    const tekst = nieuweNotitie.trim()
    if (tekst === "") {
      toast.error("Schrijf eerst een notitie.")
      return
    }
    setNotitieBezig(true)
    const res = await fetch(`/api/klanten/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nieuweNotitie: tekst }),
    })
    setNotitieBezig(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "Notitie toevoegen mislukt.")
      return
    }
    setNieuweNotitie("")
    toast.success("Notitie toegevoegd aan de kennislog.")
    mutate()
  }

  if (dLoading || aLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!dossier) {
    return (
      <Card className="p-10 text-center">
        <h3 className="text-h3">Dossier niet gevonden</h3>
        <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
          Dit klantdossier bestaat niet (meer). Ga terug naar het overzicht van klanten.
        </p>
        <Button render={<Link href="/klanten" />} className="mt-4">
          Terug naar klanten
        </Button>
      </Card>
    )
  }

  const winratePct = stats.winrate != null ? `${Math.round(stats.winrate * 100)}%` : "—"
  const isGewogen = themaWeergave === "gewogen"
  const themas = isGewogen
    ? [...stats.themas].filter((t) => t.gewogenVerlies > 0).sort((a, b) => b.gewogenVerlies - a.gewogenVerlies).slice(0, 8)
    : stats.themas.slice(0, 8)
  const naarThemaHref = (thema: string) =>
    `/overzicht?thema=${encodeURIComponent(thema)}&klant=${encodeURIComponent(dossier.klantNaam)}`
  const geenAanbestedingen = klantAanbestedingen.length === 0
  const notities = [...dossier.notities].sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

  // Insight over terugkerende verlies-thema's.
  const topVerlies = [...stats.themas].filter((t) => t.bijVerlies > 0).sort((a, b) => b.bijVerlies - a.bijVerlies)[0]
  const insight = topVerlies
    ? `"${topVerlies.thema}" is bij deze klant het vaakst terugkerende verlies-thema (${topVerlies.bijVerlies}×). Adresseer dit expliciet in de volgende inschrijving.`
    : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "Klanten", href: "/klanten" }, { label: dossier.klantNaam }]} />
        <div className="flex flex-col gap-1">
          <p className="eyebrow">Klantdossier</p>
          <h1 className="text-display">
            <span className="font-bold">{dossier.klantNaam} </span>
            <span className="display-accent">in beeld</span>
          </h1>
        </div>
      </div>

      {/* KPI-tegels */}
      {geenAanbestedingen ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nog geen aanbestedingen voor deze klant ingevoerd.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiTile
            label="Aanbestedingen"
            value={String(stats.aantalAanbestedingen)}
            sub={`${stats.aantalPercelen} percelen`}
          />
          <KpiTile
            label="Winrate percelen"
            value={winratePct}
            sub={`${stats.gewonnen} gewonnen · ${stats.verloren} verloren`}
          />
          <KpiTile
            label="Gem. verschil bij verlies"
            value={stats.gemVerschil != null ? `−${stats.gemVerschil.toFixed(1)}` : "—"}
            sub="punten achter op winnaar"
          />
        </div>
      )}

      {/* Twee kolommen */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Links — uit de cijfers */}
        <section className="flex flex-col gap-5">
          <p className="eyebrow">Uit de cijfers</p>

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-h3">Terugkerende thema&apos;s bij deze klant</h3>
              <div
                className="inline-flex shrink-0 rounded-lg border border-border bg-secondary p-0.5"
                role="tablist"
                aria-label="Weergave thema's"
              >
                {(
                  [
                    { id: "gewogen", label: "Gewogen" },
                    { id: "frequentie", label: "Frequentie" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="tab"
                    aria-selected={themaWeergave === opt.id}
                    onClick={() => setThemaWeergave(opt.id)}
                    className={
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
                      (themaWeergave === opt.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {themas.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {isGewogen
                  ? "Nog geen criteria met volledige weging + scores om gewogen verlies te berekenen."
                  : "Nog geen feedbackthema's gecodeerd."}
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2.5">
                {themas.map((t) => {
                  const winst = t.totaal - t.bijVerlies
                  const verlies = t.bijVerlies >= winst
                  return (
                    <li key={t.thema}>
                      <Link
                        href={naarThemaHref(t.thema)}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1 -mx-2 transition-colors hover:bg-[var(--paper)]"
                      >
                        <span className="text-sm">{t.thema}</span>
                        {isGewogen ? (
                          <span
                            className="tnum shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
                            style={{ color: "var(--lost)", backgroundColor: "var(--lost-bg)" }}
                          >
                            {(Math.round(t.gewogenVerlies * 10) / 10).toFixed(1)} gewogen punten
                          </span>
                        ) : (
                          <span
                            className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
                            style={
                              verlies
                                ? { color: "var(--lost)", backgroundColor: "var(--lost-bg)" }
                                : { color: "var(--won)", backgroundColor: "var(--won-bg)" }
                            }
                          >
                            {verlies ? `${t.bijVerlies}× bij verlies` : `${winst}× bij winst`}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
            {insight && (
              <p className="mt-4 border-t border-border pt-3 text-sm text-pretty text-foreground">{insight}</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-h3">Tijdlijn</h3>
            {stats.tijdlijn.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nog geen aanbestedingen.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2.5">
                {stats.tijdlijn.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/overzicht/${t.id}`}
                      className="flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-[var(--paper)] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">{t.opdrachtgever || "Onbekende opdrachtgever"}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {formatDatum(t.datum)}
                          {t.kenmerk ? ` · ${t.kenmerk}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {t.percelen.map((p, i) => (
                          <UitslagStamp key={i} uitslag={p.uitslag} size="sm" />
                        ))}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Rechts — opgebouwde klantkennis */}
        <section className="flex flex-col gap-5">
          <p className="eyebrow">Opgebouwde klantkennis</p>

          <Card className="flex flex-col gap-4 p-5">
            <KennisVeld id="profiel" label="Profiel" hint="Wie is de klant: markt, omvang, ambities." value={profiel} onChange={setProfiel} />
            <KennisVeld id="sterktes" label="Sterktes & bewijsvoering" hint="Referenties, certificeringen, USP's." value={sterktes} onChange={setSterktes} />
            <KennisVeld id="aandachtspunten" label="Aandachtspunten" hint="Bekende zwaktes en valkuilen." value={aandachtspunten} onChange={setAandachtspunten} />
            <KennisVeld id="afspraken" label="Werkafspraken" hint="Tone of voice, reviewproces, contactpersonen." value={afspraken} onChange={setAfspraken} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {dirty ? (
                  <span className="font-medium text-[var(--accent-strong)]">Niet-opgeslagen wijzigingen</span>
                ) : (
                  `Laatst bijgewerkt op ${formatTijdstip(dossier.bijgewerktOp)}`
                )}
              </p>
              <Button onClick={opslaan} disabled={saving || !dirty}>
                {saving ? "Bezig met opslaan…" : "Dossier opslaan"}
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-h3">Kennislog</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Gedateerde aantekeningen. Bestaande notities blijven staan en kunnen niet worden aangepast.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="nieuweNotitie" className="sr-only">
                Nieuwe notitie
              </Label>
              <Textarea
                id="nieuweNotitie"
                rows={3}
                value={nieuweNotitie}
                onChange={(e) => setNieuweNotitie(e.target.value)}
                placeholder="Bijvoorbeeld: nieuwe contactpersoon, wijziging in strategie, uitkomst van een evaluatiegesprek…"
              />
              <div className="flex justify-end">
                <Button variant="outline" onClick={notitieToevoegen} disabled={notitieBezig}>
                  {notitieBezig ? "Bezig…" : "Notitie toevoegen"}
                </Button>
              </div>
            </div>

            {notities.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nog geen notities in de kennislog.</p>
            ) : (
              <ul className="mt-5 flex flex-col gap-4">
                {notities.map((n, i) => {
                  const initiaal = (n.auteur?.[0] ?? "?").toUpperCase()
                  return (
                    <li key={i} className="flex gap-3">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold"
                        style={{ backgroundColor: "var(--secondary)", color: "var(--ink)" }}
                        aria-hidden="true"
                      >
                        {initiaal}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-pretty text-foreground">{n.tekst}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {formatTijdstip(n.datum)} · {n.auteur}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}
