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
import { AIInsight } from "@/components/dashboard/AIInsight"
import { useDashboardData, useRefreshDetection } from "@/hooks/useWasteDetection"
import { useSavingsTracking } from "@/hooks/useSavingsTracking"
import { useRealtimeResources } from "@/hooks/useRealtime"
import { useAuditLog } from "@/hooks/useActionExecution"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Zap,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

// Force dynamic rendering to avoid build-time errors during static generation
export const dynamic = 'force-dynamic'

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
    approvals,
    wasteByScenario,
    isLoading,
  } = useDashboardData()

  // Refresh mutation that bypasses server cache
  const refreshDetection = useRefreshDetection()

  // Fetch audit log for recent activity
  const { data: auditLog, isLoading: auditLogLoading, refetch: refetchAuditLog } = useAuditLog(10)

  // Fetch savings tracking data
  const { stats: savingsStats, isLoading: savingsLoading } = useSavingsTracking()

  // Handle refresh - bypasses server cache for fresh data
  const handleRefresh = () => {
    console.log("[Dashboard] Refreshing data (bypassing cache)...")
    refreshDetection.mutate()
    refetchAuditLog()
  }

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

      <main className="flex-1 container py-8">
        <div className="flex flex-col gap-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Dashboard</h1>
              <p className="text-muted-foreground text-base">
                Monitor your cloud costs and optimization opportunities
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshDetection.isPending}
              className="shadow-sm hover:shadow-md transition-shadow duration-200 border-2"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshDetection.isPending ? "animate-spin" : ""}`} />
              {refreshDetection.isPending ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>

          {/* Waste Alert Banner */}
          <WasteAlertBanner
            totalDetections={wasteDetection?.totalDetections ?? 0}
            totalPotentialSavings={wasteDetection?.totalPotentialSavings ?? 0}
            scenarioCount={wasteByScenario.length}
            isLoading={isLoading}
          />

          {/* AI Insight - Powered by OpenAI */}
          {!isLoading && (counts?.total ?? 0) > 0 && (
            <AIInsight
              totalResources={counts?.total ?? 0}
              totalDetections={wasteDetection?.totalDetections ?? 0}
              totalSavings={wasteDetection?.totalPotentialSavings ?? 0}
              topScenarios={wasteByScenario}
              autoSafeCount={autoSafe.count}
              approvalCount={approvals.count}
            />
          )}

          {/* Savings Summary Card */}
          <SavingsSummaryCard
            stats={savingsStats}
            isLoading={savingsLoading}
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
                title="Cloud Usage"
                description="Real-time monitoring and cost analysis"
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
                title="Auto-Safe"
                description="Safe optimizations executed automatically"
                status="active"
                icon={<Zap className="h-5 w-5" />}
                features={[
                  "Idle CI runner cleanup",
                  "Orphaned EIP release",
                  "Log retention policies",
                ]}
                href="/approvals?tab=auto-safe"
              />
              <AgentModeCard
                title="Approvals"
                description="Recommendations requiring human review"
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
            <RecentActivity auditLog={auditLog} isLoading={auditLogLoading} />
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

import type { SavingsStats } from "@/hooks/useSavingsTracking"

function SavingsSummaryCard({
  stats,
  isLoading,
}: {
  stats: SavingsStats
  isLoading: boolean
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const pendingRecommendations = stats.actionsExecutedThisMonth > 0
    ? Math.max(0, stats.savingsByScenario.filter(s => s.potential > 0).length)
    : stats.savingsByScenario.length

  if (isLoading) {
    return (
      <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse flex space-x-4 items-center">
              <div className="h-12 w-12 bg-green-500/20 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-green-500/20 rounded"></div>
                <div className="h-8 w-24 bg-green-500/20 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5 shadow-lg">
      <CardContent className="py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Savings Amount */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Savings This Month</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.realizedThisMonth)}
              </p>
              {stats.realizedThisWeek > 0 && (
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{formatCurrency(stats.realizedThisWeek)} this week</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{stats.actionsExecutedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Actions Executed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{stats.successRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingRecommendations}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>

          {/* CTA Button */}
          <Link href="/approvals">
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md">
              View Recommendations
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
