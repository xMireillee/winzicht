"use client"

import { useId } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const NONE = "__geen__"

/** Label met optioneel AI-ingevuld-stipje: markeert wat nog niet menselijk gecontroleerd is. */
function VeldLabel({ htmlFor, label, aiFilled }: { htmlFor: string; label: string; aiFilled?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="eyebrow flex items-center gap-1.5 text-muted-foreground">
      {label}
      {aiFilled && (
        <span
          className="inline-block rounded-full"
          style={{ width: 7, height: 7, backgroundColor: "var(--ai)" }}
          title="Automatisch ingevuld — nog niet gecontroleerd"
          aria-label="Automatisch ingevuld, nog niet gecontroleerd"
        />
      )}
    </Label>
  )
}

export function TextField({
  label,
  value,
  onChange,
  mono,
  placeholder,
  type = "text",
  aiFilled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
  placeholder?: string
  type?: string
  aiFilled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <VeldLabel htmlFor={id} label={label} aiFilled={aiFilled} />
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(mono && "font-mono", aiFilled && "ai-filled")}
      />
    </div>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  step = "any",
  aiFilled,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  step?: string
  aiFilled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <VeldLabel htmlFor={id} label={label} aiFilled={aiFilled} />
      <Input
        id={id}
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={cn("font-mono", aiFilled && "ai-filled")}
      />
    </div>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  aiFilled,
  warn,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
  aiFilled?: boolean
  warn?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <VeldLabel htmlFor={id} label={label} aiFilled={aiFilled} />
      <Textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(aiFilled && "ai-filled")}
      />
      {warn && <p className="text-xs text-[var(--lost)]">{warn}</p>}
    </div>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  allowEmpty,
  placeholder = "Kies…",
  aiFilled,
  warn,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  allowEmpty?: boolean
  placeholder?: string
  aiFilled?: boolean
  warn?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <VeldLabel htmlFor={id} label={label} aiFilled={aiFilled} />
      <Select value={value === "" ? undefined : value} onValueChange={(v) => onChange(v == null || v === NONE ? "" : v)}>
        <SelectTrigger id={id} className={cn(warn && "border-[var(--lost)]", aiFilled && "ai-filled")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={NONE}>— Geen —</SelectItem>}
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {warn && <p className="text-xs text-[var(--lost)]">{warn}</p>}
    </div>
  )
}
