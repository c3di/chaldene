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

    // Process inputs
    inputs?.forEach(input => {
      const edge = incomingEdges.find(e => e.targetHandle === input.id);

      inputValues[input.name] = edge
        ? uniqueHandleName(editorID, edge.source, edge.sourceHandle!)
        : this.widgetValueToCodeLiteral(
            this.widgetsRegistry.getOutputType(input.widget?.type),
            input.defaultValue
          );

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
        if (output.widget?.heatmapOverlay && imageInputVar) {
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
        code += `${captureHistogramCode(imageVar, targetHandle)}\n`;
      });
    }
    // Main node code
    code += generator(inputValues, outputValues);

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

  public codeFromGraph(
    editorID: string,
    graph: Graph,
    inspect_included: boolean = true
  ): string {
    const nodes = topologicalSortDAG(graph);
    const edges = graph.edges;

    const code = nodes.map(node => {
      const incomingEdges = edges.filter(e => e.target === node.id);
      return this.generateNodeCode(
        editorID,
        node,
        incomingEdges,
        inspect_included
      );
    });

    if (!inspect_included) {
      return code.join('\n');
    }

    const finalCode =
      ImageCaptureDependencies +
      '\n' +
      HistogramCaptureDependencies +
      '\n' +
      code.join('\n');

    console.log(finalCode);
    return finalCode;
  }
}
