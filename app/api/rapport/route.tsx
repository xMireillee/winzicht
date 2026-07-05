import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createClient } from "@/lib/supabase/server"
import { berekenRapportStats, parseKwartaalKort, laatsteVoltooideKwartaal, kwartaalKort } from "@/lib/rapport"
import { RapportDocument } from "@/lib/rapport-pdf"
import type { Aanbesteding } from "@/lib/types"

export const maxDuration = 60

const MODEL = "claude-sonnet-4-5"

const INSTRUCTIE =
  "Je bent analist bij tenderbureau Corus. Schrijf op basis van deze cijfers een kwartaalduiding in het Nederlands voor het teamoverleg: (1) de drie belangrijkste patronen, (2) wat er veranderd is t.o.v. het vorige kwartaal, (3) drie concrete aanbevelingen voor het schrijfproces. Nuchter en direct, geen jubeltaal, max 400 woorden. Verwijs alleen naar de aangeleverde cijfers."

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "De AI-duiding is niet geconfigureerd (ANTHROPIC_API_KEY ontbreekt)." }, { status: 500 })
  }

  let body: { kwartaal?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Leeg body → standaard laatste voltooide kwartaal.
  }

  const kwartaal = (body.kwartaal && parseKwartaalKort(body.kwartaal)) || laatsteVoltooideKwartaal()

  const { data, error } = await supabase
    .from("aanbestedingen")
    .select("id, data, aangemaakt_door, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false })

  if (error) {
    console.log("[v0] Rapport: ophalen mislukt:", error.message)
    return NextResponse.json({ error: "Ophalen van gegevens mislukt." }, { status: 500 })
  }

  const items: Aanbesteding[] = (data ?? []).map((row) => ({
    ...(row.data as Omit<Aanbesteding, "id" | "aangemaaktOp" | "aangemaaktDoor">),
    id: row.id,
    aangemaaktOp: row.aangemaakt_op,
    aangemaaktDoor: row.aangemaakt_door ?? "",
  }))

  const stats = berekenRapportStats(items, kwartaal)

  // AI-duiding ophalen.
  let duiding = ""
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
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `${INSTRUCTIE}\n\nCijfers (JSON):\n${JSON.stringify(stats, null, 2)}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.log("[v0] Rapport: Anthropic-fout:", res.status, detail)
      return NextResponse.json({ error: "De AI-duiding kon niet worden opgehaald." }, { status: 502 })
    }

    const json = await res.json()
    duiding =
      Array.isArray(json?.content) && json.content.length > 0
        ? json.content.map((c: { text?: string }) => c.text ?? "").join("")
        : ""
  } catch (err) {
    console.log("[v0] Rapport: duiding mislukt:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "De AI-duiding kon niet worden opgehaald." }, { status: 500 })
  }

  // PDF renderen.
  try {
    const buffer = await renderToBuffer(<RapportDocument stats={stats} duiding={duiding} />)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="Corus-kwartaalrapport-${kwartaalKort(kwartaal)}.pdf"`,
      },
    })
  } catch (err) {
    console.log("[v0] Rapport: PDF mislukt:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "Het rapport kon niet worden opgemaakt." }, { status: 500 })
  }
}
