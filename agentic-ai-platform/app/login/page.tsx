"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Mail, Loader2, AlertCircle, Lock, Eye, EyeOff } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/connection"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    checkExistingSession()
  }, [])

  async function checkExistingSession() {
    const client = getSupabaseClient()

    if (!client) {
      setCheckingSession(false)
      return
    }

    try {
      const { data: { session }, error } = await client.auth.getSession()

      if (error) {
        console.error("[Login] Session check error:", error)
        setCheckingSession(false)
        return
      }

      if (session?.user) {
        // User is authenticated - always redirect to onboarding
        // Onboarding will handle smart redirect to dashboard if context is complete
        router.push("/onboarding")
        return
      }
    } catch (err) {
      console.error("[Login] Error checking session:", err)
    }

    setCheckingSession(false)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    const client = getSupabaseClient()
    if (!client) {
      setError("Please connect to your database first. Go to /accounts/connect")
      return
    }

    setLoading(true)

    try {
      const { data, error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.")
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }

      if (data.session) {
        // Always redirect to onboarding after sign in
        // Onboarding will handle smart redirect to dashboard if context is complete
        router.push("/onboarding")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    const client = getSupabaseClient()
    if (!client) {
      setError("Please connect to your database first. Go to /accounts/connect")
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email is already registered. Please sign in instead.")
        } else {
          setError(signUpError.message)
        }
        setLoading(false)
        return
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setError(null)
        alert("Account created! Please check your email to confirm your account, then sign in.")
        setIsSignUp(false)
        setPassword("")
        setConfirmPassword("")
      } else if (data.session) {
        // Auto-confirmed (email confirmation disabled in Supabase)
        router.push("/onboarding")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#74ADFE]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradient - horizon effect */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-[#0a1628]" />
      <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[#1a4a7a]/40 via-[#0d2847]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#74ADFE]/20 via-[#296CF0]/10 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[30%] bg-gradient-to-t from-[#74ADFE]/10 via-transparent to-transparent blur-3xl" />

      {/* Header */}
      <header className="relative z-10 w-full border-b border-gray-800/50 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex h-16 items-center px-6">
          <Link href="/" className="flex items-center">
            <span className="font-heading font-bold text-xl text-white">Heliozz</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-gray-900/40 border border-gray-800/60 backdrop-blur-sm p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
                {isSignUp ? "Create an account" : "Welcome back"}
              </h1>
              <p className="text-gray-400">
                {isSignUp
                  ? "Sign up to get started with Heliozz"
                  : "Sign in to your account"}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-400">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none pl-8 pr-4 py-3 text-gray-100 placeholder:text-gray-500 focus:border-[#74ADFE] focus:outline-none focus:ring-0 transition-colors [&:-webkit-autofill]:[-webkit-background-clip:text] [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(243,244,246)] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-400">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none pl-8 pr-12 py-3 text-gray-100 placeholder:text-gray-500 focus:border-[#74ADFE] focus:outline-none focus:ring-0 transition-colors [&:-webkit-autofill]:[-webkit-background-clip:text] [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(243,244,246)] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field (Sign Up only) */}
              {isSignUp && (
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none pl-8 pr-4 py-3 text-gray-100 placeholder:text-gray-500 focus:border-[#74ADFE] focus:outline-none focus:ring-0 transition-colors [&:-webkit-autofill]:[-webkit-background-clip:text] [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(243,244,246)] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]"
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email || !password || (isSignUp && !confirmPassword)}
                className="w-full mt-8 px-8 py-4 bg-white text-black font-semibold hover:bg-[#74ADFE] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {isSignUp ? "Creating account..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    {isSignUp ? "Create Account" : "Sign In"}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900/40 px-4 text-gray-500">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}
                </span>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setPassword("")
                setConfirmPassword("")
              }}
              disabled={loading}
              className="w-full px-8 py-4 border border-gray-700 text-gray-300 font-semibold hover:border-[#74ADFE] hover:text-white transition-all duration-300 disabled:opacity-50"
            >
              {isSignUp ? "Sign In" : "Create Account"}
            </button>
          </div>

          {/* Footer text */}
          <p className="mt-8 text-center text-gray-600 text-sm">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  )
}
