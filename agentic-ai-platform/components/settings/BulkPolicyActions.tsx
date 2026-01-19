"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"
import { Zap, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useBulkPolicyUpdate } from "@/hooks/useBulkPolicyUpdate"
import type { PolicyResource } from "@/hooks/usePolicyResources"
import { isPolicyLocked, getPolicyLabel, type OptimizationPolicy } from "@/lib/utils/policyLock"

interface BulkPolicyActionsProps {
  selectedResources: PolicyResource[]
  onComplete?: () => void
}

export function BulkPolicyActions({ selectedResources, onComplete }: BulkPolicyActionsProps) {
  const bulkUpdate = useBulkPolicyUpdate()
  const [selectedPolicy, setSelectedPolicy] = useState<OptimizationPolicy | "">("")
  const [confirmDialog, setConfirmDialog] = useState(false)
  const [resultMessage, setResultMessage] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const updatableResources = selectedResources.filter(
    (r) =>
      !isPolicyLocked(r) &&
      (selectedPolicy === "" || r.optimization_policy !== selectedPolicy)
  )

  const lockedResources = selectedResources.filter((r) => isPolicyLocked(r))

  const handleApply = async () => {
    if (!selectedPolicy || updatableResources.length === 0) return

    setConfirmDialog(false)

    try {
      const result = await bulkUpdate.mutateAsync({
        resources: updatableResources,
        newPolicy: selectedPolicy,
      })

      if (result.successCount > 0) {
        setResultMessage({
          type: "success",
          message: `Updated ${result.successCount} resource${result.successCount !== 1 ? "s" : ""} to ${getPolicyLabel(selectedPolicy)}${result.skippedCount > 0 ? ` (${result.skippedCount} skipped)` : ""}`,
        })
        onComplete?.()
      } else if (result.skippedCount > 0) {
        setResultMessage({
          type: "error",
          message: `All ${result.skippedCount} resources were skipped (locked or already set)`,
        })
      }

      setTimeout(() => setResultMessage(null), 5000)
    } catch (error) {
      setResultMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update policies",
      })
      setTimeout(() => setResultMessage(null), 5000)
    }
  }

  if (selectedResources.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {resultMessage && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            resultMessage.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {resultMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span className="text-sm">{resultMessage.message}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-muted/50 rounded-lg border">
        <span className="text-sm font-medium shrink-0">
          {selectedResources.length} selected
        </span>

        <div className="flex-1 hidden sm:block" />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 sm:flex-initial">
          <Select
            value={selectedPolicy}
            onValueChange={(v) => setSelectedPolicy(v as OptimizationPolicy)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Set policy..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto_safe">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  Auto-Safe
                </div>
              </SelectItem>
              <SelectItem value="recommend_only">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-600" />
                  Recommend Only
                </div>
              </SelectItem>
              <SelectItem value="ignore">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-gray-500" />
                  Ignore
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setConfirmDialog(true)}
            disabled={
              !selectedPolicy ||
              updatableResources.length === 0 ||
              bulkUpdate.isPending
            }
            className="w-full sm:w-auto whitespace-nowrap"
          >
            {bulkUpdate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              `Apply to ${updatableResources.length}`
            )}
          </Button>
        </div>
      </div>

      {lockedResources.length > 0 && (
        <div className="text-xs text-amber-600 px-4">
          {lockedResources.length} resource{lockedResources.length !== 1 ? "s are" : " is"} locked and will be skipped
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Policies</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>
                  You are about to update <strong>{updatableResources.length}</strong> resource
                  {updatableResources.length !== 1 ? "s" : ""} to{" "}
                  <Badge variant="secondary" className="mx-1">
                    {selectedPolicy && getPolicyLabel(selectedPolicy)}
                  </Badge>
                </p>

                {lockedResources.length > 0 && (
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-sm">
                    {lockedResources.length} locked resource
                    {lockedResources.length !== 1 ? "s" : ""} will be skipped
                  </div>
                )}

                {selectedPolicy === "auto_safe" && (
                  <div className="p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm">
                    Production resources cannot be set to Auto-Safe and will be skipped automatically
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply}>
              Update {updatableResources.length} Resource{updatableResources.length !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
