import { type IHandleIdentifier } from './Handle';
export {
  findCodeChangedGraph,
  topologicalSortDAG,
  findCycle,
  findNodeGroupsBetweenSourceChangers
} from './Utils';
export { type Edge } from './Edge';
export { isUsedAsInput, uniqueHandleName } from './Handle';
export { default as Registry } from './Registry';
export { type Graph, defaultGraph } from './Graph';
export type { Tuple2, Tuple4 } from './Tuple';
export type { default as BoundingBox } from './BoundingBox';
export type { default as ExecuteStatus } from './ExecuteStatus';
export type { default as ConnectionStatus } from './ConnectionStatus';
export {
  type IHandle,
  type IHandleIdentifier,
  type HandleUsageType,
  isInputViaConnection
} from './Handle';
export type { Node, INodeData as BasicNodeData, ValueCategory } from './Node';

export interface IPosition {
  x: number;
  y: number;
}

export type Identifier = IHandleIdentifier;

export function isImageType(type?: string | string[]): boolean {
  let types = type ?? [];
  if (!Array.isArray(types)) {
    types = [types];
  }
  return types.some(t => !!type && ['image', 'binary image'].includes(t));
}

export function isSameType(
  type1?: string | string[],
  type2?: string | string[]
): boolean {
  if (type1 === '*' || type2 === '*') {
    return true;
  }
  const types1 = type1 ? (Array.isArray(type1) ? type1 : [type1]) : [];
  const types2 = type2 ? (Array.isArray(type2) ? type2 : [type2]) : [];
  return types1.some(t1 => types2.some(t2 => t1 === t2));
}
