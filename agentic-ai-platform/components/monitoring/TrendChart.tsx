"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { useMetricsSummary, useS3UsageCosts, useResourceMetrics } from "@/hooks/useResources"
import { TrendingUp, Activity } from "lucide-react"

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

type ResourceType = "instances" | "rds" | "lambda" | "s3" | "volumes" | "load-balancers" | "cache-clusters" | "elastic-ips"

function formatDate(dateString: string): string {
  // Handle date string (could be YYYY-MM-DD format from database)
  const date = new Date(dateString + "T00:00:00") // Add time to avoid timezone issues
  if (isNaN(date.getTime())) {
    console.warn("[formatDate] Invalid date string:", dateString)
    return dateString
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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

function generateTrendData(baseValue: number, days: number = 30, addVariance: boolean = false): Array<{ date: string; value: number; rawDate: string }> {
  const data: Array<{ date: string; value: number; rawDate: string }> = []
  const today = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    
    // Only add variance if explicitly requested (for constant costs, use exact value)
    let value = baseValue
    if (addVariance) {
      const variance = 0.95 + Math.random() * 0.1 // 0.95 to 1.05
      value = baseValue * variance
    }
    
    // Round to 2 decimal places for display
    data.push({
      date: formatDate(dateStr),
      value: Number(value.toFixed(2)),
      rawDate: dateStr,
    })
  }
  
  return data
}

export function CostTrendChart({ 
  resourceType,
  resources,
}: { 
  resourceType: ResourceType
  resources?: ResourceCost[]
}) {
  const { data: metrics, isLoading } = useMetricsSummary()
  const { data: s3Metrics, isLoading: s3Loading } = useS3UsageCosts()
  const { data: resourceMetrics, isLoading: resourceMetricsLoading } = useResourceMetrics(resourceType)

  console.log("[CostTrendChart] Component rendered", { 
    resourceType,
    resourcesCount: resources?.length ?? 0,
    isLoading, 
    s3Loading,
    metricsCount: metrics?.dailyMetrics?.length,
    s3MetricsCount: s3Metrics?.dailyMetrics?.length,
  })

  const isLoadingData = isLoading || (resourceType === "s3" && s3Loading) || (resourceType !== "instances" && resourceType !== "s3" && resourceMetricsLoading)
  
  if (isLoadingData) {
    console.log("[CostTrendChart] Loading state - showing skeleton")
    return (
      <Card className="border-2 min-h-[400px]">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="min-h-[300px]">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Calculate date range for last 30 days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0]

  let chartData: Array<{ date: string; cost: number; rawDate: string }> = []

  if (resourceType === "instances") {
    // Use metrics_daily for EC2 instances
    const costByDate = new Map<string, number>()
    metrics?.dailyMetrics?.forEach((m: any) => {
      const date = m.date
      // Filter to only last 30 days
      if (date >= thirtyDaysAgoStr) {
        const cost = Number(m.estimated_daily_cost || 0)
        const current = costByDate.get(date) || 0
        costByDate.set(date, current + cost)
      }
    })

    chartData = Array.from(costByDate.entries())
      .map(([date, cost]) => ({
        date: formatDate(date),
        cost: Number(cost.toFixed(2)),
        rawDate: date,
      }))
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
  } else if (resourceType === "s3") {
    // Use s3_bucket_usage_daily for S3 buckets
    const costByDate = new Map<string, number>()
    s3Metrics?.dailyMetrics?.forEach((m: any) => {
      const date = m.date
      // Filter to only last 30 days
      if (date >= thirtyDaysAgoStr) {
        const cost = Number(m.estimated_daily_cost || 0)
        const current = costByDate.get(date) || 0
        costByDate.set(date, current + cost)
      }
    })

    chartData = Array.from(costByDate.entries())
      .map(([date, cost]) => ({
        date: formatDate(date),
        cost: Number(cost.toFixed(2)),
        rawDate: date,
      }))
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
  } else if (resourceMetrics && resourceMetrics.dailyMetrics.length > 0) {
    // Use actual historical data from metrics_daily if available
    // Filter to only last 30 days
    chartData = resourceMetrics.dailyMetrics
      .filter((m: any) => m.date >= thirtyDaysAgoStr)
      .map((m: any) => ({
        date: formatDate(m.date),
        cost: Number(m.estimated_daily_cost.toFixed(2)),
        rawDate: m.date,
      }))
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
  } else if (resources && resources.length > 0) {
    // Fallback: Calculate daily cost - handle different cost field names per service
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
    
    const dailyCost = totalMonthlyCost / 30
    
    // Generate 30 days of trend data from current cost (straight line for constant costs)
    const trendData = generateTrendData(dailyCost, 30, false)
    chartData = trendData.map((d) => ({ date: d.date, cost: d.value, rawDate: d.rawDate }))
  }

  console.log("[CostTrendChart] Chart data prepared", {
    resourceType,
    dataPoints: chartData.length,
    totalCost: chartData.reduce((sum, d) => sum + d.cost, 0),
    dateRange: chartData.length > 0 ? { first: chartData[0].date, last: chartData[chartData.length - 1].date } : null,
  })

  return (
    <Card className="border-2 min-h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Cost Trend (30 Days)
        </CardTitle>
        <CardDescription>
          {resourceType === "instances"
            ? `Daily ${getServiceName(resourceType)} costs from actual historical data (metrics_daily table, last 30 days)`
            : resourceType === "s3"
            ? `Daily ${getServiceName(resourceType)} costs from actual historical data (s3_bucket_usage_daily table, last 30 days)`
            : resourceMetrics && resourceMetrics.dailyMetrics.length > 0
            ? `Daily ${getServiceName(resourceType)} costs from actual historical data (metrics_daily table, last 30 days)`
            : `Daily ${getServiceName(resourceType)} costs estimated as constant from current rates (no historical data available)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[300px]">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No cost data available for the last 30 days</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={Math.max(0, Math.floor((chartData.length - 1) / 8))}
                minTickGap={20}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(value) => `$${value}`}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  padding: "0.5rem",
                }}
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
                name="Daily Cost"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

interface ResourceUtilization {
  // EC2
  current_cpu?: number | null
  current_memory?: number | null
  // RDS & Cache
  avg_cpu_7d?: number | null
  avg_connections_7d?: number | null
  // Lambda
  avg_memory_used_mb_7d?: number | null
  memory_mb?: number
  // Load Balancers
  avg_request_count_7d?: number | null
}

export function UtilizationTrendChart({ 
  resourceType,
  resources,
}: { 
  resourceType: ResourceType
  resources?: ResourceUtilization[]
}) {
  const { data: metrics, isLoading } = useMetricsSummary()

  console.log("[UtilizationTrendChart] Component rendered", { 
    resourceType,
    resourcesCount: resources?.length ?? 0,
    isLoading, 
    metricsCount: metrics?.dailyMetrics?.length 
  })

  if (isLoading) {
    console.log("[UtilizationTrendChart] Loading state - showing skeleton")
    return (
      <Card className="border-2 min-h-[400px]">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="min-h-[300px]">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Calculate date range for last 30 days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0]

  let chartData: Array<{ date: string; cpu: number; memory: number; rawDate: string }> = []
  let hasData = false

  if (resourceType === "instances") {
    // Use metrics_daily for EC2 instances
    const utilByDate = new Map<string, { cpuValues: number[]; memoryValues: number[] }>()

    metrics?.dailyMetrics?.forEach((m: any) => {
      const payload = m.metric_payload || {}
      const date = m.date
      // Filter to only last 30 days
      if (date >= thirtyDaysAgoStr) {
        const cpu = Number(payload.cpu_avg || 0)
        const memory = Number(payload.memory_avg || 0)

        const current = utilByDate.get(date) || { cpuValues: [], memoryValues: [] }
        if (cpu > 0) current.cpuValues.push(cpu)
        if (memory > 0) current.memoryValues.push(memory)
        utilByDate.set(date, current)
      }
    })

    chartData = Array.from(utilByDate.entries())
      .map(([date, data]) => {
        const avgCpu = data.cpuValues.length > 0 ? data.cpuValues.reduce((a, b) => a + b, 0) / data.cpuValues.length : 0
        const avgMemory = data.memoryValues.length > 0 ? data.memoryValues.reduce((a, b) => a + b, 0) / data.memoryValues.length : 0

        return {
          date: formatDate(date),
          cpu: Number(avgCpu.toFixed(1)),
          memory: Number(avgMemory.toFixed(1)),
          rawDate: date,
        }
      })
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
    
    hasData = chartData.length > 0
  } else if (resources && resources.length > 0) {
    // Calculate average utilization from current resource data
    let avgCpu = 0
    let avgMemory = 0
    
    if (resourceType === "rds" || resourceType === "cache-clusters") {
      const cpuValues = resources
        .map((r) => r.avg_cpu_7d)
        .filter((c): c is number => c !== null)
      avgCpu = cpuValues.length > 0 ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : 0
      hasData = avgCpu > 0
    } else if (resourceType === "lambda") {
      const memoryUsage = resources
        .map((r) => {
          const used = r.avg_memory_used_mb_7d || 0
          const total = r.memory_mb || 1
          return total > 0 ? (used / total) * 100 : 0
        })
        .filter((m): m is number => m > 0)
      avgMemory = memoryUsage.length > 0 ? memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length : 0
      hasData = avgMemory > 0
    } else if (resourceType === "load-balancers") {
      // Load balancers don't have CPU/Memory, use request count as a metric (normalized to 0-100)
      const requests = resources
        .map((r) => r.avg_request_count_7d)
        .filter((r): r is number => r !== null && r > 0)
      if (requests.length > 0) {
        const maxRequests = Math.max(...requests)
        avgCpu = requests.length > 0 ? (requests.reduce((a, b) => a + b, 0) / requests.length / maxRequests) * 100 : 0
        hasData = avgCpu > 0
      }
    }

    if (hasData) {
      // Generate 30 days of trend data from current utilization (straight line for constant values)
      const cpuTrend = generateTrendData(avgCpu, 30, false)
      const memoryTrend = generateTrendData(avgMemory, 30, false)
      
      chartData = cpuTrend.map((d, i) => ({
        date: d.date,
        cpu: Number((d.value > 0 ? d.value : 0).toFixed(1)),
        memory: Number((memoryTrend[i]?.value > 0 ? memoryTrend[i].value : 0).toFixed(1)),
        rawDate: d.rawDate,
      }))
    }
  }

  console.log("[UtilizationTrendChart] Chart data prepared", {
    resourceType,
    dataPoints: chartData.length,
    avgCpu: chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.cpu, 0) / chartData.length : 0,
    avgMemory: chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.memory, 0) / chartData.length : 0,
    dateRange: chartData.length > 0 ? { first: chartData[0].date, last: chartData[chartData.length - 1].date } : null,
  })

  return (
    <Card className="border-2 min-h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Utilization Trend (30 Days)
        </CardTitle>
        <CardDescription>
          {resourceType === "instances"
            ? `Average CPU and Memory utilization for ${getServiceName(resourceType)} from metrics_daily (last 30 days)`
            : `Average utilization for ${getServiceName(resourceType)} estimated from current metrics (last 30 days)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[300px]">
        {!hasData && chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground px-4">
            <p className="text-center">
              {resourceType === "s3" || resourceType === "volumes" || resourceType === "elastic-ips"
                ? `Utilization metrics are not available for ${getServiceName(resourceType)}.`
                : `No utilization data available for ${getServiceName(resourceType)}.`}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={Math.max(0, Math.floor((chartData.length - 1) / 8))}
                minTickGap={20}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  padding: "0.5rem",
                }}
                formatter={(value: number) => `${value.toFixed(1)}%`}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="hsl(221.2 83.2% 53.3%)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(221.2 83.2% 53.3%)" }}
                activeDot={{ r: 5 }}
                name="CPU %"
              />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="hsl(173 58% 39%)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(173 58% 39%)" }}
                activeDot={{ r: 5 }}
                name="Memory %"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

