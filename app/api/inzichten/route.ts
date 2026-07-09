import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Aanbesteding, KlantDossier } from "@/lib/types"

export const maxDuration = 60

// Model conform specificatie. Pas hier aan als Anthropic een nieuwe versie uitbrengt.
const MODEL = "claude-sonnet-4-5"

const MAX_VRAAG_TEKENS = 500

const INSTRUCTIE = `Je bent analist bij tenderbureau Corus. Beantwoord de vraag van een collega uitsluitend op basis van de meegeleverde data: gunningsbrieven (met scores, wegingen en letterlijke feedback per criterium), interne evaluaties (uren-afwijking en een open terugblik per project) en klantdossiers.

Regels:
- Antwoord in het Nederlands, nuchter en direct, geen jubeltaal.
- Onderbouw met concrete verwijzingen: noem kenmerk, opdrachtgever of klant, en citeer korte stukjes feedback of toelichting als bewijs.
- Noem aantallen en steekproefgrootte. Wees eerlijk wanneer de data te dun is voor een harde conclusie — zeg dan wat er wél uit te halen valt.
- Als de vraag niet met deze data te beantwoorden is, zeg dat gewoon.
- Gebruik gewone alinea's en eventueel korte opsommingen met "–". Geen markdown-koppen, geen tabellen.
- Sluit waar passend af met maximaal twee concrete aanbevelingen of een vervolgvraag die de data wél kan beantwoorden.`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "De AI-inzichten zijn niet geconfigureerd (ANTHROPIC_API_KEY ontbreekt)." }, { status: 500 })
  }

  let body: { vraag?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ongeldige gegevens." }, { status: 400 })
  }

  const vraag = (body.vraag ?? "").trim()
  if (vraag === "") {
    return NextResponse.json({ error: "Stel eerst een vraag." }, { status: 400 })
  }
  if (vraag.length > MAX_VRAAG_TEKENS) {
    return NextResponse.json({ error: `Houd de vraag korter dan ${MAX_VRAAG_TEKENS} tekens.` }, { status: 400 })
  }

  const [{ data: aRows, error: aErr }, { data: kRows }] = await Promise.all([
    supabase.from("aanbestedingen").select("id, data, aangemaakt_op").order("aangemaakt_op", { ascending: false }),
    supabase.from("klanten").select("klant_naam, data"),
  ])

  if (aErr) {
    console.log("[v0] Inzichten: ophalen mislukt:", aErr.message)
    return NextResponse.json({ error: "Ophalen van gegevens mislukt." }, { status: 500 })
  }

  const aanbestedingen = (aRows ?? []).map((row) => {
    const d = row.data as Omit<Aanbesteding, "id" | "aangemaaktOp" | "aangemaaktDoor">
    // Debrief en bron weglaten: afgeleide/administratieve velden, geen brondata.
    const { debrief: _debrief, bron: _bron, ...rest } = d
    return rest
  })

  if (aanbestedingen.length === 0) {
    return NextResponse.json({ error: "Er zijn nog geen gunningsbrieven om te analyseren." }, { status: 400 })
  }

  const dossiers = (kRows ?? []).map((row) => {
    const d = (row.data ?? {}) as Partial<KlantDossier>
    return {
      klant: row.klant_naam,
      profiel: d.profiel || undefined,
      sterktes: d.sterktes || undefined,
      aandachtspunten: d.aandachtspunten || undefined,
      afspraken: d.afspraken || undefined,
      notities: Array.isArray(d.notities) ? d.notities.map((n) => ({ datum: n.datum, tekst: n.tekst })) : undefined,
    }
  })

  const dataBlok = JSON.stringify({ aanbestedingen, klantdossiers: dossiers })

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
            content: `${INSTRUCTIE}\n\nData (JSON):\n${dataBlok}\n\nVraag van de collega:\n${vraag}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.log("[v0] Inzichten: Anthropic-fout:", res.status, detail)
      return NextResponse.json({ error: "Het antwoord kon niet worden opgehaald. Probeer het opnieuw." }, { status: 502 })
    }

    const json = await res.json()
    const antwoord: string =
      Array.isArray(json?.content) && json.content.length > 0
        ? json.content.map((c: { text?: string }) => c.text ?? "").join("").trim()
        : ""

    if (!antwoord) {
      return NextResponse.json({ error: "Het antwoord kwam leeg terug. Probeer het opnieuw." }, { status: 502 })
    }

    return NextResponse.json({ antwoord, aantalBrieven: aanbestedingen.length })
  } catch (err) {
    console.log("[v0] Inzichten mislukt:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "Het antwoord kon niet worden opgehaald. Probeer het opnieuw." }, { status: 500 })
  }
}
