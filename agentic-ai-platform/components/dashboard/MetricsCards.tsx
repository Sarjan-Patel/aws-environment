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
      <Card className="relative overflow-hidden border card-hover group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-muted/30 rounded-full -mr-20 -mt-20 blur-xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Total Resources</CardTitle>
          <div className="h-11 w-11 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-3xl font-semibold mb-1">
            {counts?.total.toLocaleString() ?? 0}
          </div>
          <p className="text-sm text-muted-foreground">
            {counts?.instances ?? 0} instances, {counts?.lambdaFunctions ?? 0} lambdas
          </p>
        </CardContent>
      </Card>

      {/* Estimated Monthly Cost - placeholder until metrics are added to unified hook */}
      <Card className="relative overflow-hidden border card-hover group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-muted/30 rounded-full -mr-20 -mt-20 blur-xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Est. Monthly Cost</CardTitle>
          <div className="h-11 w-11 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-3xl font-semibold mb-1">
            {formatCurrency(totalPotentialSavings * 3)}
          </div>
          <p className="text-sm text-muted-foreground">
            Based on resource analysis
          </p>
        </CardContent>
      </Card>

      {/* Potential Savings */}
      <Card className="relative overflow-hidden border card-hover group border-border">
        <div className="absolute top-0 right-0 w-40 h-40 bg-muted/30 rounded-full -mr-20 -mt-20 blur-xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Potential Savings</CardTitle>
          <div className="h-11 w-11 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-3xl font-semibold text-foreground mb-1">
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
      <Card className="relative overflow-hidden border card-hover group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-muted/30 rounded-full -mr-20 -mt-20 blur-xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Auto-Safe Actions</CardTitle>
          <div className="h-11 w-11 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Zap className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-3xl font-semibold mb-1">
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
    <Card className="border border-border bg-muted/30 shadow-sm">
      <CardContent className="flex items-center gap-4 py-5">
        <div className="h-12 w-12 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shadow-sm">
          <AlertTriangle className="h-6 w-6 text-muted-foreground" />
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
