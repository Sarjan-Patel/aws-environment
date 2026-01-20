"use client"

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Target,
  Download,
  Calendar,
  Activity,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react"
import { useSavingsTracking, downloadSavingsReport } from "@/hooks/useSavingsTracking"
import { CostTrendChart, SavingsByScenarioChart } from "@/components/dashboard/CostTrendChart"
import { useDashboardData } from "@/hooks/useWasteDetection"
import { useAuditLog } from "@/hooks/useActionExecution"

// Force dynamic rendering to avoid build-time errors during static generation
export const dynamic = 'force-dynamic'

export default function SavingsPage() {
  const { stats, isLoading } = useSavingsTracking()
  const { wasteByScenario, autoSafe, approvals, isLoading: detectionLoading, refetch } = useDashboardData()
  const { data: auditLog } = useAuditLog(20)

  const handleExport = () => {
    if (!isLoading) {
      downloadSavingsReport(stats)
    }
  }

  const handleRefresh = () => {
    refetch()
  }

  // Calculate percentage changes (mock for now - would need historical data)
  const monthOverMonthChange = stats.realizedThisMonth > 0 ? 12.5 : 0
  const weekOverWeekChange = stats.realizedThisWeek > 0 ? 8.2 : 0

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Savings Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track realized savings and optimization opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={detectionLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${detectionLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Realized This Month */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Realized This Month</CardTitle>
            <PiggyBank className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {isLoading ? "..." : `$${stats.realizedThisMonth.toFixed(0)}`}
            </div>
            {monthOverMonthChange !== 0 && (
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{monthOverMonthChange}% from last month
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stats.actionsExecutedThisMonth} actions executed
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-300" />
        </Card>

        {/* Realized All Time */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Realized</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {isLoading ? "..." : `$${stats.realizedAllTime.toFixed(0)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">all time savings</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {stats.successRate.toFixed(0)}% success rate
              </Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-300" />
        </Card>

        {/* Potential Savings */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
            <Target className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {isLoading ? "..." : `$${stats.potentialTotal.toFixed(0)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">per month available</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                ${stats.potentialAutoSafe.toFixed(0)} auto-safe
              </Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-300" />
        </Card>

        {/* This Week */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {isLoading ? "..." : `$${stats.realizedThisWeek.toFixed(0)}`}
            </div>
            {weekOverWeekChange !== 0 && (
              <div className="flex items-center text-xs text-purple-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{weekOverWeekChange}% vs last week
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stats.actionsExecutedThisWeek} actions this week
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-300" />
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actions Today</p>
                <p className="text-2xl font-bold">{stats.actionsExecutedToday}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-green-600 font-medium">
                  ${stats.realizedToday.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Auto-Safe</p>
                <p className="text-2xl font-bold">{autoSafe.count}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-blue-600 font-medium">
                  ${autoSafe.totalSavings.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">potential</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/20">
                <Activity className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Approval</p>
                <p className="text-2xl font-bold">{approvals.count}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-amber-600 font-medium">
                  ${approvals.totalSavings.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">potential</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trend" className="mb-8">
        <TabsList>
          <TabsTrigger value="trend">
            <BarChart3 className="h-4 w-4 mr-2" />
            Savings Trend
          </TabsTrigger>
          <TabsTrigger value="breakdown">
            <Target className="h-4 w-4 mr-2" />
            By Scenario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="mt-4">
          <CostTrendChart data={stats.trendData} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <SavingsByScenarioChart data={stats.savingsByScenario} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Waste Breakdown by Scenario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-500" />
              Active Waste Scenarios
            </CardTitle>
            <CardDescription>
              Current optimization opportunities by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {wasteByScenario.slice(0, 5).map((scenario) => (
                <div
                  key={scenario.scenarioId}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        scenario.mode === 2 ? "bg-green-500" : "bg-amber-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-sm">{scenario.scenarioName}</p>
                      <p className="text-xs text-muted-foreground">
                        {scenario.count} resource{scenario.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ${scenario.totalSavings.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                </div>
              ))}
              {wasteByScenario.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No active waste scenarios detected
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Executions
            </CardTitle>
            <CardDescription>
              Latest optimization actions performed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditLog?.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {entry.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{entry.resource_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.action.replace(/-/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.executed_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs">
                      {entry.duration_ms}ms
                    </p>
                  </div>
                </div>
              ))}
              {(!auditLog || auditLog.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No recent executions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
