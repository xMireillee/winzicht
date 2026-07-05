import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Aanbesteding } from "@/lib/types"

// Alle reads/writes lopen via deze route, nooit direct vanuit de client.

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const { data, error } = await supabase
    .from("aanbestedingen")
    .select("id, data, aangemaakt_door, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false })

  if (error) {
    console.log("[v0] Ophalen mislukt:", error.message)
    return NextResponse.json({ error: "Ophalen van gegevens mislukt." }, { status: 500 })
  }

  const items: Aanbesteding[] = (data ?? []).map((row) => ({
    ...(row.data as Omit<Aanbesteding, "id" | "aangemaaktOp" | "aangemaaktDoor">),
    id: row.id,
    aangemaaktOp: row.aangemaakt_op,
    aangemaaktDoor: row.aangemaakt_door ?? "",
  }))

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
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

  // id/metadata worden server-side gezet.
  const { id: _id, aangemaaktOp: _op, aangemaaktDoor: _door, ...rest } = payload
  const data = rest

  const { data: inserted, error } = await supabase
    .from("aanbestedingen")
    .insert({ data, aangemaakt_door: user.email })
    .select("id, data, aangemaakt_door, aangemaakt_op")
    .single()

  if (error) {
    console.log("[v0] Opslaan mislukt:", error.message)
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 })
  }

  const item: Aanbesteding = {
    ...(inserted.data as Omit<Aanbesteding, "id" | "aangemaaktOp" | "aangemaaktDoor">),
    id: inserted.id,
    aangemaaktOp: inserted.aangemaakt_op,
    aangemaaktDoor: inserted.aangemaakt_door ?? "",
  }

  return NextResponse.json({ item }, { status: 201 })
}
