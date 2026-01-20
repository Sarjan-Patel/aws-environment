"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Zap, CheckCircle2, AlertCircle, Play, Loader2, History, RefreshCw, Server, HardDrive, Database, Globe, Layers, FileText, Box, ChevronLeft, ChevronRight, PlayCircle, Settings2 } from "lucide-react"
import { useAutoSafeDetections, WasteDetection, useRefreshDetection, useDriftTick } from "@/hooks/useWasteDetection"
import { useExecuteAction, useExecutionStats, useAuditLog, AuditLogEntry } from "@/hooks/useActionExecution"
import { useExecutionMode } from "@/hooks/useExecutionMode"
import { Switch } from "@/components/ui/switch"
import { WASTE_SCENARIOS } from "@/lib/agent/scenarios"
import { Calendar, TrendingUp, DollarSign } from "lucide-react"

// Force dynamic rendering to avoid build-time errors during static generation
export const dynamic = 'force-dynamic'

// Service categories for filtering
const SERVICE_CATEGORIES = {
  all: { label: "All Services", icon: Layers },
  instances: { label: "EC2", icon: Server },
  autoscaling_groups: { label: "Auto Scaling", icon: Layers },
  volumes: { label: "EBS Volumes", icon: HardDrive },
  snapshots: { label: "Snapshots", icon: Database },
  elastic_ips: { label: "Elastic IPs", icon: Globe },
  s3_buckets: { label: "S3", icon: Box },
  log_groups: { label: "CloudWatch", icon: FileText },
} as const

type ServiceCategory = keyof typeof SERVICE_CATEGORIES

const ITEMS_PER_PAGE = 10

