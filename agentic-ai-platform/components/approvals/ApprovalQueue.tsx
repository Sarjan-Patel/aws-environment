"use client"

import { useState } from "react"
import { RecommendationCard } from "./RecommendationCard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  Wand2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react"
import { useApprovalsData } from "@/hooks/useRecommendations"
import { Recommendation } from "@/lib/agent/recommender"

interface ApprovalQueueProps {
  onApprovalComplete?: () => void
}

export function ApprovalQueue({ onApprovalComplete }: ApprovalQueueProps) {
  const {
    recommendations,
    summary,
    isLoading,
    isGenerating,
    error,
    generateRecommendations,
    approve,
    reject,
    snooze,
    schedule,
    isApproving,
    isRejecting,
    isSnoozing,
    isScheduling,
    refetch,
  } = useApprovalsData()

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("pending")

  const isProcessing = isApproving || isRejecting || isSnoozing || isScheduling

  // Filter recommendations by status for tabs
  const pendingRecs = recommendations.filter(
    (r) => r.status === "pending" || r.status === "snoozed"
  )
  const snoozedRecs = recommendations.filter((r) => r.status === "snoozed")

  const handleApprove = async (rec: Recommendation) => {
    setProcessingId(rec.id)
    try {
      await approve({ id: rec.id })
      onApprovalComplete?.()
    } catch (err) {
      console.error("Failed to approve:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (rec: Recommendation, reason?: string) => {
    setProcessingId(rec.id)
    try {
      await reject({ id: rec.id, reason })
      onApprovalComplete?.()
    } catch (err) {
      console.error("Failed to reject:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleSnooze = async (rec: Recommendation, days: number) => {
    setProcessingId(rec.id)
    try {
      await snooze({ id: rec.id, days })
    } catch (err) {
      console.error("Failed to snooze:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleSchedule = async (rec: Recommendation, date: Date) => {
    setProcessingId(rec.id)
    try {
      await schedule({ id: rec.id, scheduledFor: date })
    } catch (err) {
      console.error("Failed to schedule:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleGenerate = async () => {
    try {
      const result = await generateRecommendations()
      console.log(`Generated ${result.created} recommendations, skipped ${result.skipped}`)
    } catch (err) {
      console.error("Failed to generate recommendations:", err)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Loading recommendations...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-red-600">
            <AlertTriangle className="h-8 w-8 mb-4" />
            <p className="font-medium">Failed to load recommendations</p>
            <p className="text-sm text-red-500 mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <Button onClick={() => refetch()} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Approval Queue</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve optimization recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="sm"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            Generate Recommendations
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="text-green-600 font-bold text-2xl">
                  ${summary.pendingSavings.toFixed(0)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Potential</p>
                  <p className="text-xs text-muted-foreground">Savings/mo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingRecs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingRecs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="snoozed">
            Snoozed
            {snoozedRecs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {snoozedRecs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingRecs.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  All Caught Up!
                </CardTitle>
                <CardDescription>
                  No pending recommendations requiring approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Scan for New Recommendations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRecs.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onApprove={() => handleApprove(rec)}
                  onReject={(reason) => handleReject(rec, reason)}
                  onSnooze={(days) => handleSnooze(rec, days)}
                  onSchedule={(date) => handleSchedule(rec, date)}
                  isProcessing={isProcessing && processingId === rec.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="snoozed" className="mt-4">
          {snoozedRecs.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Snoozed Recommendations</CardTitle>
                <CardDescription>
                  Snoozed recommendations will appear here.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-4">
              {snoozedRecs.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onApprove={() => handleApprove(rec)}
                  onReject={(reason) => handleReject(rec, reason)}
                  onSnooze={(days) => handleSnooze(rec, days)}
                  onSchedule={(date) => handleSchedule(rec, date)}
                  isProcessing={isProcessing && processingId === rec.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
