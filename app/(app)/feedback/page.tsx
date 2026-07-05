import { Suspense } from "react"
import { FeedbackZoeken } from "@/components/feedback-zoeken"

export default function FeedbackPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Laden…</p>}>
      <FeedbackZoeken />
    </Suspense>
  )
}