export default function AutoSafePage() {
  const { data: autoSafe, totalSavings, isLoading } = useAutoSafeDetections()
  const { stats: executionStats, isLoading: statsLoading } = useExecutionStats()
  const { data: auditLog } = useAuditLog(50) // Fetch more for pagination
  const executeAction = useExecuteAction()
  const refreshDetection = useRefreshDetection()
  const driftTick = useDriftTick()
  const { mode, isAutomated, setMode, isUpdating: modeUpdating, isMounted } = useExecutionMode()

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    detection: WasteDetection | null
  }>({ open: false, detection: null })

  const [executeAllDialog, setExecuteAllDialog] = useState<{
    open: boolean
    service: ServiceCategory
    detections: WasteDetection[]
  }>({ open: false, service: "all", detections: [] })

  const [executingId, setExecutingId] = useState<string | null>(null)
  const [executingAll, setExecutingAll] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceCategory>("all")

  // Pagination state
  const [actionsPage, setActionsPage] = useState(1)
  const [activityPage, setActivityPage] = useState(1)

  // Group detections by service type
  const serviceGroups = (autoSafe ?? []).reduce((acc, detection) => {
    const type = detection.resourceType as string
    if (!acc[type]) acc[type] = []
    acc[type].push(detection)
    return acc
  }, {} as Record<string, WasteDetection[]>)

  // Get services that have detections
  const availableServices = Object.keys(serviceGroups).filter(
    (key) => key in SERVICE_CATEGORIES
  ) as ServiceCategory[]

  // Filter detections based on selected service
  const filteredDetections = selectedService === "all"
    ? autoSafe ?? []
    : (autoSafe ?? []).filter((d) => d.resourceType === selectedService)

  // Calculate filtered savings
  const filteredSavings = filteredDetections.reduce((sum, d) => sum + d.potentialSavings, 0)

  // Paginate pending actions
  const totalActionsPages = Math.ceil(filteredDetections.length / ITEMS_PER_PAGE)
  const paginatedDetections = filteredDetections.slice(
    (actionsPage - 1) * ITEMS_PER_PAGE,
    actionsPage * ITEMS_PER_PAGE
  )

  // Paginate audit log
  const totalActivityPages = Math.ceil((auditLog?.length ?? 0) / ITEMS_PER_PAGE)
  const paginatedAuditLog = (auditLog ?? []).slice(
    (activityPage - 1) * ITEMS_PER_PAGE,
    activityPage * ITEMS_PER_PAGE
  )

  // Reset page when service changes
  const handleServiceChange = (service: ServiceCategory) => {
    setSelectedService(service)
    setActionsPage(1)
  }

  // Debug logging for page render
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12)
  console.log(`[${timestamp}] [AutoSafePage] Rendered - isLoading: ${isLoading}, autoSafe count: ${autoSafe?.length ?? 0}, mode: ${mode}, isMounted: ${isMounted}`)

  // Handle mode change - when switching to automated, execute all pending actions
  const handleModeChange = async (checked: boolean) => {
    const newMode = checked ? "automated" : "manual"
    console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] ========== MODE TOGGLE ==========`)
    console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] Switching mode: ${mode} -> ${newMode}`)
    console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] Pending auto-safe actions: ${autoSafe?.length ?? 0}`)

    try {
      // First, update the mode setting
      await setMode(newMode)
      console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] Mode updated successfully`)

      // If switching to automated AND there are pending actions, trigger drift-tick to execute them
      if (newMode === "automated" && autoSafe && autoSafe.length > 0) {
        console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] Auto-executing ${autoSafe.length} pending actions...`)

        // Trigger drift-tick with autoExecute=true to force execution
        const result = await driftTick.mutateAsync({ autoExecute: true })

        console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] Drift-tick complete:`)
        console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage]   - Executed: ${result.execution.executed}`)
        console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage]   - Success: ${result.execution.success}`)
        console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage]   - Failed: ${result.execution.failed}`)

        // Force refresh detection with cache bypass to ensure UI shows updated data
        // This is necessary because the in-memory cache may not be shared across serverless instances
        if (result.execution.executed > 0) {
          console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] Forcing detection refresh (bypassing server cache)...`)
          await refreshDetection.mutateAsync()
          console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] Detection refreshed`)
        }
      } else if (newMode === "automated") {
        console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] No pending actions to execute`)
      } else {
        console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] Switched to manual mode, no auto-execution`)
      }
    } catch (error) {
      console.error(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] Error during mode change:`, error)
    }

    console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}] [AutoSafePage] ========== MODE TOGGLE COMPLETE ==========`)
  }

  const handleExecute = async (detection: WasteDetection) => {
    const startTime = performance.now()
    console.log(`[AutoSafePage] ========== EXECUTING ACTION ==========`)
    console.log(`[AutoSafePage] Detection ID: ${detection.id}`)
    console.log(`[AutoSafePage] Resource: ${detection.resourceName} (${detection.resourceId})`)
    console.log(`[AutoSafePage] Scenario: ${detection.scenarioId}`)
    console.log(`[AutoSafePage] Resource Type: ${detection.resourceType}`)

    setExecutingId(detection.id)
    setConfirmDialog({ open: false, detection: null })

    try {
      const scenario = WASTE_SCENARIOS[detection.scenarioId as keyof typeof WASTE_SCENARIOS]
      console.log(`[AutoSafePage] Action to execute: ${scenario.action}`)

      const result = await executeAction.mutateAsync({
        action: scenario.action,
        resourceType: scenario.resourceType,
        resourceId: detection.resourceId,
        resourceName: detection.resourceName,
        detectionId: detection.id,
        scenarioId: detection.scenarioId,
        details: detection.details,
      })

      const duration = performance.now() - startTime
      console.log(`[AutoSafePage] ✅ Action executed successfully in ${duration.toFixed(0)}ms`)
      console.log(`[AutoSafePage] Result:`, result)

      // Refresh detection to update savings (bypass server cache)
      console.log(`[AutoSafePage] Refreshing detection data...`)
      await refreshDetection.mutateAsync()

      console.log(`[AutoSafePage] ======================================`)
    } catch (error) {
      const duration = performance.now() - startTime
      console.error(`[AutoSafePage] ❌ Action failed after ${duration.toFixed(0)}ms:`, error)
      console.log(`[AutoSafePage] ======================================`)
    } finally {
      setExecutingId(null)
    }
  }

  const handleExecuteAll = async (detections: WasteDetection[]) => {
    setExecuteAllDialog({ open: false, service: "all", detections: [] })
    setExecutingAll(true)

    console.log(`[AutoSafePage] ========== EXECUTING ALL (${detections.length} actions) ==========`)
    const startTime = performance.now()
    let successCount = 0
    let failCount = 0

    for (const detection of detections) {
      try {
        console.log(`[AutoSafePage] Executing ${successCount + failCount + 1}/${detections.length}: ${detection.resourceName}`)
        setExecutingId(detection.id)

        const scenario = WASTE_SCENARIOS[detection.scenarioId as keyof typeof WASTE_SCENARIOS]
        await executeAction.mutateAsync({
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
        console.error(`[AutoSafePage] ❌ Failed to execute ${detection.resourceName}:`, error)
        failCount++
      }
    }

    setExecutingId(null)
    setExecutingAll(false)

    const duration = performance.now() - startTime
    console.log(`[AutoSafePage] ✅ Execute All completed in ${duration.toFixed(0)}ms - Success: ${successCount}, Failed: ${failCount}`)

    // Refresh detection to update savings
    console.log(`[AutoSafePage] Refreshing detection data...`)
    await refreshDetection.mutateAsync()

    console.log(`[AutoSafePage] ======================================`)
  }

  const openConfirmDialog = (detection: WasteDetection) => {
    console.log(`[AutoSafePage] Opening confirm dialog for: ${detection.resourceName}`)
    setConfirmDialog({ open: true, detection })
  }

  const openExecuteAllDialog = (service: ServiceCategory) => {
    const detections = service === "all"
      ? autoSafe ?? []
      : (autoSafe ?? []).filter((d) => d.resourceType === service)
    console.log(`[AutoSafePage] Opening execute all dialog for: ${service} (${detections.length} actions)`)
    setExecuteAllDialog({ open: true, service, detections })
  }

  const getActionDescription = (detection: WasteDetection): string => {
    const scenario = WASTE_SCENARIOS[detection.scenarioId as keyof typeof WASTE_SCENARIOS]
    switch (scenario?.action) {
      case "terminate_instance":
        return "terminate this instance"
      case "stop_instance":
        return "stop this instance"
      case "terminate_asg":
        return "terminate this auto scaling group"
      case "scale_down_asg":
        return "scale down this auto scaling group"
      case "release_eip":
        return "release this Elastic IP"
      case "delete_volume":
        return "delete this EBS volume"
      case "delete_snapshot":
        return "delete this snapshot"
      case "add_lifecycle_policy":
        return "add a lifecycle policy to this bucket"
      case "set_retention":
        return "set a 30-day retention policy"
      default:
        return "execute this optimization"
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />

      <main className="flex-1 container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Auto-Safe Actions</h1>
            <p className="text-muted-foreground mt-2">
              Safe optimizations that can be executed automatically without risk
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Execution Mode Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Execution Mode</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${!isMounted ? "text-muted-foreground" : !isAutomated ? "font-medium" : "text-muted-foreground"}`}>
                  Manual
                </span>
                <Switch
                  checked={isMounted && isAutomated}
                  onCheckedChange={handleModeChange}
                  disabled={modeUpdating || !isMounted || driftTick.isPending}
                />
                <span className={`text-sm ${!isMounted ? "text-muted-foreground" : isAutomated ? "font-medium text-green-600" : "text-muted-foreground"}`}>
                  Automated
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                // Run drift-tick (will execute actions if in automated mode)
                const result = await driftTick.mutateAsync()
                // Force fresh detection with cache bypass to ensure UI shows latest data
                if (result.execution.executed > 0) {
                  await refreshDetection.mutateAsync()
                }
              }}
              disabled={isLoading || driftTick.isPending || refreshDetection.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || driftTick.isPending || refreshDetection.isPending) ? "animate-spin" : ""}`} />
              {driftTick.isPending || refreshDetection.isPending ? (isMounted && isAutomated ? "Running..." : "Scanning...") : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Automated Mode Banner */}
        {isMounted && isAutomated && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-green-800 dark:text-green-200">
                Automated Mode Active
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Actions will be automatically executed when new waste is detected during scheduled drift-tick runs.
                Resources set to &ldquo;Auto-Safe&rdquo; policy will be optimized without manual intervention.
              </p>
            </div>
            <Badge className="bg-green-600 text-white">Auto</Badge>
          </div>
        )}

      {/* Stats Cards - Row 1: Current Actions */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ready Actions</CardTitle>
            <Zap className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? "..." : filteredDetections.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedService === "all" ? "can be auto-executed" : `${SERVICE_CATEGORIES[selectedService].label} optimizations`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {isLoading ? "..." : `$${filteredSavings.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedService === "all" ? "per month (all services)" : `per month (${SERVICE_CATEGORIES[selectedService].label})`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Savings Realized</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {statsLoading ? "..." : `$${executionStats.totalSavingsRealized.toFixed(0)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">total saved to date</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Row 2: Execution Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
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
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Filter Tabs */}
      {!isLoading && autoSafe && autoSafe.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
          {/* All Services Tab */}
          <ServiceTab
            category="all"
            count={autoSafe.length}
            isSelected={selectedService === "all"}
            onClick={() => handleServiceChange("all")}
          />
          {/* Individual Service Tabs */}
          {availableServices.map((service) => (
            <ServiceTab
              key={service}
              category={service}
              count={serviceGroups[service]?.length ?? 0}
              isSelected={selectedService === service}
              onClick={() => handleServiceChange(service)}
            />
          ))}
        </div>
      )}

      {/* Auto-Safe Actions List */}
      {!isLoading && autoSafe && autoSafe.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Actions</CardTitle>
                <CardDescription>
                  {selectedService === "all"
                    ? "These actions are safe to execute and will not impact running workloads"
                    : `Showing ${SERVICE_CATEGORIES[selectedService].label} optimizations`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {filteredDetections.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openExecuteAllDialog(selectedService)}
                    disabled={executingAll || executeAction.isPending}
                  >
                    {executingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Execute All ({filteredDetections.length})
                      </>
                    )}
                  </Button>
                )}
                {selectedService !== "all" && (
                  <Badge variant="secondary" className="text-sm">
                    {filteredDetections.length} {filteredDetections.length === 1 ? "action" : "actions"}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {paginatedDetections.map((detection) => {
              const isExecuting = executingId === detection.id
              const scenario = WASTE_SCENARIOS[detection.scenarioId as keyof typeof WASTE_SCENARIOS]

              return (
                <div
                  key={detection.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
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
                      <span>Save <span className="text-green-600 font-medium">${detection.potentialSavings.toFixed(2)}</span>/mo</span>
                      <span>Confidence: {detection.confidence}%</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isExecuting ? "secondary" : "default"}
                    onClick={() => openConfirmDialog(detection)}
                    disabled={isExecuting || executingAll || executeAction.isPending}
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
            })}

            {/* Pagination for pending actions */}
            {totalActionsPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(actionsPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(actionsPage * ITEMS_PER_PAGE, filteredDetections.length)} of {filteredDetections.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActionsPage(p => Math.max(1, p - 1))}
                    disabled={actionsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {actionsPage} of {totalActionsPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActionsPage(p => Math.min(totalActionsPages, p + 1))}
                    disabled={actionsPage === totalActionsPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {filteredDetections.length === 0 && selectedService !== "all" && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No {SERVICE_CATEGORIES[selectedService].label} optimizations available
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleServiceChange("all")}
                  className="mt-2"
                >
                  View all services
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : !isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>No Auto-Safe Actions</CardTitle>
            <CardDescription>
              All safe optimizations have been applied or none are currently available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="font-medium">All optimized!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your resources are running efficiently.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Scanning for optimization opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {auditLog && auditLog.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <CardDescription>
              Optimization actions history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paginatedAuditLog.map((entry) => (
                <AuditLogItem key={entry.id} entry={entry} />
              ))}
            </div>

            {/* Pagination for recent activity */}
            {totalActivityPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(activityPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(activityPage * ITEMS_PER_PAGE, auditLog.length)} of {auditLog.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {activityPage} of {totalActivityPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                    disabled={activityPage === totalActivityPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              onClick={() => confirmDialog.detection && handleExecute(confirmDialog.detection)}
              disabled={executeAction.isPending}
            >
              {executeAction.isPending ? (
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
        onOpenChange={(open) => setExecuteAllDialog({ open, service: "all", detections: open ? executeAllDialog.detections : [] })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Execute All Actions</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <div>
                  You are about to execute <strong>{executeAllDialog.detections.length}</strong> optimization actions
                  {executeAllDialog.service !== "all" && (
                    <> for <strong>{SERVICE_CATEGORIES[executeAllDialog.service].label}</strong></>
                  )}.
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
                  All actions will be executed sequentially in order. This may take a few moments.
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
      </main>
    </div>
  )
}

function AuditLogItem({ entry }: { entry: AuditLogEntry }) {
  const formattedTime = new Date(entry.executed_at).toLocaleString()

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg text-sm">
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
          entry.success ? "bg-green-500/10" : "bg-red-500/10"
        }`}>
          {entry.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
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
        <div>{formattedTime}</div>
        <div>{entry.duration_ms}ms</div>
      </div>
    </div>
  )
}

function ServiceTab({
  category,
  count,
  isSelected,
  onClick,
}: {
  category: ServiceCategory
  count: number
  isSelected: boolean
  onClick: () => void
}) {
  const config = SERVICE_CATEGORIES[category]
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
        whitespace-nowrap transition-all
        ${isSelected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
        }
      `}
    >
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
      <Badge
        variant={isSelected ? "secondary" : "outline"}
        className={`ml-1 text-xs ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : ""}`}
      >
        {count}
      </Badge>
    </button>
  )
}
