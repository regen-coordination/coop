import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type NodeTypes,
  Panel,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import React, { useState, useCallback, useMemo } from "react";
import "@xyflow/react/dist/style.css";

import {
  visualBorderRadius as borderRadius,
  visualColors as colors,
  visualEffects as effects,
  visualShadows as shadows,
  visualSpacing as spacing,
  visualTransitions as transitions,
  visualTypography as typography,
} from "@coop/shared";
import { type CanvasEdgeData, CanvasNodeData, useCanvasStore } from "./hooks/useCanvasStore";

// Import custom node components
import { CaptureNode } from "./components/nodes/CaptureNode";
import { InsightNode } from "./components/nodes/InsightNode";

const nodeTypes: NodeTypes = {
  capture: CaptureNode,
  insight: InsightNode,
};

export interface CanvasViewProps {
  coopId: string;
  className?: string;
}

// Icons as simple SVG components
const AddIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const UndoIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3 7v6h6M3 7l9 9c2.5 2.5 6 3 9 1" />
  </svg>
);

const RedoIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M21 7v6h-6M21 7l-9 9c-2.5 2.5-6 3-9 1" />
  </svg>
);

const ZoomInIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35M8 11h6" />
  </svg>
);

const FitViewIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

const EmptyStateIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.text.tertiary}
    strokeWidth="1.5"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

