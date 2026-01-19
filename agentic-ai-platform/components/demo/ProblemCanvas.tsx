"use client"

import React, { useCallback, useMemo } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  ConnectionMode,
  ReactFlowProvider,
} from "reactflow"
import "reactflow/dist/style.css"

const nodeTypes: NodeTypes = {}

// Elegant, professional color scheme - muted and subtle
const getNodeStyle = (type: string) => {
  const baseStyle = {
    padding: "12px 16px",
    borderRadius: "6px",
    border: "1.5px solid",
    fontWeight: 500,
    fontSize: "13px",
    minWidth: "160px",
    textAlign: "center" as const,
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
  }

  switch (type) {
    case "resource":
      return {
        ...baseStyle,
        background: "#ffffff",
        color: "#1e293b",
        borderColor: "#cbd5e1",
      }
    case "waste":
      return {
        ...baseStyle,
        background: "#f1f5f9",
        color: "#475569",
        borderColor: "#94a3b8",
      }
    case "cost":
      return {
        ...baseStyle,
        background: "#1e293b",
        color: "white",
        borderColor: "#334155",
        fontSize: "14px",
        fontWeight: 600,
      }
    default:
      return {
        ...baseStyle,
        background: "#ffffff",
        color: "#1e293b",
        borderColor: "#e2e8f0",
      }
  }
}

