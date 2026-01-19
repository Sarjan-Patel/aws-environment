"use client"

import { Zap, Eye, EyeOff, Lock } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  isPolicyLocked,
  validatePolicyUpdate,
  getPolicyLabel,
  type OptimizationPolicy,
  type ResourceType,
} from "@/lib/utils/policyLock"

interface PolicyDropdownProps {
  resource: {
    id: string
    type: ResourceType
    env?: string | null
    optimization_policy?: OptimizationPolicy
    optimization_policy_locked?: boolean
  }
  onPolicyChange: (resourceId: string, newPolicy: OptimizationPolicy) => void
  disabled?: boolean
  className?: string
}

const POLICY_OPTIONS: {
  value: OptimizationPolicy
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}[] = [
  {
    value: "auto_safe",
    label: "Auto-Safe",
    description: "Agent can automatically optimize",
    icon: Zap,
    color: "text-green-600",
  },
  {
    value: "recommend_only",
    label: "Recommend Only",
    description: "Requires approval for changes",
    icon: Eye,
    color: "text-blue-600",
  },
  {
    value: "ignore",
    label: "Ignore",
    description: "Agent will not touch this resource",
    icon: EyeOff,
    color: "text-gray-500",
  },
]

export function PolicyDropdown({
  resource,
  onPolicyChange,
  disabled,
  className,
}: PolicyDropdownProps) {
  const currentPolicy = resource.optimization_policy || "recommend_only"
  const locked = isPolicyLocked(resource)

  const handleChange = (value: string) => {
    const newPolicy = value as OptimizationPolicy
    const validation = validatePolicyUpdate(resource, newPolicy)

    if (!validation.valid) {
      console.warn(`[PolicyDropdown] Invalid policy change:`, validation.error)
      return
    }

    onPolicyChange(resource.id, newPolicy)
  }

  const currentOption = POLICY_OPTIONS.find((o) => o.value === currentPolicy)
  const CurrentIcon = currentOption?.icon || Eye

  return (
    <Select
      value={currentPolicy}
      onValueChange={handleChange}
      disabled={disabled || locked}
    >
      <SelectTrigger
        className={cn(
          "w-[140px]",
          locked && "opacity-60 cursor-not-allowed",
          className
        )}
      >
        <div className="flex items-center gap-2">
          {locked ? (
            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <CurrentIcon className={cn("h-4 w-4 shrink-0", currentOption?.color)} />
          )}
          <span className="truncate">{currentOption?.label || "Select"}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="w-[220px]">
        {POLICY_OPTIONS.map((option) => {
          const Icon = option.icon
          const isDisabled =
            option.value === "auto_safe" &&
            !validatePolicyUpdate(resource, option.value).valid

          return (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={isDisabled}
              className={cn("py-2", isDisabled && "opacity-50")}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4 shrink-0", option.color)} />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

interface PolicyBadgeProps {
  policy: OptimizationPolicy
  className?: string
}

export function PolicyBadge({ policy, className }: PolicyBadgeProps) {
  const option = POLICY_OPTIONS.find((o) => o.value === policy)
  if (!option) return null

  const Icon = option.icon

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        option.color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{option.label}</span>
    </div>
  )
}
