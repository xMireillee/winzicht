import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-primary px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <h1 className="font-heading text-xl font-semibold">Er ging iets mis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          De authenticatie is niet gelukt. Probeer opnieuw in te loggen.
        </p>
        <Button render={<Link href="/login" />} className="mt-6">
          Terug naar inloggen
        </Button>
      </Card>
    </main>
  )
}
