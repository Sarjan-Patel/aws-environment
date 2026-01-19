"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Cloud, Plus, CheckCircle2, Loader2, ArrowRight, Mail, Database, Server, Lock, LogOut } from "lucide-react"
import { getSupabaseClient, getConnection, saveAccount, setActiveAccount } from "@/lib/supabase/connection"
import { useConnectionStore } from "@/stores/connection-store"
import Link from "next/link"

// Debug logging helper
const DEBUG = true
function debugLog(context: string, message: string, data?: any) {
  if (!DEBUG) return
  const timestamp = new Date().toISOString()
  if (data) {
    console.log(`[${timestamp}] [ONBOARDING:${context}] ${message}`, data)
  } else {
    console.log(`[${timestamp}] [ONBOARDING:${context}] ${message}`)
  }
}

interface Organization {
  id: string
  name: string
  slug: string
}

interface CloudAccount {
  id: string
  name: string
  provider: string
  org_id: string
  url?: string
  anon_key?: string
}

interface DatabaseConnection {
  id: string
  name: string
  provider: string
  url: string
  anon_key: string
  org_id: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const { isConnected, orgId, accountId, setOrgContext, connect } = useConnectionStore()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [accounts, setAccounts] = useState<CloudAccount[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<CloudAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountProvider, setNewAccountProvider] = useState("aws")
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<string | null>(null)
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [workspaceName, setWorkspaceName] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [databaseConnections, setDatabaseConnections] = useState<DatabaseConnection[]>([])
  const [selectedDbConnection, setSelectedDbConnection] = useState<DatabaseConnection | null>(null)
  const [showConnectNewDb, setShowConnectNewDb] = useState(false)
  const [loadingConnections, setLoadingConnections] = useState(false)
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false)

  useEffect(() => {
    // Check authentication first - require user to be logged in
    async function init() {
      const isAuthenticated = await checkAuthentication()
      if (!isAuthenticated) {
        return // Will redirect, don't continue
      }

      // Smart redirect: Check if user has complete tenant context
      // If so, skip onboarding and go directly to dashboard
      const hasCompleteContext = await checkExistingContext()
      if (hasCompleteContext) {
        debugLog("INIT", "User has complete context, redirecting to dashboard")
        router.push("/dashboard")
        return
      }

      // Pre-fill Supabase credentials from localStorage if available
      // But don't auto-connect - user must click button
      const savedConnection = getConnection()
      if (savedConnection?.url && savedConnection?.key) {
        setSupabaseUrl(savedConnection.url)
        setSupabaseKey(savedConnection.key)
        // Auto-select Supabase provider if credentials exist
        setSelectedCloudProvider("supabase")
      }

      // Fetch organizations after auth check passes
      fetchUserOrganizations()
    }

    init()
  }, [])

  useEffect(() => {
    // Only fetch organizations if user is authenticated and has selected org
    if (selectedOrg && !checkingAuth) {
      fetchAccounts(selectedOrg.id)
    }
  }, [selectedOrg, checkingAuth])

  async function checkAuthentication() {
    debugLog("AUTH", "Starting authentication check...")
    setCheckingAuth(true)
    const client = getSupabaseClient()

    if (!client) {
      debugLog("AUTH", "No Supabase client - redirecting to /accounts/connect")
      router.push("/accounts/connect")
      setCheckingAuth(false)
      return false
    }

    try {
      // Check for active auth session
      debugLog("AUTH", "Calling client.auth.getSession()...")
      const { data: { session }, error: sessionError } = await client.auth.getSession()

      debugLog("AUTH", "getSession() result:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        error: sessionError?.message,
      })

      // If no session, try getUser() as fallback
      let isAuthenticated = false
      let currentUser = session?.user

      if (session?.user) {
        debugLog("AUTH", "Session found with user")
        isAuthenticated = true
      } else {
        debugLog("AUTH", "No session, trying getUser() as fallback...")
        const { data: { user }, error: userError } = await client.auth.getUser()

        debugLog("AUTH", "getUser() result:", {
          hasUser: !!user,
          userId: user?.id,
          userEmail: user?.email,
          error: userError?.message,
        })

        if (user && !userError) {
          isAuthenticated = true
          currentUser = user
        }
      }

      if (!isAuthenticated) {
        debugLog("AUTH", "Not authenticated - redirecting to /login")
        router.push("/login")
        setCheckingAuth(false)
        return false
      }

      debugLog("AUTH", "Authentication successful!", {
        userId: currentUser?.id,
        email: currentUser?.email,
      })
      setCheckingAuth(false)
      return true
    } catch (error) {
      debugLog("AUTH", "Exception during auth check:", error)
      console.error("Error checking authentication:", error)
      router.push("/login")
      setCheckingAuth(false)
      return false
    }
  }

  async function checkExistingContext(): Promise<boolean> {
    debugLog("CONTEXT", "Checking existing tenant context...")
    const client = getSupabaseClient()
    if (!client) {
      debugLog("CONTEXT", "No Supabase client - no context")
      return false
    }

    // Check for saved connection
    const savedConnection = getConnection()
    if (!savedConnection?.url || !savedConnection?.key) {
      debugLog("CONTEXT", "No saved connection - no context")
      return false
    }

    // Check for stored org and account IDs
    const storedOrgId = localStorage.getItem("aws_env_org_id")
    const storedAccountId = localStorage.getItem("aws_env_account_id")

    if (!storedOrgId) {
      debugLog("CONTEXT", "No stored org_id - no context")
      return false
    }

    if (!storedAccountId) {
      debugLog("CONTEXT", "No stored account_id - need to select account")
      return false
    }

    try {
      // Verify org still exists and user is a member
      const { data: { user } } = await client.auth.getUser()
      if (!user) {
        debugLog("CONTEXT", "No authenticated user - no context")
        return false
      }

      const { data: membership, error: membershipError } = await client
        .from("organization_members")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("org_id", storedOrgId)
        .single()

      if (membershipError || !membership) {
        debugLog("CONTEXT", "User not member of stored org - clearing context", {
          error: membershipError?.message,
        })
        // User no longer member of this org, clear context
        localStorage.removeItem("aws_env_org_id")
        localStorage.removeItem("aws_env_account_id")
        document.cookie = "aws_env_org_id=; path=/; max-age=0"
        document.cookie = "aws_env_account_id=; path=/; max-age=0"
        return false
      }

      // Verify account still exists
      const { data: account, error: accountError } = await client
        .from("cloud_accounts")
        .select("id")
        .eq("id", storedAccountId)
        .eq("org_id", storedOrgId)
        .single()

      if (accountError || !account) {
        debugLog("CONTEXT", "Stored account not found - clearing account context", {
          error: accountError?.message,
        })
        localStorage.removeItem("aws_env_account_id")
        document.cookie = "aws_env_account_id=; path=/; max-age=0"
        return false
      }

      // Verify connection is still working (quick check)
      const isConnected = document.cookie.includes("aws_env_connected=true")
      if (!isConnected) {
        debugLog("CONTEXT", "Connection cookie not set - no complete context")
        return false
      }

      debugLog("CONTEXT", "User has complete tenant context!", {
        orgId: storedOrgId,
        accountId: storedAccountId,
        isConnected: true,
      })
      return true
    } catch (error) {
      debugLog("CONTEXT", "Error checking context:", error)
      return false
    }
  }

  useEffect(() => {
    if (selectedOrg) {
      fetchAccounts(selectedOrg.id)
      fetchDatabaseConnections(selectedOrg.id)
    }
  }, [selectedOrg])

  async function fetchUserOrganizations() {
    debugLog("ORGS", "Fetching user organizations...")
    setLoading(true)
    const client = getSupabaseClient()

    // If no connection, user can still proceed - they'll connect in Step 3
    if (!client) {
      debugLog("ORGS", "No Supabase client - setting empty orgs")
      setLoading(false)
      setOrganizations([])
      return
    }

    try {
      // First, check if there's an active auth session
      // This works with Supabase Auth OTP/magic link authentication
      debugLog("ORGS", "Getting session for org fetch...")
      const { data: { session }, error: sessionError } = await client.auth.getSession()
      debugLog("ORGS", "Session for org fetch:", {
        hasSession: !!session,
        userId: session?.user?.id,
        error: sessionError?.message,
      })

      // If no session, try to get user (might have session in URL from OTP callback)
      let currentUserId: string | null = null
      if (session?.user) {
        currentUserId = session.user.id
      } else {
        // Try getUser() as fallback (handles session refresh)
        const { data: { user }, error: userError } = await client.auth.getUser()
        if (user && !userError) {
          currentUserId = user.id
        }
      }

      if (currentUserId) {
        // User is authenticated via Supabase Auth - fetch organizations they're a member of
        // Step 1: Get org_ids from organization_members for this user
        // Using the security definer function approach to avoid RLS recursion
        const { data: memberships, error: membershipsError } = await client
          .from("organization_members")
          .select("org_id")
          .eq("user_id", currentUserId)

        if (membershipsError) {
          console.error("Error fetching user memberships:", membershipsError)
          setOrganizations([])
        } else if (memberships && memberships.length > 0) {
          // Step 2: Get organization details for those org_ids
          const orgIds = memberships.map((m: any) => m.org_id)
          const { data: orgsData, error: orgsError } = await client
            .from("organizations")
            .select("id, name, slug")
            .in("id", orgIds)
            .order("name")

          if (!orgsError && orgsData) {
            setOrganizations(orgsData)

            // Auto-select first org if none selected
            if (orgsData.length > 0 && !orgId) {
              setSelectedOrg(orgsData[0])
              setOrgContext(orgsData[0].id)
            } else if (orgId) {
              const current = orgsData.find((o) => o.id === orgId)
              if (current) setSelectedOrg(current)
            }
          } else {
            console.error("Error fetching organizations:", orgsError)
            setOrganizations([])
          }
        } else {
          // No memberships found - user is not part of any organization
          setOrganizations([])
        }
      } else {
        // No authenticated user - try RLS policy approach
        // RLS policies should filter organizations automatically if set up
        const { data: orgsData, error: orgsError } = await client
          .from("organizations")
          .select("id, name, slug")
          .order("name")

        if (!orgsError && orgsData) {
          // RLS policies will filter if auth is configured
          // For now, show all orgs (will be filtered by RLS if policies are active)
          setOrganizations(orgsData)

          // Auto-select first org if none selected
          if (orgsData.length > 0 && !orgId) {
            setSelectedOrg(orgsData[0])
            setOrgContext(orgsData[0].id)
          } else if (orgId) {
            const current = orgsData.find((o) => o.id === orgId)
            if (current) setSelectedOrg(current)
          }
        } else {
          console.error("Error fetching organizations:", orgsError)
          setOrganizations([])
        }
      }
    } catch (error) {
      console.error("Error in fetchUserOrganizations:", error)
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchAccounts(orgId: string) {
    const client = getSupabaseClient()
    if (!client) {
      setAccounts([])
      return
    }

    const { data, error } = await client
      .from("cloud_accounts")
      .select("id, name, provider, org_id")
      .eq("org_id", orgId)
      .order("name")

    if (!error && data) {
      setAccounts(data)
      // Auto-select first account if none selected
      if (data.length > 0 && !accountId) {
        setSelectedAccount(data[0])
        setOrgContext(orgId, data[0].id)
      } else if (accountId) {
        const current = data.find((a) => a.id === accountId)
        if (current) setSelectedAccount(current)
      }
    } else {
      setAccounts([])
    }
  }

  async function fetchDatabaseConnections(orgId: string) {
    debugLog("DB_CONNECTIONS", "Fetching database connections for org:", orgId)
    setLoadingConnections(true)
    const client = getSupabaseClient()
    if (!client) {
      setDatabaseConnections([])
      setLoadingConnections(false)
      return
    }

    try {
      // Fetch cloud_accounts that have url and anon_key (database connections)
      const { data, error } = await client
        .from("cloud_accounts")
        .select("id, name, provider, org_id, url, anon_key")
        .eq("org_id", orgId)
        .eq("provider", "supabase")
        .not("url", "is", null)
        .not("anon_key", "is", null)
        .order("name")

      if (!error && data) {
        debugLog("DB_CONNECTIONS", "Found database connections:", data.length)
        setDatabaseConnections(data as DatabaseConnection[])

        // If we have connections, don't show connect new UI by default
        setShowConnectNewDb(data.length === 0)

        // Auto-select first connection if none selected
        if (data.length > 0 && !selectedDbConnection) {
          const firstConn = data[0] as DatabaseConnection
          setSelectedDbConnection(firstConn)
        }
      } else {
        debugLog("DB_CONNECTIONS", "Error fetching connections:", error?.message)
        setDatabaseConnections([])
        setShowConnectNewDb(true)
      }
    } catch (error) {
      debugLog("DB_CONNECTIONS", "Exception fetching connections:", error)
      setDatabaseConnections([])
      setShowConnectNewDb(true)
    } finally {
      setLoadingConnections(false)
    }
  }

  async function handleCreateOrganization() {
    debugLog("CREATE_ORG", "Creating organization:", newOrgName)
    if (!newOrgName.trim()) return

    setCreatingOrg(true)
    const client = getSupabaseClient()
    if (!client) {
      debugLog("CREATE_ORG", "No Supabase client")
      setCreatingOrg(false)
      return
    }

    try {
      // Get the authenticated user's ID
      debugLog("CREATE_ORG", "Getting authenticated user...")
      const { data: { user }, error: userError } = await client.auth.getUser()

      debugLog("CREATE_ORG", "getUser() result:", {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        error: userError?.message,
      })

      if (userError || !user) {
        debugLog("CREATE_ORG", "No authenticated user - cannot create org")
        console.error("Error getting user:", userError)
        alert("You must be logged in to create an organization.")
        setCreatingOrg(false)
        return
      }

      const slug = newOrgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

      debugLog("CREATE_ORG", "Inserting organization:", { name: newOrgName.trim(), slug })
      const { data: org, error: orgError } = await client
        .from("organizations")
        .insert({
          name: newOrgName.trim(),
          slug: slug,
        })
        .select()
        .single()

      debugLog("CREATE_ORG", "Insert organization result:", {
        org,
        error: orgError?.message,
        errorCode: orgError?.code,
      })

      if (orgError) {
        console.error("Error creating organization:", orgError)
        alert(`Failed to create organization: ${orgError.message}`)
        return
      }

      // Add user as owner of the organization using authenticated user's ID
      debugLog("CREATE_ORG", "Adding user as owner:", { userId: user.id, orgId: org.id })
      const { error: memberError } = await client.from("organization_members").insert({
        user_id: user.id,
        org_id: org.id,
        role: "owner",
      })

      debugLog("CREATE_ORG", "Add member result:", {
        error: memberError?.message,
        errorCode: memberError?.code,
      })

      if (memberError) {
        console.error("Error adding user to organization:", memberError)
        // Don't alert - org was created, just membership failed
        debugLog("CREATE_ORG", "WARNING: Organization created but membership insert failed")
      }

      debugLog("CREATE_ORG", "Organization created successfully!", { orgId: org.id })
      setNewOrgName("")
      setShowCreateOrgDialog(false)
      await fetchUserOrganizations()
      setSelectedOrg(org)
      setOrgContext(org.id)
    } catch (error) {
      debugLog("CREATE_ORG", "Exception creating organization:", error)
      console.error("Error creating organization:", error)
      alert("Failed to create organization. Please try again.")
    } finally {
      setCreatingOrg(false)
    }
  }

  async function handleCreateAccount() {
    if (!newAccountName.trim() || !selectedOrg) return

    setCreatingAccount(true)
    const client = getSupabaseClient()
    if (!client) {
      setCreatingAccount(false)
      return
    }

    try {
      const { data: account, error } = await client
        .from("cloud_accounts")
        .insert({
          name: newAccountName.trim(),
          provider: newAccountProvider,
          org_id: selectedOrg.id,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating account:", error)
        alert("Failed to create account. Please try again.")
        return
      }

      setNewAccountName("")
      await fetchAccounts(selectedOrg.id)
      setSelectedAccount(account)
      setOrgContext(selectedOrg.id, account.id)
    } catch (error) {
      console.error("Error creating account:", error)
      alert("Failed to create account. Please try again.")
    } finally {
      setCreatingAccount(false)
    }
  }

  async function handleConnectSupabase(e?: React.FormEvent) {
    if (e) e.preventDefault()

    if (!workspaceName.trim()) {
      alert("Please enter a name for this account")
      return
    }

    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      alert("Please enter Supabase URL and Key")
      return
    }

    if (!selectedOrg) {
      alert("Please select an organization first")
      return
    }

    setConnecting(true)
    try {
      // First, test the connection
      const success = await connect(supabaseUrl, supabaseKey)

      if (!success) {
        alert("Failed to connect. Please check your credentials.")
        setConnecting(false)
        return
      }

      // Connection successful - save to database
      const client = getSupabaseClient()
      if (!client) {
        alert("No database client available")
        setConnecting(false)
        return
      }

      // Get current user for created_by field
      const { data: { user } } = await client.auth.getUser()

      // Create cloud_account with database connection details
      const { data: newAccount, error: insertError } = await client
        .from("cloud_accounts")
        .insert({
          name: workspaceName.trim(),
          provider: "supabase",
          org_id: selectedOrg.id,
          url: supabaseUrl.trim(),
          anon_key: supabaseKey.trim(),
          is_active: true,
          created_by: user?.id,
        })
        .select()
        .single()

      if (insertError) {
        debugLog("CONNECT", "Error saving connection to database:", insertError)
        console.error("Error saving connection:", insertError)
        alert(`Failed to save connection: ${insertError.message}`)
        setConnecting(false)
        return
      }

      debugLog("CONNECT", "Database connection saved:", newAccount)

      // Also save to localStorage for the connection utility
      saveAccount(workspaceName.trim(), supabaseUrl, supabaseKey)
      setActiveAccount(newAccount.id)

      // Update org context with the new account
      setOrgContext(selectedOrg.id, newAccount.id)

      // Clear form
      setWorkspaceName("")
      setSupabaseUrl("")
      setSupabaseKey("")
      setShowConnectNewDb(false)

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Connection error:", error)
      alert("Failed to connect. Please check your credentials.")
    } finally {
      setConnecting(false)
    }
  }

  async function handleSelectDatabaseConnection(connection: DatabaseConnection) {
    debugLog("SELECT_DB", "Selecting database connection:", connection.name)
    setSelectedDbConnection(connection)

    // Ensure org is selected before proceeding
    if (!selectedOrg) {
      debugLog("SELECT_DB", "ERROR: No organization selected")
      alert("Please select an organization first")
      setSelectedDbConnection(null)
      return
    }

    // Connect using the stored credentials
    setConnecting(true)
    try {
      debugLog("SELECT_DB", "Testing connection...", { url: connection.url })
      const success = await connect(connection.url, connection.anon_key)
      debugLog("SELECT_DB", "Connection result:", { success })

      if (success) {
        // Save to localStorage for the connection utility
        // saveAccount returns the saved account with its localStorage ID
        const savedAccount = saveAccount(connection.name, connection.url, connection.anon_key)
        debugLog("SELECT_DB", "Saved account:", { id: savedAccount.id, name: savedAccount.name })

        // Use the localStorage account ID, not the database connection ID
        setActiveAccount(savedAccount.id)

        // Update org context - this sets the required cookies for middleware
        debugLog("SELECT_DB", "Setting org context:", { orgId: selectedOrg.id, accountId: connection.id })
        setOrgContext(selectedOrg.id, connection.id)

        // Small delay to ensure cookies are written before redirect
        await new Promise(resolve => setTimeout(resolve, 50))

        // Verify cookies are set
        const cookies = document.cookie
        debugLog("SELECT_DB", "Cookies before redirect:", cookies)

        // Redirect to dashboard using replace to avoid back-button issues
        debugLog("SELECT_DB", "Redirecting to dashboard...")
        router.replace("/dashboard")
      } else {
        debugLog("SELECT_DB", "Connection failed")
        alert("Failed to connect to this database. The credentials may have changed.")
        setSelectedDbConnection(null)
      }
    } catch (error) {
      debugLog("SELECT_DB", "Connection exception:", error)
      console.error("Connection error:", error)
      alert("Failed to connect. Please try again.")
      setSelectedDbConnection(null)
    } finally {
      setConnecting(false)
    }
  }

  function handleContinue() {
    if (selectedOrg && selectedAccount && selectedCloudProvider) {
      if (selectedCloudProvider === "supabase") {
        handleConnectSupabase()
      } else {
        // Other providers - show coming soon message
        alert("This provider is coming soon!")
      }
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const client = getSupabaseClient()
      if (client) {
        await client.auth.signOut()
      }

      // IMPORTANT: Clear ALL tenant context on sign out
      // This ensures user goes through onboarding flow on next login
      debugLog("SIGNOUT", "Clearing all tenant context...")

      // Clear localStorage
      localStorage.removeItem("aws_env_org_id")
      localStorage.removeItem("aws_env_account_id")
      localStorage.removeItem("supabase_active_account")

      // Clear cookies for middleware
      document.cookie = "aws_env_org_id=; path=/; max-age=0"
      document.cookie = "aws_env_account_id=; path=/; max-age=0"
      document.cookie = "aws_env_connected=; path=/; max-age=0"

      // Reset local state
      setSelectedOrg(null)
      setSelectedAccount(null)
      setSelectedDbConnection(null)
      setOrgContext(null, null)

      debugLog("SIGNOUT", "All context cleared, redirecting to login")

      // Redirect to login
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      setSigningOut(false)
    }
  }

  // Show loading while checking authentication or loading data
  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#74ADFE]" />
          <p className="text-gray-400">
            {checkingAuth ? "Verifying authentication..." : "Loading..."}
          </p>
        </div>
      </div>
    )
  }

  // No organizations - show create or wait for invitation
  if (organizations.length === 0 && !loading) {
    // Check if we have a working Supabase client (user passed auth check, so we should)
    const client = getSupabaseClient()
    const needsConnection = !client

    debugLog("UI", "No organizations view", {
      hasClient: !!client,
      isConnected,
      needsConnection,
    })

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
            <div className="bg-gray-900/40 border border-gray-800/60 backdrop-blur-sm p-8 sm:p-10">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
                  Welcome to Heliozz
                </h1>
                <p className="text-gray-400">
                  Get started by creating or joining an organization
                </p>
              </div>

              {needsConnection && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 text-amber-400 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-300 mb-1">Database Connection Required</h3>
                      <p className="text-sm text-amber-400/80">
                        You need to connect your database first to create or view organizations.
                        You&apos;ll be able to connect in Step 3 after selecting an organization.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="p-4 bg-[#74ADFE]/10 border border-[#74ADFE]/30">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-[#74ADFE] mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">Waiting for Invitation?</h3>
                      <p className="text-sm text-gray-400">
                        If someone invited you to their organization, you&apos;ll receive an email with
                        instructions. Once accepted, the organization will appear here.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-6">
                  <h3 className="font-semibold text-white mb-4 text-center">Or Create Your Own Organization</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="org-name" className="block text-sm font-medium text-gray-400">
                        Organization Name
                      </label>
                      <input
                        id="org-name"
                        placeholder="Acme Corp"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateOrganization()
                        }}
                        disabled={needsConnection}
                        className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none px-0 py-3 text-gray-100 placeholder:text-gray-500 focus:border-[#74ADFE] focus:outline-none focus:ring-0 transition-colors disabled:opacity-50"
                      />
                      {needsConnection && (
                        <p className="text-xs text-gray-500 mt-1">
                          Connect your database in Step 3 to create an organization
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleCreateOrganization}
                      disabled={!newOrgName.trim() || creatingOrg || needsConnection}
                      className="w-full px-8 py-4 bg-white text-black font-semibold hover:bg-[#74ADFE] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {creatingOrg ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5" />
                          Create Organization
                        </>
                      )}
                    </button>
                    {needsConnection && (
                      <p className="text-xs text-center text-gray-500">
                        You can skip organization creation for now and connect your database first.
                        Organizations can be created after connection.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Allow skipping to connection if no orgs and not connected */}
              {needsConnection && (
                <div className="border-t border-gray-800 pt-6 mt-6">
                  <button
                    onClick={() => {
                      // Skip to Step 3 (cloud provider connection)
                      // We'll show connection form even without org/account
                      setSelectedCloudProvider("supabase")
                      // Scroll to connection form after state update
                      setTimeout(() => {
                        const formElement = document.getElementById("connection-form")
                        if (formElement) {
                          formElement.scrollIntoView({ behavior: "smooth", block: "center" })
                          // Focus on URL input
                          setTimeout(() => {
                            const urlInput = document.getElementById("supabase-url")
                            if (urlInput) {
                              (urlInput as HTMLInputElement).focus()
                            }
                          }, 300)
                        }
                      }, 100)
                    }}
                    className="w-full px-8 py-4 border border-gray-700 text-gray-300 font-semibold hover:border-[#74ADFE] hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    Skip and Connect Database First
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Sign Out */}
              <div className="border-t border-gray-800 pt-6 mt-6 text-center">
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-sm text-gray-500 hover:text-white transition-colors inline-flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Has organizations - show selection flow
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

      <main className="relative z-10 flex-1 flex items-center justify-center py-8 px-6 lg:px-12">
        <div className="w-full max-w-5xl">
          <div className="bg-gray-900/40 border border-gray-800/60 backdrop-blur-sm p-6 sm:p-8 lg:p-12">
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
                Complete Your Setup
              </h1>
              <p className="text-gray-400">
                Select an organization and cloud account to get started
              </p>
            </div>

            <div className="space-y-6">
              {/* Step 1: Select Organization */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-base font-semibold text-white">Step 1: Select Organization</label>
                  <button
                    onClick={() => setShowCreateOrgDialog(true)}
                    className="px-4 py-2 border border-gray-700 text-gray-300 text-sm font-medium hover:border-[#74ADFE] hover:text-white transition-all duration-300 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create New
                  </button>
                </div>

                {/* Create Org Dialog */}
                {showCreateOrgDialog && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateOrgDialog(false)} />
                    <div className="relative bg-gray-900 border border-gray-800 p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
                      <h2 className="font-heading text-2xl font-bold text-white mb-2">Create New Organization</h2>
                      <p className="text-gray-400 text-sm mb-6">Create a new organization to manage your cloud accounts</p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="new-org-name" className="block text-sm font-medium text-gray-400">Organization Name</label>
                          <input
                            id="new-org-name"
                            placeholder="Acme Corp"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none px-0 py-3 text-gray-100 placeholder:text-gray-500 focus:border-[#74ADFE] focus:outline-none focus:ring-0 transition-colors"
                          />
                        </div>
                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => setShowCreateOrgDialog(false)}
                            className="flex-1 px-6 py-3 border border-gray-700 text-gray-300 font-medium hover:border-gray-500 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateOrganization}
                            disabled={!newOrgName.trim() || creatingOrg}
                            className="flex-1 px-6 py-3 bg-white text-black font-semibold hover:bg-[#74ADFE] hover:text-white transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {creatingOrg ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Create
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setSelectedOrg(org)
                        setOrgContext(org.id)
                      }}
                      className={`p-4 border-2 transition-all duration-300 text-left ${
                        selectedOrg?.id === org.id
                          ? "border-[#74ADFE] bg-[#74ADFE]/10"
                          : "border-gray-800 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">{org.name}</div>
                          <div className="text-sm text-gray-500 truncate">{org.slug}</div>
                        </div>
                        {selectedOrg?.id === org.id && (
                          <CheckCircle2 className="h-5 w-5 text-[#74ADFE] flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Database Connection - Animated container */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-out ${
                  selectedOrg ? "opacity-100 max-h-[2000px]" : "opacity-0 max-h-0"
                }`}
              >
                <div className="space-y-4 border-t border-gray-800 pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label className="text-base font-semibold text-white block">
                        Step 2: Select Database
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        Choose an existing database connection or add a new one
                      </p>
                    </div>
                    {databaseConnections.length > 0 && !showConnectNewDb && (
                      <button
                        onClick={() => setShowConnectNewDb(true)}
                        className="px-4 py-2 border border-gray-700 text-gray-300 text-sm font-medium hover:border-[#74ADFE] hover:text-white transition-all duration-300 flex items-center gap-2 flex-shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Connect Another</span>
                        <span className="sm:hidden">Add</span>
                      </button>
                    )}
                  </div>

                  {/* Loading state */}
                  <div className={`transition-all duration-300 ${loadingConnections ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      <span className="ml-2 text-gray-500">Loading connections...</span>
                    </div>
                  </div>

                  {/* Show existing database connections */}
                  <div className={`transition-all duration-300 ${!loadingConnections && databaseConnections.length > 0 && !showConnectNewDb ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>
                    {/* Helper text */}
                    <div className="p-3 bg-[#74ADFE]/10 border border-[#74ADFE]/30 mb-4">
                      <p className="text-sm text-[#74ADFE]">
                        <span className="font-semibold">Click on a database below</span> to connect and continue to your dashboard.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {databaseConnections.map((conn) => (
                        <button
                          key={conn.id}
                          onClick={() => handleSelectDatabaseConnection(conn)}
                          disabled={connecting}
                          className={`p-4 border-2 transition-all duration-300 text-left ${
                            selectedDbConnection?.id === conn.id
                              ? "border-[#74ADFE] bg-[#74ADFE]/10"
                              : "border-gray-800 hover:border-[#74ADFE] hover:bg-[#74ADFE]/5"
                          } ${connecting ? "opacity-50 cursor-wait" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-500/20 flex items-center justify-center flex-shrink-0">
                              <Database className="h-5 w-5 text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-white truncate">{conn.name}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {conn.url.replace("https://", "").replace(".supabase.co", "")}
                              </div>
                            </div>
                            {selectedDbConnection?.id === conn.id && connecting ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#74ADFE] flex-shrink-0" />
                            ) : selectedDbConnection?.id === conn.id ? (
                              <CheckCircle2 className="h-5 w-5 text-[#74ADFE] flex-shrink-0" />
                            ) : (
                              <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-[#74ADFE] flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Empty state - no connections */}
                  <div className={`transition-all duration-300 ${!loadingConnections && databaseConnections.length === 0 && !showConnectNewDb ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>
                    <div className="text-center py-8 px-4 border-2 border-dashed border-gray-800">
                      <Database className="h-12 w-12 mx-auto text-gray-700 mb-3" />
                      <h3 className="font-semibold text-white mb-1">No database connections</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Connect your first database to get started
                      </p>
                      <button
                        onClick={() => setShowConnectNewDb(true)}
                        className="px-6 py-3 bg-white text-black font-semibold hover:bg-[#74ADFE] hover:text-white transition-all duration-300 inline-flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Connect Database
                      </button>
                    </div>
                  </div>

                  {/* Connect New Database UI - Animated expansion */}
                  <div className={`transition-all duration-500 ease-out ${!loadingConnections && showConnectNewDb ? "opacity-100 max-h-[1500px]" : "opacity-0 max-h-0 overflow-hidden"}`}>
                    {databaseConnections.length > 0 && (
                      <div className="flex items-center justify-between border-t border-gray-800 pt-4 mb-4">
                        <span className="text-sm font-medium text-white">Connect a new database</span>
                        <button
                          onClick={() => setShowConnectNewDb(false)}
                          className="text-sm text-gray-500 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Helper text for provider selection */}
                    <div className="p-3 bg-[#74ADFE]/10 border border-[#74ADFE]/30 mb-4">
                      <p className="text-sm text-[#74ADFE]">
                        <span className="font-semibold">Click on Supabase below</span> to enter your database credentials and connect.
                      </p>
                    </div>

                    {/* Cloud Services - Horizontal Scroll */}
                    <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
                      <div className="flex gap-3 min-w-max">
                        {/* Supabase/Database - Available */}
                        <button
                          onClick={() => setSelectedCloudProvider(selectedCloudProvider === "supabase" ? null : "supabase")}
                          className={`relative w-32 flex-shrink-0 p-4 border-2 transition-all duration-300 text-left group ${
                            selectedCloudProvider === "supabase"
                              ? "border-[#74ADFE] bg-[#74ADFE]/10"
                              : "border-gray-800 hover:border-gray-700"
                          }`}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div className={`h-10 w-10 flex items-center justify-center transition-colors ${
                              selectedCloudProvider === "supabase"
                                ? "bg-[#74ADFE] text-white"
                                : "bg-green-500/20 text-green-400"
                            }`}>
                              <Database className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-white">Supabase</div>
                            </div>
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-medium">Available</span>
                          </div>
                          {selectedCloudProvider === "supabase" && (
                            <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-[#74ADFE]" />
                          )}
                        </button>

                        {/* AWS */}
                        <button
                          onClick={() => setSelectedCloudProvider(selectedCloudProvider === "aws" ? null : "aws")}
                          className={`relative w-32 flex-shrink-0 p-4 border-2 transition-all duration-300 text-left group ${
                            selectedCloudProvider === "aws"
                              ? "border-orange-500 bg-orange-500/10"
                              : "border-gray-800 hover:border-gray-700"
                          }`}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div className={`h-10 w-10 flex items-center justify-center transition-colors ${
                              selectedCloudProvider === "aws"
                                ? "bg-orange-500 text-white"
                                : "bg-orange-500/20 text-orange-400"
                            }`}>
                              <Server className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-white">AWS</div>
                            </div>
                            <span className="px-2 py-0.5 bg-gray-800 text-gray-500 text-[9px] font-medium">Coming Soon</span>
                          </div>
                          {selectedCloudProvider === "aws" && (
                            <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-orange-500" />
                          )}
                        </button>

                        {/* Azure */}
                        <button
                          onClick={() => setSelectedCloudProvider(selectedCloudProvider === "azure" ? null : "azure")}
                          className={`relative w-32 flex-shrink-0 p-4 border-2 transition-all duration-300 text-left group ${
                            selectedCloudProvider === "azure"
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-gray-800 hover:border-gray-700"
                          }`}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div className={`h-10 w-10 flex items-center justify-center transition-colors ${
                              selectedCloudProvider === "azure"
                                ? "bg-blue-500 text-white"
                                : "bg-blue-500/20 text-blue-400"
                            }`}>
                              <Cloud className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-white">Azure</div>
                            </div>
                            <span className="px-2 py-0.5 bg-gray-800 text-gray-500 text-[9px] font-medium">Coming Soon</span>
                          </div>
                          {selectedCloudProvider === "azure" && (
                            <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-blue-500" />
                          )}
                        </button>

                        {/* GCP */}
                        <button
                          onClick={() => setSelectedCloudProvider(selectedCloudProvider === "gcp" ? null : "gcp")}
                          className={`relative w-32 flex-shrink-0 p-4 border-2 transition-all duration-300 text-left group ${
                            selectedCloudProvider === "gcp"
                              ? "border-red-500 bg-red-500/10"
                              : "border-gray-800 hover:border-gray-700"
                          }`}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div className={`h-10 w-10 flex items-center justify-center transition-colors ${
                              selectedCloudProvider === "gcp"
                                ? "bg-red-500 text-white"
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              <Cloud className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-white">GCP</div>
                            </div>
                            <span className="px-2 py-0.5 bg-gray-800 text-gray-500 text-[9px] font-medium">Coming Soon</span>
                          </div>
                          {selectedCloudProvider === "gcp" && (
                            <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-red-500" />
                          )}
                        </button>

                        {/* DigitalOcean */}
                        <button
                          onClick={() => setSelectedCloudProvider(selectedCloudProvider === "digitalocean" ? null : "digitalocean")}
                          className={`relative w-32 flex-shrink-0 p-4 border-2 transition-all duration-300 text-left group ${
                            selectedCloudProvider === "digitalocean"
                              ? "border-blue-400 bg-blue-400/10"
                              : "border-gray-800 hover:border-gray-700"
                          }`}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div className={`h-10 w-10 flex items-center justify-center transition-colors ${
                              selectedCloudProvider === "digitalocean"
                                ? "bg-blue-400 text-white"
                                : "bg-blue-400/20 text-blue-300"
                            }`}>
                              <Cloud className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-white">DigitalOcean</div>
                            </div>
                            <span className="px-2 py-0.5 bg-gray-800 text-gray-500 text-[9px] font-medium">Coming Soon</span>
                          </div>
                          {selectedCloudProvider === "digitalocean" && (
                            <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-blue-400" />
                          )}
                        </button>

                        {/* Kubernetes */}
                        <button
                          onClick={() => setSelectedCloudProvider(selectedCloudProvider === "kubernetes" ? null : "kubernetes")}
                          className={`relative w-32 flex-shrink-0 p-4 border-2 transition-all duration-300 text-left group ${
                            selectedCloudProvider === "kubernetes"
                              ? "border-indigo-500 bg-indigo-500/10"
                              : "border-gray-800 hover:border-gray-700"
                          }`}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div className={`h-10 w-10 flex items-center justify-center transition-colors ${
                              selectedCloudProvider === "kubernetes"
                                ? "bg-indigo-500 text-white"
                                : "bg-indigo-500/20 text-indigo-400"
                            }`}>
                              <Server className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-white">Kubernetes</div>
                            </div>
                            <span className="px-2 py-0.5 bg-gray-800 text-gray-500 text-[9px] font-medium">Coming Soon</span>
                          </div>
                          {selectedCloudProvider === "kubernetes" && (
                            <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-indigo-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Supabase Connection Form - Shows when Supabase is selected */}
                    <div className={`transition-all duration-500 ease-out ${selectedCloudProvider === "supabase" ? "opacity-100 max-h-[800px] mt-6" : "opacity-0 max-h-0 overflow-hidden"}`}>
                      <div className="p-6 border-2 border-[#74ADFE] bg-[#74ADFE]/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="h-5 w-5 text-[#74ADFE]" />
                          <h3 className="font-heading text-lg font-semibold text-white">Connect to Supabase</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">Enter your Supabase project credentials to connect</p>

                        <form onSubmit={handleConnectSupabase} className="space-y-5">
                          <div className="space-y-2">
                            <label htmlFor="account-name" className="block text-sm font-medium text-gray-400">Account Name</label>
                            <input
                              id="account-name"
                              type="text"
                              placeholder="My Production Database"
                              value={workspaceName}
                              onChange={(e) => setWorkspaceName(e.target.value)}
                              required
                              disabled={connecting}
                              className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none px-0 py-3 text-gray-100 placeholder:text-gray-500 focus:border-[#74ADFE] focus:outline-none focus:ring-0 transition-colors"
                            />
                            <p className="text-xs text-gray-500">A friendly name to identify this connection</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="supabase-url" className="block text-sm font-medium text-gray-400">Project URL</label>
                            <input
                              id="supabase-url"
                              type="url"
                              placeholder="https://your-project-id.supabase.co"
                              value={supabaseUrl}
                              onChange={(e) => setSupabaseUrl(e.target.value)}
                              required
                              disabled={connecting}
                              className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none px-0 py-3 text-gray-100 placeholder:text-gray-500 focus:border-[#74ADFE] focus:outline-none focus:ring-0 transition-colors"
                            />
                            <p className="text-xs text-gray-500">Find this in Project Settings → API → Project URL</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="supabase-key" className="block text-sm font-medium text-gray-400">Anon Public Key</label>
                            <input
                              id="supabase-key"
                              type="password"
                              placeholder="eyJhbGciOiJIUzI1NiIs..."
                              value={supabaseKey}
                              onChange={(e) => setSupabaseKey(e.target.value)}
                              required
                              disabled={connecting}
                              className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none px-0 py-3 text-gray-100 placeholder:text-gray-500 focus:border-[#74ADFE] focus:outline-none focus:ring-0 transition-colors"
                            />
                            <p className="text-xs text-gray-500">Find this in Project Settings → API → anon public key</p>
                          </div>
                          <button
                            type="submit"
                            disabled={connecting || !workspaceName.trim() || !supabaseUrl.trim() || !supabaseKey.trim()}
                            className="w-full mt-4 px-8 py-4 bg-white text-black font-semibold hover:bg-[#74ADFE] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {connecting ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                Connect & Continue
                                <ArrowRight className="h-5 w-5" />
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* AWS Connection Form */}
                    <div className={`transition-all duration-500 ease-out ${selectedCloudProvider === "aws" ? "opacity-100 max-h-[800px] mt-6" : "opacity-0 max-h-0 overflow-hidden"}`}>
                      <div className="p-6 border-2 border-orange-500 bg-orange-500/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Server className="h-5 w-5 text-orange-500" />
                          <h3 className="font-heading text-lg font-semibold text-white">Connect to AWS</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">Connect your AWS account using IAM credentials</p>

                        <div className="p-4 bg-orange-500/10 border border-orange-500/30 mb-4">
                          <div className="flex items-center gap-2 text-orange-400 font-medium mb-2">
                            <Lock className="h-4 w-4" />
                            Coming Soon
                          </div>
                          <p className="text-sm text-orange-400/80">
                            AWS integration is currently under development. You&apos;ll be able to connect using IAM Access Keys or assume role.
                          </p>
                        </div>
                        <div className="opacity-50 pointer-events-none space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Access Key ID</label>
                            <input placeholder="AKIAIOSFODNN7EXAMPLE" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Secret Access Key</label>
                            <input type="password" placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Region</label>
                            <input placeholder="us-east-1" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                        </div>
                        <button disabled className="w-full mt-6 px-8 py-4 bg-gray-800 text-gray-500 font-semibold flex items-center justify-center gap-2">
                          <Lock className="h-5 w-5" />
                          Coming Soon
                        </button>
                      </div>
                    </div>

                    {/* Azure Connection Form */}
                    <div className={`transition-all duration-500 ease-out ${selectedCloudProvider === "azure" ? "opacity-100 max-h-[800px] mt-6" : "opacity-0 max-h-0 overflow-hidden"}`}>
                      <div className="p-6 border-2 border-blue-500 bg-blue-500/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Cloud className="h-5 w-5 text-blue-500" />
                          <h3 className="font-heading text-lg font-semibold text-white">Connect to Azure</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">Connect your Azure subscription using Service Principal</p>

                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 mb-4">
                          <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
                            <Lock className="h-4 w-4" />
                            Coming Soon
                          </div>
                          <p className="text-sm text-blue-400/80">
                            Azure integration is currently under development. You&apos;ll be able to connect using Service Principal credentials.
                          </p>
                        </div>
                        <div className="opacity-50 pointer-events-none space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Subscription ID</label>
                            <input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Tenant ID</label>
                            <input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Client ID</label>
                            <input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Client Secret</label>
                            <input type="password" placeholder="Your client secret" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                        </div>
                        <button disabled className="w-full mt-6 px-8 py-4 bg-gray-800 text-gray-500 font-semibold flex items-center justify-center gap-2">
                          <Lock className="h-5 w-5" />
                          Coming Soon
                        </button>
                      </div>
                    </div>

                    {/* GCP Connection Form */}
                    <div className={`transition-all duration-500 ease-out ${selectedCloudProvider === "gcp" ? "opacity-100 max-h-[800px] mt-6" : "opacity-0 max-h-0 overflow-hidden"}`}>
                      <div className="p-6 border-2 border-red-500 bg-red-500/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Cloud className="h-5 w-5 text-red-500" />
                          <h3 className="font-heading text-lg font-semibold text-white">Connect to Google Cloud</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">Connect your GCP project using Service Account</p>

                        <div className="p-4 bg-red-500/10 border border-red-500/30 mb-4">
                          <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                            <Lock className="h-4 w-4" />
                            Coming Soon
                          </div>
                          <p className="text-sm text-red-400/80">
                            GCP integration is currently under development. You&apos;ll be able to connect using Service Account JSON key.
                          </p>
                        </div>
                        <div className="opacity-50 pointer-events-none space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Project ID</label>
                            <input placeholder="my-project-123456" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Service Account JSON</label>
                            <textarea
                              placeholder='{"type": "service_account", ...}'
                              disabled
                              className="w-full bg-transparent border border-gray-700 px-3 py-3 text-white placeholder:text-gray-600 h-24 resize-none"
                            />
                          </div>
                        </div>
                        <button disabled className="w-full mt-6 px-8 py-4 bg-gray-800 text-gray-500 font-semibold flex items-center justify-center gap-2">
                          <Lock className="h-5 w-5" />
                          Coming Soon
                        </button>
                      </div>
                    </div>

                    {/* DigitalOcean Connection Form */}
                    <div className={`transition-all duration-500 ease-out ${selectedCloudProvider === "digitalocean" ? "opacity-100 max-h-[800px] mt-6" : "opacity-0 max-h-0 overflow-hidden"}`}>
                      <div className="p-6 border-2 border-blue-400 bg-blue-400/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Cloud className="h-5 w-5 text-blue-400" />
                          <h3 className="font-heading text-lg font-semibold text-white">Connect to DigitalOcean</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">Connect your DigitalOcean account using API Token</p>

                        <div className="p-4 bg-blue-400/10 border border-blue-400/30 mb-4">
                          <div className="flex items-center gap-2 text-blue-300 font-medium mb-2">
                            <Lock className="h-4 w-4" />
                            Coming Soon
                          </div>
                          <p className="text-sm text-blue-300/80">
                            DigitalOcean integration is currently under development. You&apos;ll be able to connect using Personal Access Token.
                          </p>
                        </div>
                        <div className="opacity-50 pointer-events-none space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">API Token</label>
                            <input type="password" placeholder="dop_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                        </div>
                        <button disabled className="w-full mt-6 px-8 py-4 bg-gray-800 text-gray-500 font-semibold flex items-center justify-center gap-2">
                          <Lock className="h-5 w-5" />
                          Coming Soon
                        </button>
                      </div>
                    </div>

                    {/* Kubernetes Connection Form */}
                    <div className={`transition-all duration-500 ease-out ${selectedCloudProvider === "kubernetes" ? "opacity-100 max-h-[800px] mt-6" : "opacity-0 max-h-0 overflow-hidden"}`}>
                      <div className="p-6 border-2 border-indigo-500 bg-indigo-500/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Server className="h-5 w-5 text-indigo-500" />
                          <h3 className="font-heading text-lg font-semibold text-white">Connect to Kubernetes</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">Connect your Kubernetes cluster using kubeconfig</p>

                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 mb-4">
                          <div className="flex items-center gap-2 text-indigo-400 font-medium mb-2">
                            <Lock className="h-4 w-4" />
                            Coming Soon
                          </div>
                          <p className="text-sm text-indigo-400/80">
                            Kubernetes integration is currently under development. You&apos;ll be able to connect using kubeconfig or service account.
                          </p>
                        </div>
                        <div className="opacity-50 pointer-events-none space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Cluster Name</label>
                            <input placeholder="my-cluster" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">API Server URL</label>
                            <input placeholder="https://kubernetes.example.com:6443" disabled className="w-full bg-transparent border-0 border-b-2 border-gray-700 px-0 py-3 text-white placeholder:text-gray-600" />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">kubeconfig</label>
                            <textarea
                              placeholder="apiVersion: v1&#10;kind: Config&#10;..."
                              disabled
                              className="w-full bg-transparent border border-gray-700 px-3 py-3 text-white placeholder:text-gray-600 h-24 resize-none font-mono"
                            />
                          </div>
                        </div>
                        <button disabled className="w-full mt-6 px-8 py-4 bg-gray-800 text-gray-500 font-semibold flex items-center justify-center gap-2">
                          <Lock className="h-5 w-5" />
                          Coming Soon
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <div className="border-t border-gray-800 pt-6 text-center">
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-sm text-gray-500 hover:text-white transition-colors inline-flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
