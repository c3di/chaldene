import type INodeSpec from './NodeSpec';
import type { IHandle, Node } from '../Type';
import type { ISpec2NodeDataParams } from './NodeSpec';
import type { NodeCodeGenerators } from '../CodeGeneration';

// todo: rename data strucute Node to compute Node, keep consistent
export default interface IComputeNodeSpec extends INodeSpec {
  inputs?: Array<Omit<IHandle, 'id' | 'identifier'>>;
  outputs?: Array<Omit<IHandle, 'id' | 'identifier'>>;
  codeGenerators?: NodeCodeGenerators;
}

export function spec2ComputeNode({
  specName,
  spec,
  visualNodeType,
  nodeId,
  position,
  editorContext
}: ISpec2NodeDataParams & { spec: IComputeNodeSpec }): Node {
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
        id: `in${index}`,
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
