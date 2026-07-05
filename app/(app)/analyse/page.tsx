import { PageHeading } from "@/components/page-heading"
import { AnalyseView } from "@/components/analyse-view"

export const metadata = {
  title: "Analyse · Gunningsbrief-analyse",
}

export default function AnalysePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        eyebrow="Tenderintelligentie"
        bold="Verdiepende"
        accent="analyse"
        description="Sector-analyse, procescijfers en terugkerende lessen uit de interne evaluaties — de laag onder het dashboard."
      />
      <AnalyseView />
    </div>
  )
}
