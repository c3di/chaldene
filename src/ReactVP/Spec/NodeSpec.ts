import { type Position } from '../Type';
import type EditorContext from '../EditorContext';

export default interface NodeSpec {
  name: string;
  displayLabel?: string;
  description?: string;
  category?: string;
}

export interface NodeSpecConfig {
  spec: any; // todo? NodeSpec or others
  spec2Node: (p: Spec2NodeDataParams) => any;
  visualNodeType: any;
}

export interface Spec2NodeDataParams {
  specName: string;
  spec: NodeSpec;
  visualNodeType: any;
  nodeId: string;
  position: Position;
  editorContext?: EditorContext;
}
