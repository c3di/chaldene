// Minimal mock for @xyflow/react used in Jest tests.
// Only value exports that are referenced at runtime need to be present;
// type-only imports are erased by the TypeScript compiler.

export const applyNodeChanges = (_changes: any[], nodes: any[]) => nodes;
export const applyEdgeChanges = (_changes: any[], edges: any[]) => edges;

export const MarkerType = {
  Arrow: 'arrow',
  ArrowClosed: 'arrowclosed'
} as const;

export const ConnectionMode = {
  Loose: 'loose',
  Strict: 'strict'
} as const;

export const BackgroundVariant = {
  Dots: 'dots',
  Lines: 'lines',
  Cross: 'cross'
} as const;

// Component stubs — never rendered in unit/integration tests
export const ReactFlow = () => null;
export const ReactFlowProvider = ({ children }: { children: any }) => children;
export const Background = () => null;
export const Controls = () => null;

export const useReactFlow = () => ({
  fitView: () => undefined,
  setCenter: () => undefined,
  getNodes: () => [],
  getEdges: () => []
});

// Type aliases that mirror the real shapes used across the codebase.
// These are erased at runtime but keep ts-jest happy.
export type Node<T = any, U extends string = string> = {
  id: string;
  position: { x: number; y: number };
  data: T;
  type?: U;
  selected?: boolean;
  width?: number;
  height?: number;
};

export type Edge<T = any> = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: T;
  selected?: boolean;
};

export type NodeChange = any;
export type EdgeChange = any;
export type Connection = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};
export type NodeProps<T = any> = { id: string; data: T; selected: boolean };
