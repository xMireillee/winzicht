import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Aanbesteding } from "@/lib/types"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  let payload: Partial<Aanbesteding>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Ongeldige gegevens." }, { status: 400 })
  }

  const { id: _id, aangemaaktOp: _op, aangemaaktDoor: _door, ...data } = payload

  // De formulieren sturen afgeleide velden (debrief, leidraad, leidraad-analyse)
  // niet mee; neem bestaande waarden over zodat die niet verloren gaan bij het
  // opslaan van wijzigingen.
  const AFGELEIDE_VELDEN = ["debrief", "leidraad", "leidraadAnalyse"] as const
  if (AFGELEIDE_VELDEN.some((veld) => !(veld in data))) {
    const { data: bestaand } = await supabase.from("aanbestedingen").select("data").eq("id", id).single()
    const bestaandeData = (bestaand?.data ?? {}) as Partial<Aanbesteding>
    for (const veld of AFGELEIDE_VELDEN) {
      if (!(veld in data) && bestaandeData[veld]) {
        ;(data as unknown as Record<string, unknown>)[veld] = bestaandeData[veld]
      }
    }
  }

  const { data: updated, error } = await supabase
    .from("aanbestedingen")
    .update({ data })
    .eq("id", id)
    .select("id, data, aangemaakt_door, aangemaakt_op")
    .single()

  if (error) {
    console.log("[v0] Bijwerken mislukt:", error.message)
    return NextResponse.json({ error: "Bijwerken mislukt." }, { status: 500 })
  }

  const item: Aanbesteding = {
    ...(updated.data as Omit<Aanbesteding, "id" | "aangemaaktOp" | "aangemaaktDoor">),
    id: updated.id,
    aangemaaktOp: updated.aangemaakt_op,
    aangemaaktDoor: updated.aangemaakt_door ?? "",
  }

  return NextResponse.json({ item })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const { error } = await supabase.from("aanbestedingen").delete().eq("id", id)

  if (error) {
    console.log("[v0] Verwijderen mislukt:", error.message)
    return NextResponse.json({ error: "Verwijderen mislukt." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
