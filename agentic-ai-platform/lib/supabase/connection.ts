import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Singleton client instance - avoids creating multiple GoTrueClient instances
let cachedClient: SupabaseClient | null = null
let cachedClientKey: string | null = null

export interface ConnectionTestResult {
  success: boolean
  error?: string
  stats?: {
    instances: number
    s3Buckets: number
    rdsInstances: number
    logGroups: number
    lambdaFunctions: number
    metricsRecords: number
  }
}

export interface ConnectionConfig {
  url: string
  key: string
}

export interface SavedAccount {
  id: string
  name: string
  url: string
  key: string
  createdAt: string
}

const ACCOUNTS_STORAGE_KEY = "aws_env_accounts"
const ACTIVE_ACCOUNT_KEY = "aws_env_active_account"

/**
 * Gets or creates a cached Supabase client for the given credentials
 * Configured for auth session persistence (works with OTP/magic link)
 */
function getOrCreateClient(url: string, key: string): SupabaseClient {
  const cacheKey = `${url}:${key}`
  if (cachedClient && cachedClientKey === cacheKey) {
    return cachedClient
  }
  // Create client with auth configuration for session persistence
  // This enables OTP/magic link authentication to work properly
  cachedClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
  cachedClientKey = cacheKey
  return cachedClient
}

/**
 * Tests a Supabase connection and verifies the AWS Environment schema exists
 */
export async function testConnection(
  supabaseUrl: string,
  anonKey: string
): Promise<ConnectionTestResult> {
  // const startTime = performance.now()
  // console.log("[Connection] testConnection() started")
  // console.log(`[Connection] URL: ${supabaseUrl.replace(/\.supabase\.co.*/, '.supabase.co')}`)

  try {
    // Validate URL format
    if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes("supabase")) {
      // console.log(`[Connection] VALIDATION FAILED - Invalid URL format (${(performance.now() - startTime).toFixed(2)}ms)`)
      return {
        success: false,
        error: "Invalid Supabase URL. It should look like: https://your-project-id.supabase.co",
      }
    }

    // Validate key format (JWT token)
    if (!anonKey.startsWith("eyJ") || anonKey.length < 100) {
      // console.log(`[Connection] VALIDATION FAILED - Invalid key format (${(performance.now() - startTime).toFixed(2)}ms)`)
      return {
        success: false,
        error: "Invalid Supabase key. Please use the anon (public) key from your project settings.",
      }
    }

    // console.log("[Connection] Validation passed, creating/getting cached client...")
    // const clientStartTime = performance.now()
    // Use cached client to avoid multiple GoTrueClient instances
    const supabase = getOrCreateClient(supabaseUrl, anonKey)
    // console.log(`[Connection] Client ready in ${(performance.now() - clientStartTime).toFixed(2)}ms`)

    // Test by querying expected tables
    // console.log("[Connection] Testing database connection with parallel table queries...")
    // const queryStartTime = performance.now()
    const [instances, buckets, rds, logs, lambdas, metrics] = await Promise.all([
      supabase.from("instances").select("id", { count: "exact", head: true }),
      supabase.from("s3_buckets").select("id", { count: "exact", head: true }),
      supabase.from("rds_instances").select("id", { count: "exact", head: true }),
      supabase.from("log_groups").select("id", { count: "exact", head: true }),
      supabase.from("lambda_functions").select("id", { count: "exact", head: true }),
      supabase.from("metrics_daily").select("id", { count: "exact", head: true }),
    ])
    // const queryDuration = performance.now() - queryStartTime
    // console.log(`[Connection] Table queries completed in ${queryDuration.toFixed(2)}ms`)

    // Check if tables exist (error code 42P01 = table doesn't exist)
    if (instances.error?.code === "42P01") {
      // console.log(`[Connection] FAILED - Tables don't exist (code: 42P01) (${(performance.now() - startTime).toFixed(2)}ms)`)
      return {
        success: false,
        error:
          "This database does not contain AWS Environment tables. Please check you are connecting to the correct Supabase project.",
      }
    }

    // Check for any other errors
    const errors = [instances, buckets, rds, logs, lambdas, metrics].filter(
      (r) => r.error
    )
    if (errors.length > 0) {
      const firstError = errors[0].error
      // console.log(`[Connection] FAILED - Database error: ${firstError?.message} (${(performance.now() - startTime).toFixed(2)}ms)`)
      return {
        success: false,
        error: `Database error: ${firstError?.message || "Unknown error"}`,
      }
    }

    // const totalDuration = performance.now() - startTime
    // console.log(`[Connection] SUCCESS - Connection verified in ${totalDuration.toFixed(2)}ms`)
    // console.log(`[Connection] Stats: instances=${instances.count}, s3=${buckets.count}, rds=${rds.count}, logs=${logs.count}, lambdas=${lambdas.count}, metrics=${metrics.count}`)

    return {
      success: true,
      stats: {
        instances: instances.count ?? 0,
        s3Buckets: buckets.count ?? 0,
        rdsInstances: rds.count ?? 0,
        logGroups: logs.count ?? 0,
        lambdaFunctions: lambdas.count ?? 0,
        metricsRecords: metrics.count ?? 0,
      },
    }
  } catch (error) {
    // const totalDuration = performance.now() - startTime
    // console.error(`[Connection] EXCEPTION after ${totalDuration.toFixed(2)}ms:`, error)
    return {
      success: false,
      error: "Failed to connect. Please check your URL and key are correct.",
    }
  }
}

