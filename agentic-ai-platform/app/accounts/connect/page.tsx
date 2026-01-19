"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import {
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  Server,
  HardDrive,
  Cloud,
  Activity,
  CloudCog,
  ArrowLeft,
} from "lucide-react"

type Provider = "supabase" | "aws" | "azure" | "gcp" | "other"

const providers: { id: Provider; name: string; description: string; available: boolean }[] = [
  { id: "supabase", name: "Supabase", description: "Connect to your Supabase database", available: true },
  { id: "aws", name: "AWS", description: "Amazon Web Services", available: false },
  { id: "azure", name: "Azure", description: "Microsoft Azure", available: false },
  { id: "gcp", name: "GCP", description: "Google Cloud Platform", available: false },
  { id: "other", name: "Other", description: "Other cloud providers", available: false },
]

export default function ConnectPage() {
  const router = useRouter()
  const { isConnected, isLoading, error, stats, connect, disconnect, initialize } =
    useConnectionStore()

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [url, setUrl] = useState("")
  const [key, setKey] = useState("")

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await connect(url, key)
    if (success) {
      setUrl("")
      setKey("")
      router.push("/dashboard")
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setUrl("")
    setKey("")
    setSelectedProvider(null)
  }

  const handleContinue = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <CloudCog className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">FinOps AI</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Back button */}
          <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to login
          </Link>

          {!selectedProvider && !isConnected ? (
            /* Provider Selection */
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Connect Cloud Account</CardTitle>
                <CardDescription>
                  Choose a provider to connect your cloud infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => provider.available && setSelectedProvider(provider.id)}
                      disabled={!provider.available}
                      className={`relative flex flex-col items-start p-4 rounded-lg border-2 text-left transition-colors ${
                        provider.available
                          ? "hover:border-primary cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Database className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">{provider.name}</div>
                          {!provider.available && (
                            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : isConnected && stats ? (
            /* Connected State */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Database className="h-6 w-6" />
                    Connected to Supabase
                  </CardTitle>
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                </div>
                <CardDescription>
                  Your AWS Environment database is ready
                </CardDescription>
              </CardHeader>
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
            </Card>
          ) : (
            /* Supabase Connection Form */
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProvider(null)}
                    className="p-1 rounded hover:bg-muted"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Database className="h-6 w-6" />
                      Connect to Supabase
                    </CardTitle>
                    <CardDescription>
                      Enter your Supabase credentials to connect
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
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
            </Card>
          )}
        </div>
      </main>
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