export const CanvasView: React.FC<CanvasViewProps> = ({ coopId, className }) => {
  // Zustand store
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    addNode,
    selectedNodes,
    selectedEdges,
    setSelectedNodes,
    setSelectedEdges,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasStore();

  // ReactFlow state (synced with Zustand)
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Sync ReactFlow state with Zustand
  React.useEffect(() => {
    setStoreNodes(nodes);
  }, [nodes, setStoreNodes]);

  React.useEffect(() => {
    setStoreEdges(edges);
  }, [edges, setStoreEdges]);

  // Handle connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge<CanvasEdgeData> = {
        ...connection,
        id: `edge-${Date.now()}`,
        type: "default",
        data: {
          relationship: "relates-to",
        },
        style: {
          stroke: colors.brand[500],
          strokeWidth: 2,
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges],
  );

  // Selection change
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedNodes(selectedNodes.map((n) => n.id));
      setSelectedEdges(selectedEdges.map((e) => e.id));
    },
    [setSelectedNodes, setSelectedEdges],
  );

  // Add a capture node
  const addCaptureNode = () => {
    const id = addNode({
      type: "capture",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        type: "capture",
        label: `Capture ${Date.now()}`,
        content: "Test content from canvas",
        createdAt: new Date().toISOString(),
      },
    });
  };

  // Add an insight node
  const addInsightNode = () => {
    const id = addNode({
      type: "insight",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        type: "insight",
        label: `AI Insight ${Date.now()}`,
        content: "AI-generated insight from your captures",
        createdAt: new Date().toISOString(),
        metadata: {
          actions: ["Create task", "Schedule meeting", "Share with team"],
        },
      },
    });
  };

  // Canvas container styles
  const canvasContainerStyles: React.CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: "500px",
    backgroundColor: colors.bg.primary,
    position: "relative",
  };

  // Glass panel base styles
  const glassPanelStyles: React.CSSProperties = {
    background: effects.glass.background,
    backdropFilter: effects.glass.backdropFilter,
    border: effects.glass.border,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.glass,
  };

  // Toolbar button styles
  const toolbarButtonStyles = (disabled?: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.sizes.sm.size,
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.weights.medium,
    color: disabled ? colors.text.quaternary : colors.text.secondary,
    backgroundColor: "transparent",
    border: "none",
    borderRadius: borderRadius.md,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: transitions.hover,
    opacity: disabled ? 0.5 : 1,
  });

  // Primary action button styles
  const primaryButtonStyles: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.sizes.sm.size,
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.weights.semibold,
    color: colors.bg.primary,
    backgroundColor: colors.brand[500],
    border: "none",
    borderRadius: borderRadius.md,
    cursor: "pointer",
    transition: transitions.hover,
    boxShadow: `0 0 0 1px ${colors.brand[500]}, 0 0 20px ${colors.brand.glow}`,
  };

  // Mini-map styles
  const miniMapStyles: React.CSSProperties = {
    backgroundColor: colors.bg.secondary,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.md,
  };

  // Controls styles override
  const controlsStyles: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: spacing[2],
  };

  // Selection status styles
  const selectionStatusStyles: React.CSSProperties = {
    ...glassPanelStyles,
    padding: `${spacing[3]} ${spacing[5]}`,
    fontSize: typography.sizes.sm.size,
    fontFamily: typography.fontFamily.sans,
    color: colors.text.secondary,
    display: "flex",
    alignItems: "center",
    gap: spacing[2],
  };

  // Empty state styles
  const emptyStateStyles: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    pointerEvents: "none",
    zIndex: 1,
  };

  // Calculate selection text
  const selectionText = useMemo(() => {
    const parts: string[] = [];
    if (selectedNodes.length > 0)
      parts.push(`${selectedNodes.length} node${selectedNodes.length > 1 ? "s" : ""}`);
    if (selectedEdges.length > 0)
      parts.push(`${selectedEdges.length} edge${selectedEdges.length > 1 ? "s" : ""}`);
    return parts.length > 0 ? `${parts.join(", ")} selected` : "Select nodes to edit";
  }, [selectedNodes.length, selectedEdges.length]);

  return (
    <div style={canvasContainerStyles} className={className}>
      {/* Inject custom styles for ReactFlow */}
      <style>{`
        .react-flow__node {
          transition: all ${transitions.normal} !important;
        }
        
        .react-flow__node.selected {
          z-index: 10 !important;
        }
        
        .react-flow__edge path {
          stroke: ${colors.border.medium};
          stroke-width: 2;
          transition: all ${transitions.fast};
        }
        
        .react-flow__edge.selected path {
          stroke: ${colors.brand[500]};
          stroke-width: 3;
          filter: drop-shadow(0 0 4px ${colors.brand.glow});
        }
        
        .react-flow__handle {
          width: 8px;
          height: 8px;
          background: ${colors.brand[500]};
          border: 2px solid ${colors.bg.primary};
          transition: all ${transitions.fast};
        }
        
        .react-flow__handle:hover {
          width: 12px;
          height: 12px;
          background: ${colors.brand[400]};
          box-shadow: 0 0 12px ${colors.brand.glow};
        }
        
        .react-flow__controls {
          background: ${effects.glass.background};
          backdrop-filter: ${effects.glass.backdropFilter};
          border: ${effects.glass.border};
          border-radius: ${borderRadius.lg};
          box-shadow: ${shadows.glass};
          overflow: hidden;
        }
        
        .react-flow__controls-button {
          background: transparent;
          border: none;
          border-bottom: 1px solid ${colors.border.subtle};
          color: ${colors.text.secondary};
          transition: all ${transitions.fast};
        }
        
        .react-flow__controls-button:hover {
          background: ${colors.surface.glassHover};
          color: ${colors.text.primary};
        }
        
        .react-flow__controls-button:last-child {
          border-bottom: none;
        }
        
        .react-flow__minimap {
          background: ${colors.bg.secondary};
          border-radius: ${borderRadius.lg};
          border: 1px solid ${colors.border.subtle};
        }
        
        .react-flow__attribution {
          opacity: 0.3;
          font-size: 10px;
        }
        
        .react-flow__attribution a {
          color: ${colors.text.tertiary};
        }
      `}</style>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        deleteKeyCode={["Backspace", "Delete"]}
        selectionKeyCode={["Shift"]}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        zoomActivationKeyCode={["Meta", "Control"]}
        style={{ background: colors.bg.primary }}
      >
        {/* Subtle dot grid background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={colors.border.subtle}
          style={{ opacity: 0.6 }}
        />

        {/* Glass controls */}
        <Controls className="glass-controls" />

        {/* Styled minimap */}
        <MiniMap
          nodeStrokeWidth={2}
          zoomable
          pannable
          style={miniMapStyles}
          nodeBorderRadius={Number.parseInt(borderRadius.md)}
          maskColor={colors.bg.overlay}
        />

        {/* Floating Glass Toolbar */}
        <Panel position="top-left">
          <div
            style={{
              ...glassPanelStyles,
              padding: spacing[4],
              minWidth: "220px",
            }}
          >
            <div
              style={{
                fontSize: typography.sizes.md.size,
                fontWeight: typography.weights.semibold,
                color: colors.text.primary,
                marginBottom: spacing[4],
                fontFamily: typography.fontFamily.sans,
                letterSpacing: typography.sizes.md.letterSpacing,
              }}
            >
              Canvas Tools
            </div>

            {/* Primary Actions */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: spacing[3],
                marginBottom: spacing[4],
              }}
            >
              <button
                type="button"
                onClick={addCaptureNode}
                style={primaryButtonStyles}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.brand[400];
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.brand[500];
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <AddIcon />
                Add Capture
              </button>

              <button
                type="button"
                onClick={addInsightNode}
                style={{
                  ...toolbarButtonStyles(),
                  backgroundColor: colors.surface.glass,
                  color: colors.text.primary,
                  justifyContent: "flex-start",
                  padding: `${spacing[3]} ${spacing[4]}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.surface.glassHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.surface.glass;
                }}
              >
                <span style={{ marginRight: spacing[2] }}>💡</span>
                Add Insight
              </button>
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: colors.border.subtle,
                margin: `${spacing[3]} 0`,
              }}
            />

            {/* History Controls */}
            <div style={{ display: "flex", gap: spacing[2], marginBottom: spacing[3] }}>
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo()}
                style={{
                  ...toolbarButtonStyles(!canUndo()),
                  flex: 1,
                }}
                onMouseEnter={(e) => {
                  if (canUndo()) {
                    e.currentTarget.style.backgroundColor = colors.surface.glassHover;
                    e.currentTarget.style.color = colors.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = canUndo()
                    ? colors.text.secondary
                    : colors.text.quaternary;
                }}
              >
                <UndoIcon />
                Undo
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo()}
                style={{
                  ...toolbarButtonStyles(!canRedo()),
                  flex: 1,
                }}
                onMouseEnter={(e) => {
                  if (canRedo()) {
                    e.currentTarget.style.backgroundColor = colors.surface.glassHover;
                    e.currentTarget.style.color = colors.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = canRedo()
                    ? colors.text.secondary
                    : colors.text.quaternary;
                }}
              >
                <RedoIcon />
                Redo
              </button>
            </div>

            {/* Zoom Controls */}
            <div style={{ display: "flex", gap: spacing[2], marginBottom: spacing[3] }}>
              <button
                type="button"
                onClick={() => zoomIn()}
                style={{
                  ...toolbarButtonStyles(),
                  flex: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.surface.glassHover;
                  e.currentTarget.style.color = colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = colors.text.secondary;
                }}
              >
                <ZoomInIcon />
              </button>
              <button
                type="button"
                onClick={() => zoomOut()}
                style={{
                  ...toolbarButtonStyles(),
                  flex: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.surface.glassHover;
                  e.currentTarget.style.color = colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = colors.text.secondary;
                }}
              >
                <ZoomOutIcon />
              </button>
            </div>

            <button
              type="button"
              onClick={() => fitView()}
              style={{
                ...toolbarButtonStyles(),
                width: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.surface.glassHover;
                e.currentTarget.style.color = colors.text.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = colors.text.secondary;
              }}
            >
              <FitViewIcon />
              Fit View
            </button>
          </div>
        </Panel>

        {/* Selection Status */}
        <Panel position="bottom-center">
          <div style={selectionStatusStyles}>
            {selectedNodes.length > 0 && (
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: colors.brand[500],
                  boxShadow: `0 0 8px ${colors.brand.glow}`,
                }}
              />
            )}
            {selectionText}
          </div>
        </Panel>

        {/* Empty State */}
        {nodes.length === 0 && !isLoading && (
          <div style={emptyStateStyles}>
            <div
              style={{
                ...glassPanelStyles,
                padding: `${spacing[8]} ${spacing[10]}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: spacing[4],
              }}
            >
              <EmptyStateIcon />
              <div
                style={{
                  fontSize: typography.sizes.lg.size,
                  fontWeight: typography.weights.semibold,
                  color: colors.text.secondary,
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Start Your Canvas
              </div>
              <div
                style={{
                  fontSize: typography.sizes.sm.size,
                  color: colors.text.tertiary,
                  fontFamily: typography.fontFamily.sans,
                  maxWidth: "280px",
                  lineHeight: typography.sizes.sm.lineHeight,
                }}
              >
                Add your first capture or insight to begin mapping your knowledge
              </div>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
};

export default CanvasView;
