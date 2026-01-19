"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Server,
  Database,
  HardDrive,
  Globe,
  Zap,
  Sparkles,
  Loader2,
} from "lucide-react"
import { Recommendation, ImpactLevel } from "@/lib/agent/recommender"
import { useGenerateStructuredExplanation, useAIStatus, StructuredExplanation, AlternativeAction } from "@/hooks/useAIExplanation"
import { Progress } from "@/components/ui/progress"

interface RecommendationCardProps {
  recommendation: Recommendation
  onApprove: () => void
  onReject: (reason?: string) => void
  onSnooze: (days: number) => void
  onSchedule: (date: Date) => void
  onExecuteAlternative?: (action: string, target?: string) => void
  isProcessing?: boolean
}

// Impact level colors and icons
const impactConfig: Record<
  ImpactLevel,
  { color: string; bgColor: string; label: string }
> = {
  critical: {
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    label: "CRITICAL",
  },
  high: {
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    label: "HIGH IMPACT",
  },
  medium: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200",
    label: "MEDIUM IMPACT",
  },
  low: {
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    label: "LOW IMPACT",
  },
}

// Resource type icons
const resourceIcons: Record<string, typeof Server> = {
  instances: Server,
  rds_instances: Database,
  cache_clusters: Database,
  load_balancers: Globe,
  lambda_functions: Zap,
  volumes: HardDrive,
  snapshots: HardDrive,
  s3_buckets: HardDrive,
  autoscaling_groups: Server,
  log_groups: Server,
  elastic_ips: Globe,
}

// Risk level colors for structured explanation
const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  medium: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  high: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
}

