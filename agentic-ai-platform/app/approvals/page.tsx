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
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { useExecuteAction, useExecutionStats, useAuditLog, AuditLogEntry } from "@/hooks/useActionExecution"
import { useExecutionMode } from "@/hooks/useExecutionMode"
import { ActionType, ResourceType } from "@/lib/agent/scenarios"
import { useRefreshDetection, useAutoSafeDetections, useDriftTick, WasteDetection } from "@/hooks/useWasteDetection"
import { WASTE_SCENARIOS } from "@/lib/agent/scenarios"
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
  Sparkles,
  Settings2,
  PlayCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  DollarSign,
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

type TabType = "pending" | "auto-safe" | "approved" | "rejected" | "snoozed" | "scheduled" | "executed"

export default function ApprovalsPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>("pending")
  const [resourceFilter, setResourceFilter] = useState<ResourceTypeFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Fetch recommendations based on active tab
  const statusMap: Record<TabType, RecommendationStatus | RecommendationStatus[] | null> = {
    pending: "pending",
    "auto-safe": null, // Auto-safe uses a different data source
    approved: "approved",
    rejected: "rejected",
    snoozed: "snoozed",
    scheduled: "scheduled",
    executed: "executed",
  }

  const { data: recommendations, isLoading, refetch } = useRecommendations({
    status: statusMap[activeTab] ?? "pending", // Default to pending if null (auto-safe tab)
  })

  const { data: summary, refetch: refetchSummary } = useRecommendationSummary()

  // Auto-safe detections
  const { data: autoSafeDetections, totalSavings: autoSafeSavings, isLoading: autoSafeLoading } = useAutoSafeDetections()
  const [executingAutoSafeId, setExecutingAutoSafeId] = useState<string | null>(null)

  // Execution mode and stats (from Auto-Safe page)
  const { mode, isAutomated, setMode, isUpdating: modeUpdating, isMounted } = useExecutionMode()
  const { stats: executionStats, isLoading: statsLoading } = useExecutionStats()
  const { data: auditLog, isLoading: auditLogLoading } = useAuditLog(20)
  const driftTick = useDriftTick()

  // Dialogs state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    detection: WasteDetection | null
  }>({ open: false, detection: null })

  const [executeAllDialog, setExecuteAllDialog] = useState<{
    open: boolean
    detections: WasteDetection[]
  }>({ open: false, detections: [] })

  const [executingAll, setExecutingAll] = useState(false)

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

  // Handle auto-safe execution
  const handleExecuteAutoSafe = async (detection: WasteDetection) => {
    setExecutingAutoSafeId(detection.id)
    setConfirmDialog({ open: false, detection: null })
    try {
      const scenario = WASTE_SCENARIOS[detection.scenarioId as keyof typeof WASTE_SCENARIOS]
      if (!scenario) {
        console.error(`Unknown scenario: ${detection.scenarioId}`)
        return
      }

      await executeActionMutation.mutateAsync({
        action: scenario.action,
        resourceType: scenario.resourceType,
        resourceId: detection.resourceId,
        resourceName: detection.resourceName,
        detectionId: detection.id,
        scenarioId: detection.scenarioId,
        details: detection.details,
      })

      console.log(`[Approvals] ✅ Auto-safe action executed for ${detection.resourceName}`)
      await refreshDetection.mutateAsync()
    } catch (err) {
      console.error("Failed to execute auto-safe action:", err)
    } finally {
      setExecutingAutoSafeId(null)
    }
  }

  // Handle execution mode change
  const handleModeChange = async (checked: boolean) => {
    const newMode = checked ? "automated" : "manual"
    console.log(`[Approvals] Switching mode: ${mode} -> ${newMode}`)

    try {
      await setMode(newMode)

      // If switching to automated AND there are pending actions, trigger drift-tick
      if (newMode === "automated" && autoSafeDetections && autoSafeDetections.length > 0) {
        console.log(`[Approvals] Auto-executing ${autoSafeDetections.length} pending actions...`)
        const result = await driftTick.mutateAsync({ autoExecute: true })
        console.log(`[Approvals] Drift-tick complete: Executed ${result.execution.executed}`)

        if (result.execution.executed > 0) {
          await refreshDetection.mutateAsync()
        }
      }
    } catch (error) {
      console.error(`[Approvals] Error during mode change:`, error)
    }
  }

  // Handle execute all auto-safe actions
  const handleExecuteAll = async (detections: WasteDetection[]) => {
    setExecuteAllDialog({ open: false, detections: [] })
    setExecutingAll(true)

    console.log(`[Approvals] Executing all ${detections.length} auto-safe actions...`)
    let successCount = 0
    let failCount = 0

    for (const detection of detections) {
      try {
        setExecutingAutoSafeId(detection.id)
        const scenario = WASTE_SCENARIOS[detection.scenarioId as keyof typeof WASTE_SCENARIOS]
        if (!scenario) continue

        await executeActionMutation.mutateAsync({
          action: scenario.action,
          resourceType: scenario.resourceType,
          resourceId: detection.resourceId,
          resourceName: detection.resourceName,
          detectionId: detection.id,
          scenarioId: detection.scenarioId,
          details: detection.details,
        })
        successCount++
      } catch (error) {
        console.error(`Failed to execute ${detection.resourceName}:`, error)
        failCount++
      }
    }

    setExecutingAutoSafeId(null)
    setExecutingAll(false)
    console.log(`[Approvals] Execute All complete - Success: ${successCount}, Failed: ${failCount}`)
    await refreshDetection.mutateAsync()
  }

  // Get action description for confirmation dialog
  const getActionDescription = (detection: WasteDetection): string => {
    const scenario = WASTE_SCENARIOS[detection.scenarioId as keyof typeof WASTE_SCENARIOS]
    switch (scenario?.action) {
      case "terminate_instance": return "terminate this instance"
      case "stop_instance": return "stop this instance"
      case "terminate_asg": return "terminate this auto scaling group"
      case "scale_down_asg": return "scale down this auto scaling group"
      case "release_eip": return "release this Elastic IP"
      case "delete_volume": return "delete this EBS volume"
      case "delete_snapshot": return "delete this snapshot"
      case "add_lifecycle_policy": return "add a lifecycle policy to this bucket"
      case "set_retention": return "set a 30-day retention policy"
      default: return "execute this optimization"
    }
  }

  // Filter auto-safe detections by resource type
  const filteredAutoSafeDetections = useMemo(() => {
    if (!autoSafeDetections) return []
    if (resourceFilter === "all") return autoSafeDetections
    return autoSafeDetections.filter((d) => d.resourceType === resourceFilter)
  }, [autoSafeDetections, resourceFilter])

  // Calculate filtered auto-safe savings
  const filteredAutoSafeSavings = useMemo(() => {
    return filteredAutoSafeDetections.reduce((sum, d) => sum + d.potentialSavings, 0)
  }, [filteredAutoSafeDetections])

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
                <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
              </div>
              <p className="text-muted-foreground">
                Review and manage all optimizations in one place
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={generateMutation.isPending || driftTick.isPending} variant="outline" size="sm">
              {generateMutation.isPending || driftTick.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {generateMutation.isPending || driftTick.isPending ? "Scanning..." : "Refresh"}
            </Button>
          </div>

          {/* Automated Mode Banner - only show when on Auto-Safe tab */}
          {activeTab === "auto-safe" && isMounted && isAutomated && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-green-800 dark:text-green-200">
                  Automated Mode Active
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Auto-safe actions will be executed automatically when detected. Manual approval items still require review.
                </p>
              </div>
              <Badge className="bg-green-600 text-white">Auto</Badge>
            </div>
          )}

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <Card className={activeTab === "auto-safe" ? "ring-2 ring-primary" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-2xl font-bold">{autoSafeDetections?.length ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Auto-Safe</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

          {/* Execution Stats Row */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Today</p>
                    <p className="text-2xl font-bold">{statsLoading ? "..." : executionStats.today}</p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold">{statsLoading ? "..." : executionStats.thisWeek}</p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">{statsLoading ? "..." : executionStats.thisMonth}</p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">All Time</p>
                    <p className="text-2xl font-bold">{statsLoading ? "..." : executionStats.allTime}</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Saved</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${statsLoading ? "..." : executionStats.totalSavingsRealized.toFixed(0)}
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

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
              <TabsTrigger value="auto-safe" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Auto-Safe
                {autoSafeDetections && autoSafeDetections.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-emerald-100 text-emerald-700">
                    {autoSafeDetections.length}
                  </Badge>
                )}
              </TabsTrigger>
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

            {/* Auto-Safe Tab Content */}
            <TabsContent value="auto-safe" className="mt-4">
              {autoSafeLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !autoSafeDetections || autoSafeDetections.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      All Optimized!
                    </CardTitle>
                    <CardDescription>
                      No safe optimizations available. Your resources are running efficiently.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-emerald-500" />
                          Auto-Safe Actions
                          {resourceFilter !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              {resourceFilter.replace("_", " ")}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Safe optimizations that can be executed automatically without risk
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Execution Mode Toggle */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card">
                          <span className={`text-sm ${!isMounted ? "text-muted-foreground" : !isAutomated ? "font-medium" : "text-muted-foreground"}`}>
                            Manual
                          </span>
                          <Switch
                            checked={isMounted && isAutomated}
                            onCheckedChange={handleModeChange}
                            disabled={modeUpdating || !isMounted || driftTick.isPending}
                          />
                          <span className={`text-sm ${!isMounted ? "text-muted-foreground" : isAutomated ? "font-medium text-green-600" : "text-muted-foreground"}`}>
                            Auto
                          </span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          Save ${filteredAutoSafeSavings.toFixed(0)}/mo
                        </Badge>
                        {filteredAutoSafeDetections.length > 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setExecuteAllDialog({ open: true, detections: filteredAutoSafeDetections })}
                            disabled={executingAll || executeActionMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            {executingAll ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Executing...
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Execute All ({filteredAutoSafeDetections.length})
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {filteredAutoSafeDetections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <CheckCircle className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No {resourceFilter !== "all" ? resourceFilter.replace("_", " ") : ""} optimizations available
                        </p>
                        {resourceFilter !== "all" && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setResourceFilter("all")}
                            className="mt-2"
                          >
                            View all services
                          </Button>
                        )}
                      </div>
                    ) : (
                      filteredAutoSafeDetections.map((detection) => {
                        const isExecuting = executingAutoSafeId === detection.id
                        return (
                          <div
                            key={detection.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-emerald-50/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{detection.resourceName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {detection.region}
                                </Badge>
                                {detection.env && (
                                  <Badge variant="secondary" className="text-xs">
                                    {detection.env}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {detection.scenarioName}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>
                                  Save{" "}
                                  <span className="text-green-600 font-medium">
                                    ${detection.potentialSavings.toFixed(2)}
                                  </span>
                                  /mo
                                </span>
                                <span>Confidence: {detection.confidence}%</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={isExecuting ? "secondary" : "default"}
                              onClick={() => setConfirmDialog({ open: true, detection })}
                              disabled={isExecuting || executingAll || executeActionMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              {isExecuting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Executing...
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Execute
                                </>
                              )}
                            </Button>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab Content */}
            <TabsContent value={activeTab} className="mt-4">
              {activeTab === "auto-safe" ? null : isLoading ? (
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

          {/* Recent Activity */}
          {auditLog && auditLog.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </div>
                <CardDescription>
                  Recent optimization actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditLog.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          entry.success ? "bg-green-500/10" : "bg-red-500/10"
                        }`}>
                          {entry.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{entry.resource_name}</div>
                          <div className="text-xs text-muted-foreground">{entry.message}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{new Date(entry.executed_at).toLocaleString()}</div>
                        <div>{entry.duration_ms}ms</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help section */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Understanding Approvals</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground mb-1">Auto-Safe Actions</p>
                <p>
                  Safe optimizations that can be executed immediately without risk.
                  These include idle CI runners, orphaned resources, and log retention policies.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Pending Approvals</p>
                <p>
                  Optimizations requiring human review: production resources, high-impact changes,
                  and resources marked as &quot;Recommend Only&quot; in settings.
                </p>
              </div>
              <div className="pt-1">
                <p className="font-medium text-foreground mb-1">Available Actions</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Execute</strong> - Apply the optimization immediately</li>
                  <li><strong>Schedule</strong> - Execute during off-peak hours</li>
                  <li><strong>Snooze</strong> - Delay the recommendation</li>
                  <li><strong>Reject</strong> - Dismiss with a reason</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Single Action Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, detection: open ? confirmDialog.detection : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.detection && (
                <>
                  Are you sure you want to{" "}
                  <strong>{getActionDescription(confirmDialog.detection)}</strong>?
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="font-medium">{confirmDialog.detection.resourceName}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {confirmDialog.detection.scenarioName}
                    </div>
                    <div className="text-sm text-green-600 mt-2">
                      Potential savings: ${confirmDialog.detection.potentialSavings.toFixed(2)}/mo
                    </div>
                  </div>
                  <div className="mt-4 text-sm">
                    This action is classified as <Badge variant="secondary">Auto-Safe</Badge> and should not impact running workloads.
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.detection && handleExecuteAutoSafe(confirmDialog.detection)}
              disabled={executeActionMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {executeActionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                "Execute Action"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Execute All Confirmation Dialog */}
      <AlertDialog
        open={executeAllDialog.open}
        onOpenChange={(open) => setExecuteAllDialog({ open, detections: open ? executeAllDialog.detections : [] })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Execute All Actions</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <div>
                  You are about to execute <strong>{executeAllDialog.detections.length}</strong> optimization actions.
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">Summary:</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Total Actions:</div>
                    <div className="font-medium">{executeAllDialog.detections.length}</div>
                    <div className="text-muted-foreground">Potential Savings:</div>
                    <div className="font-medium text-green-600">
                      ${executeAllDialog.detections.reduce((sum, d) => sum + d.potentialSavings, 0).toFixed(2)}/mo
                    </div>
                  </div>
                </div>

                <div className="text-sm">
                  All actions will be executed sequentially. This may take a few moments.
                </div>

                <div className="text-sm">
                  These actions are classified as <Badge variant="secondary">Auto-Safe</Badge> and should not impact running workloads.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleExecuteAll(executeAllDialog.detections)}
              disabled={executingAll}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {executingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Execute All ({executeAllDialog.detections.length})
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
