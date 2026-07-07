"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, Users, Plus, LogOut, Menu, X, MessageSquareQuote, Settings, Search, Sparkles, ChartColumn, KeyRound } from "lucide-react"
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

/* Dark glass chrome for the sidebar / topbar */
const glassChrome: React.CSSProperties = {
  backgroundColor: "rgba(10, 16, 32, 0.42)",
  backdropFilter: "blur(28px) saturate(1.6)",
  WebkitBackdropFilter: "blur(28px) saturate(1.6)",
}

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
    <div className="flex h-full flex-col gap-1 px-4 py-6 text-[#F2F5FB]">
      {/* Wordmark */}
      <Link href="/dashboard" onClick={onNavigate} className="flex flex-col gap-1 px-2">
        <span className="flex items-baseline gap-0.5 font-heading text-2xl font-bold tracking-tight">
          corus
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 10px rgba(47,216,197,0.8)" }}
            aria-hidden="true"
          />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/45">
          Tenderintelligentie
        </span>
      </Link>

      {/* Primaire actie — teal accent + glow */}
      <Link
        href="/nieuw"
        onClick={onNavigate}
        className="mt-6 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all hover:brightness-110"
        style={{
          backgroundColor: "var(--accent)",
          color: "#06201C",
          boxShadow: "0 0 24px rgba(47,216,197,0.45)",
        }}
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
        className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <Search className="size-[18px] shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Zoeken</span>
        <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white/45">
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
                "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                actief
                  ? "border-white/20 bg-white/[0.12] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  : "border-transparent text-white/65 hover:bg-white/[0.08] hover:text-white",
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
          "mt-auto flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
          isActief(pathname, "/instellingen")
            ? "border-white/20 bg-white/[0.12] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            : "border-transparent text-white/65 hover:bg-white/[0.08] hover:text-white",
        )}
      >
        <Settings className="size-[18px] shrink-0" aria-hidden="true" />
        Instellingen
      </Link>

      {/* Gebruiker */}
      <div className="mt-4 border-t border-white/12 pt-4">
        <div className="flex items-center gap-3 px-2">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold"
            style={{
              backgroundColor: "var(--accent)",
              color: "#06201C",
              boxShadow: "0 0 16px rgba(47,216,197,0.4)",
            }}
            aria-hidden="true"
          >
            {initiaal}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium capitalize">{naam}</p>
            <p className="truncate font-mono text-[11px] text-white/45">{email}</p>
          </div>
        </div>
        <Link
          href="/instellingen/wachtwoord"
          onClick={onNavigate}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <KeyRound className="size-[18px] shrink-0" aria-hidden="true" />
          Wachtwoord wijzigen
        </Link>
        <button
          type="button"
          onClick={uitloggen}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white"
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
      {/* Vaste zijbalk op desktop — dark glass over the backdrop */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[218px] border-r border-white/12 md:block"
        style={glassChrome}
      >
        <SidebarInhoud email={email} />
      </aside>

      {/* Mobiele topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between border-b border-white/12 px-4 py-3 text-[#F2F5FB] md:hidden"
        style={glassChrome}
      >
        <span className="flex items-baseline gap-0.5 font-heading text-xl font-bold tracking-tight">
          corus
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 10px rgba(47,216,197,0.8)" }}
            aria-hidden="true"
          />
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
            className="absolute inset-0 bg-[rgba(6,9,22,0.6)]"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 w-[260px] border-r border-white/12"
            style={{
              backgroundColor: "rgba(10, 16, 32, 0.72)",
              backdropFilter: "blur(28px) saturate(1.6)",
              WebkitBackdropFilter: "blur(28px) saturate(1.6)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menu sluiten"
              className="absolute right-3 top-4 rounded-md p-1.5 text-[#F2F5FB] hover:bg-white/10"
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
