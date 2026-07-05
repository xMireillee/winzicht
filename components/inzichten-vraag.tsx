"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Sparkles, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const VOORBEELDVRAGEN = [
  "In welke sector verliezen we het vaakst, en wat is daar de terugkerende feedback?",
  "Waarom lopen projecten uit op de begrote uren?",
  "Bij welke klanten verloopt de samenwerking stroef en waar ligt dat aan?",
  "Op welke criteria scoren we structureel lager dan de winnaar?",
  "Welke leerpunten blijven kwartaal na kwartaal terugkomen?",
]

interface Beurt {
  vraag: string
  antwoord: string
  aantalBrieven: number
}

/** Vrije vraag over alle data; het antwoord komt van AI op basis van alle brieven, evaluaties en dossiers. */
export function InzichtenVraag() {
  const [vraag, setVraag] = useState("")
  const [bezig, setBezig] = useState(false)
  const [beurten, setBeurten] = useState<Beurt[]>([])

  async function stel(tekst?: string) {
    const v = (tekst ?? vraag).trim()
    if (v === "" || bezig) return
    setBezig(true)
    const res = await fetch("/api/inzichten", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vraag: v }),
    })
    setBezig(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "Het antwoord kon niet worden opgehaald.")
      return
    }
    setBeurten((b) => [{ vraag: v, antwoord: data.antwoord, aantalBrieven: data.aantalBrieven }, ...b])
    setVraag("")
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <Label htmlFor="inzicht-vraag" className="eyebrow">
          Jouw vraag
        </Label>
        <Textarea
          id="inzicht-vraag"
          rows={3}
          value={vraag}
          onChange={(e) => setVraag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) stel()
          }}
          placeholder="Bijvoorbeeld: waarom verliezen we vaker bij gemeenten dan bij het Rijk?"
          className="mt-2"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {VOORBEELDVRAGEN.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => stel(v)}
                disabled={bezig}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => stel()} disabled={bezig || vraag.trim() === ""}>
            <Send className="size-4" aria-hidden="true" />
            {bezig ? "Bezig met analyseren…" : "Vraag stellen"}
          </Button>
        </div>
      </Card>

      {bezig && (
        <Card className="flex items-center gap-3 p-5">
          <Sparkles className="size-4 shrink-0 animate-pulse" style={{ color: "var(--ai)" }} aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Alle gunningsbrieven, evaluaties en dossiers worden doorgenomen — dit kan even duren.
          </p>
        </Card>
      )}

      {beurten.map((b, i) => (
        <Card key={i} className="p-5">
          <p className="eyebrow">Vraag</p>
          <p className="mt-1 font-semibold text-foreground">{b.vraag}</p>
          <div className="mt-4 border-t border-border pt-4">
            <p className="whitespace-pre-wrap text-pretty text-sm text-foreground">{b.antwoord}</p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Op basis van {b.aantalBrieven} {b.aantalBrieven === 1 ? "gunningsbrief" : "gunningsbrieven"} · AI kan
              fouten maken; controleer belangrijke conclusies.
            </p>
          </div>
        </Card>
      ))}

      {beurten.length === 0 && !bezig && (
        <p className="text-sm text-muted-foreground">
          Antwoorden verschijnen hier. Ze worden niet opgeslagen — kopieer wat je wilt bewaren, bijvoorbeeld naar een
          klantdossier.
        </p>
      )}
    </div>
  )
}
