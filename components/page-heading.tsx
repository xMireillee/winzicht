import { cn } from "@/lib/utils"

/**
 * Paginatitel in de Corus bold+italic mix: vetgedrukte Archivo + editorial
 * cursieve Fraunces-accent. Eén accent per pagina.
 */
export function PageHeading({
  eyebrow,
  bold,
  accent,
  description,
  className,
}: {
  eyebrow: string
  bold: string
  accent: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="text-display">
        <span className="font-bold">{bold} </span>
        <span className="display-accent">{accent}</span>
      </h1>
      {description && <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{description}</p>}
    </div>
  )
}
