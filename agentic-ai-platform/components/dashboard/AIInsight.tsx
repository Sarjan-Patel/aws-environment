"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardInsight, useAIStatus } from "@/hooks/useAIExplanation"
import { Sparkles, RefreshCw, AlertCircle, Lightbulb } from "lucide-react"
import { useMemo } from "react"

interface AIInsightProps {
  totalResources: number
  totalDetections: number
  totalSavings: number
  topScenarios: { scenarioId: string; scenarioName: string; count: number; totalSavings: number }[]
  autoSafeCount: number
  approvalCount: number
}

export function AIInsight({
  totalResources,
  totalDetections,
  totalSavings,
  topScenarios,
  autoSafeCount,
  approvalCount,
}: AIInsightProps) {
  // Check if AI is configured
  const { data: aiStatus, isLoading: statusLoading } = useAIStatus()

  // Prepare input for dashboard insight
  const insightInput = useMemo(() => {
    if (totalResources === 0 && totalDetections === 0) return null

    return {
      totalResources,
      totalDetections,
      totalSavings,
      topScenarios: topScenarios.map((s) => ({
        name: s.scenarioName,
        count: s.count,
        savings: s.totalSavings,
      })),
      autoSafeCount,
      approvalCount,
    }
  }, [totalResources, totalDetections, totalSavings, topScenarios, autoSafeCount, approvalCount])

  // Fetch AI insight
  const {
    data: insight,
    isLoading: insightLoading,
    error: insightError,
    refetch,
  } = useDashboardInsight(aiStatus?.configured ? insightInput : null)

  // Show nothing if AI is not configured and loading
  if (statusLoading) {
    return (
      <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show setup prompt if AI is not configured
  if (!aiStatus?.configured) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">AI Insights Available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your OpenAI API key to .env.local to enable AI-powered insights and explanations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show loading state
  if (insightLoading) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Generating insight...</span>
                <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (insightError) {
    return (
      <Card className="border-2 border-destructive/20 bg-destructive/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Failed to generate insight</p>
              <p className="text-xs text-muted-foreground mt-1">{insightError.message}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show the AI insight
  if (!insight?.explanation) {
    return null
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">AI Insight</span>
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by OpenAI
              </Badge>
              {insight.cached && (
                <Badge variant="outline" className="text-xs">
                  Cached
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight.explanation}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => refetch()}
            title="Regenerate insight"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
