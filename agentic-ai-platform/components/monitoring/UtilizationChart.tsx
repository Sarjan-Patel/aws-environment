"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricGauge } from "@/components/monitoring/MetricGauge"
import { Activity, Cpu, HardDrive, Database, Zap, Loader } from "lucide-react"

interface UtilizationChartProps {
  cpu: number | null
  memory: number | null
  connections?: number | null
  type?: "instances" | "rds" | "lambda" | "cache"
}

export function UtilizationChart({
  cpu,
  memory,
  connections,
  type = "instances",
}: UtilizationChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Real-Time Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-6">
          {cpu !== null && (
            <div className="flex flex-col items-center gap-2">
              <MetricGauge value={cpu} label="CPU" size="md" />
            </div>
          )}
          {memory !== null && (
            <div className="flex flex-col items-center gap-2">
              <MetricGauge value={memory} label="Memory" size="md" />
            </div>
          )}
          {connections !== null && connections !== undefined && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-bold">{connections.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Connections</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

type ResourceType = "instances" | "rds" | "lambda" | "s3" | "volumes" | "load-balancers" | "cache-clusters" | "elastic-ips"

interface UtilizationSummaryProps {
  instances: Array<{ current_cpu: number | null; current_memory: number | null }>
  rdsInstances: Array<{ avg_cpu_7d: number | null; avg_connections_7d: number | null }>
  cacheClusters: Array<{ avg_cpu_7d: number | null; avg_connections_7d: number | null }>
  lambdaFunctions: Array<{ avg_memory_used_mb_7d: number | null; memory_mb: number; invocations_7d: number }>
  loadBalancers: Array<{ avg_request_count_7d: number | null }>
  resourceType: ResourceType
}

export function UtilizationSummary({ 
  instances, 
  rdsInstances, 
  cacheClusters, 
  lambdaFunctions,
  loadBalancers,
  resourceType 
}: UtilizationSummaryProps) {
  console.log("[UtilizationSummary] Component rendered", {
    instancesCount: instances.length,
    rdsCount: rdsInstances.length,
    cacheCount: cacheClusters.length,
  })

  // Calculate averages
  const instanceCpu = instances
    .map((i) => i.current_cpu)
    .filter((c): c is number => c !== null)
  const instanceMemory = instances
    .map((i) => i.current_memory)
    .filter((m): m is number => m !== null)
  const rdsCpu = rdsInstances
    .map((r) => r.avg_cpu_7d)
    .filter((c): c is number => c !== null)
  const rdsConnections = rdsInstances
    .map((r) => r.avg_connections_7d)
    .filter((c): c is number => c !== null)
  const cacheCpu = cacheClusters
    .map((c) => c.avg_cpu_7d)
    .filter((c): c is number => c !== null)
  const cacheConnections = cacheClusters
    .map((c) => c.avg_connections_7d)
    .filter((c): c is number => c !== null)

  const avgInstanceCpu =
    instanceCpu.length > 0 ? instanceCpu.reduce((a, b) => a + b, 0) / instanceCpu.length : null
  const avgInstanceMemory =
    instanceMemory.length > 0
      ? instanceMemory.reduce((a, b) => a + b, 0) / instanceMemory.length
      : null
  const avgRDSCpu = rdsCpu.length > 0 ? rdsCpu.reduce((a, b) => a + b, 0) / rdsCpu.length : null
  const avgRDSConnections =
    rdsConnections.length > 0
      ? rdsConnections.reduce((a, b) => a + b, 0) / rdsConnections.length
      : null
  const avgCacheCpu =
    cacheCpu.length > 0 ? cacheCpu.reduce((a, b) => a + b, 0) / cacheCpu.length : null
  const avgCacheConnections =
    cacheConnections.length > 0
      ? cacheConnections.reduce((a, b) => a + b, 0) / cacheConnections.length
      : null

  // Lambda metrics
  const lambdaMemoryUsage = lambdaFunctions
    .map((l) => {
      const used = l.avg_memory_used_mb_7d || 0
      const total = l.memory_mb || 1
      return total > 0 ? (used / total) * 100 : 0
    })
    .filter((m): m is number => m > 0)
  const avgLambdaMemoryUsage =
    lambdaMemoryUsage.length > 0 ? lambdaMemoryUsage.reduce((a, b) => a + b, 0) / lambdaMemoryUsage.length : null
  const avgLambdaInvocations =
    lambdaFunctions.length > 0
      ? lambdaFunctions.reduce((sum, l) => sum + (l.invocations_7d || 0), 0) / lambdaFunctions.length
      : null

  // Load Balancer metrics
  const lbRequests = loadBalancers
    .map((lb) => lb.avg_request_count_7d)
    .filter((r): r is number => r !== null && r > 0)
  const avgLBRequests = lbRequests.length > 0 ? lbRequests.reduce((a, b) => a + b, 0) / lbRequests.length : null

  console.log("[UtilizationSummary] Calculated averages", {
    resourceType,
    avgInstanceCpu,
    avgInstanceMemory,
    avgRDSCpu,
    avgRDSConnections,
    avgCacheCpu,
    avgCacheConnections,
    avgLambdaMemoryUsage,
    avgLambdaInvocations,
    avgLBRequests,
  })

  // Show only the selected service's metrics
  if (resourceType === "instances") {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              EC2 Instances
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-around gap-2">
              {avgInstanceCpu !== null && (
                <MetricGauge value={avgInstanceCpu} label="CPU" size="sm" />
              )}
              {avgInstanceMemory !== null && (
                <MetricGauge value={avgInstanceMemory} label="Memory" size="sm" />
              )}
              {(avgInstanceCpu === null && avgInstanceMemory === null) && (
                <p className="text-xs text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (resourceType === "rds") {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" />
              RDS Instances
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-around gap-2">
              {avgRDSCpu !== null && (
                <MetricGauge value={avgRDSCpu} label="CPU" size="sm" />
              )}
              {avgRDSConnections !== null && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-lg font-bold">{Math.round(avgRDSConnections).toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Connections</div>
                </div>
              )}
              {(avgRDSCpu === null && avgRDSConnections === null) && (
                <p className="text-xs text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (resourceType === "cache-clusters") {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Cache Clusters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-around gap-2">
              {avgCacheCpu !== null && (
                <MetricGauge value={avgCacheCpu} label="CPU" size="sm" />
              )}
              {avgCacheConnections !== null && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-lg font-bold">{Math.round(avgCacheConnections).toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Connections</div>
                </div>
              )}
              {(avgCacheCpu === null && avgCacheConnections === null) && (
                <p className="text-xs text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (resourceType === "lambda") {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Lambda Functions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-around gap-2">
              {avgLambdaMemoryUsage !== null && (
                <MetricGauge value={avgLambdaMemoryUsage} label="Memory" size="sm" />
              )}
              {avgLambdaInvocations !== null && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-lg font-bold">{Math.round(avgLambdaInvocations).toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Invocations (7d avg)</div>
                </div>
              )}
              {(avgLambdaMemoryUsage === null && avgLambdaInvocations === null) && (
                <p className="text-xs text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (resourceType === "load-balancers") {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Loader className="h-4 w-4" />
              Load Balancers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-around gap-2">
              {avgLBRequests !== null && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-lg font-bold">{Math.round(avgLBRequests).toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Requests (7d avg)</div>
                </div>
              )}
              {avgLBRequests === null && (
                <p className="text-xs text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // For other resource types (s3, volumes, elastic-ips), show no utilization data
  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Utilization Metrics</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-sm text-muted-foreground">Utilization metrics not available for this resource type.</p>
      </CardContent>
    </Card>
  )
}

