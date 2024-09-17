import { type IPosition } from '../Type';
import type EditorContext from '../EditorContext';

export default interface INodeSpec {
  name: string;
  displayLabel?: string;
  description?: string;
  category?: string;
}

export interface INodeSpecConfig {
  spec: any; // todo? NodeSpec or others
  spec2Node: (p: ISpec2NodeDataParams) => any;
  visualNodeType: any;
}

export interface ISpec2NodeDataParams {
  specName: string;
  spec: INodeSpec;
  visualNodeType: any;
  nodeId: string;
  position: IPosition;
  editorContext?: EditorContext;
}
