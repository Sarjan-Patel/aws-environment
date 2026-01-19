/**
 * AI Prompts for Cloud Cost Optimization
 *
 * These prompts are designed to generate helpful, actionable explanations
 * for cloud resource optimization recommendations.
 */

/**
 * System prompt for the AI assistant
 */
export const SYSTEM_PROMPT = `You are a cloud cost optimization expert helping engineers understand and act on AWS cost-saving recommendations. Your explanations should be:

1. CONCISE: Keep explanations brief (2-3 sentences max)
2. ACTIONABLE: Focus on what the user should do
3. CONFIDENT: Don't hedge unnecessarily - the data supports the recommendation
4. SPECIFIC: Reference actual metrics when available
5. FRIENDLY: Use a helpful, professional tone

You understand AWS services deeply: EC2, RDS, ElastiCache, ELB, Lambda, S3, CloudWatch, Auto Scaling Groups, and more.

Never include technical jargon without explanation. Never suggest checking documentation - give direct answers.`

/**
 * Resource types and their human-readable names
 */
export const RESOURCE_TYPE_NAMES: Record<string, string> = {
  instances: "EC2 instance",
  rds_instances: "RDS database",
  cache_clusters: "ElastiCache cluster",
  load_balancers: "Load Balancer",
  lambda_functions: "Lambda function",
  volumes: "EBS volume",
  snapshots: "EBS snapshot",
  s3_buckets: "S3 bucket",
  autoscaling_groups: "Auto Scaling Group",
  log_groups: "CloudWatch Log Group",
  elastic_ips: "Elastic IP",
}

/**
 * Scenario-specific context for better explanations
 */
export const SCENARIO_CONTEXT: Record<string, string> = {
  idle_rds: "This RDS database shows minimal activity. Low CPU and few connections typically indicate it's not serving production traffic.",
  idle_cache: "This cache cluster has low utilization. Caches with minimal hits often indicate the application isn't benefiting from caching.",
  idle_load_balancer: "This load balancer is receiving very few requests. It may be serving deprecated endpoints or test environments.",
  over_provisioned_lambda: "This Lambda function uses less memory than allocated. Right-sizing can reduce costs without impacting performance.",
  over_provisioned_instance: "This EC2 instance has much more CPU and memory than it's using. Downsizing to a smaller instance type reduces costs while maintaining performance headroom.",
  over_provisioned_asg: "This Auto Scaling Group maintains more instances than workload requires. Scaling down won't impact availability.",
  orphaned_eip: "This Elastic IP isn't attached to any running resource. Unattached EIPs incur hourly charges.",
  idle_ci_runner: "This CI runner instance has completed its jobs. Terminating idle runners is a safe, immediate cost savings.",
  idle_instance: "This EC2 instance shows very low CPU activity over the past 7 days. It may be unused or a candidate for termination.",
  log_no_retention: "This log group has no retention policy. Old logs accumulate indefinitely, increasing storage costs.",
  unattached_volume: "This EBS volume is not attached to any instance. Unattached volumes still incur storage charges.",
  old_snapshot: "This EBS snapshot is over 90 days old. Old snapshots may no longer be needed and cost money to store.",
}

/**
 * Generate a prompt for explaining a single recommendation
 */
export function generateRecommendationPrompt(params: {
  resourceName: string
  resourceType: string
  scenarioId: string
  scenarioName: string
  action: string
  potentialSavings: number
  currentCost: number
  details: Record<string, unknown>
  region?: string
  env?: string
}): string {
  const {
    resourceName,
    resourceType,
    scenarioId,
    scenarioName,
    action,
    potentialSavings,
    currentCost,
    details,
    region,
    env,
  } = params

  const resourceTypeName = RESOURCE_TYPE_NAMES[resourceType] || resourceType
  const scenarioContext = SCENARIO_CONTEXT[scenarioId] || ""

  // Build details string from available metrics
  const detailsStr = Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `- ${formatDetailKey(k)}: ${formatDetailValue(k, v)}`)
    .join("\n")

  return `Explain this cloud cost optimization recommendation in 2-3 sentences:

RESOURCE: ${resourceName} (${resourceTypeName})
${region ? `REGION: ${region}` : ""}
${env ? `ENVIRONMENT: ${env}` : ""}
SCENARIO: ${scenarioName}
RECOMMENDED ACTION: ${action}
CURRENT MONTHLY COST: $${currentCost.toFixed(2)}
POTENTIAL SAVINGS: $${potentialSavings.toFixed(2)}/month

${detailsStr ? `METRICS:\n${detailsStr}` : ""}

${scenarioContext ? `CONTEXT: ${scenarioContext}` : ""}

Provide a brief, actionable explanation of why this recommendation makes sense and what the user should consider before acting.`
}

/**
 * Generate a prompt for a structured recommendation explanation
 * Returns JSON with detailed breakdown of the optimization
 */
