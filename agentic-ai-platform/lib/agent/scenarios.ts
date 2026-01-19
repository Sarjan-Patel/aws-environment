/**
 * Waste Detection Scenarios
 *
 * 15 scenarios for detecting cloud resource waste, organized by:
 * - Mode 2 (Auto-Safe): Can be automatically optimized without approval
 * - Mode 3 (Approval Required): Requires human approval before action
 */

export type WasteScenarioId =
  | "forgotten_preview"
  | "over_provisioned_asg"
  | "idle_ci_runner"
  | "s3_no_lifecycle"
  | "log_no_retention"
  | "off_hours_dev"
  | "stale_feature_env"
  | "orphaned_eip"
  | "unattached_volume"
  | "old_snapshot"
  | "idle_rds"
  | "idle_cache"
  | "idle_load_balancer"
  | "over_provisioned_lambda"
  | "idle_instance"
  | "over_provisioned_instance"
  // Phase 1: Quick-win optimizations (no migrations needed)
  | "gp2_volume"
  | "unused_lambda"
  | "orphaned_snapshot"
  | "static_asg"
  // Phase 2: Quick-win optimizations (with migrations)
  | "multi_az_non_prod"
  | "empty_load_balancer"
  | "s3_no_version_expiration"
  | "over_configured_lambda_timeout"

export type ActionType =
  | "terminate_asg"
  | "scale_down_asg"
  | "terminate_instance"
  | "stop_instance"
  | "rightsize_instance"
  | "add_lifecycle_policy"
  | "set_retention"
  | "release_eip"
  | "delete_volume"
  | "delete_snapshot"
  | "stop_rds"
  | "downsize_rds"
  | "delete_cache"
  | "delete_lb"
  | "rightsize_lambda"
  // Phase 1: Quick-win actions
  | "upgrade_volume_type"
  | "delete_lambda"
  | "delete_orphaned_snapshot"
  | "enable_asg_scaling"
  // Phase 2: Quick-win actions
  | "disable_multi_az"
  | "delete_empty_lb"
  | "add_version_expiration"
  | "optimize_lambda_timeout"

export type ResourceType =
  | "autoscaling_groups"
  | "instances"
  | "s3_buckets"
  | "log_groups"
  | "elastic_ips"
  | "volumes"
  | "snapshots"
  | "rds_instances"
  | "cache_clusters"
  | "load_balancers"
  | "lambda_functions"

export interface WasteScenario {
  id: WasteScenarioId
  name: string
  description: string
  mode: 2 | 3 // Mode 2 = Auto-Safe, Mode 3 = Approval Required
  resourceType: ResourceType
  action: ActionType
  severity: "low" | "medium" | "high"
  baseConfidence: number // 0-100
}

