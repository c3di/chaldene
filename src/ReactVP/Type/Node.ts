import { type Node as RcNode } from '@xyflow/react';
import { type IHandle } from './Handle';
import type EditorContext from '../EditorContext';

export type ValueCategory = 'inputs' | 'outputs';

export interface INodeData extends Record<string, unknown> {
  displayLabel?: string;
  description?: string;
  inputs?: IHandle[];
  outputs?: IHandle[];
  editorContext?: EditorContext;
  specName?: string;
  // todo: add image preview or others interactive visualizations
}

export type Node = RcNode<INodeData, string>;
