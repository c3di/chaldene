import CodeGenerator from './CodeGenerator';
import PythonCodeGenerator from './PythonCodeGenerator';
import { type Graph } from '../Type';
import { topologicalSortDAG } from '../Type';
import { getCodeGenerator } from '../Spec';
import condaEnvironment from '../../condaEnvironment';

export default class PWDGenerator extends CodeGenerator {
  private pythonLiterals = new PythonCodeGenerator();

  constructor() {
    super('PWD');
  }

  public widgetValueToCodeLiteral(type: string, value: any): string {
    return this.pythonLiterals.widgetValueToCodeLiteral(type, value);
  }

  public codeFromGraph(
    editorID: string,
    graph: Graph,
    inspect_included?: boolean
  ): string {
    // In PWD (https://github.com/pythonworkflow/python-workflow-definition)
    // Each workflow consists of three files, a Python module which defines the individual Pythons,
    // a JSON file which defines the connections between the different Python functions
    // a conda environment file to define the software dependencies.
    const nodes = topologicalSortDAG(graph);
    const pythonModule = this.pythonModule(nodes);
    const jsonDefinition = this.jsonDefinition(graph);
    const condaEnv = this.condaEnv(graph);
    this.downloadFile('workflow.py', pythonModule);
    this.downloadFile('workflow.json', jsonDefinition);
    this.downloadFile('environment.yml', condaEnv);

    return `# Python Module:\n${pythonModule}\n\n# JSON Definition:\n${jsonDefinition}\n\n# Conda Environment:\n${condaEnv}`;
  }
  public pythonModule(nodes: any[]): string {
    const moduleImports = new Set<string>();
    const functionBlocks: string[] = [];

    for (const node of nodes) {
      const { specName, inputs, outputs, displayLabel } = node.data;
      const generator = getCodeGenerator(specName, 'Python');
      if (!generator) {
        continue;
      }

      // Use plain handle names so they become readable param/return names
      const inputMap: Record<string, string> = {};
      inputs?.forEach((h: any) => {
        inputMap[h.name] = h.name;
      });

      const outputMap: Record<string, string> = {};
      outputs?.forEach((h: any) => {
        outputMap[h.name] = h.name;
      });

      const rawCode = generator(inputMap, outputMap);

      // Split import lines (module-level) from the function body
      const lines = rawCode.split('\n');
      const bodyLines: string[] = [];
      for (const line of lines) {
        if (/^\s*(import |from )/.test(line)) {
          if (line.trim()) {
            moduleImports.add(line.trim());
          }
        } else {
          bodyLines.push(line);
        }
      }

      // Trim trailing blank lines from the body
      while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) {
        bodyLines.pop();
      }

      const params = (inputs ?? []).map((h: any) => h.name).join(', ');
      const returnVars = (outputs ?? []).map((h: any) => h.name);
      const returnStatement =
        returnVars.length > 0 ? `    return ${returnVars.join(', ')}` : '';

      const funcName = (displayLabel ?? specName ?? 'node')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .toLowerCase();

      const indentedBody = bodyLines.map(l => `    ${l}`).join('\n');

      functionBlocks.push(
        `def ${funcName}(${params}):\n${indentedBody}\n${returnStatement}`
      );
    }

    const importsSection = [...moduleImports].join('\n');
    const functionsSection = functionBlocks.join('\n\n\n');
    return `${importsSection}\n\n\n${functionsSection}\n`.trimStart();
  }

  public jsonDefinition(graph: Graph): string {
    const { nodes, edges } = graph;

    const pwdNodes: object[] = [];
    const pwdEdges: object[] = [];

    // graph node id → PWD node id
    const funcIdMap = new Map<string, number>();
    let nextId = 0;

    // Function nodes
    for (const node of nodes) {
      const { specName, displayLabel } = node.data;
      const funcName = (displayLabel ?? specName ?? 'node')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .toLowerCase();
      const pwdId = nextId++;
      funcIdMap.set(node.id, pwdId);
      pwdNodes.push({
        id: pwdId,
        type: 'function',
        value: `workflow.${funcName}`
      });
    }

    // Input nodes — one per unconnected input handle
    for (const node of nodes) {
      node.data.inputs?.forEach(input => {
        const connected = edges.some(
          e => e.target === node.id && e.targetHandle === input.id
        );
        if (!connected) {
          const pwdId = nextId++;
          pwdNodes.push({
            id: pwdId,
            type: 'input',
            value: input.defaultValue ?? null,
            name: input.name
          });
          pwdEdges.push({
            target: funcIdMap.get(node.id),
            targetPort: input.name,
            source: pwdId,
            sourcePort: null
          });
        }
      });
    }

    // Output nodes — one per unconnected output handle
    for (const node of nodes) {
      node.data.outputs?.forEach(output => {
        const connected = edges.some(
          e => e.source === node.id && e.sourceHandle === output.id
        );
        if (!connected) {
          const pwdId = nextId++;
          pwdNodes.push({ id: pwdId, type: 'output', name: output.name });
          pwdEdges.push({
            target: pwdId,
            targetPort: null,
            source: funcIdMap.get(node.id),
            sourcePort: output.name
          });
        }
      });
    }

    // Edges between function nodes
    for (const edge of edges) {
      const sourcePwdId = funcIdMap.get(edge.source);
      const targetPwdId = funcIdMap.get(edge.target);
      if (sourcePwdId === undefined || targetPwdId === undefined) {
        continue;
      }
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const sourceHandle = sourceNode?.data.outputs?.find(
        h => h.id === edge.sourceHandle
      );
      const targetHandle = targetNode?.data.inputs?.find(
        h => h.id === edge.targetHandle
      );
      pwdEdges.push({
        target: targetPwdId,
        targetPort: targetHandle?.name ?? edge.targetHandle,
        source: sourcePwdId,
        sourcePort: sourceHandle?.name ?? edge.sourceHandle
      });
    }

    return JSON.stringify(
      { version: '0.1.0', nodes: pwdNodes, edges: pwdEdges },
      null,
      2
    );
  }

  public condaEnv(_graph: Graph): string {
    return condaEnvironment;
  }

  private downloadFile(filename: string, content: string): void {
    const ext = filename.split('.').pop();
    const mimeTypes: Record<string, string> = {
      py: 'text/x-python',
      json: 'application/json',
      yml: 'text/yaml'
    };
    const mime = mimeTypes[ext ?? ''] ?? 'text/plain';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
