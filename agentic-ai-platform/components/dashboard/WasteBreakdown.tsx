"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Server,
  Plug,
  HardDrive,
  Camera,
  Database,
  Zap,
  Activity,
  Code,
  Archive,
  FileText,
  Ghost,
  TrendingUp,
  GitBranch,
  Play,
  Moon,
  AlertCircle,
  Search,
  CheckCircle2,
} from "lucide-react"
import type { ReactNode } from "react"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getScenarioIcon(scenarioId: string): ReactNode {
  const iconClass = "h-6 w-6"
  const icons: Record<string, ReactNode> = {
    idle_instance: <Server className={iconClass} />,
    orphaned_eip: <Plug className={iconClass} />,
    unattached_volume: <HardDrive className={iconClass} />,
    old_snapshot: <Camera className={iconClass} />,
    idle_rds: <Database className={iconClass} />,
    idle_cache: <Zap className={iconClass} />,
    idle_load_balancer: <Activity className={iconClass} />,
    over_provisioned_lambda: <Code className={iconClass} />,
    s3_no_lifecycle: <Archive className={iconClass} />,
    log_no_retention: <FileText className={iconClass} />,
    forgotten_preview: <Ghost className={iconClass} />,
    over_provisioned_asg: <TrendingUp className={iconClass} />,
    stale_feature_env: <GitBranch className={iconClass} />,
    idle_ci_runner: <Play className={iconClass} />,
    off_hours_dev: <Moon className={iconClass} />,
  }
  return icons[scenarioId] || <AlertCircle className={iconClass} />
}

function getScenarioDescription(scenarioId: string): string {
  const descriptions: Record<string, string> = {
    idle_instance: "EC2 instances with low CPU utilization (<5%) for extended periods",
    orphaned_eip: "Elastic IP addresses not associated with any running resources",
    unattached_volume: "EBS volumes that are not attached to any EC2 instances",
    old_snapshot: "EBS snapshots older than 90 days that may no longer be needed",
    idle_rds: "RDS databases with very low CPU usage (<5%) and minimal connections",
    idle_cache: "ElastiCache clusters with low utilization (<5% CPU, <5 connections)",
    idle_load_balancer: "Load balancers receiving less than 1 request per second",
    over_provisioned_lambda: "Lambda functions using less than 50% of allocated memory",
    s3_no_lifecycle: "S3 buckets storing data in Standard tier without lifecycle policies",
    log_no_retention: "CloudWatch log groups without retention policies accumulating data",
    forgotten_preview: "Preview environments with idle instances that should be cleaned up",
    over_provisioned_asg: "Auto Scaling Groups with more capacity than utilization requires",
    stale_feature_env: "Feature branch environments older than 7 days with low usage",
    idle_ci_runner: "CI/CD runner instances that have completed their jobs",
    off_hours_dev: "Development instances running during weekends or off-hours",
  }
  return descriptions[scenarioId] || "Optimization opportunity detected"
}

function getModeLabel(mode: number): { label: string; variant: "default" | "secondary" | "outline" } | null {
  // Only show badge for actionable modes, not for monitoring
  switch (mode) {
    case 2:
      return { label: "Auto-Safe", variant: "default" }
    case 3:
      return { label: "Approval", variant: "secondary" }
    default:
      return null // No badge for monitor-only scenarios
  }
}

export interface ScenarioData {
  scenarioId: string
  scenarioName: string
  mode: number
  count: number
  totalSavings: number
}

interface WasteBreakdownProps {
  scenarios: ScenarioData[]
  isLoading: boolean
}

