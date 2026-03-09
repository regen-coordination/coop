import type { Edge, Node, Viewport } from "@xyflow/react";
import { create } from "zustand";

// Canvas Node Data Types
export interface CanvasNodeData extends Record<string, unknown> {
  type: "capture" | "insight" | "cluster" | "action" | "evidence" | "metric" | "comment";
  label: string;
  content?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  author?: string;
}

// Canvas Edge Data Types
export interface CanvasEdgeData extends Record<string, unknown> {
  relationship?:
    | "relates-to"
    | "supports"
    | "contradicts"
    | "implements"
    | "references"
    | "sequence";
  label?: string;
}

// Cursor position for collaboration
export interface Cursor {
  x: number;
  y: number;
  userId: string;
  userName: string;
  color: string;
}

// Canvas snapshot for undo/redo
export interface CanvasSnapshot {
  nodes: Node<CanvasNodeData>[];
  edges: Edge<CanvasEdgeData>[];
  viewport: Viewport;
  timestamp: number;
}

// Canvas state interface
export interface CanvasState {
  // Nodes & Edges
  nodes: Node<CanvasNodeData>[];
  edges: Edge<CanvasEdgeData>[];

  // Viewport
  viewport: Viewport;

  // Selection
  selectedNodes: string[];
  selectedEdges: string[];

  // Collaboration
  remoteCursors: Map<string, Cursor>;

  // History
  history: CanvasSnapshot[];
  historyIndex: number;

  // UI State
  isAutoLayoutRunning: boolean;
  searchQuery: string;
  filteredNodeIds: string[] | null;

  // Actions
  setNodes: (
    nodes: Node<CanvasNodeData>[] | ((prev: Node<CanvasNodeData>[]) => Node<CanvasNodeData>[]),
  ) => void;
  setEdges: (
    edges: Edge<CanvasEdgeData>[] | ((prev: Edge<CanvasEdgeData>[]) => Edge<CanvasEdgeData>[]),
  ) => void;
  setViewport: (viewport: Viewport) => void;

  // Node operations
  addNode: (node: Omit<Node<CanvasNodeData>, "id">) => string;
  updateNode: (id: string, data: Partial<CanvasNodeData> | Partial<Node<CanvasNodeData>>) => void;
  removeNode: (id: string) => void;
  removeNodes: (ids: string[]) => void;

  // Edge operations
  addEdge: (edge: Omit<Edge<CanvasEdgeData>, "id">) => string;
  updateEdge: (id: string, data: Partial<CanvasEdgeData>) => void;
  removeEdge: (id: string) => void;
  removeEdges: (ids: string[]) => void;

  // Selection
  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;
  clearSelection: () => void;

  // Collaboration
  updateRemoteCursor: (userId: string, cursor: Cursor) => void;
  removeRemoteCursor: (userId: string) => void;

  // History
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Layout
  autoLayout: (algorithm: "force" | "hierarchical" | "grid" | "circular") => void;

  // Search
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Utilities
  getNode: (id: string) => Node<CanvasNodeData> | undefined;
  getEdge: (id: string) => Edge<CanvasEdgeData> | undefined;
  getConnectedNodes: (nodeId: string) => string[];
  getNodeEdges: (nodeId: string) => Edge<CanvasEdgeData>[];

  // Import/Export
  exportCanvas: () => { nodes: Node<CanvasNodeData>[]; edges: Edge<CanvasEdgeData>[] };
  importCanvas: (data: { nodes: Node<CanvasNodeData>[]; edges: Edge<CanvasEdgeData>[] }) => void;
  resetCanvas: () => void;
}

// Generate unique IDs
let nodeIdCounter = 0;
let edgeIdCounter = 0;

export const generateNodeId = () => `node-${Date.now()}-${++nodeIdCounter}`;
export const generateEdgeId = () => `edge-${Date.now()}-${++edgeIdCounter}`;

// Initial viewport
const initialViewport: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

