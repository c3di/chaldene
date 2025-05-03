import {
  type Graph,
  type Edge,
  type Node,
  topologicalSortDAG,
  isImageType
} from '../Type';
import { getCodeGenerator } from '../Spec';
import { uniqueHandleName } from '../Type';
import { widgetsRegistry } from '../Widgets';
import {
  captureImageCode,
  ImageCaptureDependencies
} from './CaptureImageInJupyterlab';
import {
  captureHistogramCode,
  HistogramCaptureDependencies
} from './CaptureHistogramInJupyterlab';
import {
  captureFolderImagesCode,
  FolderImageCaptureDependencies
} from './CaptureFolderImages';
import {
  generateMatrixParameterCode,
  MatrixParameterDependencies
} from './MatrixParameterProcessor';
import { findConnectedSubgraph } from '../Type/Utils';

export default class CodeGenerator {
  protected name: string;
  protected widgetsRegistry: any;

  constructor(name: string) {
    this.name = name;
    this.widgetsRegistry = widgetsRegistry; // TODO: MOVE SOMEWHERE ELSE?
  }

  public widgetValueToCodeLiteral(type: string, value: string): string {
    throw new Error(
      'Method widgetValueToCodeLiteral is not implemented in the base class'
    );
  }

  public generateNodeCode(
    editorID: string,
    { id, data }: Node,
    incomingEdges: Edge[],
    inspect_included: boolean = true,
    parameterMatrix?: Record<string, Record<string, any>>
  ): string {
    const generator = getCodeGenerator(data.specName, this.name);
    if (!generator) {
      console.warn(
        `Node: ${
          data.displayLabel ?? id
        } has no source code generator for language: ${this.name}`
      );
      return '';
    }

    const { inputs, outputs } = data;

    const inputValues: Record<string, string> = {};
    const histogramInspections: Array<{
      imageVar: string;
      targetHandle: string;
    }> = [];
    const imageInspections: Array<
      | string
      | { imageVar: string; handleId: string; referenceImageVar?: string }
    > = [];

    let imageInputVar: string | null = null;

    // Check if we're in matrix mode
    const hasMatrix = Boolean(
      parameterMatrix && Object.keys(parameterMatrix).length > 0
    );

    // Check if this node has parameters in the matrix
    const hasMatrixParameters = parameterMatrix && parameterMatrix[id];

    inputs?.forEach(input => {
      const edge = incomingEdges.find(e => e.targetHandle === input.id);

      const outputType = this.widgetsRegistry.getOutputType(input.widget?.type);

      // Create a parameter matrix reference if this input has matrix parameters
      const inputId = `${id}_input_${input.id}`;
      const hasMatrixValue =
        hasMatrixParameters && parameterMatrix![id][inputId] !== undefined;

      if (hasMatrix && hasMatrixValue) {
        // Instead of hardcoding the value, use a reference to the parameter_matrix
        // Generate code to extract the input name from the parameter ID
        const inputName = input.id;

        // For a parameter like 'sigma' that was stored as '2_input_in1'
        // we just need 'in1' for the actual code generation
        inputValues[input.name] =
          `parameter_matrix.get(${id}, {}).get('${inputName}', ${this.widgetValueToCodeLiteral(outputType, input.defaultValue)})`;
      } else {
        // No matrix value, use the normal approach
        inputValues[input.name] = edge
          ? uniqueHandleName(editorID, edge.source, edge.sourceHandle!)
          : this.widgetValueToCodeLiteral(outputType, input.defaultValue);
      }

      if (input.name === 'image' && edge) {
        imageInputVar = inputValues[input.name];
      }

      if (input.widget?.type === 'ImageCropper' && imageInputVar) {
        imageInspections.push({
          imageVar: imageInputVar,
          handleId: uniqueHandleName(editorID, id, input.id)
        });
      }

      if (input.widget?.type === 'HistogramRange' && imageInputVar) {
        histogramInspections.push({
          imageVar: imageInputVar,
          targetHandle: uniqueHandleName(editorID, id, input.id)
        });
      }
    });

    const outputValues: Record<string, string> = {};
    outputs?.forEach(output => {
      const outputVar = uniqueHandleName(editorID, id, output.id);
      outputValues[output.name] = outputVar;

      if (isImageType(output.type) || output.widget?.type === 'ImageViewer') {
        if (output.type === 'image diff') {
          imageInspections.push({
            imageVar: outputVar,
            handleId: outputVar,
            referenceImageVar: inputValues['image2']
          });
        } else if (output.widget?.showDiff && imageInputVar) {
          imageInspections.push({
            imageVar: outputVar,
            handleId: outputVar,
            referenceImageVar: imageInputVar
          });
        } else {
          imageInspections.push(outputVar);
        }
      }
    });

    let code = '';

    if (inspect_included) {
      // Histogram captures
      histogramInspections.forEach(({ imageVar, targetHandle }) => {
        code += captureHistogramCode(imageVar, targetHandle) + '\n';
      });
    }

    // If we're using a matrix, generate code to handle parameter access
    if (hasMatrix && hasMatrixParameters) {
      // Add a comment about matrix parameters
      code += `# Using matrix parameters for node ${id}\n`;
    }

    // Main node code
    code += `${generator(inputValues, outputValues)}\n`;

    if (data.extraRun) {
      // Add a loop for repeated operations
      code += `for i in range(${data.extraRun}):\n`;
      // Generate iteration code without imports, using previous output as input
      const iterationCode = generator(
        {
          [Object.keys(inputValues)[0]]:
            outputValues[Object.keys(outputValues)[0]]
        },
        outputValues
      )
        .split('\n')
        .filter(line => !line.startsWith('from') && !line.startsWith('import'))
        .join('\n');

      // Add the operation code with proper indentation
      code += `    ${iterationCode.replace(/\n/g, '\n    ')}\n`;
    }

    if (inspect_included) {
      // Image captures (including heatmap overlays)
      imageInspections.forEach(inspection => {
        if (typeof inspection === 'string') {
          code += `\n${captureImageCode(inspection)}`;
        } else {
          code += `\n${captureImageCode(
            inspection.imageVar,
            inspection.handleId,
            inspection.referenceImageVar
          )}`;
        }
      });
    }

    return code;
  }

