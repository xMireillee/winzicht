import { PageHeading } from "@/components/page-heading"
import { InzichtenVraag } from "@/components/inzichten-vraag"

export const metadata = {
  title: "Inzichten · Gunningsbrief-analyse",
}

export default function InzichtenPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        eyebrow="Tenderintelligentie"
        bold="Vraag het"
        accent="je data"
        description="Stel een vrije vraag over alle gunningsbrieven, interne evaluaties en klantdossiers. Het antwoord verwijst naar concrete aanbestedingen en citeert de onderliggende feedback."
      />
      <InzichtenVraag />
    </div>
  )
}
