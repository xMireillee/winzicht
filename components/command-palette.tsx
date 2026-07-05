"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquareQuote,
  Settings,
  Plus,
  AlertTriangle,
  Building2,
  Sparkles,
  ChartColumn,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { normaliseerKlantNaam } from "@/lib/klant-utils"
import { formatDatum } from "@/lib/aanbesteding-utils"
import type { Aanbesteding } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { data } = useSWR<{ items: Aanbesteding[] }>(open ? "/api/aanbestedingen" : null, fetcher)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    function onOpen() {
      setOpen(true)
    }
    document.addEventListener("keydown", onKey)
    window.addEventListener("open-command-palette", onOpen)
    return () => {
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("open-command-palette", onOpen)
    }
  }, [])

  const items = data?.items ?? []

  const klanten = useMemo(() => {
    const map = new Map<string, { naam: string; aantal: number }>()
    for (const a of items) {
      const naam = normaliseerKlantNaam(a.klant || a.opdrachtgever || "")
      if (!naam) continue
      const bestaand = map.get(naam.toLowerCase())
      if (bestaand) bestaand.aantal += 1
      else map.set(naam.toLowerCase(), { naam, aantal: 1 })
    }
    return [...map.values()].sort((a, b) => b.aantal - a.aantal).slice(0, 8)
  }, [items])

  const brieven = useMemo(
    () =>
      [...items]
        .sort(
          (a, b) =>
            new Date(b.datum || b.aangemaaktOp).getTime() - new Date(a.datum || a.aangemaaktOp).getTime(),
        )
        .slice(0, 8),
    [items],
  )

  function ga(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Commandopalet" description="Zoek en navigeer snel">
      <CommandInput placeholder="Zoek een pagina, klant of gunningsbrief…" />
      <CommandList>
        <CommandEmpty>Geen resultaten gevonden.</CommandEmpty>

        <CommandGroup heading="Acties">
          <CommandItem onSelect={() => ga("/nieuw")}>
            <Plus className="size-4" />
            Nieuwe brief toevoegen
          </CommandItem>
          <CommandItem onSelect={() => ga("/overzicht?onvolledig=1")}>
            <AlertTriangle className="size-4" />
            Onvolledige brieven bekijken
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Pagina's">
          <CommandItem onSelect={() => ga("/dashboard")}>
            <LayoutDashboard className="size-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => ga("/overzicht")}>
            <FileText className="size-4" />
            Gunningsbrieven
          </CommandItem>
          <CommandItem onSelect={() => ga("/feedback")}>
            <MessageSquareQuote className="size-4" />
            Feedback zoeken
          </CommandItem>
          <CommandItem onSelect={() => ga("/klanten")}>
            <Users className="size-4" />
            Klanten
          </CommandItem>
          <CommandItem onSelect={() => ga("/analyse")}>
            <ChartColumn className="size-4" />
            Analyse
          </CommandItem>
          <CommandItem onSelect={() => ga("/inzichten")}>
            <Sparkles className="size-4" />
            Inzichten
          </CommandItem>
          <CommandItem onSelect={() => ga("/instellingen/labels")}>
            <Settings className="size-4" />
            Instellingen
          </CommandItem>
        </CommandGroup>

        {klanten.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Klanten">
              {klanten.map((k) => (
                <CommandItem
                  key={k.naam}
                  value={`klant ${k.naam}`}
                  onSelect={() => ga(`/overzicht?klant=${encodeURIComponent(k.naam)}`)}
                >
                  <Building2 className="size-4" />
                  <span className="flex-1">{k.naam}</span>
                  <span className="text-xs text-muted-foreground">
                    {k.aantal} {k.aantal === 1 ? "brief" : "brieven"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {brieven.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Gunningsbrieven">
              {brieven.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`brief ${a.opdrachtgever || ""} ${a.klant || ""} ${a.kenmerk || ""} ${a.id}`}
                  onSelect={() => ga(`/overzicht/${a.id}`)}
                >
                  <FileText className="size-4" />
                  <span className="flex-1 truncate">
                    {a.opdrachtgever || a.klant || "Gunningsbrief"}
                    {a.kenmerk ? ` · ${a.kenmerk}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDatum(a.datum)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
