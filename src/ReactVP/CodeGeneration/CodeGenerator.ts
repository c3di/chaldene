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
  captureDifferenceCode,
  DifferenceCaptureDependencies
} from './CaptureDifferenceInJupyterlab';

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
    const heatmapInspections: Array<{
      inputImageVar: string;
      outputImageVar: string;
      handleId: string;
    }> = [];

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

      if (
        input.widget?.type === 'ImageViewer' &&
        input.widget.showCropControl &&
        imageInputVar
      ) {
        const captureCode = captureImageCode(
          imageInputVar,
          uniqueHandleName(editorID, id, input.id)
        );
        console.log('Adding crop widget capture:', captureCode); // Debug log
        imageInspections.push(captureCode);
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
        if (output.widget?.showCropControl && imageInputVar) {
          const captureCode = captureImageCode(
            imageInputVar,
            uniqueHandleName(editorID, id, output.id)
          );
          imageInspections.push(captureCode);
        }
        imageInspections.push(outputVar);
        if (output.widget?.heatmapOverlay && imageInputVar) {
          heatmapInspections.push({
            inputImageVar: imageInputVar,
            outputImageVar: outputVar,
            handleId: outputVar
          });
        }
      }
    });

    let code = '';

    // Debug logs
    console.log(
      'Input captures:',
      imageInspections.filter(insp => insp.includes('capture_image'))
    );
    console.log(
      'Output captures:',
      imageInspections.filter(insp => !insp.includes('capture_image'))
    );

    // Image captures for inputs (crop widget)
    const inputCaptures = imageInspections.filter(insp =>
      insp.includes('capture_image')
    );
    inputCaptures.forEach(inspection => {
      code += `${inspection}\n`;
    });

    // Histogram captures
    histogramInspections.forEach(({ imageVar, targetHandle }) => {
      code += `${captureHistogramCode(imageVar, targetHandle)}\n`;
    });

    // Main node code
    code += generator(inputValues, outputValues);

    // Image captures for outputs
    const outputCaptures = imageInspections.filter(
      insp => !insp.includes('capture_image')
    );
    outputCaptures.forEach(inspection => {
      code += `\n${captureImageCode(inspection)}`;
    });

    // Heatmap captures
    heatmapInspections.forEach(
      ({ inputImageVar, outputImageVar, handleId }) => {
        code += `\n${captureDifferenceCode(inputImageVar, outputImageVar, handleId)}`;
      }
    );

    return code;
  }

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
      DifferenceCaptureDependencies +
      '\n' +
      code.join('\n');

    console.log('Final generated code:', finalCode);
    return finalCode;
  }
}
