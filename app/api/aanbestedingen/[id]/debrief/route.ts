import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { EVALUATIE_VRAGEN } from "@/lib/constants"
import type { Aanbesteding, Debrief } from "@/lib/types"

export const maxDuration = 60

// Model conform specificatie. Pas hier aan als Anthropic een nieuwe versie uitbrengt.
const MODEL = "claude-sonnet-4-5"

const INSTRUCTIE = `Je bent analist bij tenderbureau Corus. Schrijf een korte debrief van deze aanbesteding voor het teamarchief.

Structuur (gewone tekst, geen markdown-koppen of tabellen):
- 1-2 zinnen: wat was dit en hoe liep het af (uitslag per perceel).
- 2-3 zinnen: waarom — de doorslaggevende criteria en feedback; citeer kort waar dat kan.
- 2-3 zinnen: lessen voor volgende inschrijvingen, inclusief het interne proces als daar een evaluatie van is.

Nuchter en direct, maximaal 150 woorden. Verzin niets dat niet in de data staat; benoem het expliciet als de brief geen inhoudelijke motivering bevat of als de interne evaluatie ontbreekt.`

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "De AI-debrief is niet geconfigureerd (ANTHROPIC_API_KEY ontbreekt)." }, { status: 500 })
  }

  const { data: row, error } = await supabase
    .from("aanbestedingen")
    .select("id, data, aangemaakt_op")
    .eq("id", id)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: "Aanbesteding niet gevonden." }, { status: 404 })
  }

  const d = row.data as Omit<Aanbesteding, "id" | "aangemaaktOp" | "aangemaaktDoor">

  // Compacte weergave van de aanbesteding voor het model; de debrief zelf gaat niet mee.
  const invoer = {
    opdrachtgever: d.opdrachtgever,
    klant: d.klant,
    kenmerk: d.kenmerk,
    sector: d.sector,
    procedure: d.procedure,
    datum: d.datum,
    percelen: d.percelen,
    interneEvaluatie: d.evaluatie
      ? {
          afwijkingUrenPct: d.evaluatie.afwijking,
          reflectie: EVALUATIE_VRAGEN.map((vraag) => ({
            vraag: vraag.label,
            antwoord: d.evaluatie?.[vraag.key] || null,
          })).filter((r) => r.antwoord),
        }
      : null,
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
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `${INSTRUCTIE}\n\nAanbesteding (JSON):\n${JSON.stringify(invoer, null, 2)}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.log("[v0] Debrief: Anthropic-fout:", res.status, detail)
      return NextResponse.json({ error: "De debrief kon niet worden gegenereerd." }, { status: 502 })
    }

    const json = await res.json()
    const tekst: string =
      Array.isArray(json?.content) && json.content.length > 0
        ? json.content.map((c: { text?: string }) => c.text ?? "").join("").trim()
        : ""

    if (!tekst) {
      return NextResponse.json({ error: "De debrief kwam leeg terug. Probeer het opnieuw." }, { status: 502 })
    }

    const debrief: Debrief = {
      tekst,
      gegenereerdOp: new Date().toISOString(),
      door: user.email ?? "",
    }

    // Bewaar de debrief in de JSONB-data zodat collega's hem ook zien.
    const { error: upErr } = await supabase
      .from("aanbestedingen")
      .update({ data: { ...d, debrief } })
      .eq("id", id)

    if (upErr) {
      console.log("[v0] Debrief opslaan mislukt:", upErr.message)
      // De debrief is wel gegenereerd — geef hem terug, maar meld dat opslaan misging.
      return NextResponse.json({ debrief, opgeslagen: false })
    }

    return NextResponse.json({ debrief, opgeslagen: true })
  } catch (err) {
    console.log("[v0] Debrief mislukt:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "De debrief kon niet worden gegenereerd." }, { status: 500 })
  }
}
