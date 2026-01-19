"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Database,
  Server,
  HardDrive,
  Network,
  CheckCircle2,
  Zap,
  BarChart3,
  TrendingUp,
  ExternalLink,
  Search,
  Play,
  FileText,
  ArrowRight,
} from "lucide-react"
import { ProblemCanvas, ArchitectureCanvas, DetectorCanvas } from "@/components/demo"
import { Header } from "@/components/header"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-semibold text-slate-900">
            FinOps AI Platform
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Intelligent Cloud Cost Optimization Platform - Detecting and optimizing underutilized and idle resources
            that silently accumulate costs
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="problem" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="problem" className="text-base">The Problem</TabsTrigger>
            <TabsTrigger value="platform" className="text-base">The Platform</TabsTrigger>
          </TabsList>

          {/* The Problem Tab */}
          <TabsContent value="problem" className="space-y-8">
            {/* Overview */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-2xl text-slate-900">The Problem: Cloud Resource Waste</CardTitle>
                <CardDescription className="text-slate-600">
                  Organizations waste up to 32% of their cloud budget on inefficient resource utilization
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <p className="text-lg text-slate-700 leading-relaxed">
                    Cloud resources are provisioned with costs that begin accumulating immediately upon creation.
                    Without continuous optimization, these costs compound silently across compute, storage, database,
                    and networking services—regardless of whether the resources are actively delivering value.
                  </p>
                  <div className="p-6 bg-slate-900 rounded-xl text-white">
                    <p className="text-xl font-medium text-center">
                      The challenge isn't identifying waste—it's detecting the specific patterns across diverse
                      cloud services and taking automated action before costs accumulate.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cloud Services Tables */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-2xl text-slate-900">Cloud Services & Waste Patterns</CardTitle>
                <CardDescription className="text-slate-600">
                  How different AWS resources accumulate costs when not optimized
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  {/* Compute Resources */}
                  <div className="p-6 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Server className="h-6 w-6 text-slate-700" />
                      <h3 className="text-xl font-semibold text-slate-900">Compute Resources</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">EC2 Instances</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Virtual machines that run your applications. You pay by the hour regardless of how much you actually use them.
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            Developers spin up instances for testing or projects, but forget to turn them off.
                            These machines sit idle—barely doing any work—yet you're paying full price 24/7.
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">Auto Scaling Groups</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Groups of instances that automatically grow or shrink based on demand. Used for production workloads.
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            Teams set high minimum capacity "just in case" but actual traffic rarely needs it.
                            You end up paying for 10 servers when 3 would handle the load just fine.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Storage Resources */}
                  <div className="p-6 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      <HardDrive className="h-6 w-6 text-slate-700" />
                      <h3 className="text-xl font-semibold text-slate-900">Storage Resources</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">EBS Volumes</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Hard drives that attach to your instances. You're charged monthly for the storage space.
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            When an instance is deleted, its storage volume often gets left behind.
                            These orphaned volumes sit unused—like paying rent for an empty apartment—costing you money every month.
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">EBS Snapshots</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Backups of your storage volumes. Created for disaster recovery but often forgotten about.
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            Teams create snapshots before big changes "just in case" but never clean them up.
                            Snapshots from months ago pile up, and the original volume may not even exist anymore.
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">S3 Buckets</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Object storage for files, logs, and backups. Charged based on how much data you store and access.
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            Without lifecycle policies, old logs and data stay in the expensive "hot" storage tier forever.
                            Data you haven't accessed in years costs the same as data you use daily.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Database Resources */}
                  <div className="p-6 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Database className="h-6 w-6 text-slate-700" />
                      <h3 className="text-xl font-semibold text-slate-900">Database Resources</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">RDS Instances</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Managed databases (MySQL, PostgreSQL, etc.). Billed hourly based on the instance size you choose.
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            Teams often provision large database instances expecting high traffic that never comes.
                            A database capable of handling millions of queries sits nearly idle, barely breaking a sweat.
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">ElastiCache Clusters</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          In-memory caching (Redis, Memcached) to speed up applications. Charged by node size and count.
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            Dev and staging environments get the same cache setup as production "for consistency."
                            But those environments barely have any users, so the cache sits mostly empty.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Networking Resources */}
                  <div className="p-6 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Network className="h-6 w-6 text-slate-700" />
                      <h3 className="text-xl font-semibold text-slate-900">Networking Resources</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">Elastic IPs</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Static public IP addresses that stay the same even when instances restart.
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            When an instance is terminated, the IP address often gets left behind.
                            Unused IPs cost money—it's like keeping a phone line active that nobody uses.
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">Load Balancers</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Distribute traffic across multiple servers. Billed hourly plus usage charges.
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            Old projects get shut down but their load balancers stick around.
                            With zero traffic flowing through, you're still paying the base cost every hour.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observability Resources */}
                  <div className="p-6 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart3 className="h-6 w-6 text-slate-700" />
                      <h3 className="text-xl font-semibold text-slate-900">Observability Resources</h3>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">CloudWatch Log Groups</h4>
                      <p className="text-sm text-slate-700 mb-3">
                        Stores application logs for debugging and monitoring. Charged for data ingestion and storage.
                      </p>
                      <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                        <p className="text-sm font-semibold text-slate-900 mb-2">Waste Pattern:</p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          Without retention policies, logs grow forever. Debugging info from 3 years ago
                          sits next to today's logs—and you're paying to store all of it indefinitely.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scenarios & Actions */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-2xl text-slate-900">Optimization Scenarios & Actions</CardTitle>
                <CardDescription className="text-slate-600">
                  What we detect and what actions we take to optimize your cloud spend
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* EC2 & Compute */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-slate-600" />
                        <h3 className="font-semibold text-slate-900">EC2 & Compute</h3>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Idle Instance</p>
                          <p className="text-sm text-slate-600">Machine running but barely used</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Stop Instance</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Over-provisioned Instance</p>
                          <p className="text-sm text-slate-600">Too large for actual workload</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Rightsize</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Forgotten CI Runner</p>
                          <p className="text-sm text-slate-600">Test machine left running after job</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Terminate</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Over-provisioned ASG</p>
                          <p className="text-sm text-slate-600">More capacity than traffic needs</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Scale Down</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Storage */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5 text-slate-600" />
                        <h3 className="font-semibold text-slate-900">Storage</h3>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Unattached Volume</p>
                          <p className="text-sm text-slate-600">Storage not connected to anything</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Delete</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Old Snapshot</p>
                          <p className="text-sm text-slate-600">Backup older than 90 days</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Delete</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">S3 No Lifecycle</p>
                          <p className="text-sm text-slate-600">Data kept in expensive tier forever</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Add Lifecycle</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Database */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-slate-600" />
                        <h3 className="font-semibold text-slate-900">Database</h3>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Idle RDS</p>
                          <p className="text-sm text-slate-600">Database with minimal activity</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Stop</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Idle Cache</p>
                          <p className="text-sm text-slate-600">ElastiCache barely being used</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Delete</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Networking & Lambda */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Network className="h-5 w-5 text-slate-600" />
                        <h3 className="font-semibold text-slate-900">Networking & Serverless</h3>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Orphaned Elastic IP</p>
                          <p className="text-sm text-slate-600">IP address not attached to anything</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Release</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Idle Load Balancer</p>
                          <p className="text-sm text-slate-600">No traffic flowing through</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Delete</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Over-provisioned Lambda</p>
                          <p className="text-sm text-slate-600">Too much memory allocated</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Rightsize</Badge>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Log No Retention</p>
                          <p className="text-sm text-slate-600">Logs growing forever</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Set Retention</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How Detection Works */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-2xl text-slate-900">How Detection Works</CardTitle>
                <CardDescription className="text-slate-600">
                  Visual flow of our waste detection engine
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <DetectorCanvas />
              </CardContent>
            </Card>
          </TabsContent>

          {/* The Platform Tab */}
          <TabsContent value="platform" className="space-y-8">
            {/* Platform Overview */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-2xl text-slate-900">Our Solution: FinOps AI Platform</CardTitle>
                <CardDescription className="text-slate-600">
                  Automated detection, optimization, and cost savings through intelligent AI
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <p className="text-slate-700 leading-relaxed">
                    Our platform continuously monitors cloud resources, detects waste patterns, and automatically
                    optimizes resources based on their configuration and environment. The platform balances
                    automation with safety through three approaches.
                  </p>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white rounded-lg border border-slate-200 text-center">
                      <div className="flex justify-center mb-4">
                        <BarChart3 className="h-10 w-10 text-slate-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Continuous Monitoring</h3>
                      <p className="text-slate-700 text-sm">
                        24/7 monitoring of all cloud resources with real-time waste detection and reporting
                      </p>
                    </div>
                    <div className="p-6 bg-white rounded-lg border border-slate-200 text-center">
                      <div className="flex justify-center mb-4">
                        <Zap className="h-10 w-10 text-slate-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Auto-Optimize</h3>
                      <p className="text-slate-700 text-sm">
                        Low-risk optimizations happen automatically without human intervention
                      </p>
                    </div>
                    <div className="p-6 bg-white rounded-lg border border-slate-200 text-center">
                      <div className="flex justify-center mb-4">
                        <CheckCircle2 className="h-10 w-10 text-slate-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Review Required</h3>
                      <p className="text-slate-700 text-sm">
                        Higher-impact actions require human approval before execution
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What We Optimize */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-2xl text-slate-900">What We Optimize</CardTitle>
                <CardDescription className="text-slate-600">
                  15 waste scenarios automatically detected and optimized
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <Tabs defaultValue="auto-safe" className="w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                    <TabsTrigger value="auto-safe">Auto-Optimize</TabsTrigger>
                    <TabsTrigger value="approval">Review Required</TabsTrigger>
                  </TabsList>

                  <TabsContent value="auto-safe">
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { name: "Forgotten Preview Environment", desc: "Preview environments with idle instances older than 7 days" },
                        { name: "Over-provisioned ASG", desc: "Auto Scaling Groups with capacity exceeding utilization needs" },
                        { name: "Idle CI Runner", desc: "CI runners that completed jobs and remain idle" },
                        { name: "S3 No Lifecycle Policy", desc: "Buckets storing data in expensive Standard tier without tiering" },
                        { name: "Log No Retention", desc: "Log groups accumulating data indefinitely without retention policy" },
                        { name: "Off-Hours Dev Instance", desc: "Development instances running during weekends or nights" },
                        { name: "Stale Feature Environment", desc: "Feature environments older than 7 days with low usage" },
                        { name: "Orphaned Elastic IP", desc: "Elastic IPs not attached to any resource" },
                        { name: "Unattached EBS Volume", desc: "EBS volumes in available state, not attached to instances" },
                        { name: "Old Snapshot", desc: "Snapshots older than 90 days that may no longer be needed" },
                        { name: "Idle Instance", desc: "Instances with very low CPU utilization for extended periods" },
                      ].map((scenario, idx) => (
                        <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200">
                          <h4 className="font-medium text-slate-900 text-sm mb-1">{scenario.name}</h4>
                          <p className="text-xs text-slate-600 mb-2">{scenario.desc}</p>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">
                            Auto-Optimized
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="approval">
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { name: "Idle RDS Instance", desc: "RDS instances with very low CPU and connections" },
                        { name: "Idle Cache Cluster", desc: "ElastiCache clusters with minimal usage" },
                        { name: "Idle Load Balancer", desc: "Load balancers with near-zero traffic" },
                        { name: "Over-provisioned Lambda", desc: "Lambda functions with much more memory allocated than used" },
                      ].map((scenario, idx) => (
                        <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200">
                          <h4 className="font-medium text-slate-900 text-sm mb-1">{scenario.name}</h4>
                          <p className="text-xs text-slate-600 mb-2">{scenario.desc}</p>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">
                              Needs Review
                            </Badge>
                            <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs">
                              Higher Impact
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Platform Architecture */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-2xl text-slate-900">Platform Architecture</CardTitle>
                <CardDescription className="text-slate-600">
                  Interactive visualization of how the platform components work together
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <ArchitectureCanvas />
              </CardContent>
            </Card>

            {/* Case Studies */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-2xl flex items-center gap-2 text-slate-900">
                  <TrendingUp className="h-6 w-6 text-slate-700" />
                  Real-World Case Studies
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Companies achieving significant cost savings through cloud optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Case Study 1 */}
                  <div className="p-6 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Full Scale</h3>
                        <p className="text-sm text-slate-600 mb-2">
                          Reference:{" "}
                          <a
                            href="https://fullscale.io/blog/cloud-cost-optimization-reduce-aws-bill/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1"
                          >
                            Full Scale Blog - Cloud Cost Optimization
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-slate-900">40%</p>
                        <p className="text-xs text-slate-600">AWS bill reduction</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2 text-sm">Actions Taken:</h4>
                        <ul className="space-y-1 text-slate-700 text-sm">
                          <li>• Diagnosed over-provisioned EC2/RDS resources</li>
                          <li>• Implemented S3 lifecycle rules</li>
                          <li>• Switched to reserved instances/savings plans</li>
                          <li>• Stopped idle resources during off-hours</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2 text-sm">Results:</h4>
                        <ul className="space-y-1 text-slate-700 text-sm">
                          <li>• 65% decrease in unused EC2 hours</li>
                          <li>• 35% improvement in utilization</li>
                          <li>• No performance degradation</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Case Study 2 */}
                  <div className="p-6 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">AWS Real-Time Bidding Architecture</h3>
                        <p className="text-sm text-slate-600 mb-2">
                          Reference:{" "}
                          <a
                            href="https://aws.amazon.com/blogs/industries/analyze-data-transfer-and-adopt-cost-optimized-designs-to-realize-cost-savings/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1"
                          >
                            AWS Blog - Data Transfer Optimization
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-slate-900">64%</p>
                        <p className="text-xs text-slate-600">data transfer savings</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2 text-sm">Problem:</h4>
                        <ul className="space-y-1 text-slate-700 text-sm">
                          <li>• High intra-region and cross-region log transfer costs</li>
                          <li>• Inefficient data transfer architecture</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2 text-sm">Solution:</h4>
                        <ul className="space-y-1 text-slate-700 text-sm">
                          <li>• Moved logs to S3 in same region</li>
                          <li>• Optimized cross-region replication</li>
                          <li>• Used VPC peering & interface endpoints</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Case Study 3 */}
                  <div className="p-6 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Serta Simmons</h3>
                        <p className="text-sm text-slate-600 mb-2">
                          Reference:{" "}
                          <a
                            href="https://www.ardoq.com/blog/reducing-costs-ea-success"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1"
                          >
                            Ardoq Blog - Reducing Costs EA Success
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-slate-900">$5M</p>
                        <p className="text-xs text-slate-600">2-year savings</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2 text-sm">Approach:</h4>
                        <ul className="space-y-1 text-slate-700 text-sm">
                          <li>• Mapped full IT architecture landscape</li>
                          <li>• Identified duplicate applications</li>
                          <li>• Found unused software licenses</li>
                          <li>• Discovered wasted cloud spend</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2 text-sm">Timeline:</h4>
                        <ul className="space-y-1 text-slate-700 text-sm">
                          <li>• Year 1: $2M savings</li>
                          <li>• Year 2: $3M savings</li>
                          <li>• Ongoing optimization</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
