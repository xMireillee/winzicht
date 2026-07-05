"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titel: string
  /** Beschrijf het gevolg, bijv. "Dit verwijdert de aanbesteding voor alle collega's." */
  gevolg: string
  bevestigLabel?: string
  annuleerLabel?: string
  bezig?: boolean
  onBevestig: () => void
}

/** Consistente destructieve-actie-bevestiging: rood + duidelijke consequentie. */
export function ConfirmDialog({
  open,
  onOpenChange,
  titel,
  gevolg,
  bevestigLabel = "Verwijderen",
  annuleerLabel = "Annuleren",
  bezig = false,
  onBevestig,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{titel}</DialogTitle>
          <DialogDescription>{gevolg}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={bezig} />}>{annuleerLabel}</DialogClose>
          <Button
            variant="destructive"
            className="border border-destructive/40"
            disabled={bezig}
            onClick={onBevestig}
          >
            {bezig ? "Bezig…" : bevestigLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Kleine hook om de open-state van een bevestigingsdialoog te beheren. */
export function useConfirm() {
  const [open, setOpen] = useState(false)
  return { open, setOpen }
}
