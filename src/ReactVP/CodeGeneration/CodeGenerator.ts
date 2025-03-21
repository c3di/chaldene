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
    inspect_included: boolean = true
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

    inputs?.forEach(input => {
      const edge = incomingEdges.find(e => e.targetHandle === input.id);

      const outputType = this.widgetsRegistry.getOutputType(input.widget?.type);

      inputValues[input.name] = edge
        ? uniqueHandleName(editorID, edge.source, edge.sourceHandle!)
        : this.widgetValueToCodeLiteral(outputType, input.defaultValue);

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
    inspect_included = true
  ): string {
    if (graph === null || graph?.nodes.length === 0) {
      return '';
    }

    const nodes = topologicalSortDAG(graph);
    const edges = graph.edges;

    const code = nodes.map(node => {
      return this.generateNodeCode(
        editorID,
        node,
        edges.filter(e => e.target === node.id),
        inspect_included
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
    inspect_included = true
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
      inspect_included
    );
  }

  // todo: merge to other nodes
  public codeFromBatchProcess(
    editorID: string,
    graph: Graph,
    batch_process_node: Node,
    inspect_included = true
  ): string {
    const inner_loop_code = this.codeFromGraphConnectedToNode(
      editorID,
      graph,
      batch_process_node,
      batch_process_node.data.outputs![0].id,
      inspect_included
    ).replace(/^/gm, '    ');

    const out_loop_code = this.codeFromGraphConnectedToNode(
      editorID,
      graph,
      batch_process_node,
      batch_process_node.data.outputs![1].id,
      inspect_included
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

  public codeFromGraph(
    editorID: string,
    graph: Graph,
    inspect_included: boolean = true
  ): string {
    // Users are encouraged to structure their workflow as a single DAG.
    // If multiple independent DAGs are needed, we recommend building each one
    // in a separate cell within the notebook. So here we assume the graph is a
    // single DAG.
    // inspect_included = true;
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
    return `${ImageCaptureDependencies}
${FolderImageCaptureDependencies}
${HistogramCaptureDependencies}
${code}
`.trim();
  }
}
