import { KlantDossierView } from "@/components/klant-dossier"

export default async function KlantDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <KlantDossierView id={id} />
}