// Create the Zustand store
export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  viewport: initialViewport,
  selectedNodes: [],
  selectedEdges: [],
  remoteCursors: new Map(),
  history: [],
  historyIndex: -1,
  isAutoLayoutRunning: false,
  searchQuery: "",
  filteredNodeIds: null,

  // Setters
  setNodes: (nodes) => {
    if (typeof nodes === "function") {
      set((state) => ({ nodes: nodes(state.nodes) }));
    } else {
      set({ nodes });
    }
  },

  setEdges: (edges) => {
    if (typeof edges === "function") {
      set((state) => ({ edges: edges(state.edges) }));
    } else {
      set({ edges });
    }
  },

  setViewport: (viewport) => set({ viewport }),

  // Node operations
  addNode: (nodeData) => {
    const id = generateNodeId();
    const { position, data, ...rest } = nodeData;
    const nodeDataInput = data ?? {
      type: "capture",
      label: "New Node",
      createdAt: new Date().toISOString(),
    };
    const newNodeData: CanvasNodeData = {
      type: nodeDataInput.type ?? "capture",
      label: nodeDataInput.label ?? "New Node",
      createdAt: nodeDataInput.createdAt ?? new Date().toISOString(),
      content: nodeDataInput.content,
      metadata: nodeDataInput.metadata,
      author: nodeDataInput.author,
    };

    const newNode: Node<CanvasNodeData> = {
      id,
      ...rest,
      type: rest.type ?? "default",
      position: position ?? { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: newNodeData,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));

    get().saveSnapshot();
    return id;
  },

  updateNode: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== id) return node;

        // Check if updating data or node properties
        if ("position" in data || "type" in data || "style" in data || "parentId" in data) {
          return { ...node, ...data };
        }

        return {
          ...node,
          data: { ...node.data, ...(data as Partial<CanvasNodeData>) },
        };
      }),
    }));

    get().saveSnapshot();
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodes: state.selectedNodes.filter((nId) => nId !== id),
    }));

    get().saveSnapshot();
  },

  removeNodes: (ids) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => !ids.includes(n.id)),
      edges: state.edges.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)),
      selectedNodes: state.selectedNodes.filter((nId) => !ids.includes(nId)),
    }));

    get().saveSnapshot();
  },

  // Edge operations
  addEdge: (edgeData) => {
    const id = generateEdgeId();
    const newEdge: Edge<CanvasEdgeData> = {
      id,
      ...edgeData,
      type: edgeData.type ?? "default",
      data: {
        ...(edgeData.data ?? {}),
        relationship: edgeData.data?.relationship ?? "relates-to",
      },
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
    }));

    get().saveSnapshot();
    return id;
  },

  updateEdge: (id, data) => {
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === id
          ? {
              ...edge,
              data: {
                ...(edge.data ?? {}),
                ...data,
                relationship: data.relationship ?? edge.data?.relationship ?? "relates-to",
              },
            }
          : edge,
      ),
    }));

    get().saveSnapshot();
  },

  removeEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      selectedEdges: state.selectedEdges.filter((eId) => eId !== id),
    }));

    get().saveSnapshot();
  },

  removeEdges: (ids) => {
    set((state) => ({
      edges: state.edges.filter((e) => !ids.includes(e.id)),
      selectedEdges: state.selectedEdges.filter((eId) => !ids.includes(eId)),
    }));

    get().saveSnapshot();
  },

  // Selection
  setSelectedNodes: (ids) => set({ selectedNodes: ids }),
  setSelectedEdges: (ids) => set({ selectedEdges: ids }),
  clearSelection: () => set({ selectedNodes: [], selectedEdges: [] }),

  // Collaboration
  updateRemoteCursor: (userId, cursor) => {
    set((state) => {
      const newCursors = new Map(state.remoteCursors);
      newCursors.set(userId, cursor);
      return { remoteCursors: newCursors };
    });
  },

  removeRemoteCursor: (userId) => {
    set((state) => {
      const newCursors = new Map(state.remoteCursors);
      newCursors.delete(userId);
      return { remoteCursors: newCursors };
    });
  },

  // History
  saveSnapshot: () => {
    const { nodes, edges, viewport, history, historyIndex } = get();

    const snapshot: CanvasSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      viewport: { ...viewport },
      timestamp: Date.now(),
    };

    // Remove any redo history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);

    // Add new snapshot (limit to 50 for memory)
    if (newHistory.length >= 50) {
      newHistory.shift();
    }

    newHistory.push(snapshot);

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { historyIndex, history } = get();

    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const snapshot = history[newIndex];

      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        viewport: { ...snapshot.viewport },
        historyIndex: newIndex,
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();

    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const snapshot = history[newIndex];

      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        viewport: { ...snapshot.viewport },
        historyIndex: newIndex,
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Layout
  autoLayout: (algorithm) => {
    const { nodes, edges } = get();

    set({ isAutoLayoutRunning: true });

    // Layout algorithms will be implemented in utils/layoutAlgorithms.ts
    // For now, just placeholder
    console.log(`Running ${algorithm} layout...`);

    // TODO: Implement actual layout algorithms
    // - force: d3-force
    // - hierarchical: dagre
    // - grid: manual grid placement
    // - circular: polar coordinates

    set({ isAutoLayoutRunning: false });
    get().saveSnapshot();
  },

  // Search
  setSearchQuery: (query) => {
    const { nodes } = get();

    if (!query.trim()) {
      set({ searchQuery: "", filteredNodeIds: null });
      return;
    }

    const filtered = nodes
      .filter(
        (node) =>
          node.data.label.toLowerCase().includes(query.toLowerCase()) ||
          node.data.content?.toLowerCase().includes(query.toLowerCase()),
      )
      .map((n) => n.id);

    set({ searchQuery: query, filteredNodeIds: filtered });
  },

  clearSearch: () => set({ searchQuery: "", filteredNodeIds: null }),

  // Utilities
  getNode: (id) => get().nodes.find((n) => n.id === id),
  getEdge: (id) => get().edges.find((e) => e.id === id),

  getConnectedNodes: (nodeId) => {
    const { edges } = get();
    const connected = new Set<string>();

    for (const edge of edges) {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    }

    return Array.from(connected);
  },

  getNodeEdges: (nodeId) => {
    return get().edges.filter((e) => e.source === nodeId || e.target === nodeId);
  },

  // Import/Export
  exportCanvas: () => {
    const { nodes, edges } = get();
    return {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
  },

  importCanvas: (data) => {
    set({
      nodes: JSON.parse(JSON.stringify(data.nodes)),
      edges: JSON.parse(JSON.stringify(data.edges)),
      selectedNodes: [],
      selectedEdges: [],
    });

    get().saveSnapshot();
  },

  resetCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodes: [],
      selectedEdges: [],
      history: [],
      historyIndex: -1,
      viewport: initialViewport,
    });
  },
}));

export default useCanvasStore;
