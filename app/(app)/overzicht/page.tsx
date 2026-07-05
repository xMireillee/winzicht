import { Suspense } from "react"
import { OverzichtLijst } from "@/components/overzicht-lijst"

export default function OverzichtPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Laden…</p>}>
      <OverzichtLijst />
    </Suspense>
  )
}
