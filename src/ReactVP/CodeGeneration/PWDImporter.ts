import { type Graph, type Node, type Edge } from '../Type';
import { registerNodeSpec, Spec2Node, type computeNodeSpec } from '../Spec';
import { MarkerType } from '@xyflow/react';
import type EditorContext from '../EditorContext';

/*
 * Importer for the Python Workflow Definition (PWD) format
 * (https://github.com/pythonworkflow/python-workflow-definition).
 *
 * This is the inverse of PWDGenerator: given the `workflow.py` (Python module
 * with one function per node) and `workflow.json` (nodes + edges) it builds a
 * Chaldene graph. For each function in workflow.py a dynamic ComputeNode spec is
 * registered (inputs = parameters, outputs = the returned names, code generator
 * = the original function body) so the imported workflow can also be executed.
 */

interface IParsedFunction {
  funcName: string;
  params: string[];
  outputs: string[]; // names returned by the function
  imports: string; // shared module-level imports
  body: string; // function body, indented by 4 spaces, no return line
  returnStatement: string; // reconstructed `    return ...` line (or '')
}

interface IPwdNode {
  id: number;
  type: 'function' | 'input' | 'output';
  value?: any;
  name?: string;
}

interface IPwdEdge {
  target: number;
  targetPort: string | null;
  source: number;
  sourcePort: string | null;
}

/* ----------------------------- workflow.py ----------------------------- */

/**
 * Parse a PWD `workflow.py` into per-function descriptors. Top-level imports
 * (column 0) are collected and shared; a `def` at column 0 starts a new
 * function, indented lines (including nested `def`s) belong to its body.
 */
export function parsePythonModule(
  pyText: string
): Map<string, IParsedFunction> {
  const lines = pyText.split('\n');
  const importLines: string[] = [];
  const functions = new Map<string, IParsedFunction>();

  // Locate the line indices of each top-level `def`.
  const defIndices: number[] = [];
  lines.forEach((line, index) => {
    if (/^def\s+\w+\s*\(/.test(line)) {
      defIndices.push(index);
    } else if (/^(import |from )/.test(line)) {
      importLines.push(line.trim());
    }
  });

  const imports = importLines.join('\n');

  for (let i = 0; i < defIndices.length; i++) {
    const start = defIndices[i];
    const end = i + 1 < defIndices.length ? defIndices[i + 1] : lines.length;
    const signature = lines[start];
    const match = /^def\s+(\w+)\s*\(([^)]*)\)\s*:/.exec(signature);
    if (!match) {
      continue;
    }
    const funcName = match[1];
    const params = match[2]
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0)
      // strip any default values / type annotations to keep the plain name
      .map(p => p.split(/[:=]/)[0].trim());

    // Body lines (everything after the signature within this function block).
    const bodyLines = lines.slice(start + 1, end);

    // Trim trailing blank lines.
    while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) {
      bodyLines.pop();
    }

    // Extract the trailing top-level (4-space indented) return statement.
    let returnStatement = '';
    const outputs: string[] = [];
    for (let j = bodyLines.length - 1; j >= 0; j--) {
      const line = bodyLines[j];
      if (!line.trim()) {
        continue;
      }
      const ret = /^ {4}return\s+(.*)$/.exec(line);
      if (ret) {
        returnStatement = line;
        const expr = ret[1].trim();
        outputs.push(...parseReturnNames(expr));
        bodyLines.splice(j);
        // trim trailing blanks again after removing the return
        while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) {
          bodyLines.pop();
        }
      }
      break;
    }

    functions.set(funcName, {
      funcName,
      params,
      outputs,
      imports,
      body: bodyLines.join('\n'),
      returnStatement
    });
  }

  return functions;
}

/**
 * Derive output handle names from a return expression.
 * `{"a": x, "b": y}` -> ['a', 'b']; `image` -> ['image']; '' -> [].
 */
function parseReturnNames(expr: string): string[] {
  if (!expr) {
    return [];
  }
  if (expr.startsWith('{') && expr.endsWith('}')) {
    const inner = expr.slice(1, -1);
    const keys: string[] = [];
    // match "key": ... or 'key': ...
    const re = /["']([^"']+)["']\s*:/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(inner)) !== null) {
      keys.push(m[1]);
    }
    if (keys.length > 0) {
      return keys;
    }
  }
  // Single value: use the returned identifier when it is a plain name,
  // otherwise fall back to a generic name.
  return [/^\w+$/.test(expr) ? expr : 'result'];
}

/* --------------------------- spec construction -------------------------- */

let importCounter = 0;

/**
 * Build and register a ComputeNode spec for a parsed function. Returns the
 * unique spec name to instantiate it with.
 */
