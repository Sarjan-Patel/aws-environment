/**
 * Policy Lock Logic for Optimization Policies
 *
 * Controls which resources can be set to auto_safe mode.
 * Production resources of critical types are always locked to recommend_only.
 * Safe resources (like S3 lifecycle, log retention) can always be toggled.
 */

export type ResourceType =
  | "instances"
  | "autoscaling_groups"
  | "rds_instances"
  | "cache_clusters"
  | "load_balancers"
  | "s3_buckets"
  | "log_groups"
  | "elastic_ips"
  | "volumes"
  | "snapshots"
  | "lambda_functions"

export type OptimizationPolicy = "auto_safe" | "recommend_only" | "ignore"

// Resources that are ALWAYS locked when env='prod'
// These are critical infrastructure that should never be auto-optimized in production
const PROD_LOCKED_TYPES: ResourceType[] = [
  "instances",
  "autoscaling_groups",
  "rds_instances",
  "cache_clusters",
  "load_balancers",
]

// Resources that can always be toggled (safe operations)
// These operations are non-destructive or affect unused resources
const ALWAYS_TOGGLEABLE: ResourceType[] = [
  "s3_buckets", // Lifecycle policies are non-destructive
  "log_groups", // Retention policies are non-destructive
  "elastic_ips", // Orphaned EIPs have no active use
  "volumes", // Unattached volumes have no active use
  "snapshots", // Old snapshots are backup data
]

export interface PolicyResource {
  type: ResourceType
  env?: string | null
  optimization_policy_locked?: boolean
}

/**
 * Check if a resource's policy is locked (cannot be changed to auto_safe)
 */
export function isPolicyLocked(resource: PolicyResource): boolean {
  // Explicit lock always wins
  if (resource.optimization_policy_locked) return true

  // Always toggleable types are never auto-locked
  if (ALWAYS_TOGGLEABLE.includes(resource.type)) return false

  // Prod resources of certain types are auto-locked
  if (resource.env === "prod" && PROD_LOCKED_TYPES.includes(resource.type)) {
    return true
  }

  return false
}

/**
 * Check if a resource can be set to auto_safe mode
 */
export function canSetAutoSafe(resource: PolicyResource): boolean {
  return !isPolicyLocked(resource)
}

/**
 * Validate a policy update request
 */
export function validatePolicyUpdate(
  resource: PolicyResource,
  newPolicy: OptimizationPolicy
): { valid: boolean; error?: string } {
  if (newPolicy === "auto_safe" && isPolicyLocked(resource)) {
    if (resource.optimization_policy_locked) {
      return {
        valid: false,
        error: "This resource has been manually locked. Contact an administrator to unlock it.",
      }
    }
    return {
      valid: false,
      error: "Production resources cannot be set to auto_safe. This is enforced for safety.",
    }
  }
  return { valid: true }
}

/**
 * Get the reason why a resource is locked
 */
export function getLockReason(resource: PolicyResource): string | null {
  if (resource.optimization_policy_locked) {
    return "Manually locked by administrator"
  }

  if (ALWAYS_TOGGLEABLE.includes(resource.type)) {
    return null
  }

  if (resource.env === "prod" && PROD_LOCKED_TYPES.includes(resource.type)) {
    return "Production environment protection"
  }

  return null
}

/**
 * Get display label for a policy
 */
export function getPolicyLabel(policy: OptimizationPolicy): string {
  switch (policy) {
    case "auto_safe":
      return "Auto-Safe"
    case "recommend_only":
      return "Recommend Only"
    case "ignore":
      return "Ignore"
  }
}

/**
 * Get description for a policy
 */
export function getPolicyDescription(policy: OptimizationPolicy): string {
  switch (policy) {
    case "auto_safe":
      return "Agent can automatically optimize this resource"
    case "recommend_only":
      return "Agent will recommend changes but require approval"
    case "ignore":
      return "Agent will not touch this resource"
  }
}

/**
 * Check if a resource type is always safe to toggle
 */
export function isAlwaysToggleable(type: ResourceType): boolean {
  return ALWAYS_TOGGLEABLE.includes(type)
}

/**
 * Check if a resource type is locked in production
 */
export function isProdLocked(type: ResourceType): boolean {
  return PROD_LOCKED_TYPES.includes(type)
}
