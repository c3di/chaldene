import { type HandleIdentifier } from './Handle';

export { findCodeChangedGraph, topologicalSortDAG, findCycle } from './Utils';
export { type Edge } from './Edge';
export { isUsedAsInput, uniqueHandleName } from './Handle';
export { default as Registry } from './Registry';
export { type Graph, defaultGraph } from './Graph';
export type { default as BoundingBox } from './BoundingBox';
export type { default as ExecuteStatus } from './ExecuteStatus';
export type { default as ConnectionStatus } from './ConnectionStatus';
export {
  type Handle,
  type HandleIdentifier,
  type HandleUsageType,
  isInputViaConnection
} from './Handle';
export type { Node, NodeData as BasicNodeData, ValueCategory } from './Node';

export interface IPosition {
  x: number;
  y: number;
}

export type Identifier = HandleIdentifier;
