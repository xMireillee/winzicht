"use client"

import { useEffect, useState } from "react"

export interface KenmerkTreffer {
  id: string
  opdrachtgever: string
  klant: string
  datum: string
}

/**
 * Controleert (met debounce) of een kenmerk al in de teamdatabase voorkomt.
 * `negeerId` sluit het huidige record uit bij bewerken.
 */
export function useKenmerkCheck(kenmerk: string, negeerId?: string) {
  const [treffers, setTreffers] = useState<KenmerkTreffer[]>([])
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    const schoon = kenmerk.trim()
    if (schoon === "") {
      setTreffers([])
      setBezig(false)
      return
    }

    let geannuleerd = false
    setBezig(true)
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ kenmerk: schoon })
        if (negeerId) params.set("negeerId", negeerId)
        const res = await fetch(`/api/aanbestedingen/check?${params.toString()}`)
        if (!res.ok) throw new Error("Controle mislukt")
        const json = (await res.json()) as { treffers: KenmerkTreffer[] }
        if (!geannuleerd) setTreffers(json.treffers ?? [])
      } catch {
        if (!geannuleerd) setTreffers([])
      } finally {
        if (!geannuleerd) setBezig(false)
      }
    }, 450)

    return () => {
      geannuleerd = true
      clearTimeout(timer)
    }
  }, [kenmerk, negeerId])

  return { treffers, bezig }
}
