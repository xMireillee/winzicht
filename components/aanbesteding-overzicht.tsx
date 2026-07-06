"use client"

import { ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UitslagStamp } from "@/components/uitslag-stamp"
import { FeedbackQuote } from "@/components/feedback-quote"
import { formatDatum } from "@/lib/aanbesteding-utils"
import { PROCES_ASPECTEN } from "@/lib/constants"
import type { Aanbesteding, InterneEvaluatie, Sentiment } from "@/lib/types"

type FormData = Omit<Aanbesteding, "id" | "aangemaaktOp">

function Veld({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className={`mt-1 text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  )
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  if (!sentiment) return null
  const stijl =
    sentiment === "Positief"
      ? { color: "var(--won)", backgroundColor: "var(--won-bg)" }
      : sentiment === "Negatief"
        ? { color: "var(--lost)", backgroundColor: "var(--lost-bg)" }
        : { color: "var(--ink)", backgroundColor: "var(--secondary)" }
  return (
    <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium" style={stijl}>
      {sentiment}
    </span>
  )
}

function heeftInhoud(e: InterneEvaluatie | null): boolean {
  if (!e) return false
  return (
    e.klantcontact != null ||
    e.binnenUren !== "" ||
    e.afwijking != null ||
    !!e.leerpunt1 ||
    !!e.leerpunt2 ||
    PROCES_ASPECTEN.some((asp) => (e[asp.key] ?? "").trim() !== "" || (e[asp.themaKey] ?? "") !== "")
  )
}

/** Leesweergave van één aanbesteding: kerngegevens, percelen, criteria en feedback. */
export function AanbestedingOverzicht({
  aanbesteding,
  onNaarEvaluatie,
}: {
  aanbesteding: FormData
  onNaarEvaluatie: () => void
}) {
  const a = aanbesteding
  const evaluatieIngevuld = heeftInhoud(a.evaluatie)

  return (
    <div className="flex flex-col gap-6">
      {/* Kerngegevens */}
      <Card className="p-5">
        <h3 className="text-h3">Kerngegevens</h3>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-3">
          <Veld label="Opdrachtgever" value={a.opdrachtgever} />
          <Veld label="Klant (inschrijver)" value={a.klant} />
          <Veld label="Kenmerk" value={a.kenmerk} mono />
          <Veld label="Datum brief" value={a.datum ? formatDatum(a.datum) : ""} />
          <Veld label="Sector" value={a.sector} />
          <Veld label="Procedure" value={a.procedure} />
        </div>
      </Card>

      {/* Percelen met criteria en feedback */}
      {a.percelen.map((p, pi) => (
        <Card key={pi} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Perceel {pi + 1}</p>
              <h3 className="mt-1 text-h3">{p.naam || "Naamloos perceel"}</h3>
            </div>
            <UitslagStamp uitslag={p.uitslag} />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
            {p.positie != null && <span>Positie {p.positie}</span>}
            {p.aantalInschrijvers != null && <span>{p.aantalInschrijvers} inschrijvers</span>}
            {p.totaalEigen != null && <span className="tnum">Eigen totaal {p.totaalEigen}</span>}
            {p.totaalWinnaar != null && <span className="tnum">Winnaar {p.totaalWinnaar}</span>}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {p.criteria.map((c, ci) => (
              <div key={ci} className="rounded-md border border-border bg-secondary/40 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-foreground">{c.naam || `Criterium ${ci + 1}`}</p>
                  <p className="tnum font-mono text-xs text-muted-foreground">
                    {c.weging != null ? `weging ${c.weging}%` : ""}
                    {c.eigen != null || c.winnaar != null
                      ? ` · eigen ${c.eigen ?? "—"} / winnaar ${c.winnaar ?? "—"}${c.max != null ? ` (max ${c.max})` : ""}`
                      : ""}
                  </p>
                </div>
                {(c.thema1 || c.thema2 || c.sentiment) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {[c.thema1, c.thema2].filter(Boolean).map((t) => (
                      <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                        {t}
                      </span>
                    ))}
                    <SentimentBadge sentiment={c.sentiment} />
                  </div>
                )}
                {c.feedback.trim() !== "" && <FeedbackQuote tekst={c.feedback} />}
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Status interne evaluatie */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">Interne evaluatie</p>
            <p className="text-sm text-muted-foreground">
              {evaluatieIngevuld
                ? "Ingevuld — bekijk of werk bij via het tabblad Interne evaluatie."
                : "Nog niet ingevuld. Vul de evaluatie in om het dashboard en de analyse te voeden."}
            </p>
          </div>
        </div>
        <Button variant={evaluatieIngevuld ? "outline" : "default"} onClick={onNaarEvaluatie}>
          {evaluatieIngevuld ? "Naar evaluatie" : "Evaluatie invullen"}
        </Button>
      </Card>
    </div>
  )
}
