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
    const folderInspections: Array<{
      folderVar: string;
      handleId: string;
    }> = [];

    let imageInputVar: string | null = null;

    // First pass: Process file path inputs and folder path inputs
    inputs?.forEach(input => {
      if (input.widget?.type === 'FileInputFromServer') {
        const edge = incomingEdges.find(e => e.targetHandle === input.id);
        const inputValue = edge
          ? uniqueHandleName(editorID, edge.source, edge.sourceHandle!)
          : this.widgetValueToCodeLiteral(
              this.widgetsRegistry.getOutputType(input.widget?.type),
              input.defaultValue
            );

        inputValues[input.name] = inputValue;

        if (input.widget.extensions && input.widget.extensions.length === 0) {
          // Find the ImageGallery input to use its handle
          const galleryInput = inputs.find(
            i => i.widget?.type === 'ImageGallery'
          );
          const handleId = uniqueHandleName(
            editorID,
            id,
            galleryInput?.id || input.id
          );

          console.log('[CodeGenerator] Setting up folder inspection:', {
            folderVar: inputValue,
            handleId,
            isGalleryInput: !!galleryInput
          });

          folderInspections.push({
            folderVar: inputValue,
            handleId: handleId
          });
        }
      }
    });

    // Second pass: Process gallery inputs and other inputs
    inputs?.forEach(input => {
      if (input.widget?.type === 'ImageGallery') {
        console.log(
          `[CodeGenerator] Processing ImageGallery input: ${input.name}`
        );
        console.log('[CodeGenerator] Current value:', inputValues[input.name]);

        const edge = incomingEdges.find(e => e.targetHandle === input.id);
        if (edge) {
          // If there's an edge, use the normal connection
          const galleryValue = uniqueHandleName(
            editorID,
            edge.source,
            edge.sourceHandle!
          );
          console.log(
            `[CodeGenerator] Found edge connection, setting value to: ${galleryValue}`
          );
          inputValues[input.name] = galleryValue;
        } else {
          console.log(
            '[CodeGenerator] No edge found, using existing value from folder input'
          );
        }
        // No else needed since we already set imageGallery value if there was a folderPath
      } else if (input.widget?.type !== 'FileInputFromServer') {
        const edge = incomingEdges.find(e => e.targetHandle === input.id);

        const outputType = this.widgetsRegistry.getOutputType(
          input.widget?.type
        );

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
      // Folder captures - must happen before main node code
      console.log(
        '[CodeGenerator] Processing folder inspections:',
        folderInspections
      );
      folderInspections.forEach(({ folderVar, handleId }) => {
        code += captureFolderImagesCode(folderVar, handleId) + '\n';
      });

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

  public codeFromGraph(
    editorID: string,
    graph: Graph,
    inspect_included: boolean = true
  ): string {
    console.log('[CodeGenerator] Generating code from graph:', {
      editorID,
      nodeCount: graph.nodes.length,
      inspect_included
    });

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

    if (!inspect_included) {
      return code.join('\n');
    }

    const finalCode =
      ImageCaptureDependencies +
      '\n' +
      FolderImageCaptureDependencies +
      '\n' +
      HistogramCaptureDependencies +
      '\n' +
      code.join('\n');

    console.log('[CodeGenerator] Final generated code:', finalCode);
    return finalCode;
  }
}
