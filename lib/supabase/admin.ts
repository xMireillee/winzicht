import { createClient } from "@supabase/supabase-js"

// Server-only admin client (service role). NOOIT importeren in client-componenten.
// Wordt gebruikt om interne accounts direct aan te maken zonder e-mailbevestiging.
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error("Supabase service role configuratie ontbreekt.")
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
