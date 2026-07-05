import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export const EXTRACTIE_STAPPEN = ["PDF lezen", "Gegevens extraheren", "Feedback coderen"] as const

/** Gefaseerde voortgangsindicator zodat de ~15–30s wachttijd doelgericht voelt. */
export function ExtractieVoortgang({ stap }: { stap: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {EXTRACTIE_STAPPEN.map((label, i) => {
          const klaar = i < stap
          const bezig = i === stap
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors",
                    klaar && "border-[var(--won)] bg-[var(--won)] text-[var(--won-foreground)]",
                    bezig && "border-[var(--accent)] text-[var(--accent-strong)]",
                    !klaar && !bezig && "border-border text-faint",
                  )}
                >
                  {klaar ? <Check className="size-3.5" /> : bezig ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-sm whitespace-nowrap",
                    bezig ? "font-medium text-foreground" : klaar ? "text-muted-foreground" : "text-faint",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < EXTRACTIE_STAPPEN.length - 1 && (
                <span className={cn("h-px flex-1", klaar ? "bg-[var(--won)]" : "bg-border")} />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Dit duurt doorgaans 15–30 seconden. De brief blijft lokaal; alleen de tekst gaat naar het taalmodel.
      </p>
    </div>
  )
}
