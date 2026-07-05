import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !password) {
    return NextResponse.json({ error: "Vul een e-mailadres en nieuw wachtwoord in." }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Het wachtwoord moet minimaal 6 tekens bevatten." }, { status: 400 })
  }

  // Alleen bedrijfsadressen mogen een wachtwoord herstellen.
  const rawDomein = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase()
  const domein = rawDomein?.includes("@") ? rawDomein.split("@").pop() : rawDomein
  if (domein && !email.endsWith(`@${domein}`)) {
    return NextResponse.json(
      { error: `Alleen e-mailadressen van @${domein} kunnen hier terecht.` },
      { status: 403 },
    )
  }

  const admin = createAdminClient()

  // Zoek de gebruiker op e-mailadres. Het team is klein, dus één pagina volstaat.
  const { data, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    console.log("[v0] Reset listUsers-fout:", listError.message)
    return NextResponse.json({ error: "Wachtwoord herstellen mislukt. Probeer het opnieuw." }, { status: 500 })
  }

  const user = data.users.find((u) => u.email?.toLowerCase() === email)
  if (!user) {
    return NextResponse.json(
      { error: "Er is geen account met dit e-mailadres. Maak eerst een account aan." },
      { status: 404 },
    )
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  })
  if (error) {
    console.log("[v0] Reset updateUser-fout:", error.message)
    return NextResponse.json({ error: "Nieuw wachtwoord instellen mislukt." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
