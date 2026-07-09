"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { FileUp, Sparkles, RotateCcw, ScrollText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { Leidraad, LeidraadAnalyse } from "@/lib/types"

// De PDF gaat als base64 in de JSON-body naar de server. Het hostingplatform
// weigert verzoeken groter dan ~4,5 MB, en base64 is ~1,37× het bestand — dus een
// PDF boven ~3 MB komt niet aan. We waarschuwen daarom vooraf i.p.v. een vage fout.
const MAX_BYTES = 3 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1] ?? "")
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatTijdstip(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/**
 * Leidraad-tabblad: upload de aanbestedingsleidraad, bekijk de geëxtraheerde
 * beoordelingssystematiek en genereer een analyse van de behaalde scores
 * t.o.v. die systematiek.
 */
export function LeidraadTab({
  id,
  initieleLeidraad,
  initieleAnalyse,
}: {
  id: string
  initieleLeidraad: Leidraad | null
  initieleAnalyse: LeidraadAnalyse | null
}) {
  const [leidraad, setLeidraad] = useState<Leidraad | null>(initieleLeidraad)
  const [analyse, setAnalyse] = useState<LeidraadAnalyse | null>(initieleAnalyse)
  const [uploadBezig, setUploadBezig] = useState(false)
  const [analyseBezig, setAnalyseBezig] = useState(false)
  const [tekst, setTekst] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)

  // Stuurt PDF of geplakte tekst naar de server en verwerkt het resultaat.
  async function verstuurLeidraad(payload: { pdfBase64?: string; text?: string; filename?: string }) {
    setUploadBezig(true)
    try {
      const res = await fetch(`/api/aanbestedingen/${id}/leidraad`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(
          data.error ??
            `De leidraad kon niet worden geanalyseerd (foutcode ${res.status}). Bij een grote PDF: upload alleen het relevante hoofdstuk of plak de tekst.`,
        )
        return false
      }
      setLeidraad(data.leidraad)
      setAnalyse(null) // hoort bij de oude leidraad
      toast.success("Leidraad geanalyseerd en opgeslagen.")
      return true
    } finally {
      setUploadBezig(false)
    }
  }

  async function upload(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Upload een PDF-bestand.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        "De PDF is te groot (max ± 3 MB). Upload alleen het hoofdstuk met de beoordelingssystematiek — of plak de tekst hieronder.",
      )
      return
    }
    const pdfBase64 = await fileToBase64(file)
    await verstuurLeidraad({ pdfBase64, filename: file.name })
    if (fileInput.current) fileInput.current.value = ""
  }

  async function analyseerTekst() {
    if (tekst.trim() === "") {
      toast.error("Plak eerst de tekst van de leidraad.")
      return
    }
    const ok = await verstuurLeidraad({ text: tekst })
    if (ok) setTekst("")
  }

  async function genereerAnalyse() {
    setAnalyseBezig(true)
    const res = await fetch(`/api/aanbestedingen/${id}/leidraad-analyse`, { method: "POST" })
    setAnalyseBezig(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "De analyse kon niet worden gegenereerd.")
      return
    }
    setAnalyse(data.leidraadAnalyse)
    toast.success("Analyse gegenereerd en opgeslagen.")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Upload / vervangen */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-h3 flex items-center gap-2">
              <ScrollText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              Aanbestedingsleidraad
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {leidraad
                ? `Geëxtraheerd uit ${leidraad.bron || "PDF"} · ${formatTijdstip(leidraad.geuploadOp)}`
                : "Upload de leidraad (PDF, max ± 3 MB) om de beoordelingssystematiek te extraheren: criteria, wegingen, schaalomschrijvingen en knock-outs. Bij een groot document: upload alleen het hoofdstuk met de gunningscriteria en de scoretabel."}
            </p>
          </div>
          <Button variant={leidraad ? "outline" : "default"} onClick={() => fileInput.current?.click()} disabled={uploadBezig}>
            <FileUp className="size-4" aria-hidden="true" />
            {uploadBezig ? "Bezig met analyseren…" : leidraad ? "Vervangen" : "Leidraad uploaden"}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) upload(f)
            }}
          />
        </div>

        {/* Alternatief: tekst plakken (handig bij grote leidraden of losse stukken) */}
        <div className="mt-4 border-t border-border pt-4">
          <Label htmlFor="leidraad-tekst" className="eyebrow">
            Of plak de tekst
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Kopieer bijvoorbeeld alleen het hoofdstuk met de gunningscriteria en de scoretabel uit de leidraad.
          </p>
          <Textarea
            id="leidraad-tekst"
            rows={5}
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            placeholder="Plak hier de tekst van de leidraad…"
            className="mt-2"
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={analyseerTekst} disabled={uploadBezig || tekst.trim() === ""}>
              {uploadBezig ? "Bezig met analyseren…" : "Tekst analyseren"}
            </Button>
          </div>
        </div>
      </Card>

      {leidraad && (
        <>
          {/* Analyse scores t.o.v. leidraad */}
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-h3 flex items-center gap-2">
                  <Sparkles className="size-4 shrink-0" style={{ color: "var(--ai)" }} aria-hidden="true" />
                  Scores t.o.v. de leidraad
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Wat betekent elke score volgens de schaal, wat vereiste een hoger niveau, en is de beoordeling
                  consistent met de gepubliceerde systematiek?
                </p>
              </div>
              <Button variant={analyse ? "outline" : "default"} size="sm" onClick={genereerAnalyse} disabled={analyseBezig}>
                {analyse ? <RotateCcw className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
                {analyseBezig ? "Bezig met analyseren…" : analyse ? "Opnieuw analyseren" : "Analyseer scores"}
              </Button>
            </div>
            {analyse && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="whitespace-pre-wrap text-pretty text-sm text-foreground">{analyse.tekst}</p>
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  Gegenereerd op {formatTijdstip(analyse.gegenereerdOp)}
                  {analyse.door ? ` · ${analyse.door}` : ""} · AI kan fouten maken; controleer belangrijke conclusies
                  altijd tegen de leidraad zelf.
                </p>
              </div>
            )}
          </Card>

          {/* Methodiek + knock-outs */}
          {(leidraad.methodiek || leidraad.knockOuts.length > 0) && (
            <Card className="p-5">
              <h3 className="text-h3">Beoordelingsmethodiek</h3>
              {leidraad.methodiek && <p className="mt-2 text-sm text-pretty text-foreground">{leidraad.methodiek}</p>}
              {leidraad.knockOuts.length > 0 && (
                <>
                  <p className="eyebrow mt-4">Knock-outs & minimumeisen</p>
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                    {leidraad.knockOuts.map((k, i) => (
                      <li key={i} className="text-sm text-pretty text-foreground">
                        {k}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}

          {/* Criteria met schaal */}
          <Card className="p-5">
            <h3 className="text-h3">Gunningscriteria volgens de leidraad</h3>
            <div className="mt-4 flex flex-col gap-3">
              {leidraad.criteria.map((c, i) => (
                <div key={i} className="rounded-md border border-border bg-secondary/40 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-foreground">{c.naam || `Criterium ${i + 1}`}</p>
                    <p className="tnum font-mono text-xs text-muted-foreground">
                      {[c.weging != null ? `weging ${c.weging}%` : "", c.maxScore != null ? `max ${c.maxScore}` : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {c.omschrijving && <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{c.omschrijving}</p>}
                  {c.schaal.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                      {c.schaal.map((s, si) => (
                        <li key={si} className="flex gap-3 text-sm">
                          <span className="tnum w-8 shrink-0 font-mono text-xs text-muted-foreground">
                            {s.score != null ? s.score : "—"}
                          </span>
                          <span className="text-pretty">
                            {s.label && <strong className="text-foreground">{s.label}: </strong>}
                            <span className="text-muted-foreground">{s.omschrijving}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
