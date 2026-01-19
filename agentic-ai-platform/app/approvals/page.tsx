"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/ui/pagination"
import { RecommendationCard } from "@/components/approvals/RecommendationCard"
import {
  useRecommendations,
  useRecommendationSummary,
  useGenerateRecommendations,
  useApproveRecommendation,
  useRejectRecommendation,
  useSnoozeRecommendation,
  useScheduleRecommendation,
  useExecuteRecommendation,
} from "@/hooks/useRecommendations"
import { useExecuteAction } from "@/hooks/useActionExecution"
import { ActionType, ResourceType } from "@/lib/agent/scenarios"
import { useRefreshDetection } from "@/hooks/useWasteDetection"
import { Recommendation, RecommendationStatus, ImpactLevel } from "@/lib/agent/recommender"
import {
  FileCheck,
  CheckCircle,
  XCircle,
  History,
  Clock,
  RefreshCw,
  Loader2,
  Search,
  Server,
  Database,
  HardDrive,
  Cloud,
  Zap,
  Activity,
  Globe,
  Filter,
  AlarmClock,
  CalendarClock,
  Play,
  RotateCcw,
} from "lucide-react"

// Resource types for filtering
type ResourceTypeFilter = "all" | "instances" | "rds_instances" | "cache_clusters" | "load_balancers" | "lambda_functions" | "volumes" | "snapshots" | "s3_buckets" | "autoscaling_groups" | "log_groups" | "elastic_ips"

const PAGE_SIZE = 10

// Resource type configuration
const resourceTypes: { id: ResourceTypeFilter; label: string; icon: typeof Server }[] = [
  { id: "all", label: "All", icon: Filter },
  { id: "instances", label: "EC2", icon: Server },
  { id: "rds_instances", label: "RDS", icon: Database },
  { id: "cache_clusters", label: "Cache", icon: Database },
  { id: "load_balancers", label: "LB", icon: Globe },
  { id: "lambda_functions", label: "Lambda", icon: Zap },
  { id: "volumes", label: "EBS", icon: HardDrive },
  { id: "s3_buckets", label: "S3", icon: Cloud },
  { id: "autoscaling_groups", label: "ASG", icon: Activity },
  { id: "elastic_ips", label: "EIP", icon: Globe },
]

// Impact level sort order
const impactOrder: Record<ImpactLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

type TabType = "pending" | "approved" | "rejected" | "snoozed" | "scheduled" | "executed"

