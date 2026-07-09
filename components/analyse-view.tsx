"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FeedbackQuote } from "@/components/feedback-quote"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { berekenStats, berekenSectorAnalyse, type SectorAnalyseStat } from "@/lib/dashboard-stats"
import type { Aanbesteding } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Onder deze steekproefgrootte (percelen met uitslag) kleuren we de winrate niet:
// 1 gewonnen perceel is nog geen sterke sector.
const MIN_PERCELEN_VOOR_KLEUR = 5

/** Afwijking met expliciet teken: + is overschrijding van de raming, − is eronder. */
function formatAfwijking(n: number): string {
  const rond = Math.round(n)
  if (rond > 0) return `+${rond}%`
  if (rond < 0) return `−${Math.abs(rond)}%`
  return "0%"
}

function KpiTile({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <Card className="p-5">
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-2 font-heading text-3xl font-bold" style={{ color: valueColor ?? "var(--foreground)" }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </Card>
  )
}

/** Inklapbare groep antwoorden op één reflectievraag. */
function ReflectieGroep({
  vraag,
  aantal,
  antwoorden,
}: {
  vraag: string
  aantal: number
  antwoorden: { klant: string; kenmerk: string; tekst: string }[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground text-pretty">{vraag}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tnum rounded-md bg-secondary px-2 py-0.5 font-medium text-foreground">{aantal}</span>
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-3 border-t border-border px-4 py-3">
          {antwoorden.map((n, i) => (
            <li key={i}>
              <p className="font-mono text-xs text-muted-foreground">{[n.klant, n.kenmerk].filter(Boolean).join(" · ")}</p>
              <FeedbackQuote tekst={n.tekst} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type SectorSortKey = "sector" | "winrate" | "gemAfwijking" | "metEvaluatie"

function sorteerSectorAnalyse(
  rijen: SectorAnalyseStat[],
  sort: { key: SectorSortKey; dir: "asc" | "desc" } | null,
): SectorAnalyseStat[] {
  if (!sort) return rijen
  const { key, dir } = sort
  const factor = dir === "asc" ? 1 : -1
  return [...rijen].sort((a, b) => {
    if (key === "sector") return factor * a.sector.localeCompare(b.sector)
    const av = a[key]
    const bv = b[key]
    if (av == null && bv == null) return 0
    if (av == null) return 1 // ontbrekende waarden altijd onderaan, ongeacht richting
    if (bv == null) return -1
    return factor * ((av as number) - (bv as number))
  })
}

export function AnalyseView() {
  const { data, isLoading } = useSWR<{ items: Aanbesteding[] }>("/api/aanbestedingen", fetcher)
  const items = useMemo(() => data?.items ?? [], [data])

  const [sectorSort, setSectorSort] = useState<{ key: SectorSortKey; dir: "asc" | "desc" } | null>(null)

  const stats = useMemo(() => berekenStats(items), [items])
  const sectorAnalyse = useMemo(() => berekenSectorAnalyse(items), [items])
  const sectorAnalyseWeergave = useMemo(
    () => sorteerSectorAnalyse(sectorAnalyse, sectorSort),
    [sectorAnalyse, sectorSort],
  )
  const wisselSectorSort = (key: SectorSortKey) =>
    setSectorSort((cur) => (cur?.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "sector" ? "asc" : "desc" }))

  const sectorSortHeader = (label: string, key: SectorSortKey, alignRight?: boolean) => {
    const actief = sectorSort?.key === key
    const Icon = actief ? (sectorSort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
    return (
      <TableHead className={alignRight ? "text-right" : undefined}>
        <button
          type="button"
          onClick={() => wisselSectorSort(key)}
          className={cn(
            "inline-flex items-center gap-1 transition-colors hover:text-foreground",
            alignRight && "flex-row-reverse",
            actief ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
          <Icon className="size-3" aria-hidden="true" />
        </button>
      </TableHead>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-28" />
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="p-10 text-center">
        <h3 className="text-h3">Nog geen data</h3>
        <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
          Zodra er gunningsbrieven en interne evaluaties zijn opgeslagen, verschijnt hier de verdiepende analyse per
          sector en de terugblik uit de evaluaties.
        </p>
        <Button render={<Link href="/nieuw" />} className="mt-4">
          Nieuwe brief analyseren
        </Button>
      </Card>
    )
  }

  const reflectiesMetInhoud = stats.proces.reflecties.filter((r) => r.aantal > 0)

  return (
    <div className="flex flex-col gap-6">
      {stats.proces.metEvaluatie === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nog geen interne evaluaties ingevuld.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiTile
            label="Gem. afwijking uren"
            value={stats.proces.gemAfwijking != null ? formatAfwijking(stats.proces.gemAfwijking) : "—"}
            sub="t.o.v. de raming · + is overschrijding"
            valueColor={stats.proces.gemAfwijking != null && stats.proces.gemAfwijking > 0 ? "var(--lost)" : undefined}
          />
          <KpiTile
            label="Ingevulde evaluaties"
            value={String(stats.proces.metEvaluatie)}
            sub={`van ${stats.aantalAanbestedingen} ${stats.aantalAanbestedingen === 1 ? "aanbesteding" : "aanbestedingen"}`}
          />
        </div>
      )}

      <Card className="flex flex-col p-5">
        <h3 className="text-h3">Sector-analyse</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Winrate naast de gemiddelde uren-afwijking, per sector — zo wordt zichtbaar of een sector niet alleen vaker
          verloren wordt maar bijvoorbeeld ook structureel meer uren kost.
        </p>
        {sectorAnalyse.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nog geen sectoren met data.</p>
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                {sectorSortHeader("Sector", "sector")}
                {sectorSortHeader("Winrate", "winrate")}
                {sectorSortHeader("Gem. afwijking uren", "gemAfwijking")}
                {sectorSortHeader("Evaluaties", "metEvaluatie", true)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectorAnalyseWeergave.map((s) => {
                const winratePctSector = s.winrate != null ? Math.round(s.winrate * 100) : null
                const totaalUitslagen = s.gewonnen + s.verloren
                const betrouwbaar = totaalUitslagen >= MIN_PERCELEN_VOOR_KLEUR
                const laag = winratePctSector != null && winratePctSector < 50
                return (
                  <TableRow key={s.sector}>
                    <TableCell className="whitespace-normal font-medium text-foreground">{s.sector}</TableCell>
                    <TableCell>
                      <span
                        className="tnum shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
                        title={betrouwbaar ? undefined : `Kleine steekproef (${totaalUitslagen} percelen)`}
                        style={
                          winratePctSector == null || !betrouwbaar
                            ? { color: "var(--muted-foreground)", backgroundColor: "var(--secondary)" }
                            : laag
                              ? { color: "var(--lost)", backgroundColor: "var(--lost-bg)" }
                              : { color: "var(--won)", backgroundColor: "var(--won-bg)" }
                        }
                      >
                        {winratePctSector != null ? `${winratePctSector}%` : "—"}
                      </span>
                      <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                        ({s.gewonnen}W · {s.verloren}V)
                      </span>
                    </TableCell>
                    <TableCell
                      className="tnum"
                      style={{ color: s.gemAfwijking != null && s.gemAfwijking > 0 ? "var(--lost)" : undefined }}
                    >
                      {s.gemAfwijking != null ? formatAfwijking(s.gemAfwijking) : "—"}
                    </TableCell>
                    <TableCell className="tnum text-right text-muted-foreground">{s.metEvaluatie}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Winrates kleuren pas vanaf {MIN_PERCELEN_VOOR_KLEUR} percelen met een uitslag; daaronder is de steekproef te
          klein. Bij "Gem. afwijking uren" betekent + een overschrijding van de raming.
        </p>
      </Card>

      {reflectiesMetInhoud.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="text-h3">Terugblik uit de evaluaties</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              De antwoorden op de reflectievragen, gebundeld per vraag over alle aanbestedingen heen.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {reflectiesMetInhoud.map((r) => (
              <ReflectieGroep key={r.key} vraag={r.vraag} aantal={r.aantal} antwoorden={r.antwoorden} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
