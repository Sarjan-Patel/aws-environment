"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, TrendingUp, Calendar, BarChart3 } from "lucide-react"
import { useMetricsSummary, useS3UsageCosts, useResourceMetrics } from "@/hooks/useResources"

type ResourceType = "instances" | "rds" | "lambda" | "s3" | "volumes" | "load-balancers" | "cache-clusters" | "elastic-ips"

function formatCurrency(amount: number): string {
  // Check if amount has decimal places
  const hasDecimals = amount % 1 !== 0
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(amount)
}

function getServiceName(resourceType: ResourceType): string {
  const names: Record<ResourceType, string> = {
    instances: "EC2 instances",
    rds: "RDS instances",
    lambda: "Lambda functions",
    s3: "S3 buckets",
    volumes: "EBS volumes",
    "load-balancers": "Load balancers",
    "cache-clusters": "Cache clusters",
    "elastic-ips": "Elastic IPs",
  }
  return names[resourceType] || "resources"
}

interface ResourceCost {
  hourly_cost?: number | null
  storage_monthly_cost?: number | null
  monthly_cost?: number | null
  estimated_monthly_cost?: number | null
}

export function CostSummary({
  resourceType,
  resources,
}: {
  resourceType: ResourceType
  resources?: ResourceCost[]
}) {
  const { data: metrics, isLoading } = useMetricsSummary()
  const { data: s3Metrics, isLoading: s3Loading } = useS3UsageCosts()
  const { data: resourceMetrics, isLoading: resourceMetricsLoading } = useResourceMetrics(resourceType)

  console.log("[CostSummary] Component rendered", {
    resourceType,
    resourcesCount: resources?.length ?? 0,
    isLoading,
    metricsCount: metrics?.dailyMetrics?.length,
  })

  const isLoadingData = isLoading || (resourceType === "s3" && s3Loading) || (resourceType !== "instances" && resourceType !== "s3" && resourceMetricsLoading)
  
  if (isLoadingData) {
    console.log("[CostSummary] Loading state - showing skeleton")
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const serviceName = getServiceName(resourceType)

  // For EC2 instances, use metrics_daily data
  let dailyAvg = 0
  let weeklyTotal = 0
  let monthlyProjection = 0
  let currentMonthTotal = 0
  let daysOfData = 0

  if (resourceType === "instances") {
    dailyAvg = metrics?.avgDailyCost ?? 0
    weeklyTotal = dailyAvg * 7
    monthlyProjection = metrics?.estimatedMonthlyCost ?? 0
    currentMonthTotal = metrics?.totalCost ?? 0
    daysOfData = metrics?.daysOfData ?? 0
  } else if (resourceType === "s3") {
    // S3 costs come from s3_bucket_usage_daily table
    dailyAvg = s3Metrics?.avgDailyCost ?? 0
    weeklyTotal = dailyAvg * 7
    monthlyProjection = s3Metrics?.estimatedMonthlyCost ?? 0
    currentMonthTotal = s3Metrics?.totalCost ?? 0
    daysOfData = s3Metrics?.daysOfData ?? 0
  } else if (resourceMetrics && resourceMetrics.dailyMetrics.length > 0) {
    // Use actual historical data from metrics_daily if available
    dailyAvg = resourceMetrics?.avgDailyCost ?? 0
    weeklyTotal = dailyAvg * 7
    monthlyProjection = resourceMetrics?.estimatedMonthlyCost ?? 0
    currentMonthTotal = resourceMetrics?.totalCost ?? 0
    daysOfData = resourceMetrics?.daysOfData ?? 0
  } else if (resources && resources.length > 0) {
    // Calculate costs - handle different cost field names per service
    const totalMonthlyCost = resources.reduce((sum, r) => {
      // Lambda uses estimated_monthly_cost
      if (r.estimated_monthly_cost !== undefined && r.estimated_monthly_cost !== null) {
        return sum + Number(r.estimated_monthly_cost)
      }
      
      // Volumes use monthly_cost
      if (r.monthly_cost !== undefined && r.monthly_cost !== null) {
        return sum + Number(r.monthly_cost)
      }
      
      // RDS, Load Balancers, Cache Clusters, Elastic IPs use hourly_cost
      const hourly = Number(r.hourly_cost || 0)
      const storage = Number(r.storage_monthly_cost || 0)
      const hourlyTotal = hourly + (storage / 730) // Convert monthly storage to hourly
      return sum + (hourlyTotal * 730) // Convert hourly to monthly
    }, 0)

    // Calculate daily average from monthly cost
    dailyAvg = totalMonthlyCost / 30
    weeklyTotal = dailyAvg * 7
    monthlyProjection = totalMonthlyCost
    currentMonthTotal = totalMonthlyCost // Last 30 days estimate
    daysOfData = 30 // Estimated based on current costs
    
    console.log("[CostSummary] Calculated costs from resources", {
      resourceType,
      resourcesCount: resources.length,
      totalMonthlyCost,
      dailyAvg,
      weeklyTotal,
      monthlyProjection,
    })
  } else {
    // No cost data available
    return (
      <Card className="border-2 h-[140px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cost data is not available for {serviceName}. Cost calculation requires resource data.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="relative overflow-hidden border-2 card-hover group h-[140px]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily Average
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatCurrency(dailyAvg)}</div>
          <p className="text-xs text-muted-foreground">
            {serviceName} • {daysOfData} days {resourceType === "instances" ? "of historical data" : "estimate"}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-2 card-hover group h-[140px]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Weekly Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatCurrency(weeklyTotal)}</div>
          <p className="text-xs text-muted-foreground">{serviceName} • 7-day projection</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-2 card-hover group h-[140px]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Monthly Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1 text-green-600 dark:text-green-400">
            {formatCurrency(monthlyProjection)}
          </div>
          <p className="text-xs text-muted-foreground">{serviceName} • Monthly estimate</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-2 card-hover group h-[140px]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Current Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatCurrency(currentMonthTotal)}</div>
          <p className="text-xs text-muted-foreground">{serviceName} • Last 30 days total</p>
        </CardContent>
      </Card>
    </div>
  )
}

