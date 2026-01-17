"use client"

import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useConnectionStore } from "@/stores/connection-store"
import {
  useInstances,
  useResourceCounts,
  useRDSInstances,
  useLambdaFunctions,
  useS3Buckets,
  useVolumes,
  useLoadBalancers,
  useElasticIPs,
  useCacheClusters,
  type Instance,
  type RDSInstance,
  type LambdaFunction,
  type S3Bucket,
  type Volume,
  type LoadBalancer,
  type ElasticIP,
  type CacheCluster,
} from "@/hooks/useResources"
import { useRealtimeResources } from "@/hooks/useRealtime"
import {
  ResourceUtilization,
  StatusIndicator,
  getResourceStatus,
} from "@/components/monitoring/MetricGauge"
import {
  InstancesTable,
  RDSTable,
  LambdaTable,
  S3Table,
  VolumesTable,
  LoadBalancersTable,
  ElasticIPsTable,
  CacheClustersTable,
} from "@/components/monitoring/ResourceTables"
import { CostSummary } from "@/components/monitoring/CostSummary"
import { CostTrendChart, UtilizationTrendChart } from "@/components/monitoring/TrendChart"
import { Pagination } from "@/components/ui/pagination"
import {
  Activity,
  Search,
  RefreshCw,
  Server,
  Database,
  HardDrive,
  Cloud,
  Zap,
  Filter,
} from "lucide-react"

type ResourceType = "instances" | "rds" | "lambda" | "s3" | "volumes" | "load-balancers" | "cache-clusters" | "elastic-ips"
type StatusFilter = "all" | "healthy" | "warning" | "critical" | "idle"

const PAGE_SIZE = 25

