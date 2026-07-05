import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Aanbesteding } from "@/lib/types"

export interface FeedbackHit {
  aanbestedingId: string
  opdrachtgever: string
  klant: string
  kenmerk: string
  sector: string
  datum: string
  perceel: string
  uitslag: string
  criterium: string
  thema1: string
  thema2: string
  sentiment: string
  feedback: string
}

// Server-side vrije-tekst zoekopdracht over alle feedbackcitaten in de teamdatabase.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const url = new URL(request.url)
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase()
  const sentimentFilter = url.searchParams.get("sentiment") ?? ""
  const themaFilter = url.searchParams.get("thema") ?? ""

  const { data, error } = await supabase
    .from("aanbestedingen")
    .select("id, data, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false })

  if (error) {
    console.log("[v0] Feedback zoeken mislukt:", error.message)
    return NextResponse.json({ error: "Zoeken mislukt." }, { status: 500 })
  }

  const items: Aanbesteding[] = (data ?? []).map((row) => ({
    ...(row.data as Omit<Aanbesteding, "id" | "aangemaaktOp">),
    id: row.id,
    aangemaaktOp: row.aangemaakt_op,
  }))

  const alleHits: FeedbackHit[] = []
  for (const a of items) {
    for (const p of a.percelen) {
      for (const c of p.criteria) {
        if (!c.feedback || c.feedback.trim() === "") continue
        alleHits.push({
          aanbestedingId: a.id,
          opdrachtgever: a.opdrachtgever,
          klant: a.klant,
          kenmerk: a.kenmerk,
          sector: a.sector,
          datum: a.datum,
          perceel: p.naam,
          uitslag: p.uitslag,
          criterium: c.naam,
          thema1: c.thema1,
          thema2: c.thema2,
          sentiment: c.sentiment,
          feedback: c.feedback,
        })
      }
    }
  }

  // Tekst-match (substring, case-insensitief) op feedback + criterium + opdrachtgever.
  const tekstMatch = (h: FeedbackHit) =>
    q === "" ||
    h.feedback.toLowerCase().includes(q) ||
    h.criterium.toLowerCase().includes(q) ||
    h.opdrachtgever.toLowerCase().includes(q)

  const opTekst = alleHits.filter(tekstMatch)

  // Facetten berekenen op de tekst-gematchte set (vóór facet-filtering).
  const sentimentTeller = new Map<string, number>()
  const themaTeller = new Map<string, number>()
  for (const h of opTekst) {
    if (h.sentiment) sentimentTeller.set(h.sentiment, (sentimentTeller.get(h.sentiment) ?? 0) + 1)
    for (const t of [h.thema1, h.thema2]) {
      if (t) themaTeller.set(t, (themaTeller.get(t) ?? 0) + 1)
    }
  }

  const resultaten = opTekst.filter((h) => {
    const matchSentiment = sentimentFilter === "" || h.sentiment === sentimentFilter
    const matchThema = themaFilter === "" || h.thema1 === themaFilter || h.thema2 === themaFilter
    return matchSentiment && matchThema
  })

  const facetten = {
    sentiment: Array.from(sentimentTeller.entries())
      .map(([label, aantal]) => ({ label, aantal }))
      .sort((a, b) => b.aantal - a.aantal),
    thema: Array.from(themaTeller.entries())
      .map(([label, aantal]) => ({ label, aantal }))
      .sort((a, b) => b.aantal - a.aantal),
  }

  return NextResponse.json({
    resultaten,
    totaal: resultaten.length,
    totaalBeschikbaar: alleHits.length,
    facetten,
  })
}