export function generateStructuredRecommendationPrompt(params: {
  resourceName: string
  resourceType: string
  scenarioId: string
  scenarioName: string
  action: string
  potentialSavings: number
  currentCost: number
  details: Record<string, unknown>
  region?: string
  env?: string
}): string {
  const {
    resourceName,
    resourceType,
    scenarioId,
    scenarioName,
    action,
    potentialSavings,
    currentCost,
    details,
    region,
    env,
  } = params

  const resourceTypeName = RESOURCE_TYPE_NAMES[resourceType] || resourceType
  const scenarioContext = SCENARIO_CONTEXT[scenarioId] || ""

  // Build details string from available metrics
  const detailsStr = Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `- ${formatDetailKey(k)}: ${formatDetailValue(k, v)}`)
    .join("\n")

  // Build utilization metrics based on scenario type
  const utilizationMetrics = buildUtilizationMetrics(scenarioId, details)

  // Check if this resource type supports alternative actions
  const supportsAlternatives = ["over_provisioned_instance", "idle_instance", "over_provisioned_lambda"].includes(scenarioId)

  // Build alternatives section for EC2/Lambda
  const alternativesSection = supportsAlternatives ? `
  "alternatives": [
    {
      "action": "<alternative action verb>",
      "target": "<target configuration or N/A>",
      "reason": "<why someone might choose this option>",
      "projectedCost": "<monthly cost after this action>",
      "savings": "<monthly savings with this action>",
      "savingsPercent": <percentage as number>,
      "risk": "<low|medium|high>"
    }
  ],` : ""

  const alternativesInstructions = supportsAlternatives ? `
IMPORTANT: For this ${resourceTypeName}, provide alternative actions the user could take:
- For EC2 instances: alternatives include "Stop" (if not needed now but may be needed later), "Terminate" (if definitely not needed), or "Rightsize" (downsize to smaller instance)
- For Lambda functions: alternatives include different memory configurations
Include 1-2 alternatives with their cost/savings impact.
` : ""

  return `Analyze this cloud resource and provide a structured JSON response explaining the optimization opportunity.

RESOURCE: ${resourceName} (${resourceTypeName})
${region ? `REGION: ${region}` : ""}
${env ? `ENVIRONMENT: ${env}` : ""}
SCENARIO: ${scenarioName}
RECOMMENDED ACTION: ${action}
CURRENT MONTHLY COST: $${currentCost.toFixed(2)}
POTENTIAL SAVINGS: $${potentialSavings.toFixed(2)}/month

${detailsStr ? `METRICS:\n${detailsStr}` : ""}

${scenarioContext ? `CONTEXT: ${scenarioContext}` : ""}
${alternativesInstructions}
Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "currentState": {
    "resource": "${resourceName}",
    "type": "<current instance type, memory size, or resource configuration>",
    "utilization": [
      ${utilizationMetrics}
    ]
  },
  "problem": {
    "summary": "<one sentence explaining the waste>",
    "details": "<2-3 sentences with specific numbers showing why this is wasteful>"
  },
  "recommendation": {
    "action": "<action verb: Rightsize, Delete, Stop, Scale Down, etc.>",
    "target": "<new configuration or N/A if deleting>",
    "reason": "<why this specific action is appropriate>"
  },${alternativesSection}
  "impact": {
    "currentCost": "$${currentCost.toFixed(2)}/month",
    "projectedCost": "<cost after optimization>",
    "savings": "$${potentialSavings.toFixed(2)}/month",
    "savingsPercent": <percentage as number>
  },
  "risk": {
    "level": "<low|medium|high>",
    "considerations": ["<thing to verify before acting>", "<another consideration>"]
  }
}`
}

/**
 * Build utilization metrics template based on scenario type
 */