export default function MonitoringPage() {
  console.log("[MonitoringPage] Component mounted/rendered")

  const { initialize, testCurrentConnection, isConnected } = useConnectionStore()
  const { data: instances, isLoading: instancesLoading, refetch: refetchInstances } = useInstances()

  console.log("[MonitoringPage] Data loaded", {
    instancesCount: instances?.length ?? 0,
    instancesLoading,
  })
  const { data: rdsInstances, isLoading: rdsLoading, refetch: refetchRDS } = useRDSInstances()
  const { data: lambdaFunctions, isLoading: lambdaLoading, refetch: refetchLambda } = useLambdaFunctions()
  const { data: s3Buckets, isLoading: s3Loading, refetch: refetchS3 } = useS3Buckets()
  const { data: volumes, isLoading: volumesLoading, refetch: refetchVolumes } = useVolumes()
  const { data: loadBalancers, isLoading: lbLoading, refetch: refetchLB } = useLoadBalancers()
  const { data: elasticIPs, isLoading: eipLoading, refetch: refetchEIP } = useElasticIPs()
  const { data: cacheClusters, isLoading: cacheLoading, refetch: refetchCache } = useCacheClusters()
  const { data: counts, isLoading: countsLoading } = useResourceCounts()

  const [searchQuery, setSearchQuery] = useState("")
  const [resourceType, setResourceType] = useState<ResourceType>("instances")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)

  const refetch = () => {
    refetchInstances()
    refetchRDS()
    refetchLambda()
    refetchS3()
    refetchVolumes()
    refetchLB()
    refetchEIP()
    refetchCache()
  }

  useEffect(() => {
    initialize()
    testCurrentConnection()
  }, [initialize, testCurrentConnection])

  // Enable real-time updates
  useRealtimeResources(isConnected)

  // Filter functions for each resource type
  const filterInstances = (items: Instance[]) => {
    return items.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
          !item.name?.toLowerCase().includes(query) &&
          !item.instance_id?.toLowerCase().includes(query) &&
          !item.instance_type?.toLowerCase().includes(query)
      ) {
        return false
      }
      }
      if (statusFilter !== "all") {
        const status = getResourceStatus(item.current_cpu, item.current_memory)
        if (status !== statusFilter) return false
      }
      return true
    })
  }

  const filterRDS = (items: RDSInstance[]) => {
    return items.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !item.db_instance_id?.toLowerCase().includes(query) &&
          !item.engine?.toLowerCase().includes(query) &&
          !item.instance_class?.toLowerCase().includes(query)
        ) {
          return false
        }
      }
    if (statusFilter !== "all") {
        const status = getResourceStatus(item.avg_cpu_7d || 0, null)
      if (status !== statusFilter) return false
      }
      return true
    })
  }

  const filterLambda = (items: LambdaFunction[]) => {
    return items.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !item.function_name?.toLowerCase().includes(query) &&
          !item.runtime?.toLowerCase().includes(query)
        ) {
          return false
        }
      }
      return true
    })
  }

  const filterS3 = (items: S3Bucket[]) => {
    return items.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!item.bucket_name?.toLowerCase().includes(query) && !item.region?.toLowerCase().includes(query)) {
          return false
        }
      }
      return true
    })
  }

  const filterVolumes = (items: Volume[]) => {
    return items.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!item.volume_id?.toLowerCase().includes(query) && !item.volume_type?.toLowerCase().includes(query)) {
          return false
        }
      }
      return true
    })
  }

  const filterLoadBalancers = (items: LoadBalancer[]) => {
    return items.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!item.lb_name?.toLowerCase().includes(query) && !item.type?.toLowerCase().includes(query)) {
          return false
        }
      }
      return true
    })
  }

  const filterElasticIPs = (items: ElasticIP[]) => {
    return items.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!item.public_ip?.toLowerCase().includes(query)) {
          return false
        }
      }
      return true
    })
  }

  const filterCacheClusters = (items: CacheCluster[]) => {
    return items.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !item.cluster_id?.toLowerCase().includes(query) &&
          !item.engine?.toLowerCase().includes(query) &&
          !item.node_type?.toLowerCase().includes(query)
        ) {
          return false
        }
      }
      if (statusFilter !== "all") {
        const status = getResourceStatus(item.avg_cpu_7d || 0, null)
        if (status !== statusFilter) return false
      }
    return true
  })
  }

  // Get filtered data based on resource type
  const getFilteredData = () => {
    switch (resourceType) {
      case "instances":
        return filterInstances(instances || [])
      case "rds":
        return filterRDS(rdsInstances || [])
      case "lambda":
        return filterLambda(lambdaFunctions || [])
      case "s3":
        return filterS3(s3Buckets || [])
      case "volumes":
        return filterVolumes(volumes || [])
      case "load-balancers":
        return filterLoadBalancers(loadBalancers || [])
      case "elastic-ips":
        return filterElasticIPs(elasticIPs || [])
      case "cache-clusters":
        return filterCacheClusters(cacheClusters || [])
      default:
        return []
    }
  }

  const filteredData = getFilteredData()
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE)
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Reset to page 1 when filters or resource type changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, resourceType])

  const isLoading =
    (resourceType === "instances" && instancesLoading) ||
    (resourceType === "rds" && rdsLoading) ||
    (resourceType === "lambda" && lambdaLoading) ||
    (resourceType === "s3" && s3Loading) ||
    (resourceType === "volumes" && volumesLoading) ||
    (resourceType === "load-balancers" && lbLoading) ||
    (resourceType === "elastic-ips" && eipLoading) ||
    (resourceType === "cache-clusters" && cacheLoading) ||
    countsLoading

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />

      <main className="flex-1 container py-8">
        <div className="flex flex-col gap-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Mode 1: Monitoring</h1>
              <p className="text-muted-foreground mt-1">
                Real-time resource utilization and status tracking
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          {/* Resource Type Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
            <ResourceTypeCard
              icon={<Server className="h-5 w-5" />}
              label="EC2 Instances"
              count={counts?.instances ?? 0}
              loading={countsLoading}
              color="blue"
              onClick={() => setResourceType("instances")}
              isActive={resourceType === "instances"}
            />
            <ResourceTypeCard
              icon={<Database className="h-5 w-5" />}
              label="RDS Databases"
              count={counts?.rdsInstances ?? 0}
              loading={countsLoading}
              color="purple"
              onClick={() => setResourceType("rds")}
              isActive={resourceType === "rds"}
            />
            <ResourceTypeCard
              icon={<Zap className="h-5 w-5" />}
              label="Lambda Functions"
              count={counts?.lambdaFunctions ?? 0}
              loading={countsLoading}
              color="amber"
              onClick={() => setResourceType("lambda")}
              isActive={resourceType === "lambda"}
            />
            <ResourceTypeCard
              icon={<Cloud className="h-5 w-5" />}
              label="S3 Buckets"
              count={counts?.s3Buckets ?? 0}
              loading={countsLoading}
              color="green"
              onClick={() => setResourceType("s3")}
              isActive={resourceType === "s3"}
            />
            <ResourceTypeCard
              icon={<HardDrive className="h-5 w-5" />}
              label="EBS Volumes"
              count={counts?.volumes ?? 0}
              loading={countsLoading}
              color="rose"
              onClick={() => setResourceType("volumes")}
              isActive={resourceType === "volumes"}
            />
            <ResourceTypeCard
              icon={<Activity className="h-5 w-5" />}
              label="Load Balancers"
              count={counts?.loadBalancers ?? 0}
              loading={countsLoading}
              color="blue"
              onClick={() => setResourceType("load-balancers")}
              isActive={resourceType === "load-balancers"}
            />
            <ResourceTypeCard
              icon={<Database className="h-5 w-5" />}
              label="Cache Clusters"
              count={counts?.cacheClusters ?? 0}
              loading={countsLoading}
              color="purple"
              onClick={() => setResourceType("cache-clusters")}
              isActive={resourceType === "cache-clusters"}
            />
            <ResourceTypeCard
              icon={<Server className="h-5 w-5" />}
              label="Elastic IPs"
              count={counts?.elasticIps ?? 0}
              loading={countsLoading}
              color="green"
              onClick={() => setResourceType("elastic-ips")}
              isActive={resourceType === "elastic-ips"}
            />
          </div>

          {/* Cost Summary */}
          <CostSummary
            resourceType={resourceType}
            resources={
              resourceType === "instances"
                ? undefined // Use metrics_daily for EC2
                : resourceType === "rds"
                ? (rdsInstances || [])
                : resourceType === "lambda"
                ? (lambdaFunctions || [])
                : resourceType === "s3"
                ? (s3Buckets || [])
                : resourceType === "volumes"
                ? (volumes || [])
                : resourceType === "load-balancers"
                ? (loadBalancers || [])
                : resourceType === "cache-clusters"
                ? (cacheClusters || [])
                : resourceType === "elastic-ips"
                ? (elasticIPs || [])
                : undefined
            }
          />

          {/* Trend Analysis */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CostTrendChart
              resourceType={resourceType}
              resources={
                resourceType === "instances"
                  ? undefined // Use metrics_daily for EC2
                  : resourceType === "rds"
                  ? (rdsInstances || [])
                  : resourceType === "lambda"
                  ? (lambdaFunctions || [])
                  : resourceType === "s3"
                  ? (s3Buckets || [])
                  : resourceType === "volumes"
                  ? (volumes || [])
                  : resourceType === "load-balancers"
                  ? (loadBalancers || [])
                  : resourceType === "cache-clusters"
                  ? (cacheClusters || [])
                  : resourceType === "elastic-ips"
                  ? (elasticIPs || [])
                  : undefined
              }
            />
            <UtilizationTrendChart
              resourceType={resourceType}
              resources={
                resourceType === "instances"
                  ? undefined // Use metrics_daily for EC2
                  : resourceType === "rds"
                  ? (rdsInstances || [])
                  : resourceType === "lambda"
                  ? (lambdaFunctions || [])
                  : resourceType === "s3"
                  ? (s3Buckets || [])
                  : resourceType === "volumes"
                  ? (volumes || [])
                  : resourceType === "load-balancers"
                  ? (loadBalancers || [])
                  : resourceType === "cache-clusters"
                  ? (cacheClusters || [])
                  : resourceType === "elastic-ips"
                  ? (elasticIPs || [])
                  : undefined
              }
            />
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, instance ID, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <FilterButton
                    active={statusFilter === "all"}
                    onClick={() => setStatusFilter("all")}
                  >
                    All
                  </FilterButton>
                  <FilterButton
                    active={statusFilter === "healthy"}
                    onClick={() => setStatusFilter("healthy")}
                  >
                    <StatusIndicator status="healthy" size="sm" /> Healthy
                  </FilterButton>
                  <FilterButton
                    active={statusFilter === "warning"}
                    onClick={() => setStatusFilter("warning")}
                  >
                    <StatusIndicator status="warning" size="sm" /> Warning
                  </FilterButton>
                  <FilterButton
                    active={statusFilter === "idle"}
                    onClick={() => setStatusFilter("idle")}
                  >
                    <StatusIndicator status="idle" size="sm" /> Idle
                  </FilterButton>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Table */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Resources
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {filteredData.length} of{" "}
                    {resourceType === "instances"
                      ? instances?.length ?? 0
                      : resourceType === "rds"
                      ? rdsInstances?.length ?? 0
                      : resourceType === "lambda"
                      ? lambdaFunctions?.length ?? 0
                      : resourceType === "s3"
                      ? s3Buckets?.length ?? 0
                      : resourceType === "volumes"
                      ? volumes?.length ?? 0
                      : resourceType === "load-balancers"
                      ? loadBalancers?.length ?? 0
                      : resourceType === "elastic-ips"
                      ? elasticIPs?.length ?? 0
                      : resourceType === "cache-clusters"
                      ? cacheClusters?.length ?? 0
                      : 0}{" "}
                    {resourceType === "instances"
                      ? "instances"
                      : resourceType === "rds"
                      ? "RDS instances"
                      : resourceType === "lambda"
                      ? "functions"
                      : resourceType === "s3"
                      ? "buckets"
                      : resourceType === "volumes"
                      ? "volumes"
                      : resourceType === "load-balancers"
                      ? "load balancers"
                      : resourceType === "elastic-ips"
                      ? "Elastic IPs"
                      : "cache clusters"}
                    {filteredData.length !==
                      (resourceType === "instances"
                        ? instances?.length ?? 0
                        : resourceType === "rds"
                        ? rdsInstances?.length ?? 0
                        : resourceType === "lambda"
                        ? lambdaFunctions?.length ?? 0
                        : resourceType === "s3"
                        ? s3Buckets?.length ?? 0
                        : resourceType === "volumes"
                        ? volumes?.length ?? 0
                        : resourceType === "load-balancers"
                        ? loadBalancers?.length ?? 0
                        : resourceType === "elastic-ips"
                        ? elasticIPs?.length ?? 0
                        : resourceType === "cache-clusters"
                        ? cacheClusters?.length ?? 0
                        : 0) && " (filtered)"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ResourceTableSkeleton />
              ) : (
                <div className="rounded-md border">
                  {resourceType === "instances" && (
                    <>
                      <InstancesTable instances={paginatedData as Instance[]} />
                      {filteredData.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">
                              {searchQuery || statusFilter !== "all"
                                ? "No instances match your filters"
                                : "No instances found"}
                            </p>
                        </div>
                      )}
                    </>
                  )}
                  {resourceType === "rds" && (
                    <>
                      <RDSTable instances={paginatedData as RDSInstance[]} />
                      {filteredData.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            {searchQuery || statusFilter !== "all"
                              ? "No RDS instances match your filters"
                              : "No RDS instances found"}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {resourceType === "lambda" && (
                    <>
                      <LambdaTable functions={paginatedData as LambdaFunction[]} />
                      {filteredData.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            {searchQuery ? "No functions match your filters" : "No functions found"}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {resourceType === "s3" && (
                    <>
                      <S3Table buckets={paginatedData as S3Bucket[]} />
                      {filteredData.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            {searchQuery ? "No buckets match your filters" : "No buckets found"}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {resourceType === "volumes" && (
                    <>
                      <VolumesTable volumes={paginatedData as Volume[]} />
                      {filteredData.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            {searchQuery ? "No volumes match your filters" : "No volumes found"}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {resourceType === "load-balancers" && (
                    <>
                      <LoadBalancersTable lbs={paginatedData as LoadBalancer[]} />
                      {filteredData.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            {searchQuery
                              ? "No load balancers match your filters"
                              : "No load balancers found"}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {resourceType === "cache-clusters" && (
                    <>
                      <CacheClustersTable clusters={paginatedData as CacheCluster[]} />
                      {filteredData.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            {searchQuery || statusFilter !== "all"
                              ? "No cache clusters match your filters"
                              : "No cache clusters found"}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {resourceType === "elastic-ips" && (
                    <>
                      <ElasticIPsTable eips={paginatedData as ElasticIP[]} />
                      {filteredData.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            {searchQuery
                              ? "No Elastic IPs match your filters"
                              : "No Elastic IPs found"}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {!isLoading && filteredData.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={PAGE_SIZE}
                  totalItems={filteredData.length}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

type ColorVariant = "blue" | "purple" | "amber" | "green" | "rose"

const colorStyles: Record<ColorVariant, { bg: string; text: string; accent: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", accent: "bg-blue-500/5" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600", accent: "bg-purple-500/5" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", accent: "bg-amber-500/5" },
  green: { bg: "bg-green-500/10", text: "text-green-600", accent: "bg-green-500/5" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-600", accent: "bg-rose-500/5" },
}

function ResourceTypeCard({
  icon,
  label,
  count,
  loading,
  color = "blue",
  onClick,
  isActive = false,
}: {
  icon: React.ReactNode
  label: string
  count: number
  loading: boolean
  color?: ColorVariant
  onClick?: () => void
  isActive?: boolean
}) {
  const styles = colorStyles[color]

  return (
    <Card
      className={`relative overflow-hidden transition-all cursor-pointer border-2 ${
        isActive ? "border-primary shadow-lg" : "border-transparent hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 ${styles.accent} rounded-full -mr-12 -mt-12`} />
      <CardContent className="flex items-center gap-4 pt-6 pb-6">
        <div className={`p-3 ${styles.bg} rounded-xl`}>
          <div className={styles.text}>{icon}</div>
        </div>
        <div className="flex-1">
          {loading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <div className="text-2xl font-bold">{count}</div>
          )}
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className="flex items-center gap-1"
    >
      {children}
    </Button>
  )
}

function EnvBadge({ env }: { env: string }) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    prod: "destructive",
    staging: "secondary",
    dev: "outline",
    preview: "outline",
    ci: "outline",
    feature: "outline",
  }

  return (
    <Badge variant={variants[env] || "outline"} className="text-xs">
      {env}
    </Badge>
  )
}

function StateBadge({ state }: { state: string }) {
  const variants: Record<string, "default" | "secondary" | "outline" | "success" | "destructive"> = {
    running: "success",
    stopped: "secondary",
    terminated: "destructive",
    pending: "outline",
  }

  return (
    <Badge variant={variants[state] || "outline"} className="text-xs">
      {state}
    </Badge>
  )
}

function ResourceTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