  public codeFromSubGraph(
    editorID: string,
    graph: Graph | null,
    inspect_included = true,
    parameterMatrix?: Record<string, Record<string, any>>
  ): string {
    if (graph === null || graph?.nodes.length === 0) {
      return '';
    }

    // Check if editorContext has a parameterMatrix that was set by MatrixDialog
    if (!parameterMatrix && (graph as any).editorContext?.parameterMatrix) {
      parameterMatrix = (graph as any).editorContext.parameterMatrix;
      console.log(
        '[CodeGenerator] Using parameter matrix from graph context:',
        parameterMatrix
      );
    }

    const nodes = topologicalSortDAG(graph);
    const edges = graph.edges;

    const code = nodes.map(node => {
      return this.generateNodeCode(
        editorID,
        node,
        edges.filter(e => e.target === node.id),
        inspect_included,
        parameterMatrix
      );
    });
    return code ? code.join('\n') : '';
  }

  public batch_process_node(graph: Graph): Node | undefined {
    return graph.nodes.find(node => node.data.specName === 'batch_process');
  }

  public codeFromGraphConnectedToNode(
    editorID: string,
    graph: Graph,
    node: Node,
    sourceHandle: string,
    inspect_included = true,
    parameterMatrix?: Record<string, Record<string, any>>
  ): string {
    const next_nodes = graph.edges
      .filter(e => e.source === node.id && e.sourceHandle === sourceHandle)
      .map(e => graph.nodes.find(n => n.id === e.target))
      .filter(n => n !== undefined) as Node[];
    const graph_after_batch = findConnectedSubgraph(graph, next_nodes, false, [
      node
    ]);

    return this.codeFromSubGraph(
      editorID,
      graph_after_batch!,
      inspect_included,
      parameterMatrix
    );
  }

  public codeFromBatchProcess(
    editorID: string,
    graph: Graph,
    batch_process_node: Node,
    inspect_included = true,
    parameterMatrix?: Record<string, Record<string, any>>
  ): string {
    const inner_loop_code = this.codeFromGraphConnectedToNode(
      editorID,
      graph,
      batch_process_node,
      batch_process_node.data.outputs![0].id,
      inspect_included,
      parameterMatrix
    ).replace(/^/gm, '    ');

    const out_loop_code = this.codeFromGraphConnectedToNode(
      editorID,
      graph,
      batch_process_node,
      batch_process_node.data.outputs![1].id,
      inspect_included,
      parameterMatrix
    );
    const image_per_batch_var = uniqueHandleName(
      editorID,
      batch_process_node.id,
      batch_process_node.data.outputs![0].id
    );
    const batch_results_var = uniqueHandleName(
      editorID,
      batch_process_node.id,
      batch_process_node.data.outputs![1].id
    );

    const folder_path = this.widgetValueToCodeLiteral(
      'string',
      batch_process_node.data.inputs![0].defaultValue
    );
    const selected_paths = this.widgetValueToCodeLiteral(
      'string[]',
      batch_process_node.data.inputs![1].defaultValue
    );
    const image_inspect = inspect_included
      ? captureImageCode(image_per_batch_var)
      : '';

    let code = `import os
from im2im import Image as IM
from skimage import io, img_as_float
import pandas as pd

folder_path = ${folder_path}
select_paths = ${selected_paths}
batch_outputs = []
for i in range(len(select_paths)):
    image_path = os.path.join(folder_path, select_paths[i])
    ${image_per_batch_var} = IM(img_as_float(io.imread(image_path, as_gray=True)), 'numpy.gray_float64(0to1)')
    ${image_inspect}
${inner_loop_code}
${batch_results_var} = pd.DataFrame(batch_outputs) 
${out_loop_code}`;
    if (inspect_included) {
      code += captureFolderImagesCode(
        folder_path,
        uniqueHandleName(
          editorID,
          batch_process_node.id,
          batch_process_node.data.inputs![1].id
        )
      );
    }

    return code;
  }

