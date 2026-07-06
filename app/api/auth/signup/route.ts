import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MIN_WACHTWOORD_LENGTE = 10

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
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

  if (password.length < MIN_WACHTWOORD_LENGTE) {
    return NextResponse.json(
      { error: `Het wachtwoord moet minimaal ${MIN_WACHTWOORD_LENGTE} tekens bevatten.` },
      { status: 400 },
    )
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

  // Bevestigingsmail verplicht: het account werkt pas nadat de eigenaar van de
  // mailbox op de link heeft geklikt. De redirect-URL wordt server-side bepaald,
  // zodat de client geen willekeurige bestemming kan meesturen. Gebruik de
  // e-mailtemplate met token_hash naar /auth/confirm (zie supabase/schema.sql),
  // dan werkt de link vanaf elk apparaat.
  const redirectTo = `${request.nextUrl.origin}/auth/confirm`

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  })

  if (error) {
    console.log("[v0] Signup-fout:", error.status, error.message)
    const msg = error.message.toLowerCase()
    let melding = "Account aanmaken mislukt. Probeer het later opnieuw."
    if (msg.includes("rate limit") || msg.includes("email rate")) {
      melding = "De e-maillimiet is tijdelijk bereikt. Probeer het over een uur opnieuw."
    } else if (msg.includes("password")) {
      melding = `Het wachtwoord voldoet niet aan de eisen (minimaal ${MIN_WACHTWOORD_LENGTE} tekens).`
    } else if (msg.includes("invalid") && msg.includes("email")) {
      melding = "Dit e-mailadres is ongeldig."
    }
    return NextResponse.json({ error: melding }, { status: error.status ?? 400 })
  }

  // Bewust geen onderscheid tussen "nieuw account" en "bestond al" in de respons,
  // zodat buitenstaanders niet kunnen aftasten welke adressen een account hebben.
  return NextResponse.json({ ok: true })
}
