"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getScenarioIcon(scenarioId: string): string {
  const icons: Record<string, string> = {
    idle_instance: "🖥️",
    orphaned_eip: "🔌",
    unattached_volume: "💾",
    old_snapshot: "📸",
    idle_rds: "🗄️",
    idle_cache: "⚡",
    idle_load_balancer: "⚖️",
    over_provisioned_lambda: "λ",
    s3_no_lifecycle: "🪣",
    log_no_retention: "📋",
    forgotten_preview: "👻",
    over_provisioned_asg: "📊",
    stale_feature_env: "🌿",
    idle_ci_runner: "🏃",
    off_hours_dev: "🌙",
  }
  return icons[scenarioId] || "📌"
}

function getModeLabel(mode: number): { label: string; variant: "default" | "secondary" | "outline" } {
  switch (mode) {
    case 2:
      return { label: "Auto-Safe", variant: "default" }
    case 3:
      return { label: "Approval", variant: "secondary" }
    default:
      return { label: "Monitor", variant: "outline" }
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
          <CardTitle className="text-xl">Waste by Scenario</CardTitle>
          <CardDescription className="text-base">Breakdown of detected optimization opportunities</CardDescription>
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
          <CardTitle className="text-xl">Waste by Scenario</CardTitle>
          <CardDescription className="text-base">Breakdown of detected optimization opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center mb-5 shadow-md">
              <span className="text-4xl">✨</span>
            </div>
            <p className="font-semibold text-lg">All optimized!</p>
            <p className="text-sm text-muted-foreground mt-2">
              No waste detected in your cloud resources.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalSavings = scenarios.reduce((sum, s) => sum + s.totalSavings, 0)
  const maxCount = Math.max(...scenarios.map((s) => s.count))

  return (
    <Card className="h-full border-2 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">Waste by Scenario</CardTitle>
        <CardDescription className="text-base mt-1">
          {scenarios.length} active scenarios • {formatCurrency(totalSavings)}/mo potential savings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {scenarios.slice(0, 6).map((scenario) => {
          const { label, variant } = getModeLabel(scenario.mode)
          const barWidth = (scenario.count / maxCount) * 100

          return (
            <div key={scenario.scenarioId} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-xl shadow-sm border border-border/50">
                    {getScenarioIcon(scenario.scenarioId)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{scenario.scenarioName}</span>
                      <Badge variant={variant} className="text-xs shadow-sm">
                        {label}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      {scenario.count} {scenario.count === 1 ? "resource" : "resources"}
                    </span>
                  </div>
                </div>
                <span className="text-base font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(scenario.totalSavings)}
                </span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 shadow-sm",
                    scenario.mode === 2 
                      ? "bg-gradient-to-r from-blue-500 to-blue-600" 
                      : "bg-gradient-to-r from-amber-500 to-amber-600"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )
        })}
        {scenarios.length > 6 && (
          <p className="text-sm text-muted-foreground text-center pt-2 font-medium">
            +{scenarios.length - 6} more scenarios
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function RecentActivity() {
  // This would typically come from an activity log table
  // For now, we'll show placeholder data based on waste detection

  return (
    <Card className="h-full border-2 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
        <CardDescription className="text-base mt-1">Latest optimization actions and detections</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <ActivityItem
            icon="🔍"
            title="Waste scan completed"
            description="Found optimization opportunities across your infrastructure"
            time="Just now"
            color="blue"
          />
          <ActivityItem
            icon="⚡"
            title="Lambda over-provisioning detected"
            description="Several functions using less than 50% of allocated memory"
            time="5m ago"
            color="amber"
          />
          <ActivityItem
            icon="💾"
            title="Unattached volumes found"
            description="EBS volumes not attached to any running instances"
            time="10m ago"
            color="rose"
          />
          <ActivityItem
            icon="📸"
            title="Old snapshots identified"
            description="Snapshots older than 90 days detected"
            time="15m ago"
            color="purple"
          />
          <ActivityItem
            icon="🔌"
            title="Orphaned EIPs detected"
            description="Elastic IPs not associated with any resource"
            time="20m ago"
            color="green"
          />
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
  icon: string
  title: string
  description: string
  time: string
  color?: "blue" | "amber" | "rose" | "purple" | "green"
}) {
  const colorMap = {
    blue: "bg-blue-500/10",
    amber: "bg-amber-500/10",
    rose: "bg-rose-500/10",
    purple: "bg-purple-500/10",
    green: "bg-green-500/10",
  }

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl hover:bg-muted/60 transition-all duration-200 border border-transparent hover:border-border/50 cursor-pointer group">
      <div className={`h-11 w-11 rounded-xl ${colorMap[color]} flex items-center justify-center text-xl flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
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
