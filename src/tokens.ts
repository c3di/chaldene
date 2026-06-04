import { Token } from '@lumino/coreutils';
import { type ISignal } from '@lumino/signaling';

// Self-contained — no @xyflow/react dependency so external extensions can
// import this file without pulling in ReactFlow.

export interface IGraphNode {
  id: string;
  position: { x: number; y: number };
  type?: string;
  data: Record<string, unknown>;
  selected?: boolean;
  width?: number;
  height?: number;
}

export interface IGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  selected?: boolean;
}

export interface IGraph {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
}

export interface IGraphChangedArgs {
  cellId: string;
  graph: IGraph;
}

export interface IChaldeneService {
  isCellReady(cellId: string): boolean;
  getReadyCellIds(): string[];

  getGraph(cellId: string): IGraph | undefined;

  setGraph(cellId: string, graph: IGraph): boolean;
  setInputValue(
    cellId: string,
    nodeId: string,
    handleId: string,
    value: unknown
  ): boolean;

  run(cellId: string): boolean;

  readonly cellReady: ISignal<IChaldeneService, string>;
  readonly cellDisposed: ISignal<IChaldeneService, string>;
  readonly graphChanged: ISignal<IChaldeneService, IGraphChangedArgs>;
}

export const IChaldeneService = new Token<IChaldeneService>(
  'chaldene:update-service'
);
