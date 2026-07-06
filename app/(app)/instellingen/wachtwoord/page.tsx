import { PageHeading } from "@/components/page-heading"
import { WachtwoordWijzigen } from "@/components/wachtwoord-wijzigen"

export const metadata = {
  title: "Wachtwoord wijzigen · Gunningsbrief-analyse",
}

export default function WachtwoordPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        eyebrow="Instellingen"
        bold="Wijzig je"
        accent="wachtwoord"
        description="Kies een nieuw wachtwoord voor je eigen account. Het gaat direct in; je huidige sessie blijft gewoon ingelogd."
      />
      <WachtwoordWijzigen />
    </div>
  )
}
