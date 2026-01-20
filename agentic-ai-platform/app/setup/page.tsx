"use client"

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useConnectionStore } from "@/stores/connection-store"
import { Database, CheckCircle2, XCircle, Loader2, Server, HardDrive, Cloud, Activity } from "lucide-react"

export default function SetupPage() {
  const router = useRouter()
  const { isConnected, isLoading, error, stats, connect, disconnect, initialize } =
    useConnectionStore()

  const [url, setUrl] = useState("")
  const [key, setKey] = useState("")

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await connect(url, key)
    if (success) {
      // Clear the form after successful connection
      setUrl("")
      setKey("")
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setUrl("")
    setKey("")
  }

  const handleContinue = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Database className="h-6 w-6" />
              Connect to AWS Environment
            </CardTitle>
            {isConnected && (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            )}
          </div>
          <CardDescription>
            Enter your Supabase credentials to connect to your AWS Environment
            database. You can find these in your Supabase project settings.
          </CardDescription>
        </CardHeader>

        {isConnected && stats ? (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<Server className="h-4 w-4" />}
                label="EC2 Instances"
                value={stats.instances}
              />
              <StatCard
                icon={<HardDrive className="h-4 w-4" />}
                label="S3 Buckets"
                value={stats.s3Buckets}
              />
              <StatCard
                icon={<Database className="h-4 w-4" />}
                label="RDS Instances"
                value={stats.rdsInstances}
              />
              <StatCard
                icon={<Cloud className="h-4 w-4" />}
                label="Lambda Functions"
                value={stats.lambdaFunctions}
              />
              <StatCard
                icon={<Activity className="h-4 w-4" />}
                label="Log Groups"
                value={stats.logGroups}
              />
              <StatCard
                icon={<Activity className="h-4 w-4" />}
                label="Metrics Records"
                value={stats.metricsRecords}
              />
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Supabase URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-project-id.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key">Anon Key</Label>
                <Input
                  id="key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Find this in Project Settings → API → anon public key
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </CardFooter>
          </form>
        )}

        {isConnected && (
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={handleContinue} className="w-full">
              Continue to Dashboard
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              Disconnect
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
