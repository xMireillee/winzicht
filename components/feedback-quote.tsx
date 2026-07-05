"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

/** Feedbackcitaat: cursief, ingekort tot 3 regels met een "Toon meer"-knop. */
export function FeedbackQuote({ tekst }: { tekst: string }) {
  const [open, setOpen] = useState(false)
  const lang = tekst.length > 160

  return (
    <div className="mt-2">
      <blockquote
        className={cn(
          "border-l-2 pl-3 text-sm italic text-[var(--muted-foreground)]",
          !open && "line-clamp-3",
        )}
        style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }}
      >
        {tekst}
      </blockquote>
      {lang && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-1 text-xs font-medium text-[var(--accent-strong)] underline underline-offset-2 hover:opacity-80"
        >
          {open ? "Toon minder" : "Toon meer"}
        </button>
      )}
    </div>
  )
}
