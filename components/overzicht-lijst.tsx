"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { ChevronDown, ChevronRight, Search, ArrowUp, ArrowDown, X, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FeedbackQuote } from "@/components/feedback-quote"
import { UitslagStamp } from "@/components/uitslag-stamp"
import { PageHeading } from "@/components/page-heading"
import { formatDatum, jaarVan, kwartaalVan, heeftThema, isOnvolledig } from "@/lib/aanbesteding-utils"
import { cn } from "@/lib/utils"
import type { Aanbesteding, Criterium, Perceel } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PER_PAGINA = 25

type FilterKey = "alle" | "gewonnen" | "verloren" | "zonder-evaluatie"
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "gewonnen", label: "Gewonnen" },
  { key: "verloren", label: "Verloren" },
  { key: "zonder-evaluatie", label: "Zonder evaluatie" },
]

type SortKey = "opdrachtgever" | "klant" | "datum" | "aangemaaktDoor"
const KOLOMMEN: { key: SortKey; label: string; sorteerbaar: true }[] = [
  { key: "opdrachtgever", label: "Opdrachtgever", sorteerbaar: true },
  { key: "klant", label: "Klant", sorteerbaar: true },
  { key: "datum", label: "Datum", sorteerbaar: true },
  { key: "aangemaaktDoor", label: "Ingevoerd door", sorteerbaar: true },
]

function themaChipStijl(sentiment: Criterium["sentiment"]): { color: string; bg: string } {
  if (sentiment === "Positief") return { color: "var(--won)", bg: "var(--won-bg)" }
  if (sentiment === "Negatief") return { color: "var(--lost)", bg: "var(--lost-bg)" }
  return { color: "var(--muted-foreground)", bg: "var(--secondary)" }
}

function ThemaChip({ tekst, sentiment }: { tekst: string; sentiment: Criterium["sentiment"] }) {
  const s = themaChipStijl(sentiment)
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {tekst}
    </span>
  )
}

function MonoFiguur({ label, waarde, color }: { label: string; waarde: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="eyebrow">{label}</span>
      <span className="tnum mt-0.5 font-mono text-lg font-semibold" style={color ? { color } : undefined}>
        {waarde}
      </span>
    </div>
  )
}