function registerFunctionSpec(fn: IParsedFunction): string {
  // Namespace to avoid clobbering built-in specs; keep it stable-ish but unique.
  const specName = `pwd_${fn.funcName}_${importCounter++}`;

  const returnVars = fn.outputs;
  const codeGenerator = (
    inputs: Record<string, string>,
    outputs: Record<string, string>
  ): string => {
    const args = fn.params.map(p => inputs[p] ?? p).join(', ');
    const call = `${fn.funcName}(${args})`;
    const def = `def ${fn.funcName}(${fn.params.join(', ')}):\n${fn.body}${
      fn.returnStatement ? `\n${fn.returnStatement}` : ''
    }`;

    let assignment: string;
    if (returnVars.length === 0) {
      assignment = call;
    } else if (returnVars.length === 1) {
      assignment = `${outputs[returnVars[0]]} = ${call}`;
    } else {
      const tmp = `__${fn.funcName}_result`;
      assignment =
        `${tmp} = ${call}\n` +
        returnVars
          .map(name => `${outputs[name]} = ${tmp}["${name}"]`)
          .join('\n');
    }

    return `${fn.imports}\n${def}\n${assignment}`;
  };

  const spec: computeNodeSpec = {
    name: specName,
    displayLabel: fn.funcName,
    description: `Imported from PWD workflow.py: ${fn.funcName}`,
    category: 'imported (PWD)',
    inputs: fn.params.map(name => ({ name, displayLabel: name })),
    outputs: returnVars.map(name => ({ name, displayLabel: name })),
    codeGenerators: { Python: codeGenerator }
  };

  registerNodeSpec(spec);
  return specName;
}

/* ------------------------- value/widget inference ----------------------- */

function inferWidget(
  value: any
): { type: string; [key: string]: any } | undefined {
  if (typeof value === 'number') {
    return { type: 'Number' };
  }
  if (typeof value === 'boolean') {
    return { type: 'Boolean' };
  }
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(v => typeof v === 'number')
  ) {
    return { type: 'Tuple2' };
  }
  if (typeof value === 'string') {
    return { type: 'String' };
  }
  return undefined;
}

/* ----------------------------- graph build ----------------------------- */

/**
 * Build a Chaldene graph from PWD `workflow.json` + `workflow.py`.
 */
export function importPWDToGraph(
  jsonText: string,
  pyText: string,
  editorContext: EditorContext
): Graph {
  const functions = parsePythonModule(pyText);
  const definition = JSON.parse(jsonText) as {
    nodes: IPwdNode[];
    edges: IPwdEdge[];
  };
  const pwdNodes = definition.nodes ?? [];
  const pwdEdges = definition.edges ?? [];

  const nodeById = new Map<number, IPwdNode>();
  pwdNodes.forEach(n => nodeById.set(n.id, n));

  // pwdId -> visual node, for function nodes only.
  const visualByPwdId = new Map<number, Node>();

  // Register a spec + create a visual node per PWD function node.
  let column = 0;
  for (const pwdNode of pwdNodes) {
    if (pwdNode.type !== 'function') {
      continue;
    }
    const funcName = String(pwdNode.value ?? '').replace(/^workflow\./, '');
    const fn = functions.get(funcName);
    if (!fn) {
      console.warn(
        `PWD import: no function "${funcName}" found in workflow.py`
      );
      continue;
    }
    const specName = registerFunctionSpec(fn);
    const node = Spec2Node(
      specName,
      editorContext.getNodeId(),
      { x: column * 320, y: (column % 2) * 120 },
      editorContext
    );
    column++;
    visualByPwdId.set(pwdNode.id, node);
  }

  // Apply PWD `input` node values onto the target function's input handles.
  for (const edge of pwdEdges) {
    const sourceNode = nodeById.get(edge.source);
    if (!sourceNode || sourceNode.type !== 'input') {
      continue;
    }
    const targetVisual = visualByPwdId.get(edge.target);
    if (!targetVisual) {
      continue;
    }
    const paramName = edge.targetPort ?? sourceNode.name;
    const handle = targetVisual.data.inputs?.find(h => h.name === paramName);
    if (handle) {
      if (sourceNode.value === null || sourceNode.value === undefined) {
        // Inverse of PWDGenerator's `'None' -> null` mapping: a null PWD input
        // becomes the literal `'None'` with no widget, so code generation emits
        // an unquoted `None` and the readiness check treats it as filled.
        handle.defaultValue = 'None';
      } else {
        handle.defaultValue = sourceNode.value;
        const widget = inferWidget(sourceNode.value);
        if (widget) {
          handle.widget = widget;
        }
      }
    }
  }

  // Build edges between function nodes (skip anything touching input/output).
  const edges: Edge[] = [];
  for (const edge of pwdEdges) {
    const sourceVisual = visualByPwdId.get(edge.source);
    const targetVisual = visualByPwdId.get(edge.target);
    if (!sourceVisual || !targetVisual) {
      continue; // input -> function or function -> output sentinel
    }
    const outputs = sourceVisual.data.outputs ?? [];
    const sourceHandle =
      (edge.sourcePort
        ? outputs.find(h => h.name === edge.sourcePort)?.id
        : outputs[0]?.id) ?? 'out0';
    const targetHandle =
      targetVisual.data.inputs?.find(h => h.name === edge.targetPort)?.id ??
      'in0';
    edges.push({
      id: editorContext.getEdgeId(),
      source: sourceVisual.id,
      target: targetVisual.id,
      sourceHandle,
      targetHandle,
      markerEnd: { type: MarkerType.Arrow, width: 30, height: 30 }
    });
  }

  return { nodes: [...visualByPwdId.values()], edges };
}
