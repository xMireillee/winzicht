import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; redirectTo?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ongeldige gegevens." }, { status: 400 })
  }

  const email = (body.email ?? "").trim().toLowerCase()
  const password = body.password ?? ""

  if (!email || !password) {
    return NextResponse.json({ error: "Vul een e-mailadres en wachtwoord in." }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Het wachtwoord moet minimaal 6 tekens bevatten." }, { status: 400 })
  }

  // Domeinrestrictie: alleen bedrijfsadressen mogen een account aanmaken.
  // Accepteer zowel "corusadvies.nl" als een volledig adres ("naam@corusadvies.nl").
  const rawDomein = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase()
  const domein = rawDomein?.includes("@") ? rawDomein.split("@").pop() : rawDomein
  if (domein && !email.endsWith(`@${domein}`)) {
    return NextResponse.json(
      { error: `Alleen e-mailadressen van @${domein} kunnen een account aanmaken.` },
      { status: 403 },
    )
  }

  // Interne tool: account direct bevestigd aanmaken (geen bevestigingsmail),
  // zodat de e-maillimiet van Supabase geen rol speelt. De domeincheck hierboven
  // beperkt wie een account mag aanmaken.
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    console.log("[v0] Signup-fout:", error.status, error.message)
    const msg = error.message.toLowerCase()
    let melding = error.message
    if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
      melding = "Er bestaat al een account met dit e-mailadres. Log in of gebruik 'wachtwoord vergeten'."
    } else if (msg.includes("rate limit") || msg.includes("email rate")) {
      melding =
        "De e-maillimiet is tijdelijk bereikt (Supabase verstuurt standaard maar een paar bevestigingsmails per uur). Probeer het over een uur opnieuw, of schakel e-mailbevestiging uit voor intern gebruik."
    } else if (msg.includes("password")) {
      melding = "Het wachtwoord voldoet niet aan de eisen (minimaal 6 tekens)."
    } else if (msg.includes("invalid") && msg.includes("email")) {
      melding = "Dit e-mailadres is ongeldig."
    }
    return NextResponse.json({ error: melding }, { status: error.status ?? 400 })
  }

  return NextResponse.json({ ok: true })
}
