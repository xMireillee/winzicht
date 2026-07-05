"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, Users, Plus, LogOut, Menu, X, MessageSquareQuote, Settings, Search, Sparkles, ChartColumn } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/overzicht", label: "Gunningsbrieven", icon: FileText },
  { href: "/feedback", label: "Feedback zoeken", icon: MessageSquareQuote },
  { href: "/klanten", label: "Klanten", icon: Users },
  { href: "/analyse", label: "Analyse", icon: ChartColumn },
  { href: "/inzichten", label: "Inzichten", icon: Sparkles },
] as const

function isActief(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

function SidebarInhoud({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const naam = email ? email.split("@")[0] : "Gebruiker"
  const initiaal = (naam[0] ?? "?").toUpperCase()

  async function uitloggen() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col gap-1 px-4 py-6 text-primary-foreground">
      {/* Wordmark */}
      <Link href="/dashboard" onClick={onNavigate} className="flex flex-col gap-1 px-2">
        <span className="flex items-baseline gap-0.5 font-heading text-2xl font-extrabold tracking-tight">
          corus
          <span className="size-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} aria-hidden="true" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary-foreground/50">
          Tenderintelligentie
        </span>
      </Link>

      {/* Primaire actie */}
      <Link
        href="/nieuw"
        onClick={onNavigate}
        className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-white/90"
      >
        <Plus className="size-4" aria-hidden="true" />
        Nieuwe brief
      </Link>

      {/* Snel zoeken */}
      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          window.dispatchEvent(new Event("open-command-palette"))
        }}
        className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary-foreground/70 transition-colors hover:bg-white/[0.06] hover:text-primary-foreground"
      >
        <Search className="size-[18px] shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Zoeken</span>
        <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-primary-foreground/50">
          ⌘K
        </kbd>
      </button>

      {/* Navigatie */}
      <nav className="mt-3 flex flex-col gap-1" aria-label="Hoofdnavigatie">
        {NAV.map(({ href, label, icon: Icon }) => {
          const actief = isActief(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={actief ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                actief
                  ? "bg-white/[0.11] font-medium text-primary-foreground"
                  : "text-primary-foreground/70 hover:bg-white/[0.06] hover:text-primary-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Instellingen */}
      <Link
        href="/instellingen/labels"
        onClick={onNavigate}
        aria-current={isActief(pathname, "/instellingen") ? "page" : undefined}
        className={cn(
          "mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActief(pathname, "/instellingen")
            ? "bg-white/[0.11] font-medium text-primary-foreground"
            : "text-primary-foreground/70 hover:bg-white/[0.06] hover:text-primary-foreground",
        )}
      >
        <Settings className="size-[18px] shrink-0" aria-hidden="true" />
        Instellingen
      </Link>

      {/* Gebruiker */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-2">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold"
            style={{ backgroundColor: "var(--accent)", color: "var(--ink-deep)" }}
            aria-hidden="true"
          >
            {initiaal}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium capitalize">{naam}</p>
            <p className="truncate font-mono text-[11px] text-primary-foreground/50">{email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={uitloggen}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary-foreground/70 transition-colors hover:bg-white/[0.06] hover:text-primary-foreground"
        >
          <LogOut className="size-[18px] shrink-0" aria-hidden="true" />
          Uitloggen
        </button>
      </div>
    </div>
  )
}

export function AppSidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Vaste zijbalk op desktop */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[218px] md:block"
        style={{ backgroundColor: "var(--ink-deep)" }}
      >
        <SidebarInhoud email={email} />
      </aside>

      {/* Mobiele topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 text-primary-foreground md:hidden"
        style={{ backgroundColor: "var(--ink-deep)" }}
      >
        <span className="flex items-baseline gap-0.5 font-heading text-xl font-extrabold tracking-tight">
          corus
          <span className="size-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} aria-hidden="true" />
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menu openen"
          className="rounded-md p-1.5 hover:bg-white/10"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobiel overlay-menu */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigatie">
          <button
            type="button"
            aria-label="Menu sluiten"
            className="absolute inset-0 bg-[var(--ink-deep)]/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[260px]" style={{ backgroundColor: "var(--ink-deep)" }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menu sluiten"
              className="absolute right-3 top-4 rounded-md p-1.5 text-primary-foreground hover:bg-white/10"
            >
              <X className="size-5" />
            </button>
            <SidebarInhoud email={email} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
