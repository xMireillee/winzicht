"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ClipboardList,
  Trophy,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeading } from "@/components/page-heading"
import { UitslagStamp } from "@/components/uitslag-stamp"
import { FeedbackQuote } from "@/components/feedback-quote"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  berekenStats,
  berekenKwartaalWinrate,
  winrateDelta,
  kwalitatiefAlsBestePct,
  themaTakeaway,
  gewogenTakeaway,
  berekenGewogenVerlies,
  berekenActies,
  berekenSectorAnalyse,
  type DashboardActie,
} from "@/lib/dashboard-stats"
import { formatDatum, isOnvolledig } from "@/lib/aanbesteding-utils"
import { KwartaalRapportButton, type KwartaalOptie } from "@/components/kwartaal-rapport-button"
import { beschikbareKwartalen, laatsteVoltooideKwartaal, kwartaalKort, kwartaalLabel } from "@/lib/rapport"
import type { Aanbesteding } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function KpiTile({
  label,
  value,
  sub,
  delta,
}: {
  label: string
  value: string
  sub?: string
  delta?: { waarde: number; goedIsPositief?: boolean } | null
}) {
  const goed = delta ? (delta.goedIsPositief === false ? delta.waarde < 0 : delta.waarde > 0) : false
  return (
    <Card className="p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="eyebrow">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="tnum font-heading text-3xl font-bold text-foreground">{value}</p>
        {delta && delta.waarde !== 0 && (
          <span
            className="tnum flex items-center gap-0.5 text-sm font-semibold"
            style={{ color: goed ? "var(--won)" : "var(--lost)" }}
          >
            {delta.waarde > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta.waarde)}pp
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </Card>
  )
}

function ProcesAspectGroup({
  label,
  aantal,
  notities,
}: {
  label: string
  aantal: number
  notities: { klant: string; kenmerk: string; tekst: string }[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tnum rounded-md bg-secondary px-2 py-0.5 font-medium text-foreground">{aantal}</span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-3 border-t border-border px-4 py-3">
          {notities.map((n, i) => (
            <li key={i}>
              <p className="font-mono text-xs text-muted-foreground">{[n.klant, n.kenmerk].filter(Boolean).join(" · ")}</p>
              <FeedbackQuote tekst={n.tekst} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ACTIE_STIJL: Record<DashboardActie["type"], { icon: typeof Clock; color: string; bg: string }> = {
  bezwaar: { icon: Clock, color: "var(--lost)", bg: "var(--lost-bg)" },
  evaluatie: { icon: ClipboardList, color: "var(--ink)", bg: "var(--secondary)" },
  dossier: { icon: Trophy, color: "var(--won)", bg: "var(--won-bg)" },
}

type ThemaWeergave = "gewogen" | "frequentie"

export function DashboardView() {
  const router = useRouter()
  const { data, isLoading } = useSWR<{ items: Aanbesteding[] }>("/api/aanbestedingen", fetcher)
  const items = useMemo(() => data?.items ?? [], [data])

  const [themaWeergave, setThemaWeergave] = useState<ThemaWeergave>("gewogen")

  const stats = useMemo(() => berekenStats(items), [items])
  const kwartalen = useMemo(() => berekenKwartaalWinrate(items), [items])
  const delta = useMemo(() => winrateDelta(kwartalen), [kwartalen])
  const kwaliteit = useMemo(() => kwalitatiefAlsBestePct(items), [items])
  const acties = useMemo(() => berekenActies(items), [items])
  const takeaway = useMemo(() => themaTakeaway(stats.themas), [stats.themas])
  const gewogen = useMemo(() => berekenGewogenVerlies(items), [items])
  const sectorAnalyse = useMemo(() => berekenSectorAnalyse(items), [items])
  const gewogenTk = useMemo(() => gewogenTakeaway(gewogen.themas), [gewogen.themas])
  const onvolledigAantal = useMemo(() => items.filter((a) => isOnvolledig(a)).length, [items])
  const rapportKwartalen = useMemo<KwartaalOptie[]>(() => {
    const beschikbaar = beschikbareKwartalen(items)
    const laatste = laatsteVoltooideKwartaal()
    // Zorg dat het laatst voltooide kwartaal altijd beschikbaar is als optie.
    const heeftLaatste = beschikbaar.some((k) => kwartaalKort(k) === kwartaalKort(laatste))
    const lijst = heeftLaatste ? beschikbaar : [laatste, ...beschikbaar]
    return lijst.map((k) => ({ kort: kwartaalKort(k), label: kwartaalLabel(k) }))
  }, [items])
  const rapportStandaard = useMemo(() => {
    const laatste = kwartaalKort(laatsteVoltooideKwartaal())
    return rapportKwartalen.some((o) => o.kort === laatste) ? laatste : (rapportKwartalen[0]?.kort ?? laatste)
  }, [rapportKwartalen])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-28" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeading eyebrow="Tenderintelligentie" bold="Leren van elke" accent="gunningsbrief" />
        <Card className="p-10 text-center">
          <h3 className="text-h3">Nog geen data</h3>
          <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
            Zodra er gunningsbrieven zijn opgeslagen, verschijnen hier winrates, feedbackthema&apos;s en acties. Voeg een
            eerste brief toe om het dashboard te vullen.
          </p>
          <Button render={<Link href="/nieuw" />} className="mt-4">
            Nieuwe brief analyseren
          </Button>
        </Card>
      </div>
    )
  }

  const winratePct = stats.winrate != null ? `${Math.round(stats.winrate * 100)}%` : "—"

  const isGewogen = themaWeergave === "gewogen"

  const themaData: { naam: string; bijVerlies: number; rest: number; gewogenVerlies: number }[] = isGewogen
    ? gewogen.themas
        .filter((t) => t.gewogenVerlies > 0)
        .slice(0, 8)
        .map((t) => ({ naam: t.thema, bijVerlies: 0, rest: 0, gewogenVerlies: Math.round(t.gewogenVerlies * 10) / 10 }))
    : stats.themas
        .slice(0, 8)
        .map((t) => ({ naam: t.thema, bijVerlies: t.bijVerlies, rest: t.totaal - t.bijVerlies, gewogenVerlies: 0 }))

  const naarThema = (naam: string | number | undefined) => {
    if (naam != null) router.push(`/overzicht?thema=${encodeURIComponent(String(naam))}`)
  }

  const lijnData = kwartalen.map((k) => ({
    label: k.label,
    winrate: k.winrate != null ? Math.round(k.winrate * 100) : null,
  }))

  const recente = [...items]
    .sort((a, b) => new Date(b.datum || b.aangemaaktOp).getTime() - new Date(a.datum || a.aangemaaktOp).getTime())
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading eyebrow="Tenderintelligentie" bold="Leren van elke" accent="gunningsbrief" />
        <KwartaalRapportButton opties={rapportKwartalen} standaard={rapportStandaard} />
      </div>

      {onvolledigAantal > 0 && (
        <Link
          href="/overzicht?onvolledig=1"
          className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors"
          style={{ borderColor: "var(--lost)", backgroundColor: "var(--lost-bg)" }}
        >
          <span className="flex items-center gap-2.5 text-sm" style={{ color: "var(--lost)" }}>
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span className="text-pretty">
              <strong className="font-semibold">
                {onvolledigAantal} {onvolledigAantal === 1 ? "brief heeft" : "brieven hebben"} ontbrekende gegevens
              </strong>{" "}
              — vul weging, scores, thema&apos;s of interne evaluaties aan voor betrouwbaardere analyses.
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium" style={{ color: "var(--lost)" }}>
            Bekijken <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </Link>
      )}

      {/* KPI-tegels */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Winrate percelen"
          value={winratePct}
          sub={`${stats.gewonnen} gewonnen · ${stats.verloren} verloren`}
          delta={delta != null ? { waarde: delta, goedIsPositief: true } : null}
        />
        <KpiTile
          label="Percelen ingevoerd"
          value={String(stats.aantalPercelen)}
          sub={`in ${stats.aantalAanbestedingen} ${stats.aantalAanbestedingen === 1 ? "aanbesteding" : "aanbestedingen"}`}
        />
        <KpiTile
          label="Gem. verschil bij verlies"
          value={stats.gemVerschil != null ? `−${stats.gemVerschil.toFixed(1)}` : "—"}
          sub="punten achter op de winnaar"
        />
        <KpiTile
          label="Kwalitatief als beste"
          value={kwaliteit.pct != null ? `${Math.round(kwaliteit.pct * 100)}%` : "—"}
          sub={`van ${kwaliteit.aantal} vergelijkbare percelen`}
        />
      </div>

      {/* Grafiekrij */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-h3 text-pretty">
              {isGewogen ? "Waar kost feedback de meeste punten?" : "Waar wordt op gescoord — en verloren?"}
            </h3>
            <div
              className="inline-flex shrink-0 rounded-lg border border-border bg-secondary p-0.5"
              role="tablist"
              aria-label="Weergave feedbackthema's"
            >
              {(
                [
                  { id: "gewogen", label: "Gewogen puntenverlies" },
                  { id: "frequentie", label: "Frequentie" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={themaWeergave === opt.id}
                  onClick={() => setThemaWeergave(opt.id)}
                  className={
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
                    (themaWeergave === opt.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {!isGewogen && (
            <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: "var(--lost)" }} /> bij verlies
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: "color-mix(in srgb, var(--ink) 25%, transparent)" }}
                />
                overig
              </span>
            </div>
          )}
          {themaData.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              {isGewogen
                ? "Nog geen criteria met volledige weging + scores om gewogen verlies te berekenen."
                : "Nog geen feedbackthema's gecodeerd."}
            </p>
          ) : (
            <div className="mt-4" style={{ height: themaData.length * 40 + 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={themaData}
                  layout="vertical"
                  margin={{ left: 8, right: 24 }}
                  barCategoryGap={8}
                  onClick={(state: { activeLabel?: string | number }) => naarThema(state?.activeLabel)}
                  className="cursor-pointer"
                >
                  <XAxis type="number" hide allowDecimals={!isGewogen ? false : true} />
                  <YAxis
                    type="category"
                    dataKey="naam"
                    width={210}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--secondary)" }}
                    contentStyle={{ fontSize: 12, borderColor: "var(--border)", borderRadius: 8 }}
                    formatter={(value, name) =>
                      isGewogen ? [`${value} gewogen punten`, "Puntenverlies"] : [value, name]
                    }
                  />
                  {isGewogen ? (
                    <Bar
                      dataKey="gewogenVerlies"
                      name="Gewogen puntenverlies"
                      fill="var(--lost)"
                      radius={[3, 3, 3, 3]}
                      cursor="pointer"
                    />
                  ) : (
                    <>
                      <Bar
                        dataKey="bijVerlies"
                        name="Bij verlies"
                        stackId="a"
                        fill="var(--lost)"
                        radius={[3, 0, 0, 3]}
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="rest"
                        name="Overig"
                        stackId="a"
                        fill="color-mix(in srgb, var(--ink) 25%, transparent)"
                        radius={[0, 3, 3, 0]}
                        cursor="pointer"
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {isGewogen
            ? gewogenTk && (
                <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                  <p className="flex items-start gap-2 text-sm text-pretty text-foreground">
                    <Lightbulb
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: "var(--accent-strong)" }}
                      aria-hidden="true"
                    />
                    {gewogenTk}
                  </p>
                  <p className="pl-6 text-xs text-muted-foreground">
                    Op basis van {gewogen.meegeteld} criteria; {gewogen.overgeslagen} overgeslagen wegens ontbrekende
                    scores of weging.
                  </p>
                </div>
              )
            : takeaway && (
                <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-sm text-pretty text-foreground">
                  <Lightbulb
                    className="mt-0.5 size-4 shrink-0"
                    style={{ color: "var(--accent-strong)" }}
                    aria-hidden="true"
                  />
                  {takeaway}
                </p>
              )}
          <p className="mt-2 text-[11px] text-muted-foreground">Klik op een balk om de bijbehorende brieven te zien.</p>
        </Card>

        <Card className="flex flex-col p-5">
          <h3 className="text-h3">Winrate per kwartaal</h3>
          {lijnData.filter((d) => d.winrate != null).length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Nog te weinig gedateerde uitslagen om een trend te tonen.
            </p>
          ) : (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={lijnData}
                  margin={{ left: -16, right: 8, top: 8 }}
                  onClick={(state: { activeLabel?: string | number }) => {
                    const label = state?.activeLabel
                    if (label != null) router.push(`/overzicht?kwartaal=${encodeURIComponent(String(label))}`)
                  }}
                  className="cursor-pointer"
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}%`, "Winrate"]}
                    contentStyle={{ fontSize: 12, borderColor: "var(--border)", borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="winrate"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--accent)" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
            Berekend op perceelniveau, gegroepeerd op het kwartaal van de briefdatum. Klik op een kwartaal om die
            brieven te bekijken.
          </p>
        </Card>
      </div>

      {/* Onderste rij */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-h3">Recente gunningsbrieven</h3>
            <Link
              href="/overzicht"
              className="flex items-center gap-1 text-sm font-medium text-[var(--accent-strong)] hover:underline"
            >
              Alles bekijken <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {recente.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <Link href={`/overzicht/${a.id}`} className="font-semibold hover:underline">
                    {a.opdrachtgever || "Onbekende opdrachtgever"}
                  </Link>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {[a.kenmerk, a.klant].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {a.percelen.slice(0, 3).map((p, i) => (
                    <UitslagStamp key={i} uitslag={p.uitslag} size="sm" />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col p-5">
          <h3 className="text-h3">Actiecentrum</h3>
          {acties.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Geen openstaande acties.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {acties.map((actie) => {
                const stijl = ACTIE_STIJL[actie.type]
                const Icon = stijl.icon
                return (
                  <li key={actie.id}>
                    <Link
                      href={actie.href}
                      className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:brightness-[0.97]"
                      style={{ backgroundColor: stijl.bg }}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0" style={{ color: stijl.color }} aria-hidden="true" />
                      <span className="text-sm text-pretty" style={{ color: "var(--ink)" }}>
                        {actie.tekst}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Verdieping: sector, proces en leerpunten */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="eyebrow">Verdieping</p>
          <h2 className="text-h3">Proces &amp; interne evaluatie</h2>
        </div>

        {stats.proces.metEvaluatie === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nog geen interne evaluaties ingevuld.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiTile
              label="Binnen budget"
              value={stats.proces.binnenUrenPct != null ? `${Math.round(stats.proces.binnenUrenPct * 100)}%` : "—"}
              sub={`${stats.proces.binnenUrenJa} van ${stats.proces.binnenUrenJa + stats.proces.binnenUrenNee} projecten`}
            />
            <KpiTile
              label="Gem. afwijking uren"
              value={stats.proces.gemAfwijking != null ? `${Math.round(stats.proces.gemAfwijking)}%` : "—"}
              sub="t.o.v. de raming"
            />
            <KpiTile
              label="Klantcontact"
              value={stats.proces.gemKlantcontact != null ? `${stats.proces.gemKlantcontact.toFixed(1)} / 5` : "—"}
              sub={`op basis van ${stats.proces.metEvaluatie} evaluaties`}
            />
          </div>
        )}

        <Card className="flex flex-col p-5">
          <h3 className="text-h3">Sector-analyse</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Winrate naast procescijfers, per sector — zo wordt zichtbaar of een sector niet alleen vaker verloren
            wordt maar bijvoorbeeld ook structureel meer uren kost of lastiger samenwerkt.
          </p>
          {sectorAnalyse.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nog geen sectoren met data.</p>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Sector</TableHead>
                  <TableHead>Winrate</TableHead>
                  <TableHead>Binnen budget</TableHead>
                  <TableHead>Gem. afwijking uren</TableHead>
                  <TableHead>Klantcontact</TableHead>
                  <TableHead className="text-right">Evaluaties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorAnalyse.map((s) => {
                  const winratePctSector = s.winrate != null ? Math.round(s.winrate * 100) : null
                  const laag = winratePctSector != null && winratePctSector < 50
                  return (
                    <TableRow key={s.sector}>
                      <TableCell className="whitespace-normal font-medium text-foreground">{s.sector}</TableCell>
                      <TableCell>
                        <span
                          className="tnum shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
                          style={
                            winratePctSector == null
                              ? { color: "var(--muted-foreground)" }
                              : laag
                                ? { color: "var(--lost)", backgroundColor: "var(--lost-bg)" }
                                : { color: "var(--won)", backgroundColor: "var(--won-bg)" }
                          }
                        >
                          {winratePctSector != null ? `${winratePctSector}%` : "—"}
                        </span>
                        <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                          ({s.gewonnen}W · {s.verloren}V)
                        </span>
                      </TableCell>
                      <TableCell className="tnum">
                        {s.binnenUrenPct != null ? `${Math.round(s.binnenUrenPct * 100)}%` : "—"}
                      </TableCell>
                      <TableCell className="tnum">
                        {s.gemAfwijking != null ? `${Math.round(s.gemAfwijking)}%` : "—"}
                      </TableCell>
                      <TableCell className="tnum">
                        {s.gemKlantcontact != null ? `${s.gemKlantcontact.toFixed(1)} / 5` : "—"}
                      </TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">{s.metEvaluatie}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Sectoren met weinig evaluaties zijn minder betrouwbaar — check de kolom "Evaluaties" voor de steekproefgrootte.
          </p>
        </Card>

        <Card className="flex flex-col p-5">
          <h3 className="text-h3">Terugkerende leerpunten</h3>
          {stats.leerpunten.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nog geen leerpunten uit interne evaluaties.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {stats.leerpunten.slice(0, 8).map((l) => (
                <li key={l.leerpunt} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-pretty">{l.leerpunt}</span>
                  <span className="tnum shrink-0 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                    {l.aantal}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {stats.proces.aspecten.some((a) => a.aantal > 0) && (
          <Card className="flex flex-col gap-3 p-5">
            <div>
              <h3 className="text-h3">Lessen uit de procesevaluatie</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Toelichtingen uit interne evaluaties, gegroepeerd per procesaspect.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {stats.proces.aspecten
                .filter((a) => a.aantal > 0)
                .map((a) => (
                  <ProcesAspectGroup key={a.key} label={a.label} aantal={a.aantal} notities={a.notities} />
                ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