// Structured Explanation Display Component
function StructuredExplanationDisplay({
  explanation,
  onExecuteAlternative,
  isProcessing
}: {
  explanation: StructuredExplanation
  onExecuteAlternative?: (action: string, target?: string) => void
  isProcessing?: boolean
}) {
  const riskStyle = riskColors[explanation.risk.level] || riskColors.medium

  return (
    <div className="bg-gradient-to-br from-primary/5 via-white to-primary/5 rounded-lg border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="bg-primary/10 px-4 py-2 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-primary text-sm">AI Analysis</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current State with Utilization Bars */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Current Resource State
          </h4>
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">{explanation.currentState.resource}</span>
              <Badge variant="outline" className="text-xs">{explanation.currentState.type}</Badge>
            </div>
            <div className="space-y-2">
              {explanation.currentState.utilization.map((util, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{util.metric}</span>
                    <span>{util.current} / {util.capacity}</span>
                  </div>
                  <Progress
                    value={util.percentage}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Problem Analysis */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Why This Is Wasteful
          </h4>
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-sm font-medium text-red-800 mb-1">{explanation.problem.summary}</p>
            <p className="text-xs text-red-600">{explanation.problem.details}</p>
          </div>
        </div>

        {/* Recommendation */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recommended Action
          </h4>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-green-600 text-white text-xs">{explanation.recommendation.action}</Badge>
              {explanation.recommendation.target !== "N/A" && (
                <span className="text-sm font-medium text-green-800">→ {explanation.recommendation.target}</span>
              )}
            </div>
            <p className="text-xs text-green-600">{explanation.recommendation.reason}</p>
          </div>
        </div>

        {/* Alternative Actions */}
        {explanation.alternatives && explanation.alternatives.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Alternative Options
            </h4>
            <div className="space-y-2">
              {explanation.alternatives.map((alt, idx) => {
                const altRiskStyle = riskColors[alt.risk] || riskColors.medium
                return (
                  <div key={idx} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                          {alt.action}
                        </Badge>
                        {alt.target !== "N/A" && (
                          <span className="text-sm font-medium text-blue-800">→ {alt.target}</span>
                        )}
                      </div>
                      <Badge className={`${altRiskStyle.bg} ${altRiskStyle.text} text-xs border ${altRiskStyle.border}`}>
                        {alt.risk} risk
                      </Badge>
                    </div>
                    <p className="text-xs text-blue-600 mb-2">{alt.reason}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-500">
                          Cost: <span className="font-medium text-gray-700">{alt.projectedCost}</span>
                        </span>
                        <span className="text-gray-500">
                          Savings: <span className="font-medium text-green-600">{alt.savings}</span>
                        </span>
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          {alt.savingsPercent}% reduction
                        </Badge>
                      </div>
                      {onExecuteAlternative && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onExecuteAlternative(alt.action, alt.target)}
                          disabled={isProcessing}
                          className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Execute
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Financial Impact */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Financial Impact
          </h4>
          <div className="bg-white rounded-lg p-3 border">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500">Current</p>
                <p className="text-sm font-semibold text-gray-700">{explanation.impact.currentCost}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">After</p>
                <p className="text-sm font-semibold text-gray-700">{explanation.impact.projectedCost}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Savings</p>
                <p className="text-sm font-semibold text-green-600">{explanation.impact.savings}</p>
              </div>
            </div>
            <div className="mt-2 text-center">
              <Badge className="bg-green-100 text-green-700 text-xs">
                {explanation.impact.savingsPercent}% reduction
              </Badge>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Risk Assessment
          </h4>
          <div className={`rounded-lg p-3 border ${riskStyle.bg} ${riskStyle.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${riskStyle.text} border ${riskStyle.border} bg-white text-xs uppercase`}>
                {explanation.risk.level} risk
              </Badge>
            </div>
            <ul className="text-xs space-y-1">
              {explanation.risk.considerations.map((consideration, idx) => (
                <li key={idx} className={`flex items-start gap-1 ${riskStyle.text}`}>
                  <span className="mt-1">•</span>
                  <span>{consideration}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RecommendationCard({
  recommendation,
  onApprove,
  onReject,
  onSnooze,
  onSchedule,
  onExecuteAlternative,
  isProcessing = false,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false)
  const [structuredExplanation, setStructuredExplanation] = useState<StructuredExplanation | null>(null)
  const [simpleExplanation, setSimpleExplanation] = useState<string | null>(recommendation.ai_explanation || null)

  // AI hooks
  const { data: aiStatus } = useAIStatus()
  const generateStructuredExplanation = useGenerateStructuredExplanation()

  const impact = impactConfig[recommendation.impact_level] || impactConfig.medium
  const ResourceIcon = resourceIcons[recommendation.resource_type] || Server

  // Handle AI explanation generation
  const handleGenerateExplanation = async () => {
    try {
      const result = await generateStructuredExplanation.mutateAsync({
        resourceName: recommendation.resource_name,
        resourceType: recommendation.resource_type,
        scenarioId: recommendation.scenario_id,
        scenarioName: recommendation.scenario_name,
        action: recommendation.action,
        potentialSavings: recommendation.potential_savings || 0,
        currentCost: recommendation.current_monthly_cost || 0,
        details: recommendation.details || {},
        region: recommendation.region || undefined,
        env: recommendation.env || undefined,
      })
      if (result.structured) {
        setStructuredExplanation(result.structured)
      } else {
        // Fallback to simple explanation
        setSimpleExplanation(result.explanation)
      }
    } catch (error) {
      console.error("Failed to generate AI explanation:", error)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "$0.00"
    return `$${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Card className={`border-2 ${impact.bgColor} transition-all duration-200`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <ResourceIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={`${impact.color} border-current text-xs font-semibold`}
                >
                  {impact.label}
                </Badge>
                {recommendation.status === "snoozed" && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Snoozed until {formatDate(recommendation.snoozed_until)}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 truncate">
                {recommendation.title}
              </h3>
              <div className="text-sm text-gray-600 mt-1 flex items-center gap-1 flex-wrap">
                <span>{recommendation.resource_name}</span>
                <span>&bull;</span>
                <span>{recommendation.region || "unknown"}</span>
                {recommendation.env && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {recommendation.env}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-green-600 font-semibold">
              <DollarSign className="h-4 w-4" />
              <span>Save {formatCurrency(recommendation.potential_savings)}/mo</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {recommendation.confidence}% confidence
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Description */}
        <p className="text-sm text-gray-700 mb-4">
          {recommendation.description}
        </p>

        {/* AI Explanation */}
        {structuredExplanation ? (
          <div className="mb-4">
            <StructuredExplanationDisplay
              explanation={structuredExplanation}
              onExecuteAlternative={onExecuteAlternative}
              isProcessing={isProcessing}
            />
          </div>
        ) : simpleExplanation ? (
          <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-3 mb-4 border border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  {simpleExplanation}
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  AI-powered insight
                </Badge>
              </div>
            </div>
          </div>
        ) : aiStatus?.configured ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateExplanation}
            disabled={generateStructuredExplanation.isPending}
            className="mb-4 text-primary border-primary/30 hover:bg-primary/5"
          >
            {generateStructuredExplanation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                Analyze with AI
              </>
            )}
          </Button>
        ) : null}

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show details
            </>
          )}
        </button>

        {expanded && (
          <div className="bg-white rounded-lg p-3 mb-4 border text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">Resource Type:</span>{" "}
                <span className="font-medium">{recommendation.resource_type}</span>
              </div>
              <div>
                <span className="text-gray-500">Action:</span>{" "}
                <span className="font-medium">{recommendation.action}</span>
              </div>
              <div>
                <span className="text-gray-500">Current Cost:</span>{" "}
                <span className="font-medium">
                  {formatCurrency(recommendation.current_monthly_cost)}/mo
                </span>
              </div>
              <div>
                <span className="text-gray-500">Risk Level:</span>{" "}
                <span className="font-medium capitalize">{recommendation.risk_level}</span>
              </div>
              <div>
                <span className="text-gray-500">Scenario:</span>{" "}
                <span className="font-medium">{recommendation.scenario_name}</span>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>{" "}
                <span className="font-medium">{formatDate(recommendation.created_at)}</span>
              </div>
            </div>

            {/* Details JSON (for debugging) */}
            {recommendation.details && Object.keys(recommendation.details).length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-gray-500 text-xs">Additional Details:</span>
                <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
                  {JSON.stringify(recommendation.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={onApprove}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>

          <Button
            onClick={() => onReject()}
            disabled={isProcessing}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>

          {/* Snooze dropdown */}
          <div className="relative">
            <Button
              onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
              disabled={isProcessing}
              variant="outline"
            >
              <Clock className="h-4 w-4 mr-1" />
              Snooze
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>

            {showSnoozeOptions && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[120px]">
                {[1, 3, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      onSnooze(days)
                      setShowSnoozeOptions(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    {days} day{days > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={() => {
              // Schedule for next weekend (Saturday at 2 AM)
              const now = new Date()
              const saturday = new Date(now)
              saturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7))
              saturday.setHours(2, 0, 0, 0)
              onSchedule(saturday)
            }}
            disabled={isProcessing}
            variant="outline"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Schedule Weekend
          </Button>
        </div>

        {/* Risk warning for high/critical */}
        {(recommendation.risk_level === "high" ||
          recommendation.impact_level === "critical") && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium text-amber-800">Caution:</span>{" "}
              <span className="text-amber-700">
                This is a{" "}
                {recommendation.risk_level === "high" ? "high-risk" : "critical"}{" "}
                optimization. Please review carefully before approving.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