function PerceelDetail({ perceel }: { perceel: Perceel }) {
  const heeftTotalen = perceel.totaalEigen != null && perceel.totaalWinnaar != null
  const verschil = heeftTotalen
    ? Math.round(((perceel.totaalEigen as number) - (perceel.totaalWinnaar as number)) * 100) / 100
    : null
  return (
    <div className="rounded-lg border-l-2 pl-4" style={{ borderColor: "var(--accent)" }}>
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="font-heading font-semibold">{perceel.naam}</h4>
        <UitslagStamp uitslag={perceel.uitslag} size="sm" />
      </div>

      {heeftTotalen && (
        <div className="mt-3 flex flex-wrap gap-8">
          <MonoFiguur label="Eigen totaal" waarde={String(perceel.totaalEigen)} />
          <MonoFiguur label="Winnaar" waarde={String(perceel.totaalWinnaar)} />
          <MonoFiguur
            label="Verschil"
            waarde={`${(verschil as number) > 0 ? "+" : ""}${verschil}`}
            color={(verschil as number) >= 0 ? "var(--won)" : "var(--lost)"}
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {perceel.criteria.map((c, ci) => (
          <div key={ci} className="border-l-2 border-border pl-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{c.naam || "Criterium"}</span>
              <span className="tnum font-mono text-xs text-muted-foreground">
                {c.eigen != null ? `eigen ${c.eigen}` : ""}
                {c.winnaar != null ? ` · winnaar ${c.winnaar}` : ""}
                {c.weging != null ? ` · ${c.weging}%` : ""}
              </span>
            </div>
            {(c.thema1 || c.thema2) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {c.thema1 && <ThemaChip tekst={c.thema1} sentiment={c.sentiment} />}
                {c.thema2 && <ThemaChip tekst={c.thema2} sentiment={c.sentiment} />}
              </div>
            )}
            {c.feedback && <FeedbackQuote tekst={c.feedback} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function OverzichtLijst() {
  const router = useRouter()
  const params = useSearchParams()
  const { data, isLoading, mutate } = useSWR<{ items: Aanbesteding[] }>("/api/aanbestedingen", fetcher)

  const zoek = params.get("q") ?? params.get("zoek") ?? ""
  const filter = (params.get("f") as FilterKey) ?? "alle"
  const jaar = params.get("jaar") ?? ""
  const sector = params.get("sector") ?? ""
  const thema = params.get("thema") ?? ""
  const kwartaal = params.get("kwartaal") ?? ""
  const klantFilter = params.get("klant") ?? ""
  const onvolledigAan = params.get("onvolledig") === "1"
  const sortKey = (params.get("sort") as SortKey) || "datum"
  const sortDir = (params.get("dir") as "asc" | "desc") || "desc"
  const pagina = Math.max(1, Number(params.get("p")) || 1)

  const [zoekInput, setZoekInput] = useState(zoek)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [teVerwijderen, setTeVerwijderen] = useState<Aanbesteding | null>(null)
  const [bezig, setBezig] = useState(false)
  const zoekRef = useRef<HTMLInputElement>(null)

  // Bouwt een nieuwe query op basis van de huidige params + overrides. Reset altijd de pagina.
  function pushParams(overrides: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    next.delete("zoek")
    next.delete("p")
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null || v === "") next.delete(k)
      else next.set(k, v)
    }
    router.replace(next.toString() ? `/overzicht?${next.toString()}` : "/overzicht", { scroll: false })
  }

  function gaNaarPagina(p: number) {
    const next = new URLSearchParams(params.toString())
    next.delete("zoek")
    if (p <= 1) next.delete("p")
    else next.set("p", String(p))
    router.replace(next.toString() ? `/overzicht?${next.toString()}` : "/overzicht", { scroll: false })
  }

  function sorteerOp(key: SortKey) {
    if (key === sortKey) {
      pushParams({ sort: key, dir: sortDir === "asc" ? "desc" : "asc" })
    } else {
      pushParams({ sort: key, dir: key === "datum" ? "desc" : "asc" })
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (zoekInput !== zoek) pushParams({ q: zoekInput })
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoekInput])

  // "/" focust het zoekveld (tenzij je al in een veld typt).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement
      const typend =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement)?.isContentEditable
      if (e.key === "/" && !typend) {
        e.preventDefault()
        zoekRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const items = useMemo(() => data?.items ?? [], [data])

  // Beschikbare jaren en sectoren voor de dropdowns.
  const jaren = useMemo(() => {
    const set = new Set<string>()
    for (const a of items) {
      const j = jaarVan(a.datum)
      if (j) set.add(j)
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [items])

  const sectoren = useMemo(() => {
    const set = new Set<string>()
    for (const a of items) if (a.sector) set.add(a.sector)
    return Array.from(set).sort()
  }, [items])

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    const res = items.filter((a) => {
      const matchZoek =
        q === "" ||
        a.opdrachtgever.toLowerCase().includes(q) ||
        a.kenmerk.toLowerCase().includes(q) ||
        a.klant.toLowerCase().includes(q)
      let matchFilter = true
      if (filter === "gewonnen") matchFilter = a.percelen.some((p) => p.uitslag === "Gewonnen")
      else if (filter === "verloren") matchFilter = a.percelen.some((p) => p.uitslag === "Verloren")
      else if (filter === "zonder-evaluatie") matchFilter = a.evaluatie == null
      const matchJaar = jaar === "" || jaarVan(a.datum) === jaar
      const matchSector = sector === "" || a.sector === sector
      const matchThema = thema === "" || heeftThema(a, thema)
      const matchKwartaal = kwartaal === "" || kwartaalVan(a.datum) === kwartaal
      const matchKlant = klantFilter === "" || a.klant.trim().toLowerCase() === klantFilter.trim().toLowerCase()
      const matchOnvolledig = !onvolledigAan || isOnvolledig(a)
      return (
        matchZoek &&
        matchFilter &&
        matchJaar &&
        matchSector &&
        matchThema &&
        matchKwartaal &&
        matchKlant &&
        matchOnvolledig
      )
    })

    const richting = sortDir === "asc" ? 1 : -1
    res.sort((a, b) => {
      let va: string | number = ""
      let vb: string | number = ""
      if (sortKey === "datum") {
        va = a.datum ? new Date(a.datum).getTime() || 0 : 0
        vb = b.datum ? new Date(b.datum).getTime() || 0 : 0
      } else {
        va = (a[sortKey] ?? "").toString().toLowerCase()
        vb = (b[sortKey] ?? "").toString().toLowerCase()
      }
      if (va < vb) return -1 * richting
      if (va > vb) return 1 * richting
      return 0
    })
    return res
  }, [items, zoek, filter, jaar, sector, thema, kwartaal, klantFilter, onvolledigAan, sortKey, sortDir])

  const totaalPaginas = Math.max(1, Math.ceil(gefilterd.length / PER_PAGINA))
  const huidigePagina = Math.min(pagina, totaalPaginas)
  const zichtbaar = gefilterd.slice((huidigePagina - 1) * PER_PAGINA, huidigePagina * PER_PAGINA)

  const actieveChips = [
    thema && { key: "thema", label: `Thema: ${thema}` },
    kwartaal && { key: "kwartaal", label: `Kwartaal: ${kwartaal}` },
    klantFilter && { key: "klant", label: `Klant: ${klantFilter}` },
    onvolledigAan && { key: "onvolledig", label: "Alleen onvolledig" },
  ].filter(Boolean) as { key: string; label: string }[]

  const heeftFilters =
    zoek !== "" ||
    filter !== "alle" ||
    jaar !== "" ||
    sector !== "" ||
    actieveChips.length > 0

  function wisAlles() {
    setZoekInput("")
    router.replace("/overzicht", { scroll: false })
  }

  async function verwijder() {
    if (!teVerwijderen) return
    setBezig(true)
    const res = await fetch(`/api/aanbestedingen/${teVerwijderen.id}`, { method: "DELETE" })
    setBezig(false)
    if (!res.ok) {
      toast.error("Verwijderen mislukt.")
      return
    }
    toast.success("Aanbesteding verwijderd.")
    setTeVerwijderen(null)
    mutate()
  }

  function toggle(id: string) {
    setOpen((o) => ({ ...o, [id]: !o[id] }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageHeading eyebrow="Teamdatabase" bold="Alle" accent="gunningsbrieven" />
        <div className="relative w-full md:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={zoekRef}
            value={zoekInput}
            onChange={(e) => setZoekInput(e.target.value)}
            placeholder="Zoek op kenmerk, opdrachtgever of klant"
            className="pl-9 pr-9"
            aria-label="Zoeken"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground sm:inline">
            /
          </kbd>
        </div>
      </div>

      {/* Filters: uitslag-chips + jaar/sector-dropdowns */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const actief = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => pushParams({ f: f.key === "alle" ? null : f.key })}
                aria-pressed={actief}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  actief
                    ? "border-transparent bg-[var(--ink)] text-white"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            )
          })}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={jaar || "alle"} onValueChange={(v) => pushParams({ jaar: v === "alle" ? null : v })}>
              <SelectTrigger className="h-9 w-[130px]" aria-label="Filter op jaar">
                <SelectValue placeholder="Alle jaren" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle jaren</SelectItem>
                {jaren.map((j) => (
                  <SelectItem key={j} value={j}>
                    {j}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sector || "alle"} onValueChange={(v) => pushParams({ sector: v === "alle" ? null : v })}>
              <SelectTrigger className="h-9 w-[170px]" aria-label="Filter op sector">
                <SelectValue placeholder="Alle sectoren" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle sectoren</SelectItem>
                {sectoren.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => pushParams({ onvolledig: onvolledigAan ? null : "1" })}
              aria-pressed={onvolledigAan}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                onvolledigAan
                  ? "border-transparent text-white"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
              style={onvolledigAan ? { backgroundColor: "var(--lost)" } : undefined}
            >
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              Onvolledig
            </button>
          </div>
        </div>

        {/* Actieve drilldown-chips */}
        {(actieveChips.length > 0 || heeftFilters) && (
          <div className="flex flex-wrap items-center gap-2">
            {actieveChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1.5 text-xs font-medium text-foreground"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => pushParams({ [chip.key]: null })}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
                  aria-label={`Filter verwijderen: ${chip.label}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {heeftFilters && (
              <button
                type="button"
                onClick={wisAlles}
                className="text-xs font-medium text-[var(--accent-strong)] hover:underline"
              >
                Alle filters wissen
              </button>
            )}
            {!isLoading && (
              <span className="ml-auto text-sm text-muted-foreground">
                {gefilterd.length} van {items.length}
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <h3 className="text-h3">Nog geen aanbestedingen</h3>
          <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
            Er staat nog niets in de teamdatabase. Voeg een gunningsbrief toe om te beginnen.
          </p>
          <Button render={<Link href="/nieuw" />} className="mt-4">
            Nieuwe brief analyseren
          </Button>
        </Card>
      ) : gefilterd.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Geen resultaten voor deze zoekopdracht of filter.</p>
          {heeftFilters && (
            <Button variant="outline" className="mt-4" onClick={wisAlles}>
              Filters wissen
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Tabelkoppen (alleen ≥ 760px), klikbaar om te sorteren */}
          <div className="hidden grid-cols-[1.6fr_1fr_0.8fr_0.9fr_auto] gap-4 border-b border-border px-5 py-3 min-[760px]:grid">
            {KOLOMMEN.map((kol) => {
              const actief = sortKey === kol.key
              return (
                <button
                  key={kol.key}
                  type="button"
                  onClick={() => sorteerOp(kol.key)}
                  className={cn(
                    "eyebrow flex items-center gap-1 text-left transition-colors hover:text-foreground",
                    actief && "text-foreground",
                  )}
                  aria-sort={actief ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  {kol.label}
                  {actief &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    ))}
                </button>
              )
            })}
            <span className="eyebrow text-right">Uitslag per perceel</span>
          </div>

          <ul className="divide-y divide-border">
            {zichtbaar.map((a) => {
              const isOpen = open[a.id] ?? false
              const onvolledig = isOnvolledig(a)
              return (
                <li key={a.id}>
                  {/* Rij */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => toggle(a.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggle(a.id)
                      }
                    }}
                    className="grid cursor-pointer grid-cols-1 gap-2 px-5 py-3.5 transition-colors hover:bg-[var(--paper)] min-[760px]:grid-cols-[1.6fr_1fr_0.8fr_0.9fr_auto] min-[760px]:items-center min-[760px]:gap-4"
                  >
                    <div className="flex items-start gap-2">
                      {isOpen ? (
                        <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold">
                          {a.opdrachtgever || "Onbekende opdrachtgever"}
                          {onvolledig && (
                            <AlertTriangle
                              className="size-3.5 shrink-0"
                              style={{ color: "var(--lost)" }}
                              aria-label="Onvolledige gegevens"
                            />
                          )}
                        </p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {[a.kenmerk, a.sector].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="pl-6 min-[760px]:pl-0">
                      {a.klant ? (
                        <Link
                          href={`/klanten/open?naam=${encodeURIComponent(a.klant)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-[var(--accent-strong)] underline-offset-2 hover:underline"
                        >
                          {a.klant}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>

                    <span className="pl-6 font-mono text-xs text-muted-foreground min-[760px]:pl-0">
                      {formatDatum(a.datum)}
                    </span>

                    <span className="pl-6 text-sm text-muted-foreground min-[760px]:pl-0">
                      {a.aangemaaktDoor || "—"}
                    </span>

                    <div className="flex flex-wrap gap-1.5 pl-6 min-[760px]:justify-end min-[760px]:pl-0">
                      {a.percelen.map((p, i) => (
                        <UitslagStamp key={i} uitslag={p.uitslag} size="sm" />
                      ))}
                    </div>
                  </div>

                  {/* Uitgeklapt */}
                  {isOpen && (
                    <div className="border-t border-border bg-[var(--paper)] px-5 py-5">
                      <div className="flex flex-col gap-6">
                        {a.percelen.map((p, pi) => (
                          <PerceelDetail key={pi} perceel={p} />
                        ))}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                          <p className="text-xs text-muted-foreground">
                            Ingevoerd door {a.aangemaaktDoor || "onbekend"} · {formatDatum(a.aangemaaktOp)}
                          </p>
                          <div className="flex gap-2">
                            <Button render={<Link href={`/overzicht/${a.id}`} />} variant="outline" size="sm">
                              Bewerken
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setTeVerwijderen(a)}
                            >
                              Verwijderen
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Paginering */}
          {totaalPaginas > 1 && (
            <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
              <span className="text-sm text-muted-foreground">
                {(huidigePagina - 1) * PER_PAGINA + 1}–{Math.min(huidigePagina * PER_PAGINA, gefilterd.length)} van{" "}
                {gefilterd.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => gaNaarPagina(huidigePagina - 1)}
                  disabled={huidigePagina <= 1}
                >
                  Vorige
                </Button>
                <span className="tnum text-sm text-muted-foreground">
                  {huidigePagina} / {totaalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => gaNaarPagina(huidigePagina + 1)}
                  disabled={huidigePagina >= totaalPaginas}
                >
                  Volgende
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={!!teVerwijderen}
        onOpenChange={(o) => !o && setTeVerwijderen(null)}
        titel="Aanbesteding verwijderen"
        gevolg={
          teVerwijderen
            ? `Weet je zeker dat je "${teVerwijderen.opdrachtgever || "deze aanbesteding"}" uit de teamdatabase wilt verwijderen? Dit geldt voor alle collega's en kan niet ongedaan worden gemaakt.`
            : ""
        }
        bevestigLabel="Verwijderen"
        bezig={bezig}
        onBevestig={verwijder}
      />
    </div>
  )
}
