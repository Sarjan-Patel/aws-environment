"use client"

import { cn } from "@/lib/utils"

interface MetricGaugeProps {
  value: number | null
  label: string
  maxValue?: number
  size?: "sm" | "md" | "lg"
  showPercentage?: boolean
}

function getColorClass(percentage: number): string {
  if (percentage < 30) return "text-green-500"
  if (percentage < 60) return "text-yellow-500"
  if (percentage < 80) return "text-orange-500"
  return "text-red-500"
}

function getStrokeClass(percentage: number): string {
  if (percentage < 30) return "stroke-green-500"
  if (percentage < 60) return "stroke-yellow-500"
  if (percentage < 80) return "stroke-orange-500"
  return "stroke-red-500"
}

export function MetricGauge({
  value,
  label,
  maxValue = 100,
  size = "md",
  showPercentage = true,
}: MetricGaugeProps) {
  const percentage = value !== null ? Math.min((value / maxValue) * 100, 100) : 0
  const displayValue = value !== null ? Math.round(value) : "—"

  const sizes = {
    sm: { width: 48, stroke: 4, text: "text-xs", labelText: "text-[10px]" },
    md: { width: 64, stroke: 5, text: "text-sm", labelText: "text-xs" },
    lg: { width: 80, stroke: 6, text: "text-base", labelText: "text-sm" },
  }

  const { width, stroke, text, labelText } = sizes[size]
  const radius = (width - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width, height: width }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={width} height={width}>
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            className="stroke-muted"
          />
          {/* Progress circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            className={cn(
              "transition-all duration-500",
              value !== null ? getStrokeClass(percentage) : "stroke-muted"
            )}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: value !== null ? strokeDashoffset : circumference,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-semibold", text, value !== null ? getColorClass(percentage) : "text-muted-foreground")}>
            {displayValue}
            {showPercentage && value !== null && "%"}
          </span>
        </div>
      </div>
      <span className={cn("text-muted-foreground", labelText)}>{label}</span>
    </div>
  )
}

interface StatusIndicatorProps {
  status: "healthy" | "warning" | "critical" | "idle" | "unknown"
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

const statusConfig = {
  healthy: { color: "bg-green-500", label: "Healthy", animate: false },
  warning: { color: "bg-yellow-500", label: "Warning", animate: true },
  critical: { color: "bg-red-500", label: "Critical", animate: true },
  idle: { color: "bg-blue-500", label: "Idle", animate: false },
  unknown: { color: "bg-gray-400", label: "Unknown", animate: false },
}

export function StatusIndicator({ status, size = "md", showLabel = false }: StatusIndicatorProps) {
  const { color, label, animate } = statusConfig[status]

  const sizes = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "rounded-full",
          sizes[size],
          color,
          animate && "animate-pulse"
        )}
      />
      {showLabel && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  )
}

export function getResourceStatus(
  cpu: number | null,
  memory?: number | null
): "healthy" | "warning" | "critical" | "idle" | "unknown" {
  if (cpu === null) return "unknown"

  // Check if idle (very low utilization)
  if (cpu < 5 && (memory === null || memory === undefined || memory < 10)) return "idle"

  // Check critical thresholds
  if (cpu > 90 || (memory !== null && memory !== undefined && memory > 90)) return "critical"

  // Check warning thresholds
  if (cpu > 70 || (memory !== null && memory !== undefined && memory > 70)) return "warning"

  return "healthy"
}

interface ResourceUtilizationProps {
  cpu: number | null
  memory: number | null
  compact?: boolean
}

export function ResourceUtilization({ cpu, memory, compact = false }: ResourceUtilizationProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">CPU</span>
          <span className={cn("text-sm font-medium", cpu !== null ? getColorClass(cpu) : "text-muted-foreground")}>
            {cpu !== null ? `${Math.round(cpu)}%` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Mem</span>
          <span className={cn("text-sm font-medium", memory !== null ? getColorClass(memory) : "text-muted-foreground")}>
            {memory !== null ? `${Math.round(memory)}%` : "—"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <MetricGauge value={cpu} label="CPU" size="sm" />
      <MetricGauge value={memory} label="Memory" size="sm" />
    </div>
  )
}
