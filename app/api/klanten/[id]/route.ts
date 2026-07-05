import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { KlantDossier, KlantNotitie } from "@/lib/types"

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

async function haalDossier(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  return supabase.from("klanten").select("id, klant_naam, data, bijgewerkt_op").eq("id", id).single()
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const { data, error } = await haalDossier(supabase, id)
  if (error || !data) {
    return NextResponse.json({ error: "Dossier niet gevonden." }, { status: 404 })
  }
  return NextResponse.json({ item: mapRow(data) })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  let body: {
    profiel?: string
    sterktes?: string
    aandachtspunten?: string
    afspraken?: string
    nieuweNotitie?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ongeldige gegevens." }, { status: 400 })
  }

  // Huidige staat ophalen: bestaande notities zijn append-only en mogen nooit worden
  // overschreven of verwijderd vanuit de client.
  const { data: huidig, error: leesFout } = await haalDossier(supabase, id)
  if (leesFout || !huidig) {
    return NextResponse.json({ error: "Dossier niet gevonden." }, { status: 404 })
  }
  const dossier = mapRow(huidig)

  const notities: KlantNotitie[] = [...dossier.notities]
  const nieuweTekst = (body.nieuweNotitie ?? "").trim()
  if (nieuweTekst !== "") {
    // datum en auteur worden server-side gezet op basis van de sessie.
    notities.push({ datum: new Date().toISOString(), auteur: user.email ?? "onbekend", tekst: nieuweTekst })
  }

  const nieuweData = {
    profiel: body.profiel ?? dossier.profiel,
    sterktes: body.sterktes ?? dossier.sterktes,
    aandachtspunten: body.aandachtspunten ?? dossier.aandachtspunten,
    afspraken: body.afspraken ?? dossier.afspraken,
    notities,
  }

  const { data: updated, error } = await supabase
    .from("klanten")
    .update({ data: nieuweData, bijgewerkt_op: new Date().toISOString() })
    .eq("id", id)
    .select("id, klant_naam, data, bijgewerkt_op")
    .single()

  if (error) {
    console.log("[v0] Dossier bijwerken mislukt:", error.message)
    return NextResponse.json({ error: "Bijwerken mislukt." }, { status: 500 })
  }

  return NextResponse.json({ item: mapRow(updated) })
}