export default function ApprovalsPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>("pending")
  const [resourceFilter, setResourceFilter] = useState<ResourceTypeFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Fetch recommendations based on active tab
  const statusMap: Record<TabType, RecommendationStatus | RecommendationStatus[]> = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    snoozed: "snoozed",
    scheduled: "scheduled",
    executed: "executed",
  }

  const { data: recommendations, isLoading, refetch } = useRecommendations({
    status: statusMap[activeTab],
  })

  const { data: summary, refetch: refetchSummary } = useRecommendationSummary()

  // Mutations
  const generateMutation = useGenerateRecommendations()
  const approveMutation = useApproveRecommendation()
  const rejectMutation = useRejectRecommendation()
  const snoozeMutation = useSnoozeRecommendation()
  const scheduleMutation = useScheduleRecommendation()
  const executeMutation = useExecuteRecommendation()
  const executeActionMutation = useExecuteAction()
  const refreshDetection = useRefreshDetection()

  const isProcessing =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    snoozeMutation.isPending ||
    scheduleMutation.isPending ||
    executeMutation.isPending ||
    executeActionMutation.isPending

  // Map AI action names to executor action types
  const mapAIActionToExecutor = (aiAction: string, resourceType: string): ActionType | null => {
    const actionMap: Record<string, Record<string, ActionType>> = {
      instances: {
        stop: "stop_instance",
        terminate: "terminate_instance",
        rightsize: "rightsize_instance",
        downsize: "rightsize_instance",
      },
      lambda_functions: {
        rightsize: "rightsize_lambda",
        optimize: "rightsize_lambda",
        delete: "delete_lambda",
        "optimize timeout": "optimize_lambda_timeout",
        "reduce timeout": "optimize_lambda_timeout",
      },
      rds_instances: {
        stop: "stop_rds",
        downsize: "downsize_rds",
        "disable multi-az": "disable_multi_az",
        "disable multi az": "disable_multi_az",
      },
      autoscaling_groups: {
        "scale down": "scale_down_asg",
        terminate: "terminate_asg",
        "enable scaling": "enable_asg_scaling",
        "enable dynamic scaling": "enable_asg_scaling",
      },
      volumes: {
        upgrade: "upgrade_volume_type",
        "upgrade to gp3": "upgrade_volume_type",
        "convert to gp3": "upgrade_volume_type",
        delete: "delete_volume",
      },
      snapshots: {
        delete: "delete_snapshot",
        "delete orphaned": "delete_orphaned_snapshot",
      },
      load_balancers: {
        delete: "delete_lb",
        "delete empty": "delete_empty_lb",
      },
      s3_buckets: {
        "add lifecycle": "add_lifecycle_policy",
        "add version expiration": "add_version_expiration",
        "expire versions": "add_version_expiration",
      },
      elastic_ips: {
        release: "release_eip",
      },
    }

    const normalizedAction = aiAction.toLowerCase().trim()
    const resourceActions = actionMap[resourceType] || {}

    // Try exact match first
    if (resourceActions[normalizedAction]) {
      return resourceActions[normalizedAction]
    }

    // Try partial match
    for (const [key, value] of Object.entries(resourceActions)) {
      if (normalizedAction.includes(key) || key.includes(normalizedAction)) {
        return value
      }
    }

    return null
  }

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    if (!recommendations) return []

    let filtered = [...recommendations]

    // Filter by resource type
    if (resourceFilter !== "all") {
      filtered = filtered.filter((r) => r.resource_type === resourceFilter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.resource_name.toLowerCase().includes(query) ||
          r.scenario_name.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query)
      )
    }

    // Sort by impact level (critical first)
    filtered.sort((a, b) => (impactOrder[b.impact_level] || 0) - (impactOrder[a.impact_level] || 0))

    return filtered
  }, [recommendations, resourceFilter, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredRecommendations.length / PAGE_SIZE)
  const paginatedRecommendations = filteredRecommendations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [resourceFilter, searchQuery, activeTab])

  // Count recommendations by resource type (for badges)
  const resourceCounts = useMemo(() => {
    if (!recommendations) return {}
    const counts: Record<string, number> = { all: recommendations.length }
    for (const rec of recommendations) {
      counts[rec.resource_type] = (counts[rec.resource_type] || 0) + 1
    }
    return counts
  }, [recommendations])

  // Handlers
  const handleRefresh = async () => {
    console.log("[Approvals] Scanning for new recommendations...")
    try {
      // First, run detection and generate any new recommendations
      const result = await generateMutation.mutateAsync()
      console.log(`[Approvals] Generated ${result.created} new, skipped ${result.skipped} existing`)
      // Then refresh the list
      refetch()
      refetchSummary()
    } catch (err) {
      console.error("Failed to refresh:", err)
      // Still try to refresh the list even if generation failed
      refetch()
      refetchSummary()
    }
  }

  const handleApprove = async (rec: Recommendation) => {
    setProcessingId(rec.id)
    try {
      // First approve the recommendation
      await approveMutation.mutateAsync({ id: rec.id })
      // Then execute the action immediately
      console.log(`[Approvals] Approved ${rec.id}, now executing action...`)
      await executeMutation.mutateAsync({ id: rec.id })
      console.log(`[Approvals] ✅ Action executed for ${rec.resource_name}`)
      // Force refresh detection with cache bypass to ensure Dashboard shows updated data
      // This is necessary because in-memory cache may not be shared across serverless instances
      console.log(`[Approvals] Forcing detection refresh (bypassing server cache)...`)
      await refreshDetection.mutateAsync()
      console.log(`[Approvals] Detection refreshed`)
    } catch (err) {
      console.error("Failed to approve/execute:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleExecute = async (rec: Recommendation) => {
    setProcessingId(rec.id)
    try {
      console.log(`[Approvals] Executing action for ${rec.id}...`)
      await executeMutation.mutateAsync({ id: rec.id })
      console.log(`[Approvals] ✅ Action executed for ${rec.resource_name}`)
      // Force refresh detection with cache bypass to ensure Dashboard shows updated data
      console.log(`[Approvals] Forcing detection refresh (bypassing server cache)...`)
      await refreshDetection.mutateAsync()
      console.log(`[Approvals] Detection refreshed`)
    } catch (err) {
      console.error("Failed to execute:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (rec: Recommendation, reason?: string) => {
    setProcessingId(rec.id)
    try {
      await rejectMutation.mutateAsync({ id: rec.id, reason })
    } catch (err) {
      console.error("Failed to reject:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleSnooze = async (rec: Recommendation, days: number) => {
    setProcessingId(rec.id)
    try {
      await snoozeMutation.mutateAsync({ id: rec.id, days })
    } catch (err) {
      console.error("Failed to snooze:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleSchedule = async (rec: Recommendation, date: Date) => {
    setProcessingId(rec.id)
    try {
      await scheduleMutation.mutateAsync({ id: rec.id, scheduledFor: date })
    } catch (err) {
      console.error("Failed to schedule:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleExecuteAlternative = async (rec: Recommendation, aiAction: string, target?: string) => {
    setProcessingId(rec.id)
    try {
      // Map the AI action name to an executor action type
      const executorAction = mapAIActionToExecutor(aiAction, rec.resource_type)

      if (!executorAction) {
        console.error(`[Approvals] Unknown action: ${aiAction} for resource type: ${rec.resource_type}`)
        return
      }

      console.log(`[Approvals] Executing alternative action: ${aiAction} -> ${executorAction} on ${rec.resource_name}`)

      // First approve the recommendation (marks it as handled)
      await approveMutation.mutateAsync({ id: rec.id })

      // Then execute the alternative action
      await executeActionMutation.mutateAsync({
        action: executorAction,
        resourceType: rec.resource_type as ResourceType,
        resourceId: rec.resource_id,
        resourceName: rec.resource_name,
        detectionId: rec.detection_id,
        scenarioId: rec.scenario_id,
        details: {
          ...rec.details,
          alternativeAction: aiAction,
          alternativeTarget: target,
        },
      })

      console.log(`[Approvals] ✅ Alternative action executed: ${aiAction} on ${rec.resource_name}`)

      // Refresh detection cache
      console.log(`[Approvals] Forcing detection refresh...`)
      await refreshDetection.mutateAsync()
      console.log(`[Approvals] Detection refreshed`)
    } catch (err) {
      console.error("Failed to execute alternative action:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />

      <main className="flex-1 container py-8">
        <div className="flex flex-col gap-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileCheck className="h-8 w-8 text-amber-500" />
                <h1 className="text-3xl font-bold tracking-tight">Mode 3: Approvals</h1>
              </div>
              <p className="text-muted-foreground">
                Review and approve optimization recommendations requiring human oversight
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={generateMutation.isPending} variant="outline" size="sm">
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {generateMutation.isPending ? "Scanning..." : "Refresh"}
            </Button>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-2xl font-bold">{summary.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{summary.approved}</p>
                      <p className="text-xs text-muted-foreground">Approved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">{summary.rejected}</p>
                      <p className="text-xs text-muted-foreground">Rejected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlarmClock className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{summary.snoozed}</p>
                      <p className="text-xs text-muted-foreground">Snoozed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">{summary.scheduled}</p>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{summary.executed}</p>
                      <p className="text-xs text-muted-foreground">Executed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <div className="text-green-600 font-bold text-2xl">
                      ${summary.pendingSavings.toFixed(0)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Potential</p>
                      <p className="text-xs text-muted-foreground">Savings/mo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Resource Type Filter */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {resourceTypes.map((type) => {
                    const count = resourceCounts[type.id] || 0
                    const isActive = resourceFilter === type.id
                    const Icon = type.icon

                    return (
                      <Button
                        key={type.id}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setResourceFilter(type.id)}
                        className="flex items-center gap-1.5"
                      >
                        <Icon className="h-4 w-4" />
                        {type.label}
                        {count > 0 && (
                          <Badge
                            variant={isActive ? "secondary" : "outline"}
                            className="ml-1 h-5 px-1.5 text-xs"
                          >
                            {count}
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search recommendations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
                {summary && summary.pending > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {summary.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved
                {summary && summary.approved > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {summary.approved}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Rejected
                {summary && summary.rejected > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {summary.rejected}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="snoozed" className="flex items-center gap-2">
                <AlarmClock className="h-4 w-4" />
                Snoozed
                {summary && summary.snoozed > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {summary.snoozed}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Scheduled
                {summary && summary.scheduled > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {summary.scheduled}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="executed" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Executed
                {summary && summary.executed > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {summary.executed}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredRecommendations.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {activeTab === "pending" ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          {searchQuery || resourceFilter !== "all"
                            ? "No Matching Recommendations"
                            : "All Caught Up!"}
                        </>
                      ) : (
                        <>
                          <History className="h-5 w-5" />
                          No {activeTab} Recommendations
                        </>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {activeTab === "pending" && !searchQuery && resourceFilter === "all"
                        ? "No pending recommendations requiring approval."
                        : searchQuery || resourceFilter !== "all"
                          ? "Try adjusting your filters."
                          : `No ${activeTab} recommendations found.`}
                    </CardDescription>
                  </CardHeader>
                  {activeTab === "pending" && !searchQuery && resourceFilter === "all" && (
                    <CardContent>
                      <Button onClick={handleRefresh} disabled={generateMutation.isPending}>
                        {generateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {generateMutation.isPending ? "Scanning..." : "Scan for Recommendations"}
                      </Button>
                    </CardContent>
                  )}
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Pending tab shows full recommendation cards */}
                  {activeTab === "pending" ? (
                    paginatedRecommendations.map((rec) => (
                      <RecommendationCard
                        key={rec.id}
                        recommendation={rec}
                        onApprove={() => handleApprove(rec)}
                        onReject={(reason) => handleReject(rec, reason)}
                        onSnooze={(days) => handleSnooze(rec, days)}
                        onSchedule={(date) => handleSchedule(rec, date)}
                        onExecuteAlternative={(action, target) => handleExecuteAlternative(rec, action, target)}
                        isProcessing={isProcessing && processingId === rec.id}
                      />
                    ))
                  ) : activeTab === "snoozed" ? (
                    /* Snoozed tab with unsnooze action */
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {paginatedRecommendations.map((rec) => {
                            const snoozedUntil = rec.snoozed_until ? new Date(rec.snoozed_until) : null
                            const isExpired = snoozedUntil && snoozedUntil < new Date()

                            return (
                              <div
                                key={rec.id}
                                className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <AlarmClock className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                      {rec.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {rec.resource_name} &bull;{" "}
                                      {snoozedUntil ? (
                                        isExpired ? (
                                          <span className="text-red-500">Snooze expired</span>
                                        ) : (
                                          <>Until {snoozedUntil.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                                        )
                                      ) : (
                                        "Snoozed"
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="outline" className="text-xs">
                                    {rec.resource_type.replace("_", " ")}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs text-green-600">
                                    ${rec.potential_savings?.toFixed(0) || 0}/mo
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApprove(rec)}
                                    disabled={isProcessing && processingId === rec.id}
                                  >
                                    {isProcessing && processingId === rec.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <RotateCcw className="h-3 w-3 mr-1" />
                                        Unsnooze
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : activeTab === "scheduled" ? (
                    /* Scheduled tab with execute now action */
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {paginatedRecommendations.map((rec) => {
                            const scheduledFor = rec.scheduled_for ? new Date(rec.scheduled_for) : null
                            const isPast = scheduledFor && scheduledFor < new Date()

                            return (
                              <div
                                key={rec.id}
                                className="flex items-center justify-between p-3 border rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <CalendarClock className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                      {rec.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {rec.resource_name} &bull;{" "}
                                      {scheduledFor ? (
                                        isPast ? (
                                          <span className="text-amber-600">Ready to execute</span>
                                        ) : (
                                          <>Scheduled for {scheduledFor.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {scheduledFor.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>
                                        )
                                      ) : (
                                        "Scheduled"
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="outline" className="text-xs">
                                    {rec.resource_type.replace("_", " ")}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs text-green-600">
                                    ${rec.potential_savings?.toFixed(0) || 0}/mo
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleExecute(rec)}
                                    disabled={isProcessing && processingId === rec.id}
                                  >
                                    {isProcessing && processingId === rec.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3 mr-1" />
                                        Execute Now
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* History tabs show compact list */
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {paginatedRecommendations.map((rec) => (
                            <div
                              key={rec.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {activeTab === "approved" && (
                                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                )}
                                {activeTab === "rejected" && (
                                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                )}
                                {activeTab === "executed" && (
                                  <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">
                                    {rec.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {rec.resource_name} &bull; {formatDate(rec.updated_at)}
                                    {rec.rejection_reason && (
                                      <span className="italic"> - &quot;{rec.rejection_reason}&quot;</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline" className="text-xs">
                                  {rec.resource_type.replace("_", " ")}
                                </Badge>
                                <Badge
                                  variant={activeTab === "rejected" ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {activeTab === "executed"
                                    ? `Saved $${rec.potential_savings?.toFixed(0) || 0}/mo`
                                    : activeTab === "approved"
                                      ? "Ready"
                                      : "Dismissed"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Pagination */}
                  {filteredRecommendations.length > PAGE_SIZE && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      pageSize={PAGE_SIZE}
                      totalItems={filteredRecommendations.length}
                    />
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Help section */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Understanding Mode 3</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Mode 3 (Approval-Based)</strong> is for optimizations that
                require human review before execution:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Production resource changes (RDS, ASGs, Load Balancers)</li>
                <li>High-impact optimizations with significant savings</li>
                <li>Resources marked as &quot;Recommend Only&quot; in settings</li>
              </ul>
              <p className="pt-2">
                <strong>Actions:</strong> Approve to execute, Reject to dismiss,
                Snooze to delay, or Schedule for off-peak hours.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
