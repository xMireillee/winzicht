"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface KwartaalOptie {
  kort: string // "2026-Q2"
  label: string // "Q2 2026"
}

export function KwartaalRapportButton({
  opties,
  standaard,
}: {
  opties: KwartaalOptie[]
  standaard: string
}) {
  const [kwartaal, setKwartaal] = useState(standaard)
  const [bezig, setBezig] = useState(false)

  async function genereer() {
    setBezig(true)
    try {
      const res = await fetch("/api/rapport", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kwartaal }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(json?.error ?? "Het rapport kon niet worden gemaakt.")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Corus-kwartaalrapport-${kwartaal}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`Kwartaalrapport ${kwartaal} gedownload.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Er ging iets mis.", {
        action: { label: "Opnieuw", onClick: () => genereer() },
      })
    } finally {
      setBezig(false)
    }
  }

  if (opties.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <Select value={kwartaal} onValueChange={(v) => v && setKwartaal(v)} disabled={bezig}>
        <SelectTrigger className="h-9 w-[130px] font-mono text-sm" aria-label="Kies kwartaal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opties.map((o) => (
            <SelectItem key={o.kort} value={o.kort} className="font-mono">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={genereer} disabled={bezig} className="gap-2">
        {bezig ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Rapport wordt geschreven…
          </>
        ) : (
          <>
            <FileText className="size-4" aria-hidden="true" />
            Kwartaalrapport (PDF)
          </>
        )}
      </Button>
    </div>
  )
}
