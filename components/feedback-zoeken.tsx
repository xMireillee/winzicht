"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Search, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeading } from "@/components/page-heading"
import { UitslagStamp } from "@/components/uitslag-stamp"
import { formatDatum } from "@/lib/aanbesteding-utils"
import { cn } from "@/lib/utils"
import type { Uitslag } from "@/lib/types"
import type { FeedbackHit } from "@/app/api/feedback/route"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Facet {
  label: string
  aantal: number
}
interface ZoekResultaat {
  resultaten: FeedbackHit[]
  totaal: number
  totaalBeschikbaar: number
  facetten: { sentiment: Facet[]; thema: Facet[] }
}

function sentimentStijl(sentiment: string): { color: string; bg: string } {
  if (sentiment === "Positief") return { color: "var(--won)", bg: "var(--won-bg)" }
  if (sentiment === "Negatief") return { color: "var(--lost)", bg: "var(--lost-bg)" }
  return { color: "var(--muted-foreground)", bg: "var(--secondary)" }
}

/** Markeer alle voorkomens van `term` (case-insensitief) in `tekst`. */
function Gemarkeerd({ tekst, term }: { tekst: string; term: string }) {
  const t = term.trim()
  if (t === "") return <>{tekst}</>
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const delen = tekst.split(new RegExp(`(${escaped})`, "gi"))
  return (
    <>
      {delen.map((deel, i) =>
        deel.toLowerCase() === t.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-[var(--accent)]/25 px-0.5 text-foreground">
            {deel}
          </mark>
        ) : (
          <span key={i}>{deel}</span>
        ),
      )}
    </>
  )
}

export function FeedbackZoeken() {
  const router = useRouter()
  const params = useSearchParams()

  const q = params.get("q") ?? ""
  const sentiment = params.get("sentiment") ?? ""
  const thema = params.get("thema") ?? ""

  const [zoekInput, setZoekInput] = useState(q)
  const zoekRef = useRef<HTMLInputElement>(null)

  function setParam(overrides: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null || v === "") next.delete(k)
      else next.set(k, v)
    }
    router.replace(next.toString() ? `/feedback?${next.toString()}` : "/feedback", { scroll: false })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (zoekInput !== q) setParam({ q: zoekInput })
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoekInput])

  useEffect(() => {
    zoekRef.current?.focus()
  }, [])

  const key = useMemo(() => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (sentiment) sp.set("sentiment", sentiment)
    if (thema) sp.set("thema", thema)
    return `/api/feedback?${sp.toString()}`
  }, [q, sentiment, thema])

  const { data, isLoading } = useSWR<ZoekResultaat>(key, fetcher, { keepPreviousData: true })

  const resultaten = data?.resultaten ?? []
  const facetten = data?.facetten ?? { sentiment: [], thema: [] }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Kennisbank" bold="Zoek in alle" accent="feedback" />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={zoekRef}
          value={zoekInput}
          onChange={(e) => setZoekInput(e.target.value)}
          placeholder="Zoek een woord of zin in alle beoordelingsteksten, bijv. 'SMART', 'planning', 'te generiek'…"
          className="h-12 pl-11 text-base"
          aria-label="Zoek in feedback"
        />
      </div>

      {/* Facetten */}
      {(facetten.sentiment.length > 0 || facetten.thema.length > 0 || sentiment || thema) && (
        <div className="flex flex-col gap-3">
          {(facetten.sentiment.length > 0 || sentiment) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1">Sentiment</span>
              {facetten.sentiment.map((f) => {
                const actief = sentiment === f.label
                const s = sentimentStijl(f.label)
                return (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setParam({ sentiment: actief ? null : f.label })}
                    aria-pressed={actief}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      actief ? "border-transparent" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                    style={actief ? { color: s.color, backgroundColor: s.bg } : undefined}
                  >
                    {f.label} · {f.aantal}
                  </button>
                )
              })}
            </div>
          )}
          {(facetten.thema.length > 0 || thema) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1">Thema</span>
              {facetten.thema.slice(0, 12).map((f) => {
                const actief = thema === f.label
                return (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setParam({ thema: actief ? null : f.label })}
                    aria-pressed={actief}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      actief
                        ? "border-transparent bg-[var(--ink)] text-white"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f.label} · {f.aantal}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Resultaten */}
      {isLoading && !data ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : resultaten.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">
            {q || sentiment || thema
              ? "Geen feedback gevonden voor deze zoekopdracht."
              : `Doorzoek ${data?.totaalBeschikbaar ?? 0} feedbackcitaten uit de teamdatabase. Typ een zoekterm om te beginnen.`}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {resultaten.length} {resultaten.length === 1 ? "citaat" : "citaten"} gevonden
          </p>
          {resultaten.map((h, i) => {
            const s = sentimentStijl(h.sentiment)
            return (
              <Card key={`${h.aanbestedingId}-${i}`} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {h.sentiment && (
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{ color: s.color, backgroundColor: s.bg }}
                    >
                      {h.sentiment}
                    </span>
                  )}
                  {[h.thema1, h.thema2].filter(Boolean).map((t) => (
                    <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                      {t}
                    </span>
                  ))}
                  <UitslagStamp uitslag={h.uitslag as Uitslag} size="sm" />
                </div>

                <blockquote
                  className="mt-3 border-l-2 pl-3 text-pretty italic text-foreground"
                  style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }}
                >
                  <Gemarkeerd tekst={h.feedback} term={q} />
                </blockquote>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <p className="min-w-0 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{h.opdrachtgever || "Onbekend"}</span>
                    {h.criterium ? ` · ${h.criterium}` : ""}
                    {h.perceel && h.perceel !== "Geheel" ? ` · ${h.perceel}` : ""}
                    {h.datum ? ` · ${formatDatum(h.datum)}` : ""}
                  </p>
                  <Link
                    href={`/overzicht/${h.aanbestedingId}`}
                    className="flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--accent-strong)] hover:underline"
                  >
                    Naar brief <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
