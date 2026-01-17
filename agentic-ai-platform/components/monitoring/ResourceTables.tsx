"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ResourceUtilization,
  StatusIndicator,
  getResourceStatus,
} from "@/components/monitoring/MetricGauge"
import {
  type Instance,
  type RDSInstance,
  type LambdaFunction,
  type S3Bucket,
  type Volume,
  type LoadBalancer,
  type ElasticIP,
  type CacheCluster,
} from "@/hooks/useResources"

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
    available: "success",
    unavailable: "destructive",
  }

  return (
    <Badge variant={variants[state] || "outline"} className="text-xs">
      {state}
    </Badge>
  )
}

export function InstancesTable({ instances }: { instances: Instance[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Instance ID</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead className="w-[180px]">Utilization</TableHead>
          <TableHead className="w-[100px]">State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {instances.map((instance) => (
          <TableRow key={instance.id} className="hover:bg-muted/50">
            <TableCell>
              <StatusIndicator
                status={getResourceStatus(instance.current_cpu, instance.current_memory)}
                showLabel
              />
            </TableCell>
            <TableCell className="font-medium">{instance.name || "—"}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {instance.instance_id}
            </TableCell>
            <TableCell>{instance.instance_type}</TableCell>
            <TableCell>
              <EnvBadge env={instance.env} />
            </TableCell>
            <TableCell>
              <ResourceUtilization
                cpu={instance.current_cpu}
                memory={instance.current_memory}
                compact
              />
            </TableCell>
            <TableCell>
              <StateBadge state={instance.state} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function RDSTable({ instances }: { instances: RDSInstance[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead>Instance ID</TableHead>
          <TableHead>Engine</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead className="w-[180px]">Utilization</TableHead>
          <TableHead className="w-[100px]">State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {instances.map((instance) => (
          <TableRow key={instance.id} className="hover:bg-muted/50">
            <TableCell>
              <StatusIndicator
                status={getResourceStatus(instance.current_cpu || 0, null)}
                showLabel
              />
            </TableCell>
            <TableCell className="font-mono text-xs">{instance.db_instance_id}</TableCell>
            <TableCell>{instance.engine}</TableCell>
            <TableCell>{instance.instance_class}</TableCell>
            <TableCell>
              <EnvBadge env={instance.env} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">CPU</span>
                  <span className="text-sm font-medium">
                    {instance.current_cpu !== null ? `${Math.round(instance.current_cpu)}%` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Conn</span>
                  <span className="text-sm font-medium">
                    {instance.avg_connections_7d !== null
                      ? instance.avg_connections_7d.toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <StateBadge state={instance.state} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function LambdaTable({ functions }: { functions: LambdaFunction[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Function Name</TableHead>
          <TableHead>Runtime</TableHead>
          <TableHead>Memory (MB)</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Invocations (7d)</TableHead>
          <TableHead>Memory Used</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {functions.map((fn) => (
          <TableRow key={fn.id} className="hover:bg-muted/50">
            <TableCell className="font-medium">{fn.function_name || "—"}</TableCell>
            <TableCell>{fn.runtime || "—"}</TableCell>
            <TableCell>{fn.memory_mb}</TableCell>
            <TableCell>
              <EnvBadge env={fn.env} />
            </TableCell>
            <TableCell>{fn.invocations_7d.toLocaleString()}</TableCell>
            <TableCell>
              {fn.avg_memory_used_mb_7d !== null
                ? `${Math.round(fn.avg_memory_used_mb_7d)} MB (${Math.round(
                    (fn.avg_memory_used_mb_7d / fn.memory_mb) * 100
                  )}%)`
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function S3Table({ buckets }: { buckets: S3Bucket[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Bucket Name</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Storage Class</TableHead>
          <TableHead>Lifecycle Policy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {buckets.map((bucket) => (
          <TableRow key={bucket.id} className="hover:bg-muted/50">
            <TableCell className="font-medium">{bucket.bucket_name || "—"}</TableCell>
            <TableCell>{bucket.region}</TableCell>
            <TableCell>{bucket.storage_class || "—"}</TableCell>
            <TableCell>
              {bucket.lifecycle_policy && 
               (typeof bucket.lifecycle_policy === 'object' ? Object.keys(bucket.lifecycle_policy).length > 0 : bucket.lifecycle_policy) ? (
                <Badge variant="outline" className="text-xs">
                  Configured
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  None
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function VolumesTable({ volumes }: { volumes: Volume[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Volume ID</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size (GB)</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Attached To</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {volumes.map((volume) => (
          <TableRow key={volume.id} className="hover:bg-muted/50">
            <TableCell className="font-mono text-xs">{volume.volume_id}</TableCell>
            <TableCell>{volume.volume_type}</TableCell>
            <TableCell>{volume.size_gb}</TableCell>
            <TableCell>
              <StateBadge state={volume.state} />
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {volume.attached_instance_id || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function LoadBalancersTable({ lbs }: { lbs: LoadBalancer[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Request Count (7d)</TableHead>
          <TableHead>State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lbs.map((lb) => (
          <TableRow key={lb.id} className="hover:bg-muted/50">
            <TableCell className="font-medium">{lb.lb_name || "—"}</TableCell>
            <TableCell>{lb.type}</TableCell>
            <TableCell>
              <EnvBadge env={lb.env} />
            </TableCell>
            <TableCell>
              {lb.avg_request_count_7d !== null
                ? lb.avg_request_count_7d.toLocaleString()
                : "—"}
            </TableCell>
            <TableCell>
              {lb.state ? (
                <StateBadge state={lb.state} />
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ElasticIPsTable({ eips }: { eips: ElasticIP[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Public IP</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Associated Instance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {eips.map((eip) => (
          <TableRow key={eip.id} className="hover:bg-muted/50">
            <TableCell className="font-mono text-xs">{eip.public_ip}</TableCell>
            <TableCell>
              <StateBadge state={eip.state} />
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {eip.associated_instance_id || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function CacheClustersTable({ clusters }: { clusters: CacheCluster[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead>Cluster ID</TableHead>
          <TableHead>Engine</TableHead>
          <TableHead>Node Type</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead className="w-[180px]">Utilization</TableHead>
          <TableHead className="w-[100px]">State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clusters.map((cluster) => (
          <TableRow key={cluster.id} className="hover:bg-muted/50">
            <TableCell>
              <StatusIndicator
                status={getResourceStatus(cluster.avg_cpu_7d || 0, null)}
                showLabel
              />
            </TableCell>
            <TableCell className="font-mono text-xs">{cluster.cluster_id}</TableCell>
            <TableCell>{cluster.engine}</TableCell>
            <TableCell>{cluster.node_type}</TableCell>
            <TableCell>
              <EnvBadge env={cluster.env} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">CPU</span>
                  <span className="text-sm font-medium">
                    {cluster.avg_cpu_7d !== null ? `${Math.round(cluster.avg_cpu_7d)}%` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Conn</span>
                  <span className="text-sm font-medium">
                    {cluster.avg_connections_7d !== null
                      ? cluster.avg_connections_7d.toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <StateBadge state={cluster.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

