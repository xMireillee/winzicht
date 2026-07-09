import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseModelJson } from "@/lib/extract-prompt"
import type { Aanbesteding, Leidraad, LeidraadCriterium, SchaalNiveau } from "@/lib/types"

export const maxDuration = 60

// Model conform specificatie. Pas hier aan als Anthropic een nieuwe versie uitbrengt.
const MODEL = "claude-sonnet-4-5"
const MAX_BYTES = 20 * 1024 * 1024 // leidraden zijn vaak groter dan gunningsbrieven

const FOUTMELDING = "De leidraad kon niet worden geanalyseerd. Controleer het bestand en probeer het opnieuw."

const PROMPT = `Je bent analist bij een aanbestedingsadviesbureau. Extraheer uit deze aanbestedingsleidraad (gunningsleidraad/beschrijvend document) de beoordelingssystematiek naar JSON.

Antwoord UITSLUITEND met compacte JSON volgens exact dit schema:
{"methodiek":"","knockOuts":[""],"criteria":[{"naam":"","weging":null,"maxScore":null,"omschrijving":"","schaal":[{"score":null,"label":"","omschrijving":""}]}]}

Regels:
- "methodiek": korte beschrijving van hoe de winnaar wordt bepaald (bijv. beste prijs-kwaliteitverhouding, gewogen score, prijsformule). Neem een eventuele rekenformule letterlijk over.
- "knockOuts": uitsluitingsgronden en knock-outeisen (geschiktheidseisen, verplichte certificaten, minimumeisen) als korte puntsgewijze teksten.
- "criteria": alle gunningscriteria en subgunningscriteria (kwaliteit én prijs). "weging" in procenten (null als onbekend). "maxScore" is de hoogst haalbare score op de schaal.
- "omschrijving": wat er per criterium wordt gevraagd/beoordeeld, kort samengevat in eigen woorden.
- "schaal": de beoordelingsschaal met per niveau de score, het label (bijv. "uitstekend", "goed", "voldoende") en de LETTERLIJKE omschrijving uit de leidraad van wat dat niveau vereist. Neem de letterlijke tekst over, niets verzinnen. Leeg laten als de leidraad geen schaalomschrijvingen bevat.
- Onbekende waarden: null (getallen) of "" (tekst). Getallen met punt als decimaalteken.`

