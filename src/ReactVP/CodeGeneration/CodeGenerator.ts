import { type Graph, type Edge, type Node, topologicalSortDAG } from '../Type';
import { getCodeGenerator } from '../Spec';
import { uniqueHandleName } from '../Type';
import { widgetsRegistry } from '../Widgets';
import {
  captureImageCode,
  ImageCaptureDependencies
} from './CaptureImageInJupyterlab';

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
    inputs?.forEach(input => {
      const edge = incomingEdges.find(e => e.targetHandle === input.id);
      inputValues[input.name] = edge
        ? uniqueHandleName(editorID, edge.source, edge.sourceHandle!)
        : this.widgetValueToCodeLiteral(
            this.widgetsRegistry.getOutputType(input.widget?.type),
            input.defaultValue
          );
    });

    const imageInspections: string[] = [];

    const outputValues: Record<string, string> = {};
    outputs?.forEach(output => {
      outputValues[output.name] = uniqueHandleName(editorID, id, output.id);
      if (output.type === 'image') {
        imageInspections.push(outputValues[output.name]);
      }
    });

    let code = generator(inputValues, outputValues);
    for (const inspection of imageInspections) {
      code += `\n${captureImageCode(inspection)}`;
    }

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
    return ImageCaptureDependencies + '\n' + code.join('\n');
  }
}
