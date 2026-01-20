"use client"

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Server, HardDrive, Cloud, Layers } from "lucide-react"
import { useResourceCounts } from "@/hooks/useResources"

export default function ResourcesPage() {
  const { data: counts, isLoading } = useResourceCounts()

  // console.log("[ResourcesPage] Rendered - isLoading:", isLoading)

  const resourceCategories = [
    { name: "EC2 Instances", count: counts?.instances ?? 0, icon: Server, color: "text-blue-500" },
    { name: "RDS Databases", count: counts?.rdsInstances ?? 0, icon: Database, color: "text-purple-500" },
    { name: "S3 Buckets", count: counts?.s3Buckets ?? 0, icon: Cloud, color: "text-green-500" },
    { name: "Lambda Functions", count: counts?.lambdaFunctions ?? 0, icon: Layers, color: "text-amber-500" },
    { name: "EBS Volumes", count: counts?.volumes ?? 0, icon: HardDrive, color: "text-red-500" },
    { name: "Load Balancers", count: counts?.loadBalancers ?? 0, icon: Server, color: "text-cyan-500" },
  ]

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all AWS resources tracked in your environment
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resourceCategories.map((category) => (
          <Card key={category.name} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
              <category.icon className={`h-5 w-5 ${category.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "..." : category.count.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total tracked resources
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Detailed resource views with filtering, search, and bulk actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Phase 6 Feature</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
