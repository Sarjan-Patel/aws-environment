import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that don't require connection
const publicRoutes = ["/setup", "/api/test-connection", "/api/detect-waste", "/api/debug", "/api/drift-tick"]

export function middleware(request: NextRequest) {
  // const startTime = Date.now()
  const { pathname } = request.nextUrl

  // console.log(`[Middleware] Processing request: ${request.method} ${pathname}`)

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    // console.log(`[Middleware] PUBLIC ROUTE - Allowing access (${Date.now() - startTime}ms)`)
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    // console.log(`[Middleware] STATIC/INTERNAL - Allowing access (${Date.now() - startTime}ms)`)
    return NextResponse.next()
  }

  // Check if user has connected (via cookie)
  const isConnected = request.cookies.get("aws_env_connected")?.value === "true"
  // console.log(`[Middleware] Connection cookie check: ${isConnected ? "CONNECTED" : "NOT CONNECTED"}`)

  // Redirect to setup if not connected
  if (!isConnected) {
    // console.log(`[Middleware] REDIRECT to /setup - Not connected (${Date.now() - startTime}ms)`)
    const setupUrl = new URL("/setup", request.url)
    return NextResponse.redirect(setupUrl)
  }

  // console.log(`[Middleware] ALLOWED - User connected (${Date.now() - startTime}ms)`)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes that don't need auth
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
