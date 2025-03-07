import type INodeSpec from './NodeSpec';
import { IHandle, Node, isImageType } from '../Type';
import type { ISpec2NodeDataParams } from './NodeSpec';
import type { NodeCodeGenerators } from '../CodeGeneration';

// todo: rename data strucute Node to compute Node, keep consistent
export default interface IComputeNodeSpec extends INodeSpec {
  inputs?: Array<Omit<IHandle, 'id' | 'identifier'>>;
  outputs?: Array<
    Omit<IHandle, 'id' | 'identifier'> & {
      showDiff?: boolean;
    }
  >;
  codeGenerators?: NodeCodeGenerators;
  extraRun?: number;
  sourceChanged?: boolean;
}

export function spec2ComputeNode({
  specName,
  spec,
  visualNodeType,
  nodeId,
  position,
  editorContext
}: ISpec2NodeDataParams & { spec: IComputeNodeSpec }): Node {
  const {
    displayLabel,
    description,
    inputs,
    outputs,
    extraRun,
    sourceChanged
  } = spec;
  const node = {
    id: nodeId,
    position,
    type: visualNodeType,
    data: {
      editorContext,
      displayLabel,
      description,
      extraRun,
      sourceChanged,
      inputs: (inputs ?? []).map((input, index) => ({
        id: `in${index}`,
        ...input
      })),
      outputs: (outputs ?? []).map((output, index) => ({
        id: `out${index}`,
        ...output,
        widget:
          isImageType(output.type) &&
          !output.widget &&
          output.type !== 'image[]' &&
          output.name !== 'processedImage' //Avoid showing image viewer for batch processing node
            ? {
                type: 'ImageViewer',
                showDiff: output.showDiff ?? false,
                isBinary: output.type === 'binary image'
              }
            : output.widget
      })),
      specName
    }
  };
  return node;
}
