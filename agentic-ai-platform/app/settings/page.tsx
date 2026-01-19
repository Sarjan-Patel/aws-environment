"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Database, Bell, Shield, RefreshCw, Sliders, Lock, LogOut, User } from "lucide-react"
import { useConnectionStore } from "@/stores/connection-store"
import { getSupabaseClient } from "@/lib/supabase/connection"
import { PolicyTable } from "@/components/settings/PolicyTable"
import { PolicyPresets } from "@/components/settings/PolicyPresets"
import { BulkPolicyActions } from "@/components/settings/BulkPolicyActions"
import type { PolicyResource } from "@/hooks/usePolicyResources"

export default function SettingsPage() {
  const router = useRouter()
  const { isConnected, url, stats, disconnect } = useConnectionStore()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    // Get current user email
    async function fetchUser() {
      const client = getSupabaseClient()
      if (client) {
        const { data: { user } } = await client.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
        }
      }
    }
    fetchUser()
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const client = getSupabaseClient()
      if (client) {
        await client.auth.signOut()
      }

      // IMPORTANT: Clear ALL tenant context on sign out
      // This ensures user goes through onboarding flow on next login
      localStorage.removeItem("aws_env_org_id")
      localStorage.removeItem("aws_env_account_id")
      localStorage.removeItem("supabase_active_account")

      // Clear cookies for middleware
      document.cookie = "aws_env_org_id=; path=/; max-age=0"
      document.cookie = "aws_env_account_id=; path=/; max-age=0"
      document.cookie = "aws_env_connected=; path=/; max-age=0"

      // Redirect to login
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      setSigningOut(false)
    }
  }
  const [selectedResources, setSelectedResources] = useState<PolicyResource[]>([])

  const projectName = url
    ? url.replace("https://", "").replace(".supabase.co", "")
    : "Not connected"

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your FinOps AI platform settings
          </p>
        </div>

        <Tabs defaultValue="policies" className="space-y-6">
          <TabsList>
            <TabsTrigger value="policies" className="gap-2">
              <Sliders className="h-4 w-4" />
              Policy Management
            </TabsTrigger>
            <TabsTrigger value="connection" className="gap-2">
              <Database className="h-4 w-4" />
              Connection
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Policy Management Tab */}
          <TabsContent value="policies" className="space-y-6">
            {/* Policy Presets */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <CardTitle>Policy Presets</CardTitle>
                </div>
                <CardDescription>
                  Quickly apply predefined optimization policies to all resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PolicyPresets />
              </CardContent>
            </Card>

            {/* Policy Configuration Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sliders className="h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <CardTitle>Resource Policies</CardTitle>
                      <CardDescription>
                        Configure optimization policies for individual resources
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="gap-1 whitespace-nowrap">
                      <Lock className="h-3 w-3" />
                      Production resources are auto-locked
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <BulkPolicyActions
                  selectedResources={selectedResources}
                  onComplete={() => setSelectedResources([])}
                />
                <PolicyTable
                  selectedResources={selectedResources}
                  onSelectionChange={setSelectedResources}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connection Tab */}
          <TabsContent value="connection">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <CardTitle>Database Connection</CardTitle>
                </div>
                <CardDescription>
                  Manage your Supabase database connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Connection Status</div>
                    <div className="text-sm text-muted-foreground">
                      {isConnected ? (
                        <>Connected to <span className="font-mono">{projectName}</span></>
                      ) : (
                        "Not connected to any database"
                      )}
                    </div>
                  </div>
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>

                {isConnected && stats && (
                  <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div>
                      <div className="text-2xl font-bold">{stats.instances}</div>
                      <div className="text-xs text-muted-foreground">Instances</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stats.rdsInstances}</div>
                      <div className="text-xs text-muted-foreground">RDS</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stats.lambdaFunctions}</div>
                      <div className="text-xs text-muted-foreground">Lambdas</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <a href="/setup">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconnect
                    </a>
                  </Button>
                  {isConnected && (
                    <Button variant="destructive" onClick={disconnect}>
                      Disconnect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Notifications</CardTitle>
                </div>
                <CardDescription>
                  Configure alerting and notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Coming Soon</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure email and Slack notifications for optimization recommendations and actions.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Account Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Account</CardTitle>
                </div>
                <CardDescription>
                  Manage your account and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Signed in as</div>
                    <div className="text-sm text-muted-foreground">
                      {userEmail || "Loading..."}
                    </div>
                  </div>
                  <Badge variant="default">Authenticated</Badge>
                </div>

                <div className="pt-2">
                  <Button
                    variant="destructive"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    {signingOut ? "Signing out..." : "Sign Out"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will sign you out and disconnect from the database.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* API Keys Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>API Keys & Access Controls</CardTitle>
                </div>
                <CardDescription>
                  Manage API keys and access controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Coming Soon</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure API keys, access controls, and audit logging.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
