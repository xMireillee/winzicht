import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Aanbesteding } from "@/lib/types"

type Soort = "thema" | "leerpunt"

// Herschrijf een labelnaam (thema of leerpunt) in alle opgeslagen aanbestedingen.
// Retourneert het aantal bijgewerkte records. Bij `naar === null` blijven codes staan
// (deactiveren verandert historische data niet).
async function herschrijfLabel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  soort: Soort,
  van: string,
  naar: string,
): Promise<number> {
  if (!van || !naar || van === naar) return 0

  const { data, error } = await supabase
    .from("aanbestedingen")
    .select("id, data")
  if (error || !data) return 0

  let bijgewerkt = 0
  for (const row of data) {
    const d = row.data as Omit<Aanbesteding, "id" | "aangemaaktOp" | "aangemaaktDoor">
    let veranderd = false

    if (soort === "thema") {
      for (const perceel of d.percelen ?? []) {
        for (const crit of perceel.criteria ?? []) {
          if (crit.thema1 === van) {
            crit.thema1 = naar
            veranderd = true
          }
          if (crit.thema2 === van) {
            crit.thema2 = naar
            veranderd = true
          }
        }
      }
    } else if (soort === "leerpunt" && d.evaluatie) {
      if (d.evaluatie.leerpunt1 === van) {
        d.evaluatie.leerpunt1 = naar
        veranderd = true
      }
      if (d.evaluatie.leerpunt2 === van) {
        d.evaluatie.leerpunt2 = naar
        veranderd = true
      }
    }

    if (veranderd) {
      const { error: upErr } = await supabase.from("aanbestedingen").update({ data: d }).eq("id", row.id)
      if (!upErr) bijgewerkt += 1
    }
  }
  return bijgewerkt
}

async function logWijziging(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: { soort: string; actie: string; oud?: string | null; nieuw?: string | null; aantal_bijgewerkt?: number; door?: string | null },
) {
  await supabase.from("label_wijzigingen").insert({
    soort: entry.soort,
    actie: entry.actie,
    oud: entry.oud ?? null,
    nieuw: entry.nieuw ?? null,
    aantal_bijgewerkt: entry.aantal_bijgewerkt ?? 0,
    door: entry.door ?? null,
  })
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  const [{ data: labels, error: lErr }, { data: wijzigingen }] = await Promise.all([
    supabase.from("labels").select("id, soort, naam, actief, aangemaakt_op").order("naam", { ascending: true }),
    supabase.from("label_wijzigingen").select("*").order("op", { ascending: false }).limit(50),
  ])

  if (lErr) {
    console.log("[v0] Labels ophalen mislukt:", lErr.message)
    return NextResponse.json({ error: "Ophalen van labels mislukt." }, { status: 500 })
  }

  return NextResponse.json({ labels: labels ?? [], wijzigingen: wijzigingen ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  let body: { soort?: Soort; naam?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ongeldige gegevens." }, { status: 400 })
  }

  const soort = body.soort
  const naam = (body.naam ?? "").trim()
  if ((soort !== "thema" && soort !== "leerpunt") || naam === "") {
    return NextResponse.json({ error: "Soort en naam zijn verplicht." }, { status: 400 })
  }

  const { data: inserted, error } = await supabase
    .from("labels")
    .insert({ soort, naam })
    .select("id, soort, naam, actief, aangemaakt_op")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Dit label bestaat al." }, { status: 409 })
    }
    console.log("[v0] Label toevoegen mislukt:", error.message)
    return NextResponse.json({ error: "Toevoegen mislukt." }, { status: 500 })
  }

  await logWijziging(supabase, { soort, actie: "toegevoegd", nieuw: naam, door: user.email })
  return NextResponse.json({ label: inserted }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })

  let body: {
    action?: "rename" | "deactivate" | "activate" | "merge"
    id?: string
    soort?: Soort
    naam?: string
    oud?: string
    nieuw?: string
    bronId?: string
    doelId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ongeldige gegevens." }, { status: 400 })
  }

  const { action } = body

  if (action === "rename") {
    const { id, naam } = body
    const nieuw = (naam ?? "").trim()
    if (!id || nieuw === "") return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 })

    const { data: bestaand, error: getErr } = await supabase
      .from("labels")
      .select("id, soort, naam")
      .eq("id", id)
      .single()
    if (getErr || !bestaand) return NextResponse.json({ error: "Label niet gevonden." }, { status: 404 })

    const { data: updated, error } = await supabase
      .from("labels")
      .update({ naam: nieuw })
      .eq("id", id)
      .select("id, soort, naam, actief, aangemaakt_op")
      .single()
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Dit label bestaat al." }, { status: 409 })
      return NextResponse.json({ error: "Hernoemen mislukt." }, { status: 500 })
    }

    const aantal = await herschrijfLabel(supabase, bestaand.soort as Soort, bestaand.naam as string, nieuw)
    await logWijziging(supabase, {
      soort: bestaand.soort,
      actie: "hernoemd",
      oud: bestaand.naam,
      nieuw,
      aantal_bijgewerkt: aantal,
      door: user.email,
    })
    return NextResponse.json({ label: updated, aantalBijgewerkt: aantal })
  }

  if (action === "deactivate" || action === "activate") {
    const { id } = body
    if (!id) return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 })
    const actief = action === "activate"
    const { data: updated, error } = await supabase
      .from("labels")
      .update({ actief })
      .eq("id", id)
      .select("id, soort, naam, actief, aangemaakt_op")
      .single()
    if (error || !updated) return NextResponse.json({ error: "Bijwerken mislukt." }, { status: 500 })

    await logWijziging(supabase, {
      soort: updated.soort,
      actie: actief ? "geactiveerd" : "gedeactiveerd",
      oud: updated.naam,
      door: user.email,
    })
    return NextResponse.json({ label: updated })
  }

  if (action === "merge") {
    const { bronId, doelId } = body
    if (!bronId || !doelId || bronId === doelId) {
      return NextResponse.json({ error: "Kies twee verschillende labels." }, { status: 400 })
    }
    const { data: labels, error: getErr } = await supabase
      .from("labels")
      .select("id, soort, naam")
      .in("id", [bronId, doelId])
    if (getErr || !labels || labels.length !== 2) {
      return NextResponse.json({ error: "Labels niet gevonden." }, { status: 404 })
    }
    const bron = labels.find((l) => l.id === bronId)!
    const doel = labels.find((l) => l.id === doelId)!
    if (bron.soort !== doel.soort) {
      return NextResponse.json({ error: "Labels moeten van dezelfde soort zijn." }, { status: 400 })
    }

    const aantal = await herschrijfLabel(supabase, bron.soort as Soort, bron.naam as string, doel.naam as string)
    // Bronlabel deactiveren i.p.v. verwijderen, zodat de historie intact blijft.
    await supabase.from("labels").update({ actief: false }).eq("id", bronId)

    await logWijziging(supabase, {
      soort: bron.soort,
      actie: "samengevoegd",
      oud: bron.naam,
      nieuw: doel.naam,
      aantal_bijgewerkt: aantal,
      door: user.email,
    })
    return NextResponse.json({ ok: true, aantalBijgewerkt: aantal })
  }

  return NextResponse.json({ error: "Onbekende actie." }, { status: 400 })
}
