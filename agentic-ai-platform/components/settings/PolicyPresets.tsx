"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Shield, Zap, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react"
import { useBulkPolicyUpdate, POLICY_PRESETS, type PolicyPreset } from "@/hooks/useBulkPolicyUpdate"
import { usePolicyResources, type PolicyResource } from "@/hooks/usePolicyResources"
import { getPolicyLabel, type OptimizationPolicy, type ResourceType } from "@/lib/utils/policyLock"

const PRESET_ICONS: Record<PolicyPreset, React.ComponentType<{ className?: string }>> = {
  conservative: Shield,
  balanced: Zap,
  aggressive: AlertTriangle,
}

const PRESET_COLORS: Record<PolicyPreset, string> = {
  conservative: "text-blue-600",
  balanced: "text-green-600",
  aggressive: "text-amber-600",
}

export function PolicyPresets() {
  const { data: resources } = usePolicyResources()
  const bulkUpdate = useBulkPolicyUpdate()
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    preset: PolicyPreset | null
  }>({ open: false, preset: null })
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleApplyPreset = async (preset: PolicyPreset) => {
    if (!resources) return

    const config = POLICY_PRESETS[preset]
    setConfirmDialog({ open: false, preset: null })

    // Group resources by their target policy
    const resourcesToUpdate: { resources: PolicyResource[]; newPolicy: OptimizationPolicy }[] = []

    // Group resources by the policy they should have according to the preset
    const policyGroups = new Map<OptimizationPolicy, PolicyResource[]>()

    for (const resource of resources) {
      const targetPolicy = config.policies[resource.type]
      if (targetPolicy && resource.optimization_policy !== targetPolicy) {
        const group = policyGroups.get(targetPolicy) || []
        group.push(resource)
        policyGroups.set(targetPolicy, group)
      }
    }

    // Apply updates for each policy group
    let totalSuccess = 0
    let totalFailed = 0
    let totalSkipped = 0

    for (const [policy, groupResources] of Array.from(policyGroups.entries())) {
      try {
        const result = await bulkUpdate.mutateAsync({
          resources: groupResources,
          newPolicy: policy,
        })
        totalSuccess += result.successCount
        totalFailed += result.failCount
        totalSkipped += result.skippedCount
      } catch (error) {
        totalFailed += groupResources.length
      }
    }

    if (totalSuccess > 0) {
      setSuccessMessage(
        `Applied ${config.name} preset: ${totalSuccess} updated${totalFailed > 0 ? `, ${totalFailed} failed` : ""}${totalSkipped > 0 ? `, ${totalSkipped} skipped (locked)` : ""}`
      )
      setTimeout(() => setSuccessMessage(null), 5000)
    }
  }

  const openConfirmDialog = (preset: PolicyPreset) => {
    setConfirmDialog({ open: true, preset })
  }

  const getPresetStats = (preset: PolicyPreset) => {
    if (!resources) return { toUpdate: 0, locked: 0 }

    const config = POLICY_PRESETS[preset]
    let toUpdate = 0
    let locked = 0

    for (const resource of resources) {
      const targetPolicy = config.policies[resource.type]
      if (targetPolicy && resource.optimization_policy !== targetPolicy) {
        if (resource.optimization_policy_locked ||
            (targetPolicy === "auto_safe" && resource.env === "prod")) {
          locked++
        } else {
          toUpdate++
        }
      }
    }

    return { toUpdate, locked }
  }

  return (
    <div className="space-y-4">
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">{successMessage}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.entries(POLICY_PRESETS) as [PolicyPreset, typeof POLICY_PRESETS.conservative][]).map(
          ([key, config]) => {
            const Icon = PRESET_ICONS[key]
            const color = PRESET_COLORS[key]
            const stats = getPresetStats(key)

            return (
              <Card key={key} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    {config.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(config.policies)
                        .filter(([, policy]) => policy === "auto_safe")
                        .slice(0, 4)
                        .map(([type]) => (
                          <Badge key={type} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            {type.split("_").map(w => w[0].toUpperCase()).join("")}
                          </Badge>
                        ))}
                      {Object.entries(config.policies).filter(([, p]) => p === "auto_safe").length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{Object.entries(config.policies).filter(([, p]) => p === "auto_safe").length - 4}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {stats.toUpdate > 0 ? (
                        <span>{stats.toUpdate} resources will be updated</span>
                      ) : (
                        <span className="text-green-600">Already applied</span>
                      )}
                      {stats.locked > 0 && (
                        <span className="ml-2 text-amber-600">
                          ({stats.locked} locked)
                        </span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => openConfirmDialog(key)}
                      disabled={stats.toUpdate === 0 || bulkUpdate.isPending}
                    >
                      {bulkUpdate.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        `Apply ${config.name}`
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          }
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, preset: open ? confirmDialog.preset : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply {confirmDialog.preset && POLICY_PRESETS[confirmDialog.preset].name} Preset</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>
                  This will update the optimization policies for all resources according to the{" "}
                  <strong>{confirmDialog.preset && POLICY_PRESETS[confirmDialog.preset].name}</strong> preset.
                </p>

                {confirmDialog.preset && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-2">Policy Configuration:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(POLICY_PRESETS[confirmDialog.preset].policies).map(
                        ([type, policy]) => (
                          <div key={type} className="flex justify-between">
                            <span className="text-muted-foreground">{type}:</span>
                            <span className={policy === "auto_safe" ? "text-green-600" : "text-blue-600"}>
                              {getPolicyLabel(policy)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                <p className="text-sm text-amber-600">
                  Note: Locked resources and production resources will be skipped.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.preset && handleApplyPreset(confirmDialog.preset)}
            >
              Apply Preset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
