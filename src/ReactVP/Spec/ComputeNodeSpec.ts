import type NodeSpec from './NodeSpec';
import type { Handle, Node } from '../Type';
import type { Spec2NodeDataParams } from './NodeSpec';
import type { NodeCodeGenerators } from '../CodeGeneration';

// todo: rename data strucute Node to compute Node, keep consistent
export default interface ComputeNodeSpec extends NodeSpec {
  inputs?: Array<Omit<Handle, 'id' | 'identifier'>>;
  outputs?: Array<Omit<Handle, 'id' | 'identifier'>>;
  codeGenerators?: NodeCodeGenerators;
}

export function spec2ComputeNode({
  specName,
  spec,
  visualNodeType,
  nodeId,
  position,
  editorContext
}: Spec2NodeDataParams & { spec: ComputeNodeSpec }): Node {
  const { displayLabel, description, inputs, outputs } = spec;
  const node = {
    id: nodeId,
    position,
    type: visualNodeType,
    data: {
      editorContext,
      displayLabel,
      description,
      inputs: (inputs ?? []).map((input, index) => ({
        id: `in${index}`, // avoid any sperator
        ...input
      })),
      outputs: (outputs ?? []).map((output, index) => ({
        id: `out${index}`,
        ...output,
        widget:
          output.type === 'image' && !output.widget
            ? { type: 'ImageViewer' }
            : output.widget
      })),
      specName
    }
  };
  return node;
}