/**
 * Saves connection credentials to localStorage and sets a cookie for middleware
 */
export function saveConnection(supabaseUrl: string, anonKey: string): void {
  if (typeof window === "undefined") return

  localStorage.setItem("aws_env_url", supabaseUrl)
  localStorage.setItem("aws_env_key", anonKey)

  // Set a cookie for middleware (can't access localStorage in middleware)
  document.cookie = "aws_env_connected=true; path=/; max-age=31536000" // 1 year
}

/**
 * Gets connection credentials from localStorage
 */
export function getConnection(): ConnectionConfig | null {
  if (typeof window === "undefined") return null

  const url = localStorage.getItem("aws_env_url")
  const key = localStorage.getItem("aws_env_key")

  if (!url || !key) return null
  return { url, key }
}

/**
 * Clears connection credentials from localStorage and removes cookie
 */
export function clearConnection(): void {
  if (typeof window === "undefined") return

  localStorage.removeItem("aws_env_url")
  localStorage.removeItem("aws_env_key")

  // Clear the cookie
  document.cookie = "aws_env_connected=; path=/; max-age=0"
}

/**
 * Checks if a connection is configured (client-side)
 */
export function isConnected(): boolean {
  if (typeof window === "undefined") return false
  return getConnection() !== null
}

/**
 * Creates a Supabase client using stored connection credentials (singleton)
 */
export function createStoredClient(): SupabaseClient | null {
  const connection = getConnection()
  if (!connection) return null
  return getOrCreateClient(connection.url, connection.key)
}

/**
 * Creates a Supabase client from environment variables (singleton)
 */
export function createEnvClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return getOrCreateClient(url, key)
}

/**
 * Gets the best available Supabase client (stored > env)
 */
export function getSupabaseClient(): SupabaseClient | null {
  // Try stored connection first (from setup page)
  const storedClient = createStoredClient()
  if (storedClient) return storedClient

  // Fall back to environment variables
  return createEnvClient()
}

// ============================================
// Multi-Account Management Functions
// ============================================

/**
 * Gets all saved accounts from localStorage
 */
export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Saves a new account to the accounts list
 */
export function saveAccount(name: string, url: string, key: string): SavedAccount {
  const accounts = getSavedAccounts()

  // Check if account with same URL already exists
  const existingIndex = accounts.findIndex(a => a.url === url)

  const account: SavedAccount = {
    id: existingIndex >= 0 ? accounts[existingIndex].id : crypto.randomUUID(),
    name,
    url,
    key,
    createdAt: existingIndex >= 0 ? accounts[existingIndex].createdAt : new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    // Update existing account
    accounts[existingIndex] = account
  } else {
    // Add new account
    accounts.push(account)
  }

  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
  return account
}

/**
 * Removes an account from the saved accounts list
 */
export function removeAccount(accountId: string): void {
  if (typeof window === "undefined") return

  const accounts = getSavedAccounts()
  const filtered = accounts.filter(a => a.id !== accountId)
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered))

  // If this was the active account, clear active account
  const activeId = getActiveAccountId()
  if (activeId === accountId) {
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY)
    clearConnection()
  }
}

/**
 * Gets the active account ID
 */
export function getActiveAccountId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY)
}

/**
 * Gets the active account details
 */
export function getActiveAccount(): SavedAccount | null {
  const activeId = getActiveAccountId()
  if (!activeId) return null

  const accounts = getSavedAccounts()
  return accounts.find(a => a.id === activeId) || null
}

/**
 * Sets the active account and saves its connection
 */
export function setActiveAccount(accountId: string): boolean {
  const accounts = getSavedAccounts()
  const account = accounts.find(a => a.id === accountId)

  if (!account) return false

  localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId)
  saveConnection(account.url, account.key)

  // Reset cached client to use new credentials
  cachedClient = null
  cachedClientKey = null

  return true
}

/**
 * Updates an existing account's details
 */
export function updateAccount(accountId: string, updates: Partial<Pick<SavedAccount, 'name'>>): boolean {
  const accounts = getSavedAccounts()
  const index = accounts.findIndex(a => a.id === accountId)

  if (index < 0) return false

  accounts[index] = { ...accounts[index], ...updates }
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
  return true
}
