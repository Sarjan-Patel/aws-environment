"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Loader2,
} from "lucide-react"
import { Recommendation } from "@/lib/agent/recommender"

interface ApprovalDialogProps {
  recommendation: Recommendation | null
  mode: "approve" | "reject" | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason?: string) => Promise<void>
  isLoading?: boolean
}

export function ApprovalDialog({
  recommendation,
  mode,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: ApprovalDialogProps) {
  const [reason, setReason] = useState("")

  if (!recommendation || !mode) return null

  const handleConfirm = async () => {
    await onConfirm(mode === "reject" ? reason : undefined)
    setReason("")
  }

  const isApprove = mode === "approve"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {isApprove ? "Approve Recommendation" : "Reject Recommendation"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {isApprove
              ? "This will approve the optimization and allow it to be executed."
              : "This will reject the recommendation. It won't be shown again unless regenerated."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Recommendation summary */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div>
            <p className="font-medium text-gray-900">{recommendation.title}</p>
            <p className="text-sm text-gray-600 mt-1">
              {recommendation.resource_name}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <DollarSign className="h-4 w-4" />
              <span>
                Save ${recommendation.potential_savings?.toFixed(2) || "0.00"}/mo
              </span>
            </div>
            <Badge variant="outline" className="capitalize">
              {recommendation.impact_level} impact
            </Badge>
            <Badge variant="outline" className="capitalize">
              {recommendation.risk_level} risk
            </Badge>
          </div>

          <p className="text-sm text-gray-700">{recommendation.description}</p>
        </div>

        {/* Warning for high-risk approvals */}
        {isApprove &&
          (recommendation.risk_level === "high" ||
            recommendation.impact_level === "critical") && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-amber-800">Warning:</span>{" "}
                <span className="text-amber-700">
                  This is a {recommendation.risk_level}-risk optimization.
                  {recommendation.env === "prod" &&
                    " It affects production resources."}
                </span>
              </div>
            </div>
          )}

        {/* Rejection reason input */}
        {!isApprove && (
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for rejection (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why are you rejecting this recommendation?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              isApprove
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isApprove ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {isApprove ? "Approve" : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface ExecuteDialogProps {
  recommendation: Recommendation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isLoading?: boolean
}

export function ExecuteDialog({
  recommendation,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: ExecuteDialogProps) {
  if (!recommendation) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Execute Optimization
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            This will immediately execute the approved optimization action on
            the resource.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Action details */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div>
            <p className="font-medium text-gray-900">{recommendation.title}</p>
            <p className="text-sm text-gray-600 mt-1">
              Resource: {recommendation.resource_name}
            </p>
          </div>

          <div className="text-sm space-y-1">
            <p>
              <span className="text-gray-500">Action:</span>{" "}
              <span className="font-medium">{recommendation.action}</span>
            </p>
            <p>
              <span className="text-gray-500">Expected savings:</span>{" "}
              <span className="font-medium text-green-600">
                ${recommendation.potential_savings?.toFixed(2) || "0.00"}/mo
              </span>
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            This action will modify the resource. Ensure you have reviewed the
            details before proceeding.
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Execute Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
