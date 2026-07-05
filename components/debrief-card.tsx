"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Sparkles, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Debrief } from "@/lib/types"

function formatTijdstip(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** AI-debrief van één aanbesteding: genereren, tonen en opnieuw genereren. */
export function DebriefCard({ id, initieel }: { id: string; initieel: Debrief | null }) {
  const [debrief, setDebrief] = useState<Debrief | null>(initieel)
  const [bezig, setBezig] = useState(false)

  async function genereer() {
    setBezig(true)
    const res = await fetch(`/api/aanbestedingen/${id}/debrief`, { method: "POST" })
    setBezig(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "De debrief kon niet worden gegenereerd.")
      return
    }
    setDebrief(data.debrief)
    if (data.opgeslagen === false) {
      toast.warning("Debrief gegenereerd, maar opslaan mislukte — hij verdwijnt bij het verlaten van de pagina.")
    } else {
      toast.success("Debrief gegenereerd en opgeslagen.")
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-h3 flex items-center gap-2">
            <Sparkles className="size-4 shrink-0" style={{ color: "var(--ai, var(--accent-strong))" }} aria-hidden="true" />
            AI-debrief
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Korte samenvatting van uitslag, doorslaggevende feedback en lessen — voor het teamarchief.
          </p>
        </div>
        <Button variant={debrief ? "outline" : "default"} size="sm" onClick={genereer} disabled={bezig}>
          {debrief ? <RotateCcw className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
          {bezig ? "Bezig met genereren…" : debrief ? "Opnieuw genereren" : "Genereer debrief"}
        </Button>
      </div>

      {debrief && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="whitespace-pre-wrap text-pretty text-sm text-foreground">{debrief.tekst}</p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Gegenereerd op {formatTijdstip(debrief.gegenereerdOp)}
            {debrief.door ? ` · ${debrief.door}` : ""} · AI kan fouten maken; controleer belangrijke conclusies.
          </p>
        </div>
      )}
    </Card>
  )
}
