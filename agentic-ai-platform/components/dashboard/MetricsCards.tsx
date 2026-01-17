"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ResourceCounts } from "@/hooks/useWasteDetection"
import {
  Activity,
  DollarSign,
  TrendingDown,
  Zap,
  AlertTriangle,
} from "lucide-react"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function MetricCardSkeleton() {
  return (
    <Card className="relative overflow-hidden border-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </CardHeader>
      <CardContent className="pt-2">
        <Skeleton className="h-9 w-24 mb-3" />
        <Skeleton className="h-4 w-36" />
      </CardContent>
    </Card>
  )
}

interface MetricsCardsProps {
  counts: ResourceCounts | null
  totalPotentialSavings: number
  totalDetections: number
  autoSafeCount: number
  autoSafeSavings: number
  isLoading: boolean
}

export function MetricsCards({
  counts,
  totalPotentialSavings,
  totalDetections,
  autoSafeCount,
  autoSafeSavings,
  isLoading,
}: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {/* Total Resources */}
      <Card className="relative overflow-hidden border-2 card-hover group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-full -mr-20 -mt-20 blur-xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Total Resources</CardTitle>
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-3xl font-bold mb-1">
            {counts?.total.toLocaleString() ?? 0}
          </div>
          <p className="text-sm text-muted-foreground">
            {counts?.instances ?? 0} instances, {counts?.lambdaFunctions ?? 0} lambdas
          </p>
        </CardContent>
      </Card>

      {/* Estimated Monthly Cost - placeholder until metrics are added to unified hook */}
      <Card className="relative overflow-hidden border-2 card-hover group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-full -mr-20 -mt-20 blur-xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Est. Monthly Cost</CardTitle>
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
            <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-3xl font-bold mb-1">
            {formatCurrency(totalPotentialSavings * 3)}
          </div>
          <p className="text-sm text-muted-foreground">
            Based on resource analysis
          </p>
        </CardContent>
      </Card>

      {/* Potential Savings */}
      <Card className="relative overflow-hidden border-2 card-hover group border-green-500/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/15 to-green-600/10 rounded-full -mr-20 -mt-20 blur-xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Potential Savings</CardTitle>
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-500/25 to-green-600/15 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
            <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
            {formatCurrency(totalPotentialSavings)}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {totalDetections} opportunities found
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Safe Actions */}
      <Card className="relative overflow-hidden border-2 card-hover group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-full -mr-20 -mt-20 blur-xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Auto-Safe Actions</CardTitle>
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
            <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-3xl font-bold mb-1">
            {autoSafeCount}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Ready to execute
            </p>
            {autoSafeSavings > 0 && (
              <Badge variant="outline" className="text-xs font-medium shadow-sm">
                {formatCurrency(autoSafeSavings)}/mo
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface WasteAlertBannerProps {
  totalDetections: number
  totalPotentialSavings: number
  scenarioCount: number
  isLoading: boolean
}

export function WasteAlertBanner({
  totalDetections,
  totalPotentialSavings,
  scenarioCount,
  isLoading,
}: WasteAlertBannerProps) {
  if (isLoading || totalDetections === 0) {
    return null
  }

  return (
    <Card className="border-2 border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent shadow-md">
      <CardContent className="flex items-center gap-4 py-5">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center shadow-sm">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-base">
            {totalDetections} waste scenarios detected
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Potential savings of {formatCurrency(totalPotentialSavings)}/month
          </p>
        </div>
        <Badge variant="secondary" className="shadow-sm px-3 py-1.5 text-sm font-medium">
          {scenarioCount} types
        </Badge>
      </CardContent>
    </Card>
  )
}
