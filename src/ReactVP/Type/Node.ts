import { type Node as RcNode } from '@xyflow/react';
import { type IHandle } from './Handle';
import type EditorContext from '../EditorContext';

export type ValueCategory = 'inputs' | 'outputs' | 'properties';

export interface INodeData extends Record<string, unknown> {
  displayLabel?: string;
  description?: string;
  inputs?: IHandle[];
  outputs?: IHandle[];
  editorContext?: EditorContext;
  specName?: string;
  // number of extra runs to perform, when not defined, the node is not repeatedly executable.
  // when defined, the node will be executed once with the initial inputs, and then repeatedly with the previous outputs as inputs for extraRun times.
  extraRun?: number;
  // todo: add image preview or others interactive visualizations
  sourceChanged?: boolean;
}

export type Node = RcNode<INodeData, string>;