export function WasteBreakdown({ scenarios, isLoading }: WasteBreakdownProps) {
  if (isLoading) {
    return (
      <Card className="h-full border-2">
        <CardHeader>
          <CardTitle className="text-xl">Pending Recommendations</CardTitle>
          <CardDescription className="text-base">Recommendations awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded-lg" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!scenarios || scenarios.length === 0) {
    return (
      <Card className="h-full border-2">
        <CardHeader>
          <CardTitle className="text-xl">Pending Recommendations</CardTitle>
          <CardDescription className="text-base">Recommendations awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center mb-5 shadow-md text-green-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <p className="font-semibold text-lg">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-2">
              No pending recommendations. Check Approvals page to generate new ones.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const [expanded, setExpanded] = useState(false)
  const totalSavings = scenarios.reduce((sum, s) => sum + s.totalSavings, 0)
  const maxCount = scenarios.length > 0 ? Math.max(...scenarios.map((s) => s.count)) : 1
  const displayedScenarios = expanded ? scenarios : scenarios.slice(0, 6)

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">Pending Recommendations</CardTitle>
        <CardDescription className="text-base mt-1">
          {scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""} pending approval • {formatCurrency(totalSavings)}/mo potential savings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayedScenarios.map((scenario) => {
          const modeLabel = getModeLabel(scenario.mode)
          const barWidth = (scenario.count / maxCount) * 100

          return (
            <div key={scenario.scenarioId} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                    {getScenarioIcon(scenario.scenarioId)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{scenario.scenarioName}</span>
                      {modeLabel && (
                        <Badge variant={modeLabel.variant} className="text-xs shadow-sm">
                          {modeLabel.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {getScenarioDescription(scenario.scenarioId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-muted-foreground/80 whitespace-nowrap">
                    {scenario.count} {scenario.count === 1 ? "resource" : "resources"}
                  </span>
                  <span className="text-base font-semibold text-foreground whitespace-nowrap">
                    {formatCurrency(scenario.totalSavings)}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    scenario.mode === 2 
                      ? "bg-primary/60" 
                      : scenario.mode === 3
                      ? "bg-primary/40"
                      : "bg-muted-foreground/30"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )
        })}
        {scenarios.length > 6 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-sm text-muted-foreground hover:text-foreground font-medium py-2 rounded-lg hover:bg-muted/50 transition-colors duration-200"
          >
            +{scenarios.length - 6} more scenarios
          </button>
        )}
        {expanded && scenarios.length > 6 && (
          <button
            onClick={() => setExpanded(false)}
            className="w-full text-sm text-muted-foreground hover:text-foreground font-medium py-2 rounded-lg hover:bg-muted/50 transition-colors duration-200"
          >
            Show less
          </button>
        )}
      </CardContent>
    </Card>
  )
}

interface AuditLogEntry {
  id: string
  action: string
  resource_type: string
  resource_id: string
  resource_name: string
  scenario_id: string
  success: boolean
  message: string
  executed_at: string
  duration_ms: number
}

interface RecentActivityProps {
  auditLog?: AuditLogEntry[]
  isLoading?: boolean
}

function getActionIcon(action: string): ReactNode {
  const iconClass = "h-5 w-5"
  const icons: Record<string, ReactNode> = {
    terminate_instance: <Server className={iconClass} />,
    stop_instance: <Server className={iconClass} />,
    release_eip: <Plug className={iconClass} />,
    delete_volume: <HardDrive className={iconClass} />,
    delete_snapshot: <Camera className={iconClass} />,
    add_lifecycle_policy: <Archive className={iconClass} />,
    set_retention: <FileText className={iconClass} />,
    terminate_asg: <TrendingUp className={iconClass} />,
    scale_down_asg: <TrendingUp className={iconClass} />,
  }
  return icons[action] || <Zap className={iconClass} />
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function RecentActivity({ auditLog, isLoading }: RecentActivityProps) {
  if (isLoading) {
    return (
      <Card className="h-full border-2 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
          <CardDescription className="text-base mt-1">Latest optimization actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!auditLog || auditLog.length === 0) {
    return (
      <Card className="h-full border-2 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
          <CardDescription className="text-base mt-1">Latest optimization actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No actions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Execute optimization actions to see activity here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-2 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
        <CardDescription className="text-base mt-1">Latest optimization actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {auditLog.slice(0, 5).map((entry) => (
            <ActivityItem
              key={entry.id}
              icon={getActionIcon(entry.action)}
              title={entry.resource_name}
              description={entry.message}
              time={formatTimeAgo(entry.executed_at)}
              color={entry.success ? "green" : "rose"}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityItem({
  icon,
  title,
  description,
  time,
  color = "blue",
}: {
  icon: ReactNode
  title: string
  description: string
  time: string
  color?: "blue" | "amber" | "rose" | "purple" | "green"
}) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-600",
    amber: "bg-amber-500/10 text-amber-600",
    rose: "bg-rose-500/10 text-rose-600",
    purple: "bg-purple-500/10 text-purple-600",
    green: "bg-green-500/10 text-green-600",
  }

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl hover:bg-muted/60 transition-all duration-200 border border-transparent hover:border-border/50 cursor-pointer group">
      <div className={`h-11 w-11 rounded-xl ${colorMap[color]} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{description}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">{time}</span>
    </div>
  )
}
