import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public routes - no authentication required
const publicRoutes = [
  "/",
  "/login",
  "/accounts/connect",
  "/demo",
  "/api/test-connection",
  "/api/detect-waste",
  "/api/debug",
  "/api/drift-tick",
]

// Routes that require tenant context (connection + org)
// Auth is checked client-side since sessions are stored in localStorage
const tenantRequiredRoutes = [
  "/dashboard",
  "/approvals",
  "/settings",
  "/monitoring",
  "/auto-safe",
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle legacy route redirects
  if (pathname === "/savings") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  if (pathname === "/auto-safe") {
    return NextResponse.redirect(new URL("/approvals", request.url))
  }
  if (pathname === "/setup") {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Check if this is a public route (exact match or prefix match for /api routes)
  const isPublicRoute = publicRoutes.some((route) => {
    if (route.startsWith("/api")) {
      return pathname === route || pathname.startsWith(route + "/")
    }
    return pathname === route
  })

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // /onboarding is allowed for anyone with a connection (auth is checked client-side)
  // This is because Supabase sessions are stored in localStorage, not cookies
  if (pathname.startsWith("/onboarding")) {
    return NextResponse.next()
  }

  // For tenant-required routes, check for connection and org context via cookies
  if (tenantRequiredRoutes.some((route) => pathname.startsWith(route))) {
    const hasConnection = request.cookies.get("aws_env_connected")?.value === "true"
    const hasOrg = request.cookies.get("aws_env_org_id")?.value

    // Missing tenant context → redirect to onboarding
    if (!hasConnection || !hasOrg) {
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