export const WASTE_SCENARIOS: Record<WasteScenarioId, WasteScenario> = {
  // ============================================================================
  // MODE 2: Auto-Safe Scenarios (can be automatically optimized)
  // ============================================================================

  forgotten_preview: {
    id: "forgotten_preview",
    name: "Forgotten Preview Environment",
    description: "Preview environment with idle instances that should be cleaned up",
    mode: 2,
    resourceType: "autoscaling_groups",
    action: "terminate_asg",
    severity: "medium",
    baseConfidence: 85,
  },

  over_provisioned_asg: {
    id: "over_provisioned_asg",
    name: "Over-provisioned Auto Scaling Group",
    description: "ASG with more capacity than needed based on utilization",
    mode: 2,
    resourceType: "autoscaling_groups",
    action: "scale_down_asg",
    severity: "medium",
    baseConfidence: 75,
  },

  idle_ci_runner: {
    id: "idle_ci_runner",
    name: "Idle CI Runner",
    description: "CI runner that completed its job and is now idle",
    mode: 2,
    resourceType: "instances",
    action: "terminate_instance",
    severity: "low",
    baseConfidence: 95,
  },

  s3_no_lifecycle: {
    id: "s3_no_lifecycle",
    name: "S3 Bucket Without Lifecycle Policy",
    description: "Bucket storing data in expensive Standard tier without tiering",
    mode: 2,
    resourceType: "s3_buckets",
    action: "add_lifecycle_policy",
    severity: "low",
    baseConfidence: 90,
  },

  log_no_retention: {
    id: "log_no_retention",
    name: "Log Group Without Retention",
    description: "Log group accumulating data indefinitely",
    mode: 2,
    resourceType: "log_groups",
    action: "set_retention",
    severity: "low",
    baseConfidence: 90,
  },

  off_hours_dev: {
    id: "off_hours_dev",
    name: "Dev Instance Running Off-Hours",
    description: "Development instance running during weekends or nights",
    mode: 2,
    resourceType: "instances",
    action: "stop_instance",
    severity: "low",
    baseConfidence: 80,
  },

  stale_feature_env: {
    id: "stale_feature_env",
    name: "Stale Feature Branch Environment",
    description: "Feature environment older than 7 days with low usage",
    mode: 2,
    resourceType: "autoscaling_groups",
    action: "terminate_asg",
    severity: "medium",
    baseConfidence: 85,
  },

  orphaned_eip: {
    id: "orphaned_eip",
    name: "Orphaned Elastic IP",
    description: "Elastic IP not attached to any resource",
    mode: 2,
    resourceType: "elastic_ips",
    action: "release_eip",
    severity: "low",
    baseConfidence: 98,
  },

  unattached_volume: {
    id: "unattached_volume",
    name: "Unattached EBS Volume",
    description: "EBS volume not attached to any instance",
    mode: 2,
    resourceType: "volumes",
    action: "delete_volume",
    severity: "medium",
    baseConfidence: 85,
  },

  old_snapshot: {
    id: "old_snapshot",
    name: "Old EBS Snapshot",
    description: "Snapshot older than 90 days that may no longer be needed",
    mode: 2,
    resourceType: "snapshots",
    action: "delete_snapshot",
    severity: "low",
    baseConfidence: 70,
  },

  idle_instance: {
    id: "idle_instance",
    name: "Idle Instance",
    description: "Instance with very low CPU utilization for extended period",
    mode: 2,
    resourceType: "instances",
    action: "stop_instance",
    severity: "medium",
    baseConfidence: 80,
  },

  // ============================================================================
  // MODE 3: Approval Required Scenarios (require human approval)
  // ============================================================================

  idle_rds: {
    id: "idle_rds",
    name: "Idle RDS Instance",
    description: "RDS instance with very low CPU and connections",
    mode: 3,
    resourceType: "rds_instances",
    action: "stop_rds",
    severity: "high",
    baseConfidence: 75,
  },

  idle_cache: {
    id: "idle_cache",
    name: "Idle Cache Cluster",
    description: "ElastiCache cluster with minimal usage",
    mode: 3,
    resourceType: "cache_clusters",
    action: "delete_cache",
    severity: "high",
    baseConfidence: 70,
  },

  idle_load_balancer: {
    id: "idle_load_balancer",
    name: "Idle Load Balancer",
    description: "Load balancer with near-zero traffic",
    mode: 3,
    resourceType: "load_balancers",
    action: "delete_lb",
    severity: "medium",
    baseConfidence: 80,
  },

  over_provisioned_lambda: {
    id: "over_provisioned_lambda",
    name: "Over-provisioned Lambda Function",
    description: "Lambda with much more memory allocated than used",
    mode: 3,
    resourceType: "lambda_functions",
    action: "rightsize_lambda",
    severity: "low",
    baseConfidence: 85,
  },

  over_provisioned_instance: {
    id: "over_provisioned_instance",
    name: "Over-provisioned EC2 Instance",
    description: "EC2 instance with much more CPU/memory than utilized",
    mode: 3,
    resourceType: "instances",
    action: "rightsize_instance",
    severity: "medium",
    baseConfidence: 80,
  },

  // ============================================================================
  // QUICK-WIN OPTIMIZATIONS - Phase 1 (No migrations needed)
  // ============================================================================

  gp2_volume: {
    id: "gp2_volume",
    name: "GP2 Volume (Upgrade to GP3)",
    description: "EBS volume using older gp2 type - gp3 offers 20% cost savings with better performance",
    mode: 2,
    resourceType: "volumes",
    action: "upgrade_volume_type",
    severity: "low",
    baseConfidence: 95,
  },

  unused_lambda: {
    id: "unused_lambda",
    name: "Unused Lambda Function",
    description: "Lambda function with zero invocations in the last 7 days",
    mode: 2,
    resourceType: "lambda_functions",
    action: "delete_lambda",
    severity: "low",
    baseConfidence: 90,
  },

  orphaned_snapshot: {
    id: "orphaned_snapshot",
    name: "Orphaned EBS Snapshot",
    description: "Snapshot whose source volume no longer exists",
    mode: 2,
    resourceType: "snapshots",
    action: "delete_orphaned_snapshot",
    severity: "medium",
    baseConfidence: 85,
  },

  static_asg: {
    id: "static_asg",
    name: "Static Auto Scaling Group",
    description: "ASG with min=max=desired capacity - not scaling, consider enabling dynamic scaling",
    mode: 3,
    resourceType: "autoscaling_groups",
    action: "enable_asg_scaling",
    severity: "low",
    baseConfidence: 75,
  },

  // ============================================================================
  // QUICK-WIN OPTIMIZATIONS - Phase 2 (With migrations)
  // ============================================================================

  multi_az_non_prod: {
    id: "multi_az_non_prod",
    name: "Multi-AZ on Non-Production RDS",
    description: "RDS instance with Multi-AZ enabled in dev/staging environment - unnecessary redundancy",
    mode: 2,
    resourceType: "rds_instances",
    action: "disable_multi_az",
    severity: "medium",
    baseConfidence: 90,
  },

  empty_load_balancer: {
    id: "empty_load_balancer",
    name: "Load Balancer with No Targets",
    description: "Load balancer with zero registered or healthy targets",
    mode: 3,
    resourceType: "load_balancers",
    action: "delete_empty_lb",
    severity: "medium",
    baseConfidence: 85,
  },

  s3_no_version_expiration: {
    id: "s3_no_version_expiration",
    name: "S3 Bucket Without Version Expiration",
    description: "Versioned bucket without noncurrent version expiration - old versions accumulating costs",
    mode: 2,
    resourceType: "s3_buckets",
    action: "add_version_expiration",
    severity: "low",
    baseConfidence: 85,
  },

  over_configured_lambda_timeout: {
    id: "over_configured_lambda_timeout",
    name: "Over-Configured Lambda Timeout",
    description: "Lambda with timeout much higher than actual execution duration",
    mode: 3,
    resourceType: "lambda_functions",
    action: "optimize_lambda_timeout",
    severity: "low",
    baseConfidence: 80,
  },
}

// Helper to get scenarios by mode
export function getScenariosByMode(mode: 2 | 3): WasteScenario[] {
  return Object.values(WASTE_SCENARIOS).filter((s) => s.mode === mode)
}

// Helper to get scenario by ID
export function getScenario(id: WasteScenarioId): WasteScenario | undefined {
  return WASTE_SCENARIOS[id]
}

// Mode 2 scenarios (Auto-Safe)
export const AUTO_SAFE_SCENARIOS = getScenariosByMode(2)

// Mode 3 scenarios (Approval Required)
export const APPROVAL_REQUIRED_SCENARIOS = getScenariosByMode(3)
