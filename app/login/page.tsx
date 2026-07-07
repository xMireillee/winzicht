"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

const MIN_WACHTWOORD_LENGTE = 10

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [melding, setMelding] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMelding(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setLoading(false)
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes("email not confirmed")) {
        setError("Je account is nog niet bevestigd. Klik eerst op de link in de bevestigingsmail.")
      } else {
        setError("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.")
      }
      return
    }
    router.push("/nieuw")
    router.refresh()
  }

  async function handleSignUp() {
    setError(null)
    setMelding(null)
    if (!email || !password) {
      setError("Vul een e-mailadres en wachtwoord in.")
      return
    }
    if (password.length < MIN_WACHTWOORD_LENGTE) {
      setError(`Kies een wachtwoord van minimaal ${MIN_WACHTWOORD_LENGTE} tekens.`)
      return
    }
    setLoading(true)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? "Account aanmaken mislukt.")
      return
    }
    setPassword("")
    setMelding(
      "Er is een bevestigingsmail verstuurd. Klik op de link in die mail om je account te activeren; daarna kun je hier inloggen.",
    )
  }

  // Login drijft als glazen paneel op de atmosfeer-achtergrond uit RootLayout.
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="eyebrow">Corus Advies · Interne tool</p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-balance">
            Gunningsbrief-<span className="display-accent">analyse</span>
          </h1>
        </div>

        <Card className="p-6">
          <h2 className="font-heading text-xl font-semibold">Inloggen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Log in met je Corus Advies-account om verder te gaan.
          </p>

          <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@corusadvies.nl"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Wachtwoord</Label>
              {/* Geen minLength hier: bestaande accounts kunnen een ouder, korter
                  wachtwoord hebben en moeten gewoon kunnen inloggen. De eis van
                  10+ tekens geldt bij aanmaken en wijzigen. */}
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
            {melding && (
              <p className="text-sm font-medium text-[var(--won)]" role="status">
                {melding}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Bezig…" : "Inloggen"}
              </Button>
              <Button type="button" variant="outline" onClick={handleSignUp} disabled={loading}>
                Account aanmaken
              </Button>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Wachtwoord vergeten? Vraag de beheerder om je wachtwoord opnieuw in te stellen.
            </p>
          </form>
        </Card>
      </div>
    </main>
  )
}
