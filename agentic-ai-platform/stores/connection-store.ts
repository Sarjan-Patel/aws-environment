"use client"

import { create } from "zustand"
import {
  ConnectionTestResult,
  getConnection,
  saveConnection,
  clearConnection,
  testConnection,
} from "@/lib/supabase/connection"

export interface ConnectionState {
  // Connection status
  isConnected: boolean
  isLoading: boolean
  url: string
  error: string | null

  // Connection stats (from test)
  stats: ConnectionTestResult["stats"] | null

  // Multi-tenant context
  orgId: string | null
  accountId: string | null

  // Actions
  initialize: () => void
  connect: (url: string, key: string) => Promise<boolean>
  disconnect: () => void
  testCurrentConnection: () => Promise<boolean>
  setOrgContext: (orgId: string | null, accountId?: string | null) => void
}

// Track if initialization has already been done (prevents multiple calls from React Strict Mode, multiple components, etc.)
let isInitialized = false
let isTestingConnection = false

// Helper functions for persisting org/account context
// Syncs to both localStorage (client-side) and cookies (middleware access)
function saveOrgContext(orgId: string | null, accountId: string | null): void {
  if (typeof window === "undefined") return

  // localStorage for client-side access
  if (orgId) {
    localStorage.setItem("aws_env_org_id", orgId)
  } else {
    localStorage.removeItem("aws_env_org_id")
  }
  if (accountId) {
    localStorage.setItem("aws_env_account_id", accountId)
  } else {
    localStorage.removeItem("aws_env_account_id")
  }

  // Cookies for middleware access (1 year expiry)
  const maxAge = 31536000 // 1 year in seconds
  if (orgId) {
    document.cookie = `aws_env_org_id=${orgId}; path=/; max-age=${maxAge}; SameSite=Lax`
  } else {
    document.cookie = "aws_env_org_id=; path=/; max-age=0"
  }
  if (accountId) {
    document.cookie = `aws_env_account_id=${accountId}; path=/; max-age=${maxAge}; SameSite=Lax`
  } else {
    document.cookie = "aws_env_account_id=; path=/; max-age=0"
  }
}

// Helper to set connection cookie for middleware
function setConnectionCookie(isConnected: boolean): void {
  if (typeof window === "undefined") return

  if (isConnected) {
    document.cookie = `aws_env_connected=true; path=/; max-age=31536000; SameSite=Lax`
  } else {
    document.cookie = "aws_env_connected=; path=/; max-age=0"
  }
}

function getOrgContext(): { orgId: string | null; accountId: string | null } {
  if (typeof window === "undefined") return { orgId: null, accountId: null }
  return {
    orgId: localStorage.getItem("aws_env_org_id"),
    accountId: localStorage.getItem("aws_env_account_id"),
  }
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // Initial state
  isConnected: false,
  isLoading: false,
  url: "",
  error: null,
  stats: null,
  orgId: null,
  accountId: null,

  // Initialize from localStorage on app load
  initialize: () => {
    // Prevent multiple initializations
    if (isInitialized) {
      // console.log("[ConnectionStore] initialize() skipped - already initialized")
      return
    }
    isInitialized = true

    // console.log("[ConnectionStore] initialize() called")
    const connection = getConnection()
    const { orgId, accountId } = getOrgContext()

    if (connection) {
      // console.log(`[ConnectionStore] Found stored connection: ${connection.url.replace(/\.supabase\.co.*/, '.supabase.co')}`)
      setConnectionCookie(true) // Set cookie on initialize if connection exists
      set({
        isConnected: true,
        url: connection.url,
        orgId,
        accountId,
      })
      // Validate connection in background
      // console.log("[ConnectionStore] Validating connection in background...")
      get().testCurrentConnection()
    } else {
      // console.log("[ConnectionStore] No stored connection found")
      setConnectionCookie(false) // Clear cookie if no connection
    }
  },

  // Connect to a new Supabase instance
  connect: async (url: string, key: string): Promise<boolean> => {
    // const startTime = performance.now()
    // console.log("[ConnectionStore] connect() called")
    // console.log(`[ConnectionStore] URL: ${url.replace(/\.supabase\.co.*/, '.supabase.co')}`)

    set({ isLoading: true, error: null })

    const result = await testConnection(url, key)
    // const duration = performance.now() - startTime

    if (result.success) {
      // console.log(`[ConnectionStore] Connection successful in ${duration.toFixed(2)}ms`)
      saveConnection(url, key)
      setConnectionCookie(true) // Set cookie for middleware
      // Restore any previously saved org context
      const { orgId, accountId } = getOrgContext()
      set({
        isConnected: true,
        isLoading: false,
        url,
        stats: result.stats,
        error: null,
        orgId,
        accountId,
      })
      return true
    } else {
      // console.error(`[ConnectionStore] Connection failed in ${duration.toFixed(2)}ms:`, result.error)
      set({
        isConnected: false,
        isLoading: false,
        error: result.error || "Connection failed",
        stats: null,
      })
      return false
    }
  },

  // Disconnect and clear credentials
  disconnect: () => {
    // console.log("[ConnectionStore] disconnect() called - Clearing stored connection")
    clearConnection()
    saveOrgContext(null, null) // Clear org context from localStorage and cookies
    setConnectionCookie(false) // Clear connection cookie
    isInitialized = false
    set({
      isConnected: false,
      isLoading: false,
      url: "",
      error: null,
      stats: null,
      orgId: null,
      accountId: null,
    })
  },

  // Set organization and account context (persists to localStorage)
  setOrgContext: (orgId: string | null, accountId?: string | null) => {
    const newAccountId = accountId !== undefined ? accountId : null
    saveOrgContext(orgId, newAccountId)
    set({ orgId, accountId: newAccountId })
  },

  // Test existing connection (used on app init)
  testCurrentConnection: async (): Promise<boolean> => {
    // Prevent concurrent connection tests
    if (isTestingConnection) {
      // console.log("[ConnectionStore] testCurrentConnection() skipped - already testing")
      return false
    }
    isTestingConnection = true

    // const startTime = performance.now()
    // console.log("[ConnectionStore] testCurrentConnection() called")

    const connection = getConnection()
    if (!connection) {
      // console.log("[ConnectionStore] No connection to test")
      set({ isConnected: false })
      isTestingConnection = false
      return false
    }

    set({ isLoading: true })

    try {
      const result = await testConnection(connection.url, connection.key)
      // const duration = performance.now() - startTime

      if (result.success) {
        // console.log(`[ConnectionStore] Connection test successful in ${duration.toFixed(2)}ms`)
        setConnectionCookie(true) // Ensure cookie is set for middleware
        set({
          isConnected: true,
          isLoading: false,
          stats: result.stats,
          error: null,
        })
        return true
      } else {
        // console.error(`[ConnectionStore] Connection test failed in ${duration.toFixed(2)}ms:`, result.error)
        // Connection is stale or invalid - keep credentials but mark as disconnected
        setConnectionCookie(false) // Clear cookie
        set({
          isConnected: false,
          isLoading: false,
          error: result.error || "Connection test failed",
          stats: null,
        })
        return false
      }
    } finally {
      isTestingConnection = false
    }
  },
}))
