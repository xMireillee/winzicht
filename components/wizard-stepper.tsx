import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export const WIZARD_STAPPEN = ["Uploaden", "Controleren", "Opslaan"] as const

/** Bovenliggende 3-staps voortgangsbalk voor de nieuwe-brief flow. */
export function WizardStepper({ stap }: { stap: number }) {
  return (
    <ol className="flex items-center gap-3" aria-label="Voortgang">
      {WIZARD_STAPPEN.map((label, i) => {
        const klaar = i < stap
        const actief = i === stap
        return (
          <li key={label} className="flex flex-1 items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-current={actief ? "step" : undefined}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-colors",
                  klaar && "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]",
                  actief && "border-[var(--accent)] text-[var(--accent-strong)]",
                  !klaar && !actief && "border-border text-faint",
                )}
              >
                {klaar ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "font-mono text-xs uppercase tracking-[0.14em] whitespace-nowrap",
                  actief ? "text-foreground" : klaar ? "text-muted-foreground" : "text-faint",
                )}
              >
                {label}
              </span>
            </div>
            {i < WIZARD_STAPPEN.length - 1 && (
              <span className={cn("h-px flex-1", klaar ? "bg-[var(--accent)]" : "bg-border")} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
