"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Client component that checks for auth errors in the URL hash
 * and redirects to login page with the error preserved.
 *
 * This handles the case where Supabase redirects to the Site URL (root)
 * with auth errors instead of the emailRedirectTo URL.
 */
export function AuthErrorHandler() {
  const router = useRouter()

  useEffect(() => {
    // Check if there's an auth error in the URL hash
    const hash = window.location.hash
    if (!hash) return

    const hashParams = new URLSearchParams(hash.substring(1))
    const error = hashParams.get("error")
    const errorCode = hashParams.get("error_code")
    const errorDescription = hashParams.get("error_description")

    // If there's an auth error, redirect to login page with the error
    if (error || errorCode) {
      console.log("[AuthErrorHandler] Auth error detected in URL, redirecting to /login", {
        error,
        errorCode,
        errorDescription,
      })

      // Redirect to login page, preserving the hash params
      router.push(`/login${hash}`)
    }

    // Also check for access_token (successful magic link landing on root)
    const accessToken = hashParams.get("access_token")
    const type = hashParams.get("type")

    if (accessToken && type === "magiclink") {
      console.log("[AuthErrorHandler] Magic link tokens detected, redirecting to /login for processing")
      router.push(`/login${hash}`)
    }
  }, [router])

  // This component doesn't render anything
  return null
}
