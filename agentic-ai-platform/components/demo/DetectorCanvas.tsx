"use client"

import React, { useCallback, useMemo } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  NodeTypes,
  ConnectionMode,
  ReactFlowProvider,
} from "reactflow"
import "reactflow/dist/style.css"

const nodeTypes: NodeTypes = {}

const getNodeStyle = (type: string) => {
  const baseStyle = {
    padding: "14px 20px",
    borderRadius: "8px",
    border: "2px solid",
    fontWeight: 500,
    fontSize: "13px",
    minWidth: "180px",
    textAlign: "center" as const,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  }

  switch (type) {
    case "database":
      return {
        ...baseStyle,
        background: "#1e293b",
        color: "white",
        borderColor: "#334155",
        fontWeight: 600,
      }
    case "detector":
      return {
        ...baseStyle,
        background: "#3b82f6",
        color: "white",
        borderColor: "#2563eb",
        fontWeight: 600,
        minWidth: "220px",
      }
    case "rule":
      return {
        ...baseStyle,
        background: "#f8fafc",
        color: "#1e293b",
        borderColor: "#94a3b8",
        fontSize: "12px",
        minWidth: "200px",
      }
    case "output":
      return {
        ...baseStyle,
        background: "#10b981",
        color: "white",
        borderColor: "#059669",
        fontWeight: 600,
      }
    case "action":
      return {
        ...baseStyle,
        background: "#f59e0b",
        color: "white",
        borderColor: "#d97706",
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

export default function DetectorCanvas() {
  const nodes: Node[] = useMemo(() => {
    const nodeList: Node[] = []

    // Database Tables (Source)
    nodeList.push({
      id: "db-source",
      type: "default",
      position: { x: 50, y: 180 },
      data: { label: "Cloud Resources\n11 Resource Tables" },
      style: getNodeStyle("database"),
    })

    // Detector Engine (Center)
    nodeList.push({
      id: "detector",
      type: "default",
      position: { x: 320, y: 160 },
      data: { label: "WASTE DETECTOR\nAnalysis Engine" },
      style: getNodeStyle("detector"),
    })

    // Detection Rules
    nodeList.push({
      id: "rule-compute",
      type: "default",
      position: { x: 620, y: 30 },
      data: { label: "Compute Analysis\nIdle machines\nOversized instances" },
      style: getNodeStyle("rule"),
    })

    nodeList.push({
      id: "rule-storage",
      type: "default",
      position: { x: 620, y: 130 },
      data: { label: "Storage Analysis\nUnused volumes\nOld backups" },
      style: getNodeStyle("rule"),
    })

    nodeList.push({
      id: "rule-database",
      type: "default",
      position: { x: 620, y: 230 },
      data: { label: "Database Analysis\nIdle databases\nOversized caches" },
      style: getNodeStyle("rule"),
    })

    nodeList.push({
      id: "rule-network",
      type: "default",
      position: { x: 620, y: 330 },
      data: { label: "Network Analysis\nOrphaned IPs\nUnused load balancers" },
      style: getNodeStyle("rule"),
    })

    // Output Classification
    nodeList.push({
      id: "output-mode2",
      type: "default",
      position: { x: 920, y: 100 },
      data: { label: "Low-Risk Actions\n11 Scenarios" },
      style: getNodeStyle("output"),
    })

    nodeList.push({
      id: "output-mode3",
      type: "default",
      position: { x: 920, y: 250 },
      data: { label: "Review Required\n5 Scenarios" },
      style: getNodeStyle("action"),
    })

    // Final Actions
    nodeList.push({
      id: "action-auto",
      type: "default",
      position: { x: 1150, y: 100 },
      data: { label: "Auto-Optimize\nor Manual Trigger" },
      style: { ...getNodeStyle("output"), background: "#22c55e", borderColor: "#16a34a" },
    })

    nodeList.push({
      id: "action-approval",
      type: "default",
      position: { x: 1150, y: 250 },
      data: { label: "Human Review\nApprove / Reject / Snooze" },
      style: { ...getNodeStyle("action"), background: "#ef4444", borderColor: "#dc2626" },
    })

    return nodeList
  }, [])

  const edges: Edge[] = useMemo(() => {
    const edgeList: Edge[] = []

    // Database to Detector
    edgeList.push({
      id: "db-to-detector",
      source: "db-source",
      target: "detector",
      type: "smoothstep",
      style: { stroke: "#64748b", strokeWidth: 2 },
      label: "Query",
      labelStyle: { fontSize: 11, fontWeight: 500 },
    })

    // Detector to Rules
    const rules = ["rule-compute", "rule-storage", "rule-database", "rule-network"]
    rules.forEach((rule) => {
      edgeList.push({
        id: `detector-to-${rule}`,
        source: "detector",
        target: rule,
        type: "smoothstep",
        style: { stroke: "#3b82f6", strokeWidth: 1.5 },
      })
    })

    // Rules to Outputs
    edgeList.push({
      id: "compute-to-mode2",
      source: "rule-compute",
      target: "output-mode2",
      type: "smoothstep",
      style: { stroke: "#10b981", strokeWidth: 1.5 },
    })

    edgeList.push({
      id: "storage-to-mode2",
      source: "rule-storage",
      target: "output-mode2",
      type: "smoothstep",
      style: { stroke: "#10b981", strokeWidth: 1.5 },
    })

    edgeList.push({
      id: "database-to-mode3",
      source: "rule-database",
      target: "output-mode3",
      type: "smoothstep",
      style: { stroke: "#f59e0b", strokeWidth: 1.5 },
    })

    edgeList.push({
      id: "network-to-mode2",
      source: "rule-network",
      target: "output-mode2",
      type: "smoothstep",
      style: { stroke: "#10b981", strokeWidth: 1.5 },
    })

    // Outputs to Actions
    edgeList.push({
      id: "mode2-to-auto",
      source: "output-mode2",
      target: "action-auto",
      type: "smoothstep",
      style: { stroke: "#22c55e", strokeWidth: 2 },
    })

    edgeList.push({
      id: "mode3-to-approval",
      source: "output-mode3",
      target: "action-approval",
      type: "smoothstep",
      style: { stroke: "#ef4444", strokeWidth: 2 },
    })

    return edgeList
  }, [])

  const onInit = useCallback((instance: any) => {
    instance.fitView({ padding: 0.1, duration: 400 })
  }, [])

  return (
    <div className="w-full h-[450px] border border-slate-200 rounded-lg bg-white">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onInit={onInit}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
          defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        >
          <Background color="#f1f5f9" gap={20} size={1} />
          <Controls className="bg-white border border-slate-200 rounded-lg shadow-sm" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
