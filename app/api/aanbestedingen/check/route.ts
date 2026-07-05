import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Aanbesteding } from "@/lib/types"

// Controleert of een kenmerk al voorkomt in de teamdatabase (duplicaatdetectie).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const url = new URL(request.url)
  const kenmerk = (url.searchParams.get("kenmerk") ?? "").trim()
  const negeerId = url.searchParams.get("negeerId") ?? ""

  if (kenmerk === "") return NextResponse.json({ treffers: [] })

  // Case-insensitieve exacte match op het JSONB-veld data->>kenmerk.
  const { data, error } = await supabase
    .from("aanbestedingen")
    .select("id, data, aangemaakt_op")
    .ilike("data->>kenmerk", kenmerk)

  if (error) {
    console.log("[v0] Kenmerkcontrole mislukt:", error.message)
    return NextResponse.json({ error: "Controle mislukt." }, { status: 500 })
  }

  const treffers = (data ?? [])
    .filter((row) => row.id !== negeerId)
    .map((row) => {
      const d = row.data as Aanbesteding
      return {
        id: row.id,
        opdrachtgever: d.opdrachtgever ?? "",
        klant: d.klant ?? "",
        datum: d.datum ?? "",
      }
    })

  return NextResponse.json({ treffers })
}
