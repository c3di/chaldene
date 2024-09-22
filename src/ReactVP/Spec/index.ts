import type NodeSpec from './NodeSpec';
import { ComputeNode } from '../Components';
import { type Node, type IPosition } from '../Type';
import type EditorContext from '../EditorContext';
import { spec2ComputeNode } from './ComputeNodeSpec';
import { NodeSpecConfigRegistry } from './NodeSpecRegistry';
import type { INodeSpecConfig } from './NodeSpec';
import { type NodeCodeGeenerator } from '../CodeGeneration';

export type { INodeSpecConfig } from './NodeSpec';
export type { default as computeNodeSpec } from './ComputeNodeSpec';
export const nodeSpecRegistry = new NodeSpecConfigRegistry();

export function registerNodeSpecConfig(
  name: string,
  config: INodeSpecConfig
): string {
  return nodeSpecRegistry.register(name, config);
}

// Allow Node Spec for ComputeNode to be registered for user
export function registerNodeSpec(spec: NodeSpec | NodeSpec[]): void {
  const toRegister: NodeSpec[] = Array.isArray(spec) ? spec : [spec];
  toRegister.forEach(s => {
    registerNodeSpecConfig(s.name, {
      spec: s,
      spec2Node: spec2ComputeNode,
      visualNodeType: ComputeNode
    });
  });
}

export function Spec2Node(
  specName: string,
  nodeId: string,
  position: IPosition,
  editorContext?: EditorContext
): Node {
  const {
    spec,
    spec2Node: spec2NodeData,
    visualNodeType
  } = nodeSpecRegistry.get(specName);
  return spec2NodeData({
    specName,
    spec,
    visualNodeType,
    nodeId,
    position,
    editorContext
  });
}

export function getCodeGenerator(
  specName?: string,
  language?: string
): NodeCodeGeenerator | null {
  if (!specName || !language) {
    return null;
  }

  const { spec } = nodeSpecRegistry.get(specName);
  if (!spec || !('codeGenerators' in spec)) {
    return null;
  }
  return spec.codeGenerators[language];
}
