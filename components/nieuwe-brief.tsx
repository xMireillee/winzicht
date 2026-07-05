"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Upload, FileText, X, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ReviewForm } from "@/components/review-form"
import { ExtractieVoortgang } from "@/components/extractie-voortgang"
import { WizardStepper } from "@/components/wizard-stepper"
import { PageHeading } from "@/components/page-heading"
import { cn } from "@/lib/utils"
import type { Aanbesteding } from "@/lib/types"

const MAX_BYTES = 10 * 1024 * 1024

type FormData = Omit<Aanbesteding, "id" | "aangemaaktOp">

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

export function NieuweBrief() {
  const [file, setFile] = useState<File | null>(null)
  const [tekst, setTekst] = useState("")
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [resultaat, setResultaat] = useState<FormData | null>(null)
  const [stap, setStap] = useState(0)
  const [opgeslagen, setOpgeslagen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Bepaal de bovenliggende wizardstap: 0 uploaden, 1 controleren, 2 opslaan/klaar.
  const wizardStap = opgeslagen ? 2 : resultaat ? 1 : 0

  // Loop de analysefasen door terwijl de extractie loopt.
  useEffect(() => {
    if (!loading) {
      setStap(0)
      return
    }
    setStap(0)
    const timers = [setTimeout(() => setStap(1), 4000), setTimeout(() => setStap(2), 12000)]
    return () => timers.forEach(clearTimeout)
  }, [loading])

  function opnieuw() {
    setFile(null)
    setTekst("")
    setResultaat(null)
    setOpgeslagen(false)
    setStap(0)
    if (inputRef.current) inputRef.current.value = ""
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleFiles(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    if (f.type !== "application/pdf") {
      toast.error("Kies een PDF-bestand.")
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error("Het bestand is te groot. Maximaal 10 MB toegestaan.")
      return
    }
    setFile(f)
  }

  async function analyseer() {
    if (!file && tekst.trim() === "") {
      toast.error("Voeg een PDF toe of plak de tekst van de brief.")
      return
    }
    setLoading(true)
    try {
      const payload: { pdfBase64?: string; text?: string; filename?: string } = {}
      if (file) {
        payload.pdfBase64 = await fileToBase64(file)
        payload.filename = file.name
      }
      if (tekst.trim() !== "") payload.text = tekst

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "De analyse is niet gelukt.")
        return
      }
      setResultaat({ ...data.data, evaluatie: null } as FormData)
    } catch {
      toast.error("De analyse is niet gelukt. Controleer het bestand of probeer het met geplakte tekst.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Terug naar dashboard
      </Link>

      <PageHeading
        eyebrow="Nieuwe gunningsbrief"
        bold="Van brief naar"
        accent="inzicht"
        description="Upload de gunningsbrief als PDF of plak de tekst. De AI codeert de scores en feedback voor; jij controleert en slaat op."
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <WizardStepper stap={wizardStap} />
      </div>

      {wizardStap === 0 && (
        <Card className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 text-center transition-colors",
              dragOver ? "border-[var(--accent)] bg-secondary" : "border-border bg-secondary/30",
            )}
          >
            {file ? (
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-[var(--accent-strong)]" aria-hidden="true" />
                <span className="font-mono text-sm">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    if (inputRef.current) inputRef.current.value = ""
                  }}
                  aria-label="Bestand verwijderen"
                  className="rounded-sm p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Sleep een PDF hierheen</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Kies PDF-bestand
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Het PDF-bestand wordt alleen gebruikt voor de analyse en niet opgeslagen.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Label htmlFor="tekst" className="eyebrow text-muted-foreground">
              Of plak de tekst van de brief
            </Label>
            <Textarea
              id="tekst"
              rows={6}
              value={tekst}
              onChange={(e) => setTekst(e.target.value)}
              placeholder="Plak hier de tekst, bijvoorbeeld wanneer de inhoudelijke motivering in een aparte bijlage staat."
            />
          </div>

          {loading ? (
            <div className="mt-6 rounded-md border border-border bg-secondary/30 p-4">
              <ExtractieVoortgang stap={stap} />
            </div>
          ) : (
            <div className="mt-6 flex justify-end">
              <Button onClick={analyseer} disabled={loading} size="lg">
                Analyseer brief
              </Button>
            </div>
          )}
        </Card>
      )}

      {wizardStap >= 1 && resultaat && (
        <ReviewForm
          initial={resultaat}
          mode="nieuw"
          onOpgeslagen={() => setOpgeslagen(true)}
          onOpnieuw={opnieuw}
        />
      )}
    </div>
  )
}
