import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Geen bg-background hier: de vaste atmosfeer-afbeelding uit RootLayout
  // moet door de glazen panelen heen zichtbaar blijven.
  return (
    <div className="min-h-screen md:pl-[218px]">
      <AppSidebar email={user.email ?? ""} />
      <CommandPalette />
      <main className="mx-auto w-full max-w-[1160px] px-5 py-8 md:px-9 md:py-9">{children}</main>
    </div>
  )
}
