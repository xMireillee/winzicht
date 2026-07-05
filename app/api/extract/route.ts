import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildExtractiePrompt, parseModelJson } from "@/lib/extract-prompt"
import { normaliseerExtractie } from "@/lib/aanbesteding-utils"
import { getActieveLabels } from "@/lib/labels"

export const maxDuration = 60

// Model conform specificatie. Pas hier aan als Anthropic een nieuwe versie uitbrengt.
const MODEL = "claude-sonnet-4-5"
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const FOUTMELDING = "De analyse is niet gelukt. Controleer het bestand of probeer het met geplakte tekst."

export async function POST(request: NextRequest) {
  // Extra beveiliging naast de middleware: sessie verplicht.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "De AI-analyse is nog niet geconfigureerd (ANTHROPIC_API_KEY ontbreekt)." },
      { status: 500 },
    )
  }

  let body: { pdfBase64?: string; text?: string; filename?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: FOUTMELDING }, { status: 400 })
  }

  const { pdfBase64, text, filename } = body

  if (!pdfBase64 && (!text || text.trim() === "")) {
    return NextResponse.json(
      { error: "Voeg een PDF toe of plak de tekst van de brief." },
      { status: 400 },
    )
  }

  // Bestandsgrootte controleren (base64 is ~4/3 van de echte grootte).
  if (pdfBase64) {
    const approxBytes = Math.floor((pdfBase64.length * 3) / 4)
    if (approxBytes > MAX_BYTES) {
      return NextResponse.json(
        { error: "Het bestand is te groot. Maximaal 10 MB toegestaan." },
        { status: 413 },
      )
    }
  }

  const { themas } = await getActieveLabels()
  const prompt = buildExtractiePrompt(themas)

  const content: unknown[] = []
  if (pdfBase64) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
    })
  }
  if (text && text.trim() !== "") {
    content.push({ type: "text", text: `Tekst van de brief:\n\n${text}` })
  }
  content.push({ type: "text", text: prompt })

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
        max_tokens: 4000,
        messages: [{ role: "user", content }],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.log("[v0] Anthropic API-fout:", res.status, detail)
      return NextResponse.json({ error: FOUTMELDING }, { status: 502 })
    }

    const data = await res.json()
    const modelText: string =
      Array.isArray(data?.content) && data.content.length > 0
        ? data.content.map((c: { text?: string }) => c.text ?? "").join("")
        : ""

    const raw = parseModelJson(modelText)
    if (filename) raw.bron = filename
    const genormaliseerd = normaliseerExtractie(raw)

    return NextResponse.json({ data: genormaliseerd })
  } catch (err) {
    console.log("[v0] Extractie mislukt:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: FOUTMELDING }, { status: 500 })
  }
}
