/**
 * AWS Pricing Utilities
 *
 * Provides cost estimation for AWS resources based on resource types,
 * sizes, and regions. These are approximate values for cost estimation.
 */

// EC2 Instance pricing (on-demand, US East, per hour)
export const EC2_HOURLY_RATES: Record<string, number> = {
  "t2.micro": 0.0116,
  "t2.small": 0.023,
  "t2.medium": 0.0464,
  "t2.large": 0.0928,
  "t2.xlarge": 0.1856,
  "t3.micro": 0.0104,
  "t3.small": 0.0208,
  "t3.medium": 0.0416,
  "t3.large": 0.0832,
  "t3.xlarge": 0.1664,
  "m5.large": 0.096,
  "m5.xlarge": 0.192,
  "m5.2xlarge": 0.384,
  "m5.4xlarge": 0.768,
  "m6i.large": 0.096,
  "m6i.xlarge": 0.192,
  "c5.large": 0.085,
  "c5.xlarge": 0.17,
  "c5.2xlarge": 0.34,
  "r5.large": 0.126,
  "r5.xlarge": 0.252,
  "r5.2xlarge": 0.504,
}

// RDS Instance pricing (on-demand, US East, per hour)
export const RDS_HOURLY_RATES: Record<string, number> = {
  "db.t3.micro": 0.017,
  "db.t3.small": 0.034,
  "db.t3.medium": 0.068,
  "db.t3.large": 0.136,
  "db.m5.large": 0.171,
  "db.m5.xlarge": 0.342,
  "db.m5.2xlarge": 0.684,
  "db.r5.large": 0.24,
  "db.r5.xlarge": 0.48,
  "db.r5.2xlarge": 0.96,
}

// ElastiCache pricing (on-demand, US East, per hour)
export const ELASTICACHE_HOURLY_RATES: Record<string, number> = {
  "cache.t3.micro": 0.017,
  "cache.t3.small": 0.034,
  "cache.t3.medium": 0.068,
  "cache.m5.large": 0.142,
  "cache.m5.xlarge": 0.284,
  "cache.r5.large": 0.198,
  "cache.r5.xlarge": 0.396,
}

// Load Balancer pricing (US East)
export const ALB_HOURLY_RATE = 0.0225
export const ALB_LCU_RATE = 0.008 // per LCU-hour

// EBS Volume pricing (US East, per GB-month)
export const EBS_GB_MONTH_RATES: Record<string, number> = {
  gp2: 0.1,
  gp3: 0.08,
  io1: 0.125,
  io2: 0.125,
  st1: 0.045,
  sc1: 0.025,
  standard: 0.05,
}

// EBS Snapshot pricing (per GB-month)
export const SNAPSHOT_GB_MONTH_RATE = 0.05

// Elastic IP pricing (unattached, per hour)
export const UNATTACHED_EIP_HOURLY_RATE = 0.005

// CloudWatch Logs pricing (per GB ingested)
export const CLOUDWATCH_LOGS_GB_RATE = 0.5

// Lambda pricing
export const LAMBDA_REQUEST_RATE = 0.0000002 // per request after free tier
export const LAMBDA_GB_SECOND_RATE = 0.0000166667 // per GB-second

// S3 pricing (per GB-month, Standard tier)
export const S3_STANDARD_GB_MONTH = 0.023
export const S3_INTELLIGENT_TIERING_GB_MONTH = 0.0025 // for frequent access
export const S3_GLACIER_GB_MONTH = 0.004

// Hours in a month (average)
export const HOURS_PER_MONTH = 730

// Instance type specs (vCPU, Memory GB)
export const EC2_INSTANCE_SPECS: Record<string, { vcpu: number; memoryGb: number }> = {
  "t2.micro": { vcpu: 1, memoryGb: 1 },
  "t2.small": { vcpu: 1, memoryGb: 2 },
  "t2.medium": { vcpu: 2, memoryGb: 4 },
  "t2.large": { vcpu: 2, memoryGb: 8 },
  "t2.xlarge": { vcpu: 4, memoryGb: 16 },
  "t3.micro": { vcpu: 2, memoryGb: 1 },
  "t3.small": { vcpu: 2, memoryGb: 2 },
  "t3.medium": { vcpu: 2, memoryGb: 4 },
  "t3.large": { vcpu: 2, memoryGb: 8 },
  "t3.xlarge": { vcpu: 4, memoryGb: 16 },
  "m5.large": { vcpu: 2, memoryGb: 8 },
  "m5.xlarge": { vcpu: 4, memoryGb: 16 },
  "m5.2xlarge": { vcpu: 8, memoryGb: 32 },
  "m5.4xlarge": { vcpu: 16, memoryGb: 64 },
  "m6i.large": { vcpu: 2, memoryGb: 8 },
  "m6i.xlarge": { vcpu: 4, memoryGb: 16 },
  "c5.large": { vcpu: 2, memoryGb: 4 },
  "c5.xlarge": { vcpu: 4, memoryGb: 8 },
  "c5.2xlarge": { vcpu: 8, memoryGb: 16 },
  "r5.large": { vcpu: 2, memoryGb: 16 },
  "r5.xlarge": { vcpu: 4, memoryGb: 32 },
  "r5.2xlarge": { vcpu: 8, memoryGb: 64 },
}

