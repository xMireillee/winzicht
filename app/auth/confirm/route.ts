import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

// Bevestigingslinks uit e-mails (account bevestigen, wachtwoordherstel) landen
// hier met een token_hash. verifyOtp werkt vanaf elk apparaat — anders dan de
// code-flow in /auth/callback, die een cookie uit dezelfde browser vereist.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const rawNext = searchParams.get("next")
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/nieuw"

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.log("[v0] Bevestiging mislukt:", error.message)
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