  public codeFromMatrix(
    editorID: string,
    graph: Graph,
    parameterMatrix: Record<string, Record<string, any>>
  ): string {
    // Get nodes in execution order
    const nodes = topologicalSortDAG(graph);
    const edges = graph.edges;

    if (nodes.length === 0) {
      return '';
    }

    // Find the first image node (usually a read_image node)
    const imageNodeIndex = nodes.findIndex(node =>
      node.data.outputs?.some(output => isImageType(output.type))
    );

    if (imageNodeIndex === -1) {
      return '';
    }

    // Generate code for the input image node
    const imageNode = nodes[imageNodeIndex];
    const imageNodeCode = this.generateNodeCode(
      editorID,
      imageNode,
      edges.filter(e => e.target === imageNode.id),
      false
    );

    // Find the output variable name from the image node
    const imageOutputVar = imageNode.data.outputs?.find(output =>
      isImageType(output.type)
    );

    if (!imageOutputVar) {
      return '';
    }

    const imageVarName = uniqueHandleName(
      editorID,
      imageNode.id,
      imageOutputVar.id
    );

    // Collect workflow stages (skip the image node)
    const workflowStages: string[] = [];

    // Initialize workflow stages first
    workflowStages.push('# Initialize workflow stages');
    workflowStages.push('stages = []');
    workflowStages.push('');

    // Generate workflow stages for all nodes after the image node
    for (let i = imageNodeIndex + 1; i < nodes.length; i++) {
      const node = nodes[i];
      const nodeGenerator = getCodeGenerator(node.data.specName, this.name);

      if (!nodeGenerator) {
        continue;
      }

      // Find the input to this node
      const incomingEdges = edges.filter(e => e.target === node.id);
      let inputVar = '';

      if (incomingEdges.length > 0) {
        // Find the source node and its output
        const sourceEdge = incomingEdges[0];
        const sourceNode = nodes.find(n => n.id === sourceEdge.source);

        if (sourceNode && sourceNode.data.outputs) {
          const sourceOutput = sourceNode.data.outputs.find(
            output => sourceEdge.sourceHandle === output.id
          );

          if (sourceOutput) {
            inputVar = uniqueHandleName(
              editorID,
              sourceNode.id,
              sourceOutput.id
            );
          }
        }
      }

      // If no input found, use the image variable for the first processing node
      if (!inputVar && i === imageNodeIndex + 1) {
        inputVar = imageVarName;
      } else if (!inputVar) {
        // For subsequent nodes, use previous node's output
        const prevNode = nodes[i - 1];
        if (prevNode.data.outputs && prevNode.data.outputs.length > 0) {
          inputVar = uniqueHandleName(
            editorID,
            prevNode.id,
            prevNode.data.outputs[0].id
          );
        }
      }

      // Find the output variable for this node
      const outputVar =
        node.data.outputs && node.data.outputs.length > 0
          ? uniqueHandleName(editorID, node.id, node.data.outputs[0].id)
          : `result_${node.id}`;

      // Create a function that will apply this node's operation with parameters
      const functionName = `apply_node_${node.id}`;

      // Generate the function definition that will execute this node with parameters
      const nodeFunctionCode = this.generateNodeFunctionCode(
        node,
        inputVar,
        outputVar,
        functionName
      );

      // Add the function definition
      workflowStages.push(nodeFunctionCode);

      // Add this stage to the workflow
      workflowStages.push(
        `stages.append(('${inputVar}', ${functionName}, '${outputVar}', '${node.id}'))`
      );
    }

    // Generate the complete matrix processing code
    const code = `
# Generate input image first
${imageNodeCode}

# Define workflow stage functions
${workflowStages.join('\n\n')}

# Reference the input image to make sure it's included
${imageVarName} 
`;

    return code;
  }

