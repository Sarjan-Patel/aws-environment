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

// Elegant, professional color scheme - muted slate tones
const getNodeStyle = (type: string) => {
  const baseStyle = {
    padding: "14px 18px",
    borderRadius: "8px",
    border: "1.5px solid",
    fontWeight: 500,
    fontSize: "14px",
    minWidth: "200px",
    textAlign: "center" as const,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  }

  switch (type) {
    case "aws-env":
      return {
        ...baseStyle,
        background: "#475569",
        color: "white",
        borderColor: "#64748b",
        fontSize: "15px",
        fontWeight: 600,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }
    case "database":
      return {
        ...baseStyle,
        background: "#64748b",
        color: "white",
        borderColor: "#94a3b8",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }
    case "connection":
      return {
        ...baseStyle,
        background: "#334155",
        color: "white",
        borderColor: "#475569",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }
    case "agent-brain":
      return {
        ...baseStyle,
        background: "#1e293b",
        color: "white",
        borderColor: "#334155",
        fontSize: "15px",
        fontWeight: 600,
        minWidth: "220px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }
    case "component":
      return {
        ...baseStyle,
        background: "#475569",
        color: "white",
        borderColor: "#64748b",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }
    case "ai-layer":
      return {
        ...baseStyle,
        background: "#334155",
        color: "white",
        borderColor: "#475569",
        fontSize: "15px",
        fontWeight: 600,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }
    case "dashboard":
      return {
        ...baseStyle,
        background: "#1e293b",
        color: "white",
        borderColor: "#334155",
        fontSize: "15px",
        fontWeight: 600,
        minWidth: "220px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }
    case "mode":
      return {
        ...baseStyle,
        background: "#64748b",
        color: "white",
        borderColor: "#94a3b8",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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

export default function ArchitectureCanvas() {
  const nodes: Node[] = useMemo(() => {
    const nodeList: Node[] = []

    // AWS Environment Layer (Top)
    nodeList.push({
      id: "drift-tick",
      type: "default",
      position: { x: 100, y: 50 },
      data: {
        label: "drift-tick\nEdge Function\n(Runs every 5 min)",
      },
      style: getNodeStyle("aws-env"),
    })

    nodeList.push({
      id: "postgresql",
      type: "default",
      position: { x: 450, y: 50 },
      data: {
        label: "PostgreSQL\nDatabase\n• instances\n• volumes\n• metrics_daily\n• resource_change_events",
      },
      style: getNodeStyle("database"),
    })

    // Connection Layer (Middle-Top)
    nodeList.push({
      id: "supabase-client",
      type: "default",
      position: { x: 275, y: 280 },
      data: {
        label: "Supabase Client\nUser-configured\nConnection",
      },
      style: getNodeStyle("connection"),
    })

    // Agent Brain (Middle)
    nodeList.push({
      id: "agent-brain",
      type: "default",
      position: { x: 650, y: 280 },
      data: {
        label: "Agent Brain",
      },
      style: getNodeStyle("agent-brain"),
    })

    nodeList.push({
      id: "detector",
      type: "default",
      position: { x: 550, y: 450 },
      data: {
        label: "Detector\nDetects waste using\n15 scenarios",
      },
      style: getNodeStyle("component"),
    })

    nodeList.push({
      id: "executor",
      type: "default",
      position: { x: 750, y: 450 },
      data: {
        label: "Executor\nExecutes low-risk\nactions automatically",
      },
      style: getNodeStyle("component"),
    })

    nodeList.push({
      id: "recommender",
      type: "default",
      position: { x: 650, y: 600 },
      data: {
        label: "Recommender\nCreates recommendations\nfor review",
      },
      style: getNodeStyle("component"),
    })

    // AI Reasoning Layer
    nodeList.push({
      id: "ai-reasoning",
      type: "default",
      position: { x: 1000, y: 450 },
      data: {
        label: "AI Reasoning\nClaude/GPT\n• Explanations\n• Insights\n• Predictions",
      },
      style: getNodeStyle("ai-layer"),
    })

    // Dashboard UI (Bottom)
    nodeList.push({
      id: "dashboard-ui",
      type: "default",
      position: { x: 650, y: 800 },
      data: {
        label: "Dashboard UI",
      },
      style: getNodeStyle("dashboard"),
    })

    nodeList.push({
      id: "mode1",
      type: "default",
      position: { x: 450, y: 950 },
      data: {
        label: "Continuous\nMonitoring\nReal-time visibility",
      },
      style: getNodeStyle("mode"),
    })

    nodeList.push({
      id: "mode2",
      type: "default",
      position: { x: 650, y: 950 },
      data: {
        label: "Auto-Optimize\nLow-risk actions\nexecuted automatically",
      },
      style: getNodeStyle("mode"),
    })

    nodeList.push({
      id: "mode3",
      type: "default",
      position: { x: 850, y: 950 },
      data: {
        label: "Review Required\nHuman approval\nbefore action",
      },
      style: getNodeStyle("mode"),
    })

    return nodeList
  }, [])

  const edges: Edge[] = useMemo(() => {
    const edgeList: Edge[] = []

    // AWS Environment connections
    edgeList.push({
      id: "drift-tick-to-postgresql",
      source: "drift-tick",
      target: "postgresql",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#64748b", strokeWidth: 2, opacity: 0.7 },
      label: "Creates waste",
      labelStyle: { fill: "#64748b", fontWeight: 500 },
    })

    // Connection layer
    edgeList.push({
      id: "postgresql-to-supabase",
      source: "postgresql",
      target: "supabase-client",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
      label: "Read",
      labelStyle: { fill: "#64748b", fontWeight: 500 },
    })

    edgeList.push({
      id: "supabase-to-agent",
      source: "supabase-client",
      target: "agent-brain",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
      label: "Data flow",
      labelStyle: { fill: "#64748b", fontWeight: 500 },
    })

    // Agent Brain components
    edgeList.push({
      id: "agent-to-detector",
      source: "agent-brain",
      target: "detector",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    edgeList.push({
      id: "agent-to-executor",
      source: "agent-brain",
      target: "executor",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    edgeList.push({
      id: "agent-to-recommender",
      source: "agent-brain",
      target: "recommender",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    // Detector outputs
    edgeList.push({
      id: "detector-to-executor",
      source: "detector",
      target: "executor",
      type: "smoothstep",
      style: { stroke: "#cbd5e1", strokeWidth: 1.5, strokeDasharray: "4,4", opacity: 0.5 },
      label: "Waste detections",
      labelStyle: { fill: "#64748b", fontWeight: 400 },
    })

    edgeList.push({
      id: "detector-to-recommender",
      source: "detector",
      target: "recommender",
      type: "smoothstep",
      style: { stroke: "#cbd5e1", strokeWidth: 1.5, strokeDasharray: "4,4", opacity: 0.5 },
      label: "Waste detections",
      labelStyle: { fill: "#64748b", fontWeight: 400 },
    })

    // Executor writes back
    edgeList.push({
      id: "executor-to-postgresql",
      source: "executor",
      target: "postgresql",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#64748b", strokeWidth: 2, opacity: 0.7 },
      label: "Write/Optimize",
      labelStyle: { fill: "#64748b", fontWeight: 500 },
    })

    // Recommender outputs
    edgeList.push({
      id: "recommender-to-dashboard",
      source: "recommender",
      target: "dashboard-ui",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
      label: "Recommendations",
      labelStyle: { fill: "#64748b", fontWeight: 500 },
    })

    // AI Reasoning connections
    edgeList.push({
      id: "detector-to-ai",
      source: "detector",
      target: "ai-reasoning",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    edgeList.push({
      id: "ai-to-dashboard",
      source: "ai-reasoning",
      target: "dashboard-ui",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
      label: "Explanations",
      labelStyle: { fill: "#64748b", fontWeight: 500 },
    })

    // Dashboard to modes
    edgeList.push({
      id: "dashboard-to-mode1",
      source: "dashboard-ui",
      target: "mode1",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    edgeList.push({
      id: "dashboard-to-mode2",
      source: "dashboard-ui",
      target: "mode2",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    edgeList.push({
      id: "dashboard-to-mode3",
      source: "dashboard-ui",
      target: "mode3",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5, opacity: 0.6 },
    })

    // All components feed to dashboard
    edgeList.push({
      id: "executor-to-dashboard",
      source: "executor",
      target: "dashboard-ui",
      type: "smoothstep",
      style: { stroke: "#cbd5e1", strokeWidth: 1.5, strokeDasharray: "4,4", opacity: 0.5 },
      label: "Actions taken",
      labelStyle: { fill: "#64748b", fontWeight: 400 },
    })

    return edgeList
  }, [])

  const onInit = useCallback((instance: any) => {
    instance.fitView({ padding: 0.2, duration: 400 })
  }, [])

  return (
    <div className="w-full h-[calc(100vh-300px)] border border-slate-200 rounded-lg bg-white">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onInit={onInit}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
          defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        >
          <Background color="#f1f5f9" gap={20} size={1} />
          <Controls className="bg-white border border-slate-200 rounded-lg shadow-sm" />
          <MiniMap
            nodeColor={(node) => {
              if (node.id.includes("mode")) return "#64748b"
              if (node.id === "dashboard-ui") return "#1e293b"
              if (node.id === "ai-reasoning") return "#334155"
              if (node.id === "agent-brain" || node.id.includes("detector") || node.id.includes("executor") || node.id.includes("recommender")) return "#1e293b"
              if (node.id === "supabase-client") return "#334155"
              if (node.id === "postgresql") return "#64748b"
              return "#475569"
            }}
            maskColor="rgba(0, 0, 0, 0.05)"
            className="bg-white border border-slate-200 rounded-lg shadow-sm"
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
