import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Aanbesteding, LeidraadAnalyse } from "@/lib/types"

export const maxDuration = 60

// Model conform specificatie. Pas hier aan als Anthropic een nieuwe versie uitbrengt.
const MODEL = "claude-sonnet-4-5"

const INSTRUCTIE = `Je bent analist bij tenderbureau Corus. Vergelijk de behaalde scores en de ontvangen feedback uit de gunningsbrief met de beoordelingssystematiek uit de aanbestedingsleidraad.

Schrijf per gunningscriterium (match de criteria uit de brief aan die uit de leidraad, ook als de namen licht verschillen):
- wat de behaalde score volgens de schaal uit de leidraad betekent (citeer de schaalomschrijving kort);
- wat het eerstvolgende hogere schaalnivau vereiste, en wat er volgens de ontvangen feedback dus concreet ontbrak;
- sla criteria zonder score of zonder bijpassend leidraadcriterium kort over met één zin.

Sluit af met een sectie "Consistentie met de leidraad": benoem eventuele inconsistenties tussen de beoordeling en de gepubliceerde systematiek (afwijkende weging, score buiten de schaal, feedback die niet past bij de schaalomschrijving). Dit kunnen legitieme aandachtspunten voor een bezwaar zijn — formuleer feitelijk, geen juridisch advies. Geen inconsistenties gevonden? Zeg dat dan expliciet.

Nuchter en direct, in het Nederlands. Gewone tekst met korte opsommingen ("–"); geen markdown-koppen of tabellen. Maximaal 500 woorden. Verzin niets dat niet in de data staat.`

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "De AI-analyse is niet geconfigureerd (ANTHROPIC_API_KEY ontbreekt)." }, { status: 500 })
  }

  const { data: row, error: getErr } = await supabase.from("aanbestedingen").select("id, data").eq("id", id).single()
  if (getErr || !row) {
    return NextResponse.json({ error: "Aanbesteding niet gevonden." }, { status: 404 })
  }

  const d = row.data as Omit<Aanbesteding, "id" | "aangemaaktOp" | "aangemaaktDoor">
  if (!d.leidraad) {
    return NextResponse.json({ error: "Upload eerst de aanbestedingsleidraad." }, { status: 400 })
  }

  const invoer = {
    leidraad: {
      methodiek: d.leidraad.methodiek,
      criteria: d.leidraad.criteria,
    },
    uitslagUitGunningsbrief: d.percelen.map((p) => ({
      perceel: p.naam,
      uitslag: p.uitslag,
      totaalEigen: p.totaalEigen,
      totaalWinnaar: p.totaalWinnaar,
      criteria: p.criteria.map((c) => ({
        naam: c.naam,
        weging: c.weging,
        max: c.max,
        eigen: c.eigen,
        winnaar: c.winnaar,
        feedback: c.feedback,
      })),
    })),
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `${INSTRUCTIE}\n\nData (JSON):\n${JSON.stringify(invoer, null, 2)}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.log("[v0] Leidraad-analyse: Anthropic-fout:", res.status, detail)
      return NextResponse.json({ error: "De analyse kon niet worden gegenereerd." }, { status: 502 })
    }

    const json = await res.json()
    const tekst: string =
      Array.isArray(json?.content) && json.content.length > 0
        ? json.content.map((c: { text?: string }) => c.text ?? "").join("").trim()
        : ""

    if (!tekst) {
      return NextResponse.json({ error: "De analyse kwam leeg terug. Probeer het opnieuw." }, { status: 502 })
    }

    const leidraadAnalyse: LeidraadAnalyse = {
      tekst,
      gegenereerdOp: new Date().toISOString(),
      door: user.email ?? "",
    }

    const { error: upErr } = await supabase
      .from("aanbestedingen")
      .update({ data: { ...d, leidraadAnalyse } })
      .eq("id", id)

    if (upErr) {
      console.log("[v0] Leidraad-analyse opslaan mislukt:", upErr.message)
      return NextResponse.json({ leidraadAnalyse, opgeslagen: false })
    }

    return NextResponse.json({ leidraadAnalyse, opgeslagen: true })
  } catch (err) {
    console.log("[v0] Leidraad-analyse mislukt:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "De analyse kon niet worden gegenereerd." }, { status: 500 })
  }
}
