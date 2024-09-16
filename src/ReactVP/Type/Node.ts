import { type Node as RcNode } from '@xyflow/react';
import { type Handle } from './Handle';
import type EditorContext from '../EditorContext';

export type ValueCategory = 'inputs' | 'outputs';

export interface NodeData extends Record<string, unknown> {
  displayLabel?: string;
  description?: string;
  inputs?: Handle[];
  outputs?: Handle[];
  editorContext?: EditorContext;
  specName?: string;
  // todo: add image preview or others interactive visualizations
}

export type Node = RcNode<NodeData, string>;
