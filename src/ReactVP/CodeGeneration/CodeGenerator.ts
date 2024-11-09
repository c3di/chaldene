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
    incomingEdges: Edge[]
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
    const imageInspections: string[] = [];

    let imageInputVar: string | null = null; // Store the image input variable

    // Process inputs and collect histogram inspections
    inputs?.forEach(input => {
      const edge = incomingEdges.find(e => e.targetHandle === input.id);

      inputValues[input.name] = edge
        ? uniqueHandleName(editorID, edge.source, edge.sourceHandle!)
        : this.widgetValueToCodeLiteral(
            this.widgetsRegistry.getOutputType(input.widget?.type),
            input.defaultValue
          );

      // If this is the image input, store its variable name
      if (input.name === 'image' && edge) {
        imageInputVar = inputValues[input.name];
      }

      // If this is a HistogramRange widget and we have an image input, use that
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
        imageInspections.push(outputVar);
      }
    });

    let code = '';

    // Histogram captures
    if (histogramInspections.length > 0) {
      histogramInspections.forEach(({ imageVar, targetHandle }) => {
        code += `${captureHistogramCode(imageVar, targetHandle)}\n`;
      });
    }

    // Main node code
    code += generator(inputValues, outputValues);

    // Image captures
    imageInspections.forEach(inspection => {
      code += `\n${captureImageCode(inspection)}`;
    });

    return code;
  }

  /**
   * @param graph: Graph - including all nodes and incoming edges
   */
  public codeFromGraph(editorID: string, graph: Graph): string {
    const nodes = topologicalSortDAG(graph);
    const edges = graph.edges;

    const code = nodes.map(node => {
      const incomingEdges = edges.filter(e => e.target === node.id);
      return this.generateNodeCode(editorID, node, incomingEdges);
    });
    const finalCode =
      ImageCaptureDependencies +
      '\n' +
      HistogramCaptureDependencies +
      '\n' +
      code.join('\n');

    console.log('Final generated code:', finalCode); // Debug print
    return finalCode;
  }
}
