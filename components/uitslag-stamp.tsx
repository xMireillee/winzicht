import { cn } from "@/lib/utils"
import type { Uitslag } from "@/lib/types"

// Rechte pill met gekleurde stip — vervangt de oude gedraaide stempel.
const STYLES: Record<Uitslag, { color: string; bg: string; label: string }> = {
  Gewonnen: { color: "var(--won)", bg: "var(--won-bg)", label: "Gewonnen" },
  Verloren: { color: "var(--lost)", bg: "var(--lost-bg)", label: "Verloren" },
  Ingetrokken: { color: "var(--faint)", bg: "var(--secondary)", label: "Ingetrokken" },
  Onbekend: { color: "var(--faint)", bg: "var(--secondary)", label: "Onbekend" },
}

export function UitslagStamp({
  uitslag,
  size,
  className,
}: {
  uitslag: Uitslag
  size?: "sm"
  className?: string
}) {
  const s = STYLES[uitslag] ?? STYLES.Onbekend
  return (
    <span
      className={cn("result-pill", className)}
      data-size={size}
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      <span className="result-dot" style={{ backgroundColor: s.color }} aria-hidden="true" />
      {s.label}
    </span>
  )
}