  // Helper method to generate node code with parameters
  private generateNodeWrappedWithParams(
    node: Node,
    inputVar: string,
    outputVar: string
  ): string {
    const generator = getCodeGenerator(node.data.specName, this.name);
    if (!generator) {
      return `# No code generator for ${node.data.specName}`;
    }

    // Build input and output dictionaries for the generator
    const inputValues: Record<string, string> = {};

    node.data.inputs?.forEach(input => {
      // Use parameter values for number and enum types
      if (input.type === 'number' || input.type === 'enum') {
        inputValues[input.name] = input.name;
      } else if (input.name === 'image') {
        // For image input, use the provided input variable
        inputValues[input.name] = inputVar;
      } else {
        // For other types, use the default value
        const outputType = this.widgetsRegistry.getOutputType(
          input.widget?.type
        );
        inputValues[input.name] = this.widgetValueToCodeLiteral(
          outputType,
          input.defaultValue
        );
      }
    });

    // Set outputs
    const outputValues: Record<string, string> = {};
    if (node.data.outputs && node.data.outputs.length > 0) {
      outputValues[node.data.outputs[0].name] = outputVar;
    }

    // Generate code with our input/output mappings
    const nodeCode = generator(inputValues, outputValues);

    // Strip imports from the middle of the code so we don't duplicate them
    // and fix any indentation issues
    const processedCode = nodeCode
      .split('\n')
      .filter((line, index) => {
        // Keep imports only at the beginning
        if (line.startsWith('import ') || line.startsWith('from ')) {
          return index < 3;
        }
        return true;
      })
      .join('\n');

    // Make sure there's no additional indentation in the code to prevent indentation errors
    return processedCode;
  }

  public codeFromGraph(
    editorID: string,
    graph: Graph,
    inspect_included: boolean = true,
    parameterMatrix?: Record<string, Record<string, any>>
  ): string {
    // Check if editorContext has a parameterMatrix that was set by MatrixDialog
    if (!parameterMatrix && (graph as any).editorContext?.parameterMatrix) {
      parameterMatrix = (graph as any).editorContext.parameterMatrix;
    }

    // Check if we're in matrix mode
    const isMatrixMode =
      parameterMatrix && Object.keys(parameterMatrix).length > 0;

    if (isMatrixMode && parameterMatrix) {
      // Generate matrix processing code only
      const matrixCode = this.codeFromMatrix(editorID, graph, parameterMatrix);
      const workflowStagesVar = 'stages';

      const fullMatrixCode = `
# Matrix dependencies
${MatrixParameterDependencies}

# Matrix preprocessing code
${matrixCode}

# Generate matrix parameter code with workflow stages
${generateMatrixParameterCode(parameterMatrix, workflowStagesVar)}
`.trim();

      return fullMatrixCode;
    } else {
      // Normal graph processing
      let code: string = '';

      const batch_process_node = this.batch_process_node(graph);
      if (batch_process_node) {
        code = this.codeFromBatchProcess(
          editorID,
          graph,
          batch_process_node,
          inspect_included
        );
      } else {
        code = this.codeFromSubGraph(editorID, graph, inspect_included);
      }

      if (!inspect_included) {
        return code;
      }

      const fullCode = `${ImageCaptureDependencies}
${FolderImageCaptureDependencies}
${HistogramCaptureDependencies}
${code}
`.trim();

      return fullCode;
    }
  }

  // Fix the parameter ID in the node function
  private generateNodeFunctionCode(
    node: Node,
    inputVar: string,
    outputVar: string,
    functionName: string
  ): string {
    const paramInputs =
      node.data.inputs?.filter(
        input => input.type === 'number' || input.type === 'enum'
      ) || [];

    // Fix indentation for the node-specific code
    const nodeCode = this.generateNodeWrappedWithParams(
      node,
      inputVar,
      outputVar
    );

    // Look for any parameters that need special handling
    let modifiedNodeCode = nodeCode;
    // Regex to find patterns where variable names are quoted: mode = 'mode', sigma = 'sigma', etc.
    const paramRegex = /(\w+)\s*=\s*['"](\1)['"]/g;
    modifiedNodeCode = nodeCode.replace(paramRegex, '$1 = $1');

    // Properly indent the node code by adding 4 spaces to each line
    const indentedNodeCode = modifiedNodeCode
      .split('\n')
      .map(line => (line.trim() ? `    ${line}` : line))
      .join('\n');

    // Create a parameter extraction block that's more robust
    const paramExtraction =
      paramInputs.length > 0
        ? paramInputs
            .map(input => {
              const paramName = input.name;
              const paramId = input.id;
              // Use a more robust parameter extraction with fallback
              return `    # Extract ${paramName} from params
    ${paramName} = None
    if '${paramId}' in params:
        ${paramName} = params['${paramId}']
    elif 'in1' in params:  # Try parameter by position
        ${paramName} = params['in1']`;
            })
            .join('\n\n')
        : '    # No parameters for this node';

    return `
def ${functionName}(input_image, params):
    ${node.data.displayLabel ? `# ${node.data.displayLabel}` : ''}
    
    # Extract parameters from the params dictionary
${paramExtraction}
    
${indentedNodeCode}
    return ${outputVar}
`;
  }
}