function buildUtilizationMetrics(scenarioId: string, details: Record<string, unknown>): string {
  switch (scenarioId) {
    case "over_provisioned_instance":
      return `{ "metric": "CPU", "current": "${details.avgCpu7d || 0}%", "capacity": "100%", "percentage": ${details.avgCpu7d || 0} },
      { "metric": "Memory", "current": "${details.currentMemoryPct || 0}%", "capacity": "100%", "percentage": ${details.currentMemoryPct || 0} }`

    case "over_provisioned_lambda":
      return `{ "metric": "Memory", "current": "${details.avgMemoryUsedMb || details.currentMemoryMb || 0} MB", "capacity": "${details.currentMemoryMb || 0} MB", "percentage": ${details.utilizationPct || 0} }`

    case "idle_rds":
      return `{ "metric": "CPU", "current": "${details.avgCpu7d || 0}%", "capacity": "100%", "percentage": ${details.avgCpu7d || 0} },
      { "metric": "Connections", "current": "${details.avgConnections7d || 0}", "capacity": "varies", "percentage": ${Math.min(100, (Number(details.avgConnections7d) || 0) * 10)} }`

    case "idle_cache":
      return `{ "metric": "CPU", "current": "${details.avgCpu7d || 0}%", "capacity": "100%", "percentage": ${details.avgCpu7d || 0} },
      { "metric": "Connections", "current": "${details.avgConnections7d || 0}", "capacity": "varies", "percentage": ${Math.min(100, (Number(details.avgConnections7d) || 0) * 10)} }`

    case "idle_load_balancer":
      return `{ "metric": "Requests", "current": "${details.avgRequestCount7d || 0}/day", "capacity": "varies", "percentage": ${Math.min(100, (Number(details.avgRequestCount7d) || 0) / 100)} }`

    case "idle_instance":
      return `{ "metric": "CPU", "current": "${details.avgCpu7d || 0}%", "capacity": "100%", "percentage": ${details.avgCpu7d || 0} }`

    case "over_provisioned_asg":
      return `{ "metric": "Utilization", "current": "${details.currentUtilization || 0}%", "capacity": "100%", "percentage": ${details.currentUtilization || 0} },
      { "metric": "Capacity", "current": "${details.currentCapacity || 0} instances", "capacity": "${details.maxSize || 0} instances", "percentage": ${Math.round(((Number(details.currentCapacity) || 0) / (Number(details.maxSize) || 1)) * 100)} }`

    default:
      return `{ "metric": "Utilization", "current": "low", "capacity": "N/A", "percentage": 0 }`
  }
}

/**
 * Generate a prompt for dashboard-level insights
 */
export function generateDashboardInsightPrompt(params: {
  totalResources: number
  totalDetections: number
  totalSavings: number
  topScenarios: { name: string; count: number; savings: number }[]
  autoSafeCount: number
  approvalCount: number
}): string {
  const {
    totalResources,
    totalDetections,
    totalSavings,
    topScenarios,
    autoSafeCount,
    approvalCount,
  } = params

  const scenariosList = topScenarios
    .slice(0, 5)
    .map((s) => `- ${s.name}: ${s.count} resources ($${s.savings.toFixed(0)}/mo)`)
    .join("\n")

  return `Generate a brief 2-3 sentence insight about this cloud environment's cost optimization opportunities:

ENVIRONMENT SUMMARY:
- Total resources: ${totalResources}
- Optimization opportunities: ${totalDetections}
- Potential monthly savings: $${totalSavings.toFixed(2)}
- Auto-safe actions (low risk): ${autoSafeCount}
- Requires approval (higher risk): ${approvalCount}

TOP SCENARIOS:
${scenariosList}

Provide a concise, actionable insight highlighting the biggest opportunity and suggested priority.`
}

/**
 * Generate a prompt for bulk action summary
 */
export function generateBulkActionSummaryPrompt(params: {
  executedCount: number
  successCount: number
  failedCount: number
  totalSavings: number
  actions: { resourceName: string; action: string; success: boolean; message: string }[]
}): string {
  const { executedCount, successCount, failedCount, totalSavings, actions } = params

  const actionsList = actions
    .slice(0, 5)
    .map((a) => `- ${a.resourceName}: ${a.action} - ${a.success ? "Success" : "Failed"}: ${a.message}`)
    .join("\n")

  return `Summarize this batch of cost optimization actions in 2-3 sentences:

EXECUTION SUMMARY:
- Total actions: ${executedCount}
- Successful: ${successCount}
- Failed: ${failedCount}
- Monthly savings realized: $${totalSavings.toFixed(2)}

ACTIONS:
${actionsList}
${actions.length > 5 ? `... and ${actions.length - 5} more` : ""}

Provide a brief summary of what was accomplished and any notable results or issues.`
}

/**
 * Format a detail key for display
 */
function formatDetailKey(key: string): string {
  const keyMap: Record<string, string> = {
    avgCpu7d: "Average CPU (7d)",
    avgConnections7d: "Average Connections (7d)",
    avgRequestCount7d: "Average Requests (7d)",
    currentMemoryMb: "Current Memory",
    recommendedMemoryMb: "Recommended Memory",
    currentCapacity: "Current Capacity",
    recommendedCapacity: "Recommended Capacity",
    instanceClass: "Instance Class",
    nodeType: "Node Type",
    lastActivity: "Last Activity",
    daysIdle: "Days Idle",
  }
  return keyMap[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
}

/**
 * Format a detail value for display
 */
function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "N/A"

  if (key.includes("Cpu") || key.includes("Percent")) {
    return `${value}%`
  }
  if (key.includes("Memory") && typeof value === "number") {
    return `${value} MB`
  }
  if (key.includes("Cost") || key.includes("Savings")) {
    return `$${Number(value).toFixed(2)}`
  }
  if (typeof value === "number") {
    return value.toLocaleString()
  }
  return String(value)
}