function str(v: unknown): string {
  return typeof v === "string" ? v : ""
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function normaliseerLeidraad(raw: Record<string, unknown>): Omit<Leidraad, "bron" | "geuploadOp" | "door"> {
  const criteriaRaw = Array.isArray(raw.criteria) ? raw.criteria : []
  const criteria: LeidraadCriterium[] = criteriaRaw.map((c) => {
    const crit = (c ?? {}) as Record<string, unknown>
    const schaalRaw = Array.isArray(crit.schaal) ? crit.schaal : []
    const schaal: SchaalNiveau[] = schaalRaw.map((s) => {
      const niveau = (s ?? {}) as Record<string, unknown>
      return { score: num(niveau.score), label: str(niveau.label), omschrijving: str(niveau.omschrijving) }
    })
    return {
      naam: str(crit.naam),
      weging: num(crit.weging),
      maxScore: num(crit.maxScore),
      omschrijving: str(crit.omschrijving),
      schaal,
    }
  })
  const knockOuts = Array.isArray(raw.knockOuts) ? raw.knockOuts.map(str).filter(Boolean) : []
  return { methodiek: str(raw.methodiek), knockOuts, criteria }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  let body: { pdfBase64?: string; text?: string; filename?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: FOUTMELDING }, { status: 400 })
  }

  const { pdfBase64, text, filename } = body
  if (!pdfBase64 && (!text || text.trim() === "")) {
    return NextResponse.json({ error: "Voeg een PDF toe of plak de tekst van de leidraad." }, { status: 400 })
  }
  if (pdfBase64) {
    const approxBytes = Math.floor((pdfBase64.length * 3) / 4)
    if (approxBytes > MAX_BYTES) {
      return NextResponse.json({ error: "Het bestand is te groot. Maximaal 20 MB toegestaan." }, { status: 413 })
    }
  }

  const { data: row, error: getErr } = await supabase.from("aanbestedingen").select("id, data").eq("id", id).single()
  if (getErr || !row) {
    return NextResponse.json({ error: "Aanbesteding niet gevonden." }, { status: 404 })
  }

  // Bouw de inhoud op: PDF-document en/of geplakte tekst, gevolgd door de opdracht.
  const content: unknown[] = []
  if (pdfBase64) {
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } })
  }
  if (text && text.trim() !== "") {
    content.push({ type: "text", text: `Tekst van de leidraad:\n\n${text}` })
  }
  content.push({ type: "text", text: PROMPT })

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
        max_tokens: 16000,
        messages: [{ role: "user", content }],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.log("[v0] Leidraad: Anthropic-fout:", res.status, detail)
      const low = detail.toLowerCase()
      let melding = FOUTMELDING
      if (res.status === 429 || low.includes("rate")) {
        melding = "De AI-service is even te druk (limiet bereikt). Wacht een minuut en probeer het opnieuw."
      } else if (res.status === 413 || low.includes("page") || low.includes("too large") || low.includes("exceed")) {
        melding =
          "De PDF is te groot of heeft te veel pagina's voor de analyse. Upload alleen het hoofdstuk met de beoordelingssystematiek (de gunningscriteria en de scoretabel)."
      }
      return NextResponse.json({ error: melding }, { status: 502 })
    }

    const json = await res.json()
    if (json?.stop_reason === "max_tokens") {
      console.log("[v0] Leidraad: max_tokens bereikt")
      return NextResponse.json(
        {
          error:
            "De leidraad is te lang om in één keer te verwerken. Upload alleen het hoofdstuk met de gunningscriteria en de scoretabel.",
        },
        { status: 422 },
      )
    }
    const modelText: string =
      Array.isArray(json?.content) && json.content.length > 0
        ? json.content.map((c: { text?: string }) => c.text ?? "").join("")
        : ""

    let genormaliseerd
    try {
      genormaliseerd = normaliseerLeidraad(parseModelJson(modelText))
    } catch (parseErr) {
      console.log("[v0] Leidraad: JSON-parse mislukt:", parseErr instanceof Error ? parseErr.message : String(parseErr))
      return NextResponse.json(
        {
          error:
            "De analyse leverde geen bruikbaar resultaat op. Probeer het opnieuw, of upload alleen het hoofdstuk met de gunningscriteria.",
        },
        { status: 502 },
      )
    }
    if (genormaliseerd.criteria.length === 0) {
      return NextResponse.json(
        { error: "Er zijn geen gunningscriteria in dit document gevonden. Is dit de juiste leidraad?" },
        { status: 422 },
      )
    }

    const leidraad: Leidraad = {
      ...genormaliseerd,
      bron: filename ?? (pdfBase64 ? "" : "Geplakte tekst"),
      geuploadOp: new Date().toISOString(),
      door: user.email ?? "",
    }

    // Bewaar de leidraad; een eerdere score-analyse hoort bij de oude leidraad en vervalt.
    const d = row.data as Omit<Aanbesteding, "id" | "aangemaaktOp" | "aangemaaktDoor">
    const { leidraadAnalyse: _oudeAnalyse, ...rest } = d
    const { error: upErr } = await supabase
      .from("aanbestedingen")
      .update({ data: { ...rest, leidraad } })
      .eq("id", id)

    if (upErr) {
      console.log("[v0] Leidraad opslaan mislukt:", upErr.message)
      return NextResponse.json({ error: "De leidraad is geanalyseerd maar opslaan mislukte. Probeer het opnieuw." }, { status: 500 })
    }

    return NextResponse.json({ leidraad })
  } catch (err) {
    console.log("[v0] Leidraad mislukt:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: FOUTMELDING }, { status: 500 })
  }
}
