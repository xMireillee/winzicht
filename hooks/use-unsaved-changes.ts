"use client"

import { useEffect } from "react"

const BERICHT = "Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je deze pagina wilt verlaten?"

/**
 * Waarschuwt de gebruiker voordat hij wegnavigeert met niet-opgeslagen wijzigingen.
 * Dekt zowel het sluiten/verversen van het tabblad (beforeunload) als het klikken
 * op interne links (App Router heeft geen officiële navigatie-guard).
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = BERICHT
      return BERICHT
    }

    function onClickCapture(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#") || anchor.target === "_blank") return
      // Alleen interne, echte navigatie onderscheppen.
      const isIntern = href.startsWith("/") || anchor.origin === window.location.origin
      if (!isIntern) return
      if (!window.confirm(BERICHT)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("click", onClickCapture, true)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("click", onClickCapture, true)
    }
  }, [dirty])
}
