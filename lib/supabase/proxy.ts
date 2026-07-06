import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that never require authentication.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/confirm", "/auth/error", "/api/auth"]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Do not run code between createServerClient and supabase.auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Guard every page and every API route. Public auth routes are exempt.
  if (!user && !isPublic(pathname)) {
    // API routes return 401 instead of an HTML redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Logged-in users visiting /login go straight to the app.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/nieuw"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
