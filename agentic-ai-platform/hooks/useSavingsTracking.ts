"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuditLog, AuditLogEntry } from "./useActionExecution"
import { useDashboardData } from "./useWasteDetection"

export interface SavingsDataPoint {
  date: string
  realized: number
  potential: number
  cumulative: number
}

export interface SavingsByScenario {
  scenarioId: string
  scenarioName: string
  realized: number
  potential: number
  actionCount: number
}

export interface SavingsStats {
  // Realized savings from executed actions
  realizedToday: number
  realizedThisWeek: number
  realizedThisMonth: number
  realizedAllTime: number

  // Potential savings from pending detections
  potentialTotal: number
  potentialAutoSafe: number
  potentialApprovalRequired: number

  // Trends
  trendData: SavingsDataPoint[]
  savingsByScenario: SavingsByScenario[]

  // Execution stats
  actionsExecutedToday: number
  actionsExecutedThisWeek: number
  actionsExecutedThisMonth: number
  successRate: number
}

// Average savings per action type (estimates based on typical AWS costs)
const SAVINGS_BY_ACTION: Record<string, number> = {
  "stop-instance": 30,
  "terminate-instance": 50,
  "delete-volume": 15,
  "delete-snapshot": 5,
  "release-eip": 4,
  "delete-lb": 25,
  "stop-rds": 45,
  "delete-log-group": 10,
  "stop-cache": 35,
  "default": 25,
}

function getSavingsForAction(action: string): number {
  return SAVINGS_BY_ACTION[action] || SAVINGS_BY_ACTION["default"]
}

/**
 * Hook to track savings from executed actions and potential savings
 * Combines audit log data with waste detection data
 */
export function useSavingsTracking() {
  const { data: auditLog, isLoading: auditLoading } = useAuditLog(1000)
  const {
    wasteDetection,
    autoSafe,
    approvals,
    wasteByScenario,
    isLoading: detectionLoading
  } = useDashboardData()

  const isLoading = auditLoading || detectionLoading

  if (isLoading || !auditLog) {
    return {
      stats: {
        realizedToday: 0,
        realizedThisWeek: 0,
        realizedThisMonth: 0,
        realizedAllTime: 0,
        potentialTotal: 0,
        potentialAutoSafe: 0,
        potentialApprovalRequired: 0,
        trendData: [],
        savingsByScenario: [],
        actionsExecutedToday: 0,
        actionsExecutedThisWeek: 0,
        actionsExecutedThisMonth: 0,
        successRate: 0,
      } as SavingsStats,
      isLoading: true,
    }
  }

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Calculate realized savings from successful audit log entries
  const successfulEntries = auditLog.filter((entry) => entry.success)

  let realizedToday = 0
  let realizedThisWeek = 0
  let realizedThisMonth = 0
  let realizedAllTime = 0
  let actionsToday = 0
  let actionsThisWeek = 0
  let actionsThisMonth = 0

  const savingsByScenarioMap: Record<string, SavingsByScenario> = {}

  for (const entry of successfulEntries) {
    const entryDate = new Date(entry.executed_at)
    const savings = getSavingsForAction(entry.action)

    realizedAllTime += savings

    if (entryDate >= monthStart) {
      realizedThisMonth += savings
      actionsThisMonth++
    }
    if (entryDate >= weekStart) {
      realizedThisWeek += savings
      actionsThisWeek++
    }
    if (entryDate >= today) {
      realizedToday += savings
      actionsToday++
    }

    // Track by scenario
    const scenarioId = entry.scenario_id
    if (!savingsByScenarioMap[scenarioId]) {
      savingsByScenarioMap[scenarioId] = {
        scenarioId,
        scenarioName: scenarioId.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        realized: 0,
        potential: 0,
        actionCount: 0,
      }
    }
    savingsByScenarioMap[scenarioId].realized += savings
    savingsByScenarioMap[scenarioId].actionCount++
  }

  // Add potential savings from waste detections to scenario map
  for (const scenario of wasteByScenario) {
    if (!savingsByScenarioMap[scenario.scenarioId]) {
      savingsByScenarioMap[scenario.scenarioId] = {
        scenarioId: scenario.scenarioId,
        scenarioName: scenario.scenarioName,
        realized: 0,
        potential: 0,
        actionCount: 0,
      }
    }
    savingsByScenarioMap[scenario.scenarioId].potential = scenario.totalSavings
  }

  // Generate trend data for the last 30 days
  const trendData: SavingsDataPoint[] = []
  const entriesByDate: Record<string, number> = {}

  for (const entry of successfulEntries) {
    const date = new Date(entry.executed_at).toISOString().split("T")[0]
    const savings = getSavingsForAction(entry.action)
    entriesByDate[date] = (entriesByDate[date] || 0) + savings
  }

  let cumulative = 0
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    const realized = entriesByDate[dateStr] || 0
    cumulative += realized

    trendData.push({
      date: dateStr,
      realized,
      potential: wasteDetection?.totalPotentialSavings ?? 0,
      cumulative,
    })
  }

  // Calculate success rate
  const totalActions = auditLog.length
  const successRate = totalActions > 0
    ? (successfulEntries.length / totalActions) * 100
    : 100

  const stats: SavingsStats = {
    realizedToday,
    realizedThisWeek,
    realizedThisMonth,
    realizedAllTime,
    potentialTotal: wasteDetection?.totalPotentialSavings ?? 0,
    potentialAutoSafe: autoSafe.totalSavings,
    potentialApprovalRequired: approvals.totalSavings,
    trendData,
    savingsByScenario: Object.values(savingsByScenarioMap).sort(
      (a, b) => (b.realized + b.potential) - (a.realized + a.potential)
    ),
    actionsExecutedToday: actionsToday,
    actionsExecutedThisWeek: actionsThisWeek,
    actionsExecutedThisMonth: actionsThisMonth,
    successRate,
  }

  return {
    stats,
    isLoading: false,
  }
}

/**
 * Generate CSV export of savings data
 */
export function generateSavingsCSV(stats: SavingsStats): string {
  const lines: string[] = []

  // Header
  lines.push("Savings Report")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")

  // Summary
  lines.push("Summary")
  lines.push(`Realized Today,$${stats.realizedToday.toFixed(2)}`)
  lines.push(`Realized This Week,$${stats.realizedThisWeek.toFixed(2)}`)
  lines.push(`Realized This Month,$${stats.realizedThisMonth.toFixed(2)}`)
  lines.push(`Realized All Time,$${stats.realizedAllTime.toFixed(2)}`)
  lines.push(`Potential Savings,$${stats.potentialTotal.toFixed(2)}`)
  lines.push(`Success Rate,${stats.successRate.toFixed(1)}%`)
  lines.push("")

  // Savings by Scenario
  lines.push("Savings by Scenario")
  lines.push("Scenario,Realized,Potential,Actions Executed")
  for (const scenario of stats.savingsByScenario) {
    lines.push(`${scenario.scenarioName},$${scenario.realized.toFixed(2)},$${scenario.potential.toFixed(2)},${scenario.actionCount}`)
  }
  lines.push("")

  // Daily Trend Data
  lines.push("Daily Savings Trend (Last 30 Days)")
  lines.push("Date,Realized,Potential,Cumulative")
  for (const point of stats.trendData) {
    lines.push(`${point.date},$${point.realized.toFixed(2)},$${point.potential.toFixed(2)},$${point.cumulative.toFixed(2)}`)
  }

  return lines.join("\n")
}

/**
 * Download savings report as CSV
 */
export function downloadSavingsReport(stats: SavingsStats) {
  const csv = generateSavingsCSV(stats)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `savings-report-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
