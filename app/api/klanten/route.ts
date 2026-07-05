import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { leegDossierData, normaliseerKlantNaam } from "@/lib/klant-utils"
import type { KlantDossier } from "@/lib/types"

// Zet een databaserij om naar een KlantDossier-object.
function mapRow(row: { id: string; klant_naam: string; data: unknown; bijgewerkt_op: string }): KlantDossier {
  const d = (row.data ?? {}) as Partial<KlantDossier>
  return {
    id: row.id,
    klantNaam: row.klant_naam,
    profiel: d.profiel ?? "",
    sterktes: d.sterktes ?? "",
    aandachtspunten: d.aandachtspunten ?? "",
    afspraken: d.afspraken ?? "",
    notities: Array.isArray(d.notities) ? d.notities : [],
    bijgewerktOp: row.bijgewerkt_op,
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const { data, error } = await supabase
    .from("klanten")
    .select("id, klant_naam, data, bijgewerkt_op")
    .order("klant_naam", { ascending: true })

  if (error) {
    console.log("[v0] Klanten ophalen mislukt:", error.message)
    return NextResponse.json({ error: "Ophalen van klanten mislukt." }, { status: 500 })
  }

  return NextResponse.json({ items: (data ?? []).map(mapRow) })
}

// Idempotent op naam: bestaat er al een dossier (case-insensitief), dan geven we dat terug.
// Zo niet, dan maken we een leeg dossier aan ("stub bij eerste keer openen").
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  let body: { klantNaam?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ongeldige gegevens." }, { status: 400 })
  }

  const klantNaam = normaliseerKlantNaam(body.klantNaam ?? "")

  // Bestaand dossier zoeken (case-insensitief).
  const { data: bestaand, error: zoekFout } = await supabase
    .from("klanten")
    .select("id, klant_naam, data, bijgewerkt_op")
    .ilike("klant_naam", klantNaam)
    .maybeSingle()

  if (zoekFout) {
    console.log("[v0] Dossier zoeken mislukt:", zoekFout.message)
    return NextResponse.json({ error: "Kon dossier niet opzoeken." }, { status: 500 })
  }
  if (bestaand) {
    return NextResponse.json({ item: mapRow(bestaand) })
  }

  const { data: inserted, error } = await supabase
    .from("klanten")
    .insert({ klant_naam: klantNaam, data: leegDossierData() })
    .select("id, klant_naam, data, bijgewerkt_op")
    .single()

  if (error) {
    console.log("[v0] Dossier aanmaken mislukt:", error.message)
    return NextResponse.json({ error: "Dossier aanmaken mislukt." }, { status: 500 })
  }

  return NextResponse.json({ item: mapRow(inserted) }, { status: 201 })
}
