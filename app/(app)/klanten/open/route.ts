import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { leegDossierData, normaliseerKlantNaam } from "@/lib/klant-utils"

// Vindt-of-maakt het dossier voor een klantnaam en stuurt door naar de detailpagina.
// Zo kan de klantnaam in andere schermen direct naar het (evt. nieuwe) dossier linken.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  const naamParam = request.nextUrl.searchParams.get("naam") ?? ""
  const klantNaam = normaliseerKlantNaam(naamParam)

  const { data: bestaand } = await supabase
    .from("klanten")
    .select("id")
    .ilike("klant_naam", klantNaam)
    .maybeSingle()

  let dossierId = bestaand?.id as string | undefined

  if (!dossierId) {
    const { data: inserted, error } = await supabase
      .from("klanten")
      .insert({ klant_naam: klantNaam, data: leegDossierData() })
      .select("id")
      .single()
    if (error || !inserted) {
      console.log("[v0] Dossier resolven mislukt:", error?.message)
      return NextResponse.redirect(new URL("/klanten", request.url))
    }
    dossierId = inserted.id
  }

  return NextResponse.redirect(new URL(`/klanten/${dossierId}`, request.url))
}