export default function ProblemCanvas() {
  const nodes: Node[] = useMemo(() => {
    const nodeList: Node[] = []

    // Compute Resources Section
    nodeList.push({
      id: "instance-running",
      type: "default",
      position: { x: 50, y: 50 },
      data: { label: "EC2 Instance\nstate='running'\navg_cpu_7d < 5%" },
      style: getNodeStyle("resource"),
    })

    nodeList.push({
      id: "instance-waste",
      type: "default",
      position: { x: 250, y: 50 },
      data: { label: "Idle Instance\nCharged full price\nNo active usage" },
      style: getNodeStyle("waste"),
    })

    nodeList.push({
      id: "asg-overprovisioned",
      type: "default",
      position: { x: 50, y: 180 },
      data: { label: "Auto Scaling Group\nmin_size too high\nutilization < 30%" },
      style: getNodeStyle("resource"),
    })

    nodeList.push({
      id: "asg-waste",
      type: "default",
      position: { x: 250, y: 180 },
      data: { label: "Over-provisioned\nPaying for instances\n24/7 unnecessarily" },
      style: getNodeStyle("waste"),
    })

    // Storage Resources Section
    nodeList.push({
      id: "volume-available",
      type: "default",
      position: { x: 500, y: 50 },
      data: { label: "EBS Volume\nstate='available'\nNot attached" },
      style: getNodeStyle("resource"),
    })

    nodeList.push({
      id: "volume-waste",
      type: "default",
      position: { x: 700, y: 50 },
      data: { label: "Unattached Volume\n100% waste\nAccumulating costs" },
      style: getNodeStyle("waste"),
    })

    nodeList.push({
      id: "snapshot-old",
      type: "default",
      position: { x: 500, y: 180 },
      data: { label: "EBS Snapshot\ncreated_at > 90 days\nSource volume deleted" },
      style: getNodeStyle("resource"),
    })

    nodeList.push({
      id: "snapshot-waste",
      type: "default",
      position: { x: 700, y: 180 },
      data: { label: "Orphaned Snapshot\nNo longer needed\nStill charging" },
      style: getNodeStyle("waste"),
    })

    nodeList.push({
      id: "s3-no-lifecycle",
      type: "default",
      position: { x: 500, y: 310 },
      data: { label: "S3 Bucket\nlifecycle_policy = null\nAll data in Standard tier" },
      style: getNodeStyle("resource"),
    })

    nodeList.push({
      id: "s3-waste",
      type: "default",
      position: { x: 700, y: 310 },
      data: { label: "No Lifecycle Policy\nCold data at hot prices\nMissing tiering" },
      style: getNodeStyle("waste"),
    })

    // Networking Resources Section
    nodeList.push({
      id: "eip-unassociated",
      type: "default",
      position: { x: 950, y: 50 },
      data: { label: "Elastic IP\nstate='unassociated'\nNot attached" },
      style: getNodeStyle("resource"),
    })

    nodeList.push({
      id: "eip-waste",
      type: "default",
      position: { x: 1150, y: 50 },
      data: { label: "Orphaned EIP\nCharging hourly\nNo value provided" },
      style: getNodeStyle("waste"),
    })

    // Database Resources Section
    nodeList.push({
      id: "rds-oversized",
      type: "default",
      position: { x: 950, y: 180 },
      data: { label: "RDS Instance\navg_cpu_7d < 20%\navg_connections_7d < 10" },
      style: getNodeStyle("resource"),
    })

    nodeList.push({
      id: "rds-waste",
      type: "default",
      position: { x: 1150, y: 180 },
      data: { label: "Oversized Database\nPaying for capacity\nNot being used" },
      style: getNodeStyle("waste"),
    })

    // Observability Resources Section
    nodeList.push({
      id: "logs-no-retention",
      type: "default",
      position: { x: 950, y: 310 },
      data: { label: "CloudWatch Logs\nretention_days = null\nNo expiration" },
      style: getNodeStyle("resource"),
    })

    nodeList.push({
      id: "logs-waste",
      type: "default",
      position: { x: 1150, y: 310 },
      data: { label: "Infinite Retention\nLogs accumulate\nIndefinitely" },
      style: getNodeStyle("waste"),
    })

    // Cost Accumulation
    nodeList.push({
      id: "cost-accumulation",
      type: "default",
      position: { x: 600, y: 450 },
      data: { label: "Silent Cost Accumulation\nResources continue billing\nregardless of usage" },
      style: getNodeStyle("cost"),
    })

    return nodeList
  }, [])

  const edges: Edge[] = useMemo(() => {
    const edgeList: Edge[] = []

    // Compute waste connections
    edgeList.push({
      id: "instance-to-waste",
      source: "instance-running",
      target: "instance-waste",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    edgeList.push({
      id: "asg-to-waste",
      source: "asg-overprovisioned",
      target: "asg-waste",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    // Storage waste connections
    edgeList.push({
      id: "volume-to-waste",
      source: "volume-available",
      target: "volume-waste",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    edgeList.push({
      id: "snapshot-to-waste",
      source: "snapshot-old",
      target: "snapshot-waste",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    edgeList.push({
      id: "s3-to-waste",
      source: "s3-no-lifecycle",
      target: "s3-waste",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    // Networking waste connections
    edgeList.push({
      id: "eip-to-waste",
      source: "eip-unassociated",
      target: "eip-waste",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    // Database waste connections
    edgeList.push({
      id: "rds-to-waste",
      source: "rds-oversized",
      target: "rds-waste",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    // Observability waste connections
    edgeList.push({
      id: "logs-to-waste",
      source: "logs-no-retention",
      target: "logs-waste",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    // All waste flows to cost accumulation
    const wasteNodes = ["instance-waste", "asg-waste", "volume-waste", "snapshot-waste", "s3-waste", "eip-waste", "rds-waste", "logs-waste"]
    wasteNodes.forEach((wasteNode) => {
      edgeList.push({
        id: `${wasteNode}-to-cost`,
        source: wasteNode,
        target: "cost-accumulation",
        type: "smoothstep",
        style: { stroke: "#64748b", strokeWidth: 1.5, strokeDasharray: "3,3", opacity: 0.5 },
      })
    })

    return edgeList
  }, [])

  const onInit = useCallback((instance: any) => {
    instance.fitView({ padding: 0.15, duration: 400 })
  }, [])

  return (
    <div className="w-full h-[600px] border border-slate-200 rounded-lg bg-white">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onInit={onInit}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background color="#f8fafc" gap={16} size={1} />
          <Controls className="bg-white border border-slate-200 rounded-lg shadow-sm" />
          <MiniMap
            nodeColor={(node) => {
              if (node.id === "cost-accumulation") return "#1e293b"
              if (node.id.includes("waste")) return "#94a3b8"
              return "#cbd5e1"
            }}
            maskColor="rgba(0, 0, 0, 0.05)"
            className="bg-white border border-slate-200 rounded-lg shadow-sm"
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
