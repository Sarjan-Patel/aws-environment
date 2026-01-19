"use client"

import { Lock, Shield, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  isPolicyLocked,
  getLockReason,
  type ResourceType,
} from "@/lib/utils/policyLock"

interface LockedIndicatorProps {
  resource: {
    type: ResourceType
    env?: string | null
    optimization_policy_locked?: boolean
  }
  showReason?: boolean
  className?: string
}

export function LockedIndicator({
  resource,
  showReason = true,
  className,
}: LockedIndicatorProps) {
  const locked = isPolicyLocked(resource)
  const reason = getLockReason(resource)

  if (!locked) return null

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
      >
        <Lock className="h-3 w-3 mr-1" />
        Locked
      </Badge>
      {showReason && reason && (
        <span className="text-xs text-muted-foreground">{reason}</span>
      )}
    </div>
  )
}

interface LockIconProps {
  resource: {
    type: ResourceType
    env?: string | null
    optimization_policy_locked?: boolean
  }
  className?: string
}

export function LockIcon({ resource, className }: LockIconProps) {
  const locked = isPolicyLocked(resource)
  const reason = getLockReason(resource)

  if (!locked) return null

  // Different icon based on lock type
  const Icon = resource.optimization_policy_locked ? Lock : Shield

  return (
    <div className={cn("group relative", className)}>
      <Icon className="h-4 w-4 text-amber-500" />
      {reason && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block">
          <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border">
            {reason}
          </div>
        </div>
      )}
    </div>
  )
}

interface ProductionBadgeProps {
  env?: string | null
  className?: string
}

export function ProductionBadge({ env, className }: ProductionBadgeProps) {
  if (env !== "prod") return null

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-red-200 bg-red-50 text-red-700 text-xs",
        className
      )}
    >
      <AlertTriangle className="h-3 w-3 mr-1" />
      Production
    </Badge>
  )
}
