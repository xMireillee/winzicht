"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatDatum } from "@/lib/aanbesteding-utils"
import { berekenKlantStats, normaliseerKlantNaam } from "@/lib/klant-utils"
import type { Aanbesteding, KlantDossier } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface KlantRij {
  naam: string
  aantalAanbestedingen: number
  winrate: number | null
  laatsteInschrijving: string | null
  heeftDossier: boolean
  dossierId: string | null
}

export function KlantenLijst() {
  const router = useRouter()
  const { data: aData, isLoading: aLoading } = useSWR<{ items: Aanbesteding[] }>("/api/aanbestedingen", fetcher)
  const { data: kData, isLoading: kLoading } = useSWR<{ items: KlantDossier[] }>("/api/klanten", fetcher)
  const [zoek, setZoek] = useState("")
  const [bezigMet, setBezigMet] = useState<string | null>(null)

  const aanbestedingen = useMemo(() => aData?.items ?? [], [aData])
  const dossiers = useMemo(() => kData?.items ?? [], [kData])

  // Combineer beide bronnen tot één gededupliceerde, case-insensitieve lijst.
  const rijen = useMemo<KlantRij[]>(() => {
    const map = new Map<string, KlantRij>()

    // Groepeer aanbestedingen per klant (case-insensitief).
    const perKlant = new Map<string, { naam: string; items: Aanbesteding[] }>()
    for (const a of aanbestedingen) {
      const naam = normaliseerKlantNaam(a.klant)
      const key = naam.toLowerCase()
      const cur = perKlant.get(key) ?? { naam, items: [] }
      cur.items.push(a)
      perKlant.set(key, cur)
    }
    for (const [key, { naam, items }] of perKlant) {
      const stats = berekenKlantStats(items)
      map.set(key, {
        naam,
        aantalAanbestedingen: stats.aantalAanbestedingen,
        winrate: stats.winrate,
        laatsteInschrijving: stats.laatsteInschrijving,
        heeftDossier: false,
        dossierId: null,
      })
    }

    // Voeg dossiers toe / markeer bestaande rijen.
    for (const d of dossiers) {
      const key = normaliseerKlantNaam(d.klantNaam).toLowerCase()
      const bestaand = map.get(key)
      if (bestaand) {
        bestaand.heeftDossier = true
        bestaand.dossierId = d.id
      } else {
        map.set(key, {
          naam: d.klantNaam,
          aantalAanbestedingen: 0,
          winrate: null,
          laatsteInschrijving: null,
          heeftDossier: true,
          dossierId: d.id,
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => a.naam.localeCompare(b.naam, "nl"))
  }, [aanbestedingen, dossiers])

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return q === "" ? rijen : rijen.filter((r) => r.naam.toLowerCase().includes(q))
  }, [rijen, zoek])

  async function openDossier(rij: KlantRij) {
    if (rij.dossierId) {
      router.push(`/klanten/${rij.dossierId}`)
      return
    }
    // Nog geen dossier: maak er een aan bij eerste keer openen, navigeer daarna.
    setBezigMet(rij.naam)
    const res = await fetch("/api/klanten", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ klantNaam: rij.naam }),
    })
    setBezigMet(null)
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.item) {
      toast.error(data.error ?? "Dossier openen mislukt.")
      return
    }
    router.push(`/klanten/${data.item.id}`)
  }

  const isLoading = aLoading || kLoading

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow text-muted-foreground">Klantkennis</p>
        <h2 className="mt-1 font-heading text-2xl font-bold text-balance">Klantendossiers</h2>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
          Per klant combineren we de cijfers uit de aanbestedingen met de kennis die het team handmatig opbouwt.
        </p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek op klantnaam"
            className="pl-9"
            aria-label="Zoeken op klantnaam"
          />
        </div>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Laden…</p>
      ) : rijen.length === 0 ? (
        <Card className="p-10 text-center">
          <h3 className="font-heading text-lg font-semibold">Nog geen klanten</h3>
          <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
            Zodra er aanbestedingen zijn ingevoerd, verschijnen de bijbehorende klanten hier.
          </p>
        </Card>
      ) : gefilterd.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Geen klanten gevonden voor deze zoekopdracht.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {gefilterd.map((rij) => (
            <Card key={rij.naam} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-heading text-lg font-semibold">{rij.naam}</span>
                  {rij.heeftDossier ? (
                    <Badge className="bg-[var(--won)]/15 text-[var(--won)]">Dossier aanwezig</Badge>
                  ) : (
                    <Badge variant="secondary">Nog geen dossier</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
                  <span>{rij.aantalAanbestedingen} aanbesteding{rij.aantalAanbestedingen === 1 ? "" : "en"}</span>
                  <span>Winrate: {rij.winrate != null ? `${Math.round(rij.winrate * 100)}%` : "—"}</span>
                  <span>Laatste inschrijving: {rij.laatsteInschrijving ? formatDatum(rij.laatsteInschrijving) : "—"}</span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => openDossier(rij)}
                disabled={bezigMet === rij.naam}
                className="shrink-0"
              >
                {bezigMet === rij.naam ? "Bezig…" : "Open dossier"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
