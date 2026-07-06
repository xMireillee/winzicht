"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

const MIN_WACHTWOORD_LENGTE = 10

/**
 * Wachtwoord wijzigen voor de ingelogde gebruiker. Veilig zonder aparte
 * verificatie: de actieve sessie bewijst wie je bent (supabase.auth.updateUser).
 */
export function WachtwoordWijzigen() {
  const [nieuw, setNieuw] = useState("")
  const [bevestig, setBevestig] = useState("")
  const [bezig, setBezig] = useState(false)

  async function opslaan(e: React.FormEvent) {
    e.preventDefault()
    if (nieuw.length < MIN_WACHTWOORD_LENGTE) {
      toast.error(`Kies een wachtwoord van minimaal ${MIN_WACHTWOORD_LENGTE} tekens.`)
      return
    }
    if (nieuw !== bevestig) {
      toast.error("De wachtwoorden komen niet overeen.")
      return
    }
    setBezig(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: nieuw })
    setBezig(false)
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes("different from the old") || msg.includes("same password")) {
        toast.error("Het nieuwe wachtwoord moet verschillen van je huidige wachtwoord.")
      } else if (msg.includes("password")) {
        toast.error(`Het wachtwoord voldoet niet aan de eisen (minimaal ${MIN_WACHTWOORD_LENGTE} tekens).`)
      } else {
        toast.error("Wachtwoord wijzigen mislukt. Log opnieuw in en probeer het nog eens.")
      }
      return
    }
    setNieuw("")
    setBevestig("")
    toast.success("Je wachtwoord is gewijzigd. Gebruik het bij je volgende login.")
  }

  return (
    <Card className="max-w-md p-6">
      <form onSubmit={opslaan} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nieuw-wachtwoord">Nieuw wachtwoord</Label>
          <Input
            id="nieuw-wachtwoord"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_WACHTWOORD_LENGTE}
            value={nieuw}
            onChange={(e) => setNieuw(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Minimaal {MIN_WACHTWOORD_LENGTE} tekens.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bevestig-wachtwoord">Herhaal nieuw wachtwoord</Label>
          <Input
            id="bevestig-wachtwoord"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_WACHTWOORD_LENGTE}
            value={bevestig}
            onChange={(e) => setBevestig(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={bezig || !nieuw || !bevestig}>
            {bezig ? "Bezig met wijzigen…" : "Wachtwoord wijzigen"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