// Instance type downsize mapping (current -> recommended smaller)
export const EC2_DOWNSIZE_MAP: Record<string, string> = {
  // T2 family
  "t2.xlarge": "t2.large",
  "t2.large": "t2.medium",
  "t2.medium": "t2.small",
  "t2.small": "t2.micro",
  // T3 family
  "t3.xlarge": "t3.large",
  "t3.large": "t3.medium",
  "t3.medium": "t3.small",
  "t3.small": "t3.micro",
  // M5 family
  "m5.4xlarge": "m5.2xlarge",
  "m5.2xlarge": "m5.xlarge",
  "m5.xlarge": "m5.large",
  // M6i family
  "m6i.xlarge": "m6i.large",
  // C5 family
  "c5.2xlarge": "c5.xlarge",
  "c5.xlarge": "c5.large",
  // R5 family
  "r5.2xlarge": "r5.xlarge",
  "r5.xlarge": "r5.large",
}

/**
 * Calculate monthly cost for an EC2 instance
 */
export function getEC2MonthlyCost(instanceType: string): number {
  const hourlyRate = EC2_HOURLY_RATES[instanceType] || 0.1 // default fallback
  return hourlyRate * HOURS_PER_MONTH
}

/**
 * Get the recommended smaller instance type for rightsizing
 * Returns null if no smaller size is available
 */
export function getRecommendedSmallerInstance(instanceType: string): string | null {
  return EC2_DOWNSIZE_MAP[instanceType] || null
}

/**
 * Get instance specs (vCPU, memory) for a given instance type
 */
export function getEC2InstanceSpecs(instanceType: string): { vcpu: number; memoryGb: number } | null {
  return EC2_INSTANCE_SPECS[instanceType] || null
}

/**
 * Calculate monthly cost for an RDS instance
 */
export function getRDSMonthlyCost(instanceClass: string): number {
  const hourlyRate = RDS_HOURLY_RATES[instanceClass] || 0.17 // default fallback
  return hourlyRate * HOURS_PER_MONTH
}

/**
 * Calculate monthly cost for an ElastiCache cluster
 */
export function getCacheMonthlyCost(nodeType: string, nodeCount: number = 1): number {
  const hourlyRate = ELASTICACHE_HOURLY_RATES[nodeType] || 0.068 // default fallback
  return hourlyRate * HOURS_PER_MONTH * nodeCount
}

/**
 * Calculate monthly cost for a Load Balancer
 */
export function getLoadBalancerMonthlyCost(avgLCUs: number = 1): number {
  const baseCost = ALB_HOURLY_RATE * HOURS_PER_MONTH
  const lcuCost = ALB_LCU_RATE * avgLCUs * HOURS_PER_MONTH
  return baseCost + lcuCost
}

/**
 * Calculate monthly cost for an EBS volume
 */
export function getVolumeMonthlyCost(volumeType: string, sizeGb: number): number {
  const gbMonthRate = EBS_GB_MONTH_RATES[volumeType] || 0.1 // default to gp2
  return gbMonthRate * sizeGb
}

/**
 * Calculate monthly cost for an EBS snapshot
 */
export function getSnapshotMonthlyCost(sizeGb: number): number {
  return SNAPSHOT_GB_MONTH_RATE * sizeGb
}

/**
 * Calculate monthly cost for an unattached Elastic IP
 */
export function getUnattachedEIPMonthlyCost(): number {
  return UNATTACHED_EIP_HOURLY_RATE * HOURS_PER_MONTH
}

/**
 * Calculate monthly cost for CloudWatch Logs (based on ingestion)
 */
export function getLogGroupMonthlyCost(monthlyIngestGb: number): number {
  return CLOUDWATCH_LOGS_GB_RATE * monthlyIngestGb
}

/**
 * Calculate monthly cost for Lambda function
 */
export function getLambdaMonthlyCost(
  avgMemoryMb: number,
  avgDurationMs: number,
  monthlyInvocations: number
): number {
  const gbSeconds = (avgMemoryMb / 1024) * (avgDurationMs / 1000) * monthlyInvocations
  const requestCost = LAMBDA_REQUEST_RATE * monthlyInvocations
  const computeCost = LAMBDA_GB_SECOND_RATE * gbSeconds
  return requestCost + computeCost
}

/**
 * Calculate monthly cost for S3 bucket (simplified)
 */
export function getS3MonthlyCost(sizeGb: number, tier: "standard" | "intelligent" | "glacier" = "standard"): number {
  switch (tier) {
    case "intelligent":
      return S3_INTELLIGENT_TIERING_GB_MONTH * sizeGb
    case "glacier":
      return S3_GLACIER_GB_MONTH * sizeGb
    default:
      return S3_STANDARD_GB_MONTH * sizeGb
  }
}

/**
 * Calculate potential savings from tiering S3 data
 */
export function getS3TieringSavings(sizeGb: number, currentTier: string = "STANDARD"): number {
  if (currentTier !== "STANDARD") return 0
  const currentCost = S3_STANDARD_GB_MONTH * sizeGb
  const intelligentCost = S3_INTELLIGENT_TIERING_GB_MONTH * sizeGb
  return currentCost - intelligentCost
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format currency with more precision for small amounts
 */
export function formatCurrencyPrecise(amount: number): string {
  if (amount < 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount)
  }
  return formatCurrency(amount)
}
