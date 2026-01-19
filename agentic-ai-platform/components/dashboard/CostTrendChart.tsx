"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts"
import { SavingsDataPoint } from "@/hooks/useSavingsTracking"

interface CostTrendChartProps {
  data: SavingsDataPoint[]
  isLoading?: boolean
}

export function CostTrendChart({ data, isLoading }: CostTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Trend</CardTitle>
          <CardDescription>Daily realized savings over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format data for display - show last 14 days for cleaner view
  const displayData = data.slice(-14).map((point) => ({
    ...point,
    date: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }))

  const formatCurrency = (value: number) => `$${value.toFixed(0)}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Trend</CardTitle>
        <CardDescription>Daily realized savings and cumulative total</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={displayData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrency}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ fontWeight: "bold" }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "realized" ? "Daily Savings" : "Cumulative",
                ]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) =>
                  value === "realized" ? "Daily Savings" : "Cumulative Total"
                }
              />
              <Area
                type="monotone"
                dataKey="realized"
                stroke="#22c55e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRealized)"
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCumulative)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface SavingsByScenarioChartProps {
  data: {
    scenarioId: string
    scenarioName: string
    realized: number
    potential: number
    actionCount: number
  }[]
  isLoading?: boolean
}

export function SavingsByScenarioChart({ data, isLoading }: SavingsByScenarioChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings by Scenario</CardTitle>
          <CardDescription>Realized vs potential savings by optimization type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        </CardContent>
      </Card>
    )
  }

  // Take top 6 scenarios for cleaner display
  const displayData = data.slice(0, 6).map((scenario) => ({
    ...scenario,
    name: scenario.scenarioName
      .replace("Idle ", "")
      .replace("Unattached ", "")
      .replace(" Instance", "")
      .replace(" Elastic", "")
      .substring(0, 15),
    total: scenario.realized + scenario.potential,
  }))

  const formatCurrency = (value: number) => `$${value.toFixed(0)}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings by Scenario</CardTitle>
        <CardDescription>Realized vs potential savings by optimization type</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayData.map((scenario, index) => {
            const total = scenario.realized + scenario.potential
            const realizedPercent = total > 0 ? (scenario.realized / total) * 100 : 0
            const potentialPercent = total > 0 ? (scenario.potential / total) * 100 : 0

            return (
              <div key={scenario.scenarioId} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{scenario.scenarioName}</span>
                  <span className="text-muted-foreground">
                    ${scenario.realized.toFixed(0)} / ${total.toFixed(0)}
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  {scenario.realized > 0 && (
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${realizedPercent}%` }}
                    />
                  )}
                  {scenario.potential > 0 && (
                    <div
                      className="bg-blue-200 transition-all"
                      style={{ width: `${potentialPercent}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{scenario.actionCount} actions executed</span>
                  <span>{realizedPercent.toFixed(0)}% realized</span>
                </div>
              </div>
            )
          })}
          {displayData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No savings data yet. Execute some optimizations to see results.
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Realized</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-200" />
            <span>Potential</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
