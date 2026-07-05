"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [melding, setMelding] = useState<string | null>(null)
  const [mode, setMode] = useState<"login" | "reset">("login")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMelding(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setLoading(false)
    if (error) {
      setError("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.")
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
    setLoading(true)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        redirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? "Account aanmaken mislukt.")
      return
    }
    setMelding("Account aangemaakt. Je kunt nu direct inloggen met dit e-mailadres en wachtwoord.")
  }

  async function handleReset() {
    setError(null)
    setMelding(null)
    if (!email || !password) {
      setError("Vul je e-mailadres en een nieuw wachtwoord in.")
      return
    }
    setLoading(true)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? "Wachtwoord herstellen mislukt.")
      return
    }
    setPassword("")
    setMode("login")
    setMelding("Je wachtwoord is bijgewerkt. Log nu in met je nieuwe wachtwoord.")
  }

  function toggleReset() {
    setError(null)
    setMelding(null)
    setPassword("")
    setMode((m) => (m === "login" ? "reset" : "login"))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="eyebrow text-primary-foreground/70">Corus Advies · Interne tool</p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-primary-foreground text-balance">
            Gunningsbrief-analyse
          </h1>
        </div>

        <Card className="p-6">
          <h2 className="font-heading text-xl font-semibold">
            {mode === "login" ? "Inloggen" : "Wachtwoord herstellen"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Log in met je Corus Advies-account om verder te gaan."
              : "Vul je e-mailadres in en kies een nieuw wachtwoord."}
          </p>

          <form
            onSubmit={mode === "login" ? handleLogin : (e) => {
              e.preventDefault()
              handleReset()
            }}
            className="mt-6 flex flex-col gap-4"
          >
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
              <Label htmlFor="password">{mode === "login" ? "Wachtwoord" : "Nieuw wachtwoord"}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
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
              {mode === "login" ? (
                <>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Bezig…" : "Inloggen"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleSignUp} disabled={loading}>
                    Account aanmaken
                  </Button>
                </>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? "Bezig…" : "Nieuw wachtwoord instellen"}
                </Button>
              )}
            </div>

            <button
              type="button"
              onClick={toggleReset}
              className="mt-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {mode === "login" ? "Wachtwoord vergeten?" : "Terug naar inloggen"}
            </button>
          </form>
        </Card>
      </div>
    </main>
  )
}
