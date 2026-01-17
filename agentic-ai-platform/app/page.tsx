"use client"

import { useEffect, useRef } from "react"
import { Header } from "@/components/header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConnectionStore } from "@/stores/connection-store"
import { MetricsCards, WasteAlertBanner } from "@/components/dashboard/MetricsCards"
import { WasteBreakdown, RecentActivity } from "@/components/dashboard/WasteBreakdown"
import { useDashboardData } from "@/hooks/useWasteDetection"
import { useRealtimeResources } from "@/hooks/useRealtime"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Zap,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { initialize, testCurrentConnection, isConnected } = useConnectionStore()
  const mountTime = useRef(performance.now())
  const dataLoadedLogged = useRef(false)

  // Initialize connection on mount
  useEffect(() => {
    console.log("[Dashboard] Component mounted")
    initialize()
    testCurrentConnection()
  }, [initialize, testCurrentConnection])

  // Enable real-time updates when connected
  useRealtimeResources(isConnected)

  // Single unified data hook - eliminates redundant queries
  const {
    counts,
    wasteDetection,
    autoSafe,
    wasteByScenario,
    isLoading,
    refetch,
  } = useDashboardData()

  // Log when data is loaded
  useEffect(() => {
    if (!isLoading && !dataLoadedLogged.current) {
      const loadTime = performance.now() - mountTime.current
      console.log(`[Dashboard] ✅ Data loaded in ${loadTime.toFixed(0)}ms | Resources: ${counts?.total ?? 0} | Detections: ${wasteDetection?.totalDetections ?? 0}`)
      dataLoadedLogged.current = true
    }
  }, [isLoading, counts, wasteDetection])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Dashboard</h1>
              <p className="text-muted-foreground text-base">
                Monitor your cloud costs and optimization opportunities
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="shadow-sm hover:shadow-md transition-shadow duration-200 border-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          {/* Waste Alert Banner */}
          <WasteAlertBanner
            totalDetections={wasteDetection?.totalDetections ?? 0}
            totalPotentialSavings={wasteDetection?.totalPotentialSavings ?? 0}
            scenarioCount={wasteByScenario.length}
            isLoading={isLoading}
          />

          {/* Summary Cards - Data from unified hook */}
          <MetricsCards
            counts={counts}
            totalPotentialSavings={wasteDetection?.totalPotentialSavings ?? 0}
            totalDetections={wasteDetection?.totalDetections ?? 0}
            autoSafeCount={autoSafe.count}
            autoSafeSavings={autoSafe.totalSavings}
            isLoading={isLoading}
          />

          {/* Agent Modes - Full Width Grid */}
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-foreground">Agent Modes</h2>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <AgentModeCard
                title="Mode 1: Monitor"
                description="Passive monitoring and data collection"
                status="active"
                icon={<Activity className="h-5 w-5" />}
                features={[
                  "Real-time utilization tracking",
                  "Cost aggregation",
                  "Trend analysis",
                ]}
                href="/monitoring"
              />
              <AgentModeCard
                title="Mode 2: Auto-Safe"
                description="Automated safe optimizations"
                status="active"
                icon={<Zap className="h-5 w-5" />}
                features={[
                  "Idle CI runner cleanup",
                  "Orphaned EIP release",
                  "Log retention policies",
                ]}
                href="/auto-safe"
              />
              <AgentModeCard
                title="Mode 3: Approvals"
                description="Recommendations requiring approval"
                status="active"
                icon={<AlertTriangle className="h-5 w-5" />}
                features={[
                  "Production scaling",
                  "RDS rightsizing",
                  "Lambda optimization",
                ]}
                href="/approvals"
              />
            </div>
          </div>

          {/* Waste Breakdown and Activity - Full Width */}
          <div className="grid gap-6 lg:grid-cols-2">
            <WasteBreakdown scenarios={wasteByScenario} isLoading={isLoading} />
            <RecentActivity />
          </div>
        </div>
      </main>
    </div>
  )
}

function AgentModeCard({
  title,
  description,
  status,
  icon,
  features,
  href,
}: {
  title: string
  description: string
  status: "active" | "pending" | "disabled"
  icon: React.ReactNode
  features: string[]
  href?: string
}) {
  const content = (
    <Card className={`${status === "pending" ? "opacity-75" : ""} ${href ? "card-hover hover:border-primary/50 cursor-pointer" : ""} border-2 transition-all duration-300`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shadow-sm transition-transform duration-200 ${
                status === "active"
                  ? "bg-gradient-to-br from-green-500/20 to-green-600/10 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {icon}
            </div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </div>
          <Badge
            variant={
              status === "active"
                ? "success"
                : status === "pending"
                ? "secondary"
                : "outline"
            }
            className="shadow-sm"
          >
            {status === "active" && (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            )}
            {status === "active" ? "Active" : status === "pending" ? "Coming Soon" : "Disabled"}
          </Badge>
        </div>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2.5 text-sm">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2.5 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
