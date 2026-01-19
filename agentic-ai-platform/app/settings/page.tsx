"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Database, Bell, Shield, RefreshCw, Sliders, Lock } from "lucide-react"
import { useConnectionStore } from "@/stores/connection-store"
import { PolicyTable } from "@/components/settings/PolicyTable"
import { PolicyPresets } from "@/components/settings/PolicyPresets"
import { BulkPolicyActions } from "@/components/settings/BulkPolicyActions"
import type { PolicyResource } from "@/hooks/usePolicyResources"

export default function SettingsPage() {
  const { isConnected, url, stats, disconnect } = useConnectionStore()
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
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Security & Access</CardTitle>
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
